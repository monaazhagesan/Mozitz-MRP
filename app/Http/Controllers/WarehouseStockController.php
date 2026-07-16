<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\Location;
use App\Models\StorageBin;
use App\Models\WarehouseStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WarehouseStockController extends Controller
{
    /**
     * Lists allocation rows (optionally filtered to one location), with the
     * item's name and its total on-hand quantity joined in from
     * InventoryStock so the frontend doesn't need a second round-trip.
     */
    public function index(Request $request)
    {
        $query = WarehouseStock::with(['location', 'storageBin']);

        if ($request->filled('location_id')) {
            $query->where('location_id', $request->query('location_id'));
        }

        $rows = $query->orderBy('created_at')->get();

        $itemsByCode = InventoryStock::whereIn('item_code', $rows->pluck('item_code')->unique())
            ->get()
            ->keyBy('item_code');

        $data = $rows->map(function (WarehouseStock $row) use ($itemsByCode) {
            $item = $itemsByCode->get($row->item_code);
            return [
                'id' => $row->id,
                'item_code' => $row->item_code,
                'item_name' => $item->item_name ?? $row->item_code,
                'item_total_on_hand' => $item ? (float) $item->quantity_on_hand : 0,
                'location_id' => $row->location_id,
                'location_name' => $row->location?->location_name,
                'storage_bin_id' => $row->storage_bin_id,
                'storage_bin_name' => $row->storageBin?->bin_name,
                'quantity_on_hand' => (float) $row->quantity_on_hand,
            ];
        });

        return response()->json($data);
    }

    /**
     * Every InventoryStock item's quantity not yet assigned to any
     * warehouse: total on hand minus the sum of its warehouse_stock rows.
     */
    public function unallocated(Request $request)
    {
        $items = InventoryStock::all(['item_code', 'item_name', 'quantity_on_hand', 'uom']);

        $allocatedByItem = WarehouseStock::select('item_code', DB::raw('SUM(quantity_on_hand) as allocated'))
            ->groupBy('item_code')
            ->pluck('allocated', 'item_code');

        $data = $items
            ->map(function ($item) use ($allocatedByItem) {
                $allocated = (float) ($allocatedByItem[$item->item_code] ?? 0);
                $unallocated = round((float) $item->quantity_on_hand - $allocated, 3);
                return [
                    'item_code' => $item->item_code,
                    'item_name' => $item->item_name,
                    'uom' => $item->uom,
                    'quantity_on_hand' => (float) $item->quantity_on_hand,
                    'allocated' => $allocated,
                    'unallocated' => $unallocated,
                ];
            })
            ->filter(fn ($row) => $row['unallocated'] > 0.0001)
            ->values();

        return response()->json($data);
    }

    private function assertWithinOnHand(string $itemCode, float $desiredQty, ?string $excludingRowId = null): ?array
    {
        $item = InventoryStock::where('item_code', $itemCode)->first();
        if (!$item) {
            return ['message' => "Item {$itemCode} was not found in Inventory."];
        }

        $alreadyAllocated = WarehouseStock::where('item_code', $itemCode)
            ->when($excludingRowId, fn ($q) => $q->where('id', '!=', $excludingRowId))
            ->sum('quantity_on_hand');

        if ($alreadyAllocated + $desiredQty > (float) $item->quantity_on_hand + 0.0001) {
            $remaining = max(0, (float) $item->quantity_on_hand - $alreadyAllocated);
            return ['message' => "Cannot allocate {$desiredQty} of {$itemCode} — only {$remaining} is unallocated (total on hand: {$item->quantity_on_hand})."];
        }

        return null;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'item_code' => 'required|string|exists:inventory_stock,item_code',
            'location_id' => 'required|string|exists:locations,id',
            'storage_bin_id' => 'nullable|string|exists:storage_bins,id',
            'quantity_on_hand' => 'required|numeric|min:0.001',
        ]);

        if ($data['storage_bin_id'] ?? null) {
            $bin = StorageBin::find($data['storage_bin_id']);
            if (!$bin || $bin->location_id !== $data['location_id']) {
                return response()->json(['message' => 'That storage bin does not belong to the selected location.'], 422);
            }
        }

        if ($error = $this->assertWithinOnHand($data['item_code'], (float) $data['quantity_on_hand'])) {
            return response()->json($error, 422);
        }

        // Upsert: allocating the same item/location/bin again adjusts the
        // existing row instead of creating a duplicate.
        $existing = WarehouseStock::where('item_code', $data['item_code'])
            ->where('location_id', $data['location_id'])
            ->where('storage_bin_id', $data['storage_bin_id'] ?? null)
            ->first();

        if ($existing) {
            $existing->update(['quantity_on_hand' => $existing->quantity_on_hand + $data['quantity_on_hand']]);
            return response()->json($existing->fresh(['location', 'storageBin']), 200);
        }

        $data['id'] = (string) Str::uuid();
        $row = WarehouseStock::create($data);

        return response()->json($row->fresh(['location', 'storageBin']), 201);
    }

    public function update(Request $request, $id)
    {
        $row = WarehouseStock::findOrFail($id);

        $data = $request->validate([
            'quantity_on_hand' => 'required|numeric|min:0.001',
        ]);

        if ($error = $this->assertWithinOnHand($row->item_code, (float) $data['quantity_on_hand'], $row->id)) {
            return response()->json($error, 422);
        }

        $row->update($data);

        return response()->json($row->fresh(['location', 'storageBin']));
    }

    public function destroy($id)
    {
        $row = WarehouseStock::findOrFail($id);
        $row->delete();

        return response()->json(['message' => 'Allocation removed']);
    }
}
