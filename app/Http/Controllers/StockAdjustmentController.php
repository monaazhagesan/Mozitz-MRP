<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\InventoryStock; // your existing model
use App\Models\StockTransaction; // your existing model

class StockAdjustmentController extends Controller
{
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            $adjustment = StockAdjustment::create([
                'id' => $request->id,
                'adjustment_number' => $request->adjustment_number,
                'adjustment_date' => $request->adjustment_date,
                'reason' => $request->reason,
                'additional_info' => $request->additional_info,
                'status' => $request->status,
                'total_value' => $request->total_value,
            ]);

            foreach ($request->items as $item) {

                StockAdjustmentItem::create([
                    'adjustment_id' => $adjustment->id,
                    'item_code' => $item['itemCode'],
                    'adjustment_qty' => $item['adjustmentQty'],
                    'cost_per_unit' => $item['costPerUnit'] ?? 0,
                ]);

                // ✅ Only update stock if completed
                if ($request->status === 'completed') {

                    $inventory = InventoryStock::where('item_code', $item['itemCode'])->first();

                    if ($inventory) {
                        $newQty = ($inventory->quantity_on_hand ?? 0) + $item['adjustmentQty'];

                        $inventory->update([
                            'quantity_on_hand' => $newQty,
                            'last_transaction_date' => now(),
                        ]);
                    }

                    StockTransaction::create([
                        'item_code' => $item['itemCode'],
                        'transaction_type' => $item['adjustmentQty'] > 0
                            ? 'Adjustment In'
                            : 'Adjustment Out',
                        'quantity' => abs($item['adjustmentQty']),
                        'unit_cost' => $item['costPerUnit'] ?? 0,
                        'reference_type' => 'Stock Adjustment',
                        'reference_number' => $request->adjustment_number,
                        'notes' => $request->reason,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => $request->status === 'completed'
                    ? 'Adjustment completed successfully'
                    : 'Adjustment saved as draft'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error saving adjustment',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
