<?php

namespace App\Http\Controllers;

use App\Models\StockTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StockTransactionController extends Controller
{
    public function index(Request $request)
{
    $itemCode = $request->query('item_code');

    $query = StockTransaction::orderBy('transaction_date', 'desc');

    if ($itemCode) {
        $query->where('item_code', $itemCode);
    }

    return response()->json($query->get());
}

    public function import(Request $request)
    {
        $file = $request->file('csv');

        $rows = file($file);
        foreach ($rows as $row) {
            $cols = explode(';', trim($row));

            StockTransaction::create([
                'id'               => $cols[0] ?? Str::uuid(),
                'item_code'        => $cols[1] ?? null,
                'transaction_type' => $cols[2] ?? null,
                'reference_type'   => $cols[3] ?? null,
                'reference_number' => $cols[4] ?? null,
                'quantity'         => (float)($cols[5] ?? 0),
                'unit_cost'        => (float)($cols[6] ?? 0),
                'transaction_date' => $cols[7] ?? null,
                'notes'            => $cols[8] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Imported successfully');
    }

     public function store(Request $request)
    {
        $validated = $request->validate([
            'item_code' => 'required|string|max:255',
            'transaction_type' => 'required|string|max:50',
            'reference_type' => 'nullable|string|max:50',
            'reference_number' => 'nullable|string|max:100',
            'quantity' => 'required|numeric',
            'unit_cost' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        $transaction = StockTransaction::create($validated);

        return response()->json([
            'success' => true,
            'data' => $transaction
        ], 201);
    }

    // Optional: show single transaction
    public function show($id)
    {
        $transaction = StockTransaction::findOrFail($id);
        return response()->json($transaction);
    }
}
