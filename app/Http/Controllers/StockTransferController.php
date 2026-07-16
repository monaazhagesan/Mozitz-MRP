<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\WarehouseStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = StockTransfer::with(['items', 'fromLocation', 'toLocation'])
                ->where('user_id', auth()->id());

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('transfer_number', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%");
                });
            }

            $transfers = $query->orderBy('transfer_date', 'desc')->paginate(20);

            return response()->json($transfers);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch stock transfers',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * How much of an item is available to move out of a given source.
     * A null $locationId means the source is the "Unallocated" pool —
     * mirrors WarehouseStockController::unallocated()'s calculation.
     */
    private function availableAtSource(string $itemCode, ?string $locationId): float
    {
        if ($locationId === null) {
            $item = InventoryStock::where('item_code', $itemCode)->first();
            if (!$item) {
                return 0;
            }
            $allocated = (float) WarehouseStock::where('item_code', $itemCode)->sum('quantity_on_hand');
            return max(0, round((float) $item->quantity_on_hand - $allocated, 3));
        }

        return (float) WarehouseStock::where('item_code', $itemCode)
            ->where('location_id', $locationId)
            ->sum('quantity_on_hand');
    }

    private function upsertDestination(string $itemCode, string $locationId, ?string $binId, float $qty): void
    {
        $existing = WarehouseStock::where('item_code', $itemCode)
            ->where('location_id', $locationId)
            ->where('storage_bin_id', $binId)
            ->first();

        if ($existing) {
            $existing->update(['quantity_on_hand' => $existing->quantity_on_hand + $qty]);
            return;
        }

        WarehouseStock::create([
            'id' => (string) Str::uuid(),
            'item_code' => $itemCode,
            'location_id' => $locationId,
            'storage_bin_id' => $binId,
            'quantity_on_hand' => $qty,
        ]);
    }

    private function decrementSource(string $itemCode, ?string $locationId, ?string $binId, float $qty): void
    {
        // Unallocated pool isn't a real row — nothing to decrement there.
        if ($locationId === null) {
            return;
        }

        $query = WarehouseStock::where('item_code', $itemCode)->where('location_id', $locationId);

        // A specific source bin was picked — decrement that exact row.
        if ($binId !== null) {
            $row = $query->where('storage_bin_id', $binId)->first();
            if (!$row) {
                return;
            }
            $remaining = round((float) $row->quantity_on_hand - $qty, 3);
            if ($remaining <= 0.0001) {
                $row->delete();
            } else {
                $row->update(['quantity_on_hand' => $remaining]);
            }
            return;
        }

        // Bin-agnostic transfer (the normal case — the UI picks an item at a
        // location, not a specific bin): drain across whichever bins hold
        // this item at the location, oldest first, until $qty is covered.
        $remainingToTake = $qty;
        foreach ($query->orderBy('created_at')->get() as $row) {
            if ($remainingToTake <= 0.0001) {
                break;
            }
            $take = min($remainingToTake, (float) $row->quantity_on_hand);
            $remaining = round((float) $row->quantity_on_hand - $take, 3);
            if ($remaining <= 0.0001) {
                $row->delete();
            } else {
                $row->update(['quantity_on_hand' => $remaining]);
            }
            $remainingToTake = round($remainingToTake - $take, 3);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'id' => 'required|string',
            'transfer_number' => 'required|string',
            'transfer_date' => 'required',
            'from_location_id' => 'nullable|string|exists:locations,id',
            'to_location_id' => 'required|string|exists:locations,id|different:from_location_id',
            'status' => 'required|in:draft,completed',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
        ]);

        // Availability check runs regardless of draft/completed, so a Draft
        // can't be created against a source that's already short — mirrors
        // the up-front validation style used by WarehouseStockController.
        foreach ($request->items as $item) {
            $available = $this->availableAtSource($item['item_code'], $request->from_location_id);
            if ($item['quantity'] > $available + 0.0001) {
                $sourceLabel = $request->from_location_id ? 'the selected source location' : 'Unallocated stock';
                return response()->json([
                    'message' => "Cannot transfer {$item['quantity']} of {$item['item_code']} — only {$available} is available in {$sourceLabel}.",
                ], 422);
            }
        }

        DB::beginTransaction();

        try {
            $transfer = StockTransfer::create([
                'id' => $request->id,
                'user_id' => auth()->id(),
                'transfer_number' => $request->transfer_number,
                'transfer_date' => $request->transfer_date,
                'from_location_id' => $request->from_location_id,
                'to_location_id' => $request->to_location_id,
                'status' => $request->status,
                'notes' => $request->notes,
                'total_items' => count($request->items),
            ]);

            foreach ($request->items as $item) {
                StockTransferItem::create([
                    'id' => (string) Str::uuid(),
                    'transfer_id' => $transfer->id,
                    'item_code' => $item['item_code'],
                    'item_name' => $item['item_name'] ?? null,
                    'quantity' => $item['quantity'],
                    'from_storage_bin_id' => $item['from_storage_bin_id'] ?? null,
                    'to_storage_bin_id' => $item['to_storage_bin_id'] ?? null,
                ]);

                // Only a completed transfer actually moves stock — a Draft
                // is just a saved plan, same semantics as Stock Adjustment.
                if ($request->status === 'completed') {
                    $this->decrementSource(
                        $item['item_code'],
                        $request->from_location_id,
                        $item['from_storage_bin_id'] ?? null,
                        (float) $item['quantity']
                    );
                    $this->upsertDestination(
                        $item['item_code'],
                        $request->to_location_id,
                        $item['to_storage_bin_id'] ?? null,
                        (float) $item['quantity']
                    );
                }
            }

            DB::commit();

            return response()->json([
                'message' => $request->status === 'completed' ? 'Transfer completed successfully' : 'Transfer saved as draft',
                'transfer_id' => $transfer->id,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error saving transfer',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        StockTransfer::where('user_id', auth()->id())
            ->where('id', $id)
            ->delete();

        return response()->json(['message' => 'Transfer deleted successfully']);
    }
}
