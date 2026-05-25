<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\StockReceipt;
use App\Models\InventoryStock;
use Illuminate\Support\Facades\DB;

class StockReceiptController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_id' => 'required|exists:inventory_stock,id',
            'qty_added' => 'required|integer|min:1',
            
            'receipt_type' => 'required|string',
            'receipt_date' => 'required|date',
            'po_grn_reference' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated, &$receipt) {

            // 1. Save receipt
            $receipt = StockReceipt::create([
                'item_id' => $validated['item_id'],
                'qty_added' => $validated['qty_added'],
                'uom' => $validated['uom'] ?? 'Nos',
                'receipt_type' => $validated['receipt_type'],
                'receipt_date' => $validated['receipt_date'],
                'po_grn_reference' => $validated['po_grn_reference'] ?? null,
            ]);

            // 2. Update stock
            $item = InventoryStock::lockForUpdate()->findOrFail($validated['item_id']);

            $item->quantity_on_hand += $validated['qty_added'];
            $item->save();
        });

        return response()->json([
            'message' => 'Stock receipt saved successfully',
            'data' => $receipt
        ]);
    }
}