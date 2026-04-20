<?php

namespace App\Http\Controllers;

use App\Models\PoReturnItem;
use Illuminate\Http\Request;
use Illuminate\Support\Str;


class PoReturnItemController extends Controller
{
    public function index()
    {
        return PoReturnItem::all();
    }

    public function show($id)
    {
        return PoReturnItem::findOrFail($id);
    }

     public function store(Request $request)
    {
        $items = $request->all(); // expecting an array of items

        $createdItems = [];

        foreach ($items as $itemData) {
            $createdItems[] = PoReturnItem::create([
                'id' => Str::uuid(),
                'return_id' => $itemData['return_id'],
                'grn_item_id' => $itemData['grn_item_id'] ?? null,
                'item_code' => $itemData['item_code'],
                'description' => $itemData['description'] ?? null,
                'return_quantity' => $itemData['return_quantity'],
                'max_returnable_quantity' => $itemData['max_returnable_quantity'],
                'unit_price' => $itemData['unit_price'],
                'tax_percent' => $itemData['tax_percent'] ?? null,
                'tax_amount' => $itemData['tax_amount'] ?? null,
                'total_amount' => $itemData['total_amount'],
            ]);
        }

        return response()->json($createdItems, 201);
    }

    public function update(Request $request, $id)
    {
        $item = PoReturnItem::findOrFail($id);

        $data = $request->validate([
            'return_id' => 'sometimes|required|string',
            'grn_item_id' => 'nullable|string',
            'item_code' => 'sometimes|required|string',
            'description' => 'nullable|string',
            'return_quantity' => 'sometimes|required|integer',
            'max_returnable_quantity' => 'sometimes|required|integer',
            'unit_price' => 'sometimes|required|numeric',
            'tax_percent' => 'nullable|numeric',
            'tax_amount' => 'nullable|numeric',
            'total_amount' => 'sometimes|required|numeric',
        ]);

        $item->update($data);

        return $item;
    }

    public function destroy($id)
    {
        $item = PoReturnItem::findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}
