<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\ItemBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ItemBatchController extends Controller
{
    public function index(Request $request)
    {
        $items = InventoryStock::where('user_id', auth()->id())->get();
        $batches = ItemBatch::with('location')
            ->where('user_id', auth()->id())
            ->orderBy('created_at')
            ->get();

        $batchesByItem = $batches->groupBy('item_code');
        $itemsByCode = $items->keyBy('item_code');

        $batchRows = $batches->map(function (ItemBatch $b) use ($itemsByCode) {
            $item = $itemsByCode->get($b->item_code);
            return [
                'id' => $b->id,
                'item_code' => $b->item_code,
                'item_name' => $item->item_name ?? $b->item_code,
                'item_type' => $item->item_type ?? 'Product',
                'batch_number' => $b->batch_number,
                'batch_date' => $b->batch_date?->toDateString(),
                'quantity' => (float) $b->quantity,
                'location_id' => $b->location_id,
                'location_name' => $b->location?->location_name,
                'expiration_date' => $b->expiration_date?->toDateString(),
                'notes' => $b->notes,
                'created_at' => $b->created_at,
                'is_synthetic' => false,
            ];
        });

        $unbatchedRows = $items
            ->map(function (InventoryStock $item) use ($batchesByItem) {
                $itemBatches = $batchesByItem->get($item->item_code, collect());
                $batchedQty = (float) $itemBatches->sum('quantity');
                $onHand = (float) ($item->quantity_on_hand ?? 0);
                $remainder = round($onHand - $batchedQty, 3);
                $hasBatches = $itemBatches->count() > 0;

                return [
                    'id' => $item->id,
                    'item_code' => $item->item_code,
                    'item_name' => $item->item_name,
                    'item_type' => $item->item_type ?? 'Product',
                    'item_mode' => $item->item_mode,
                    'uom' => $item->uom,
                    'quantity' => max(0, $remainder),
                    'has_batches' => $hasBatches,
                    'show_by_default' => !$hasBatches || $remainder > 0.0001,
                    'is_synthetic' => true,
                ];
            })
            ->values();

        $today = now()->startOfDay();
        $stats = [
            'total_batches' => $batches->count(),
            'active_batches' => $batches->filter(function (ItemBatch $b) use ($today) {
                return !$b->expiration_date || $b->expiration_date->gte($today);
            })->count(),
            'expiring_soon' => $batches->filter(function (ItemBatch $b) use ($today) {
                return $b->expiration_date && $b->expiration_date->between($today, $today->copy()->addDays(30));
            })->count(),
            'total_stock' => (float) $items->sum('quantity_on_hand'),
        ];

        // Batch tracking counts as "set up" once any item is explicitly
        // enabled for it, or already has real batch records (covers items
        // batched before this onboarding flow existed).
        $trackingEnabled = $batches->count() > 0 || $items->contains(fn (InventoryStock $i) => $i->item_mode === 'batch');

        return response()->json([
            'batches' => $batchRows->values(),
            'unbatched' => $unbatchedRows,
            'stats' => $stats,
            'tracking_enabled' => $trackingEnabled,
        ]);
    }

    /**
     * Validates one item line against its unbatched remainder. When
     * $excludeBatchNumber is set (editing an existing group), that group's
     * own current rows are excluded from the "already batched" sum, since
     * they're about to be replaced and shouldn't count against themselves.
     */
    private function validateLine(array $line, ?string $excludeBatchNumber = null): ?string
    {
        $item = InventoryStock::where('user_id', auth()->id())
            ->where('item_code', $line['item_code'])
            ->first();

        if (!$item) {
            return "Item {$line['item_code']} not found";
        }

        if ($item->item_mode === 'variant') {
            return "Item {$item->item_code} is variant-tracked and cannot have batches.";
        }

        $query = ItemBatch::where('user_id', auth()->id())->where('item_code', $line['item_code']);
        if ($excludeBatchNumber !== null) {
            $query->where('batch_number', '!=', $excludeBatchNumber);
        }
        $batchedQty = (float) $query->sum('quantity');
        $remainder = round((float) $item->quantity_on_hand - $batchedQty, 3);

        if ($line['quantity'] > $remainder + 0.0001) {
            return "Cannot tag {$line['quantity']} of {$item->item_code} — only {$remainder} is unbatched.";
        }

        return null;
    }

    private function validateGroupItems(array $items, ?string $excludeBatchNumber = null): ?string
    {
        $seenCodes = [];
        foreach ($items as $line) {
            if (isset($seenCodes[$line['item_code']])) {
                return "Item {$line['item_code']} is listed more than once in this batch.";
            }
            $seenCodes[$line['item_code']] = true;

            $error = $this->validateLine($line, $excludeBatchNumber);
            if ($error) {
                return $error;
            }
        }

        return null;
    }

    /**
     * A batch number can cover multiple items at once (e.g. everything
     * received/produced together) — each item still gets its own
     * item_batches row (own quantity/expiration), all sharing the same
     * batch_number so they display and delete together as one group.
     */
    public function store(Request $request)
    {
        $request->validate([
            'batch_number' => 'required|string|max:100',
            'batch_date' => 'nullable|date',
            'location_id' => 'nullable|string|exists:locations,id',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'required|string|exists:inventory_stock,item_code',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.expiration_date' => 'nullable|date',
        ]);

        $error = $this->validateGroupItems($request->items);
        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        DB::beginTransaction();
        try {
            $created = [];
            foreach ($request->items as $line) {
                $created[] = ItemBatch::create([
                    'id' => (string) Str::uuid(),
                    'user_id' => auth()->id(),
                    'item_code' => $line['item_code'],
                    'batch_number' => $request->batch_number,
                    'batch_date' => $request->batch_date,
                    'quantity' => $line['quantity'],
                    'location_id' => $request->location_id,
                    'expiration_date' => $line['expiration_date'] ?? null,
                    'notes' => $request->notes,
                ]);
            }
            DB::commit();

            return response()->json(['message' => 'Batch created', 'items' => $created], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error saving batch',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        ItemBatch::where('user_id', auth()->id())
            ->where('id', $id)
            ->delete();

        return response()->json(['message' => 'Batch item deleted successfully']);
    }

    /**
     * Delete every item line sharing a batch_number — removes the whole
     * group at once, restoring each item's unbatched remainder.
     */
    public function destroyGroup($batchNumber)
    {
        ItemBatch::where('user_id', auth()->id())
            ->where('batch_number', $batchNumber)
            ->delete();

        return response()->json(['message' => 'Batch group deleted successfully']);
    }

    /**
     * Replaces every row currently under $batchNumber with a fresh set —
     * simplest robust "edit a group" semantics: delete + recreate inside
     * one transaction, rather than diffing old vs new item lines. Supports
     * renaming the batch number as part of the same edit.
     */
    public function updateGroup(Request $request, $batchNumber)
    {
        $request->validate([
            'batch_number' => 'required|string|max:100',
            'batch_date' => 'nullable|date',
            'location_id' => 'nullable|string|exists:locations,id',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'required|string|exists:inventory_stock,item_code',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.expiration_date' => 'nullable|date',
        ]);

        $existing = ItemBatch::where('user_id', auth()->id())->where('batch_number', $batchNumber)->get();
        if ($existing->isEmpty()) {
            return response()->json(['message' => 'Batch not found'], 404);
        }

        $error = $this->validateGroupItems($request->items, $batchNumber);
        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        DB::beginTransaction();
        try {
            ItemBatch::where('user_id', auth()->id())->where('batch_number', $batchNumber)->delete();

            $updated = [];
            foreach ($request->items as $line) {
                $updated[] = ItemBatch::create([
                    'id' => (string) Str::uuid(),
                    'user_id' => auth()->id(),
                    'item_code' => $line['item_code'],
                    'batch_number' => $request->batch_number,
                    'batch_date' => $request->batch_date,
                    'quantity' => $line['quantity'],
                    'location_id' => $request->location_id,
                    'expiration_date' => $line['expiration_date'] ?? null,
                    'notes' => $request->notes,
                ]);
            }
            DB::commit();

            return response()->json(['message' => 'Batch updated', 'items' => $updated]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error updating batch',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
