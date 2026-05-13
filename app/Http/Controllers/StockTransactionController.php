<?php

namespace App\Http\Controllers;

use App\Models\StockTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class StockTransactionController extends Controller
{
    public function __construct()
    {
        $this->middleware('web');
    }

    public function index(Request $request)
{
    $itemCode = $request->query('item_code');

     $query = StockTransaction::where('user_id', auth()->id())
            ->orderBy('transaction_date', 'desc');

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
                'user_id'          => auth()->id(),
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
            'additional_info' => 'nullable|string',
        ]);

        $validated['user_id'] = auth()->id();

        $transaction = StockTransaction::create($validated);

        return response()->json([
            'success' => true,
            'data' => $transaction
        ], 201);
    }

    // Optional: show single transaction
    public function show($id)
    {
        $transaction = StockTransaction::where('user_id', auth()->id())
            ->findOrFail($id);

        return response()->json($transaction);
    }

   public function destroy($id)
{
    Log::info('Delete request received', [
        'received_id' => $id
    ]);

    // ✅ find by PRIMARY KEY (UUID)
      $transaction = StockTransaction::where('user_id', auth()->id())
            ->find($id);

    if (!$transaction) {
        Log::warning('Transaction not found', [
            'received_id' => $id
        ]);

        return response()->json([
            'message' => 'Transaction not found',
            'received_id' => $id
        ], 404);
    }

    Log::info('Transaction found', [
        'id' => $transaction->id,
        'item_code' => $transaction->item_code
    ]);

    $transaction->delete();

    return response()->json([
        'message' => 'Deleted successfully'
    ]);
}
}
