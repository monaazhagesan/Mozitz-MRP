<?php

namespace App\Http\Controllers;

use App\Models\CreditNote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CreditNoteController extends Controller
{
    // Get all credit notes with items
    public function index(Request $request)
{
    try {
        $customerId = $request->query('customer_id');

        $query = CreditNote::with('items');

        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        return response()->json([
            'data' => $query->get()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Failed to fetch credit notes',
            'error' => $e->getMessage()
        ], 500);
    }
}

    // Get single credit note
    public function show($id)
    {
        return CreditNote::with('items')->findOrFail($id);
    }

    // Store new credit note
    public function store(Request $request)
    {
            Log::info('Incoming credit note request:', $request->all());

        $data = $request->validate([
            'id' => 'nullable|string',
            'credit_note_number' => 'required|string',
            'customer_id' => 'nullable|string',
            'customer_name' => 'required|string',
            'invoice_id' => 'nullable|string',
            'invoice_number' => 'nullable|string',
            'credit_date' => 'nullable|date',
            'reason' => 'nullable|string',
            'status' => 'nullable|string',
            'total_amount' => 'numeric',
            'applied_amount' => 'numeric',
            'notes' => 'nullable|string',
            'created_at' => 'nullable|date',
            'updated_at' => 'nullable|date',
        ]);

        return CreditNote::create($data);
    }

    // Delete credit note
    public function destroy($id)
    {
        $creditNote = CreditNote::findOrFail($id);
        $creditNote->delete();

        return response()->json(['message' => 'Credit note deleted successfully']);
    }

    public function update(Request $request, $id)
{
    $creditNote = CreditNote::findOrFail($id);

    $data = $request->validate([
        'credit_note_number' => 'required|string',
        'customer_id' => 'nullable|string',
        'customer_name' => 'required|string',
        'invoice_id' => 'nullable|string',
        'invoice_number' => 'nullable|string',
        'credit_date' => 'nullable|date',
        'reason' => 'nullable|string',
        'status' => 'nullable|string',
        'total_amount' => 'numeric',
        'applied_amount' => 'numeric',
        'notes' => 'nullable|string',
    ]);

    $creditNote->update($data);

    return response()->json($creditNote);
}
}
