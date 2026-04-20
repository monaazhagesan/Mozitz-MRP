<?php

namespace App\Http\Controllers;

use App\Models\GRNItem;
use Illuminate\Http\Request;

class GRNItemController extends Controller
{
    public function index(Request $request)
    {
        $itemCode = $request->query('item_code');

        $query = GRNItem::with('grn');

        if ($itemCode) {
            $query->where('item_code', $itemCode);
        }

        return response()->json($query->get());
    }


  public function store(Request $request)
{
    $data = $request->validate([
        'grn_id' => 'required|exists:grns,id', // must exist
        'item_code' => 'required|string',
        'description' => 'nullable|string',
        'po_quantity' => 'required|numeric',
        'received_quantity' => 'required|numeric',
        'accepted_quantity' => 'required|numeric',
        'rejected_quantity' => 'required|numeric',
        'balance_quantity' => 'required|numeric',
        'unit_price' => 'required|numeric',
        'total_amount' => 'required|numeric',
        'rejection_reason' => 'nullable|string',
    ]);

    return GRNItem::create($data);
}

    public function destroy($id)
    {
        GRNItem::findOrFail($id)->delete();

        return response()->json(['message' => 'Item deleted']);
    }
}
