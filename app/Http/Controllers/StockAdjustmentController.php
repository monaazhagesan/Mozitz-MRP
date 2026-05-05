<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\InventoryStock;
use App\Models\StockTransaction;

class StockAdjustmentController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'id' => 'required|string',
            'adjustment_number' => 'required|string',
            'adjustment_date' => 'required',
            'status' => 'required|in:draft,completed',
            'items' => 'required|array|min:1',
        ]);

        DB::beginTransaction();

        try {
            // ✅ 1. Create master adjustment
            $adjustment = StockAdjustment::create([
                'id' => $request->id,
                'adjustment_number' => $request->adjustment_number,
                'adjustment_date' => $request->adjustment_date,
                'reason' => $request->reason,
                'additional_info' => $request->additional_info,
                'status' => $request->status,
                'total_value' => $request->total_value ?? 0,
            ]);

            // ✅ 2. Loop items
            foreach ($request->items as $item) {

                $inventory = InventoryStock::where('item_code', $item['itemCode'])->first();

                $inStock = $inventory->quantity_on_hand ?? 0;
                $adjustQty = (int) $item['adjustmentQty'];
                $cost = (float) ($item['costPerUnit'] ?? 0);

                $adjustValue = $adjustQty * $cost;

                // ✅ Save item snapshot (FULL DATA)
                StockAdjustmentItem::create([
                    'adjustment_id' => $adjustment->id,
                    'item_code' => $item['itemCode'],
                    'item_name' => $item['itemName'] ?? null,
                    'barcode' => $item['barcode'] ?? null,
                    'in_stock' => $inStock,
                    'adjustment_qty' => $adjustQty,
                    'cost_per_unit' => $cost,
                    'adjustment_value' => $adjustValue,
                ]);

                // ✅ Only apply stock changes if COMPLETED
                if ($request->status === 'completed' && $inventory) {

                    $newQty = $inStock + $adjustQty;

                    $inventory->update([
                        'quantity_on_hand' => $newQty,
                        'last_transaction_date' => now(),
                    ]);

                    StockTransaction::create([
                        'item_code' => $item['itemCode'],
                        'transaction_type' => $adjustQty > 0
                            ? 'Adjustment In'
                            : 'Adjustment Out',
                        'quantity' => abs($adjustQty),
                        'unit_cost' => $cost,
                        'reference_type' => 'Stock Adjustment',
                        'reference_number' => $request->adjustment_number,
                        'notes' => $request->reason,
                        'additional_info' => $request->additional_info,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => $request->status === 'completed'
                    ? 'Adjustment completed successfully'
                    : 'Adjustment saved as draft',
                'adjustment_id' => $adjustment->id
            ]);

        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'message' => 'Error saving adjustment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
{
    try {

        $query = StockAdjustment::with('items');

        // ✅ FILTER: status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // ✅ FILTER: search (adjustment number / reason)
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('adjustment_number', 'like', "%{$search}%")
                  ->orWhere('reason', 'like', "%{$search}%");
            });
        }

        // ✅ FILTER: date range
        if ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('adjustment_date', [
                $request->from,
                $request->to
            ]);
        }

        // ✅ latest first
        $adjustments = $query
            ->orderBy('adjustment_date', 'desc')
            ->paginate(20);

        return response()->json($adjustments);

    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Failed to fetch adjustments',
            'error' => $e->getMessage()
        ], 500);
    }
}

public function destroy($id)
{
    StockAdjustment::where('id', $id)->delete();

    return response()->json([
        'message' => 'Adjustment deleted successfully'
    ]);
}
}