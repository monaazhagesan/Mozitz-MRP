<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrderLine;
use Illuminate\Http\Request;

class PurchaseOrderLineController extends Controller
{
    public function store(Request $request)
    {
        $items = [];

        foreach ($request->items as $item) {

            $items[] = PurchaseOrderLine::create($item);
        }

        return response()->json($items);
    }


        public function index()
{
    try {
        $lines = \App\Models\PurchaseOrderLine::with('purchaseOrder')
            ->get()
            ->filter(function ($line) {
                return optional($line->purchaseOrder)->status !== 'Cancel';
            })
            ->values();

        return response()->json($lines);

    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Error fetching purchase order lines',
            'error' => $e->getMessage()
        ], 500);
    }
}

    public function update(Request $request, $id) {
    $line = PurchaseOrderLine::findOrFail($id);
    $line->update($request->all());
    return response()->json($line);
}

public function destroy($id) {
    $line = PurchaseOrderLine::findOrFail($id);
    $line->delete();
    return response()->json(['message' => 'Line deleted']);
}

public function deleteByPO($po_id)
{
    $deleted = PurchaseOrderLine::where('po_id', $po_id)->delete();
    return response()->json([
        'status' => 'success',
        'deleted' => $deleted,
        'message' => "All lines for PO $po_id deleted"
    ]);
}
}