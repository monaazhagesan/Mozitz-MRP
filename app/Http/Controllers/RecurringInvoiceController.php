<?php

namespace App\Http\Controllers;

use App\Models\RecurringInvoice;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class RecurringInvoiceController extends Controller
{
    // CREATE
    public function store(Request $request)
    {
         Log::info('RECURRING PAYLOAD:', $request->all());

        $validated = $request->validate([
            'invoice_id' => 'required|string',

            'customer_name' => 'nullable|string',
            'customer_email' => 'nullable|email',
            'customer_gstin' => 'nullable|string',
            'customer_address' => 'nullable|string',

            'items' => 'required|array',

            'tax_type' => 'nullable|string',
            'tax_config' => 'nullable|array',

            'subtotal' => 'nullable|numeric',
            'tax_amount' => 'nullable|numeric',
            'total_amount' => 'nullable|numeric',

            'frequency' => 'required|string',
            'start_date' => 'required|date',
            'end_type' => 'nullable|string',
            'occurrences' => 'nullable|integer',
            'end_date' => 'nullable|date',

            'next_invoice_date' => 'required|date',

            'status' => 'nullable|string',

            'notes' => 'nullable|string',

            'send_reminders' => 'boolean',
            'reminder_days_before' => 'nullable|integer',
            'reminder_on_due_date' => 'boolean',
            'reminder_days_after' => 'nullable|integer',
        ]);

        $recurring = RecurringInvoice::create($validated);

        return response()->json([
            'message' => 'Recurring invoice created successfully',
            'data' => $recurring
        ], 201);
    }

    // GET ALL
    public function index()
{
    return response()->json(
        RecurringInvoice::orderBy('created_at', 'desc')->get()
    );
}
    // GET SINGLE
    public function show($id)
    {
        return response()->json(
            RecurringInvoice::findOrFail($id)
        );
    }

    // UPDATE
    public function update(Request $request, $id)
    {
        $recurring = RecurringInvoice::findOrFail($id);
        $recurring->update($request->all());

        return response()->json([
            'message' => 'Updated successfully',
            'data' => $recurring
        ]);
    }

    // DELETE
    public function destroy($id)
    {
        RecurringInvoice::destroy($id);

        return response()->json([
            'message' => 'Deleted successfully'
        ]);
    }

    public function toggleStatus(Request $request, $id)
{
    $recurring = RecurringInvoice::findOrFail($id);

    $request->validate([
        'status' => 'required|string|in:active,paused',
    ]);

    $recurring->status = $request->status;
    $recurring->save();

    return response()->json([
        'message' => 'Status updated successfully',
        'data' => $recurring
    ]);
}

public function cancel($id)
{
    $recurring = RecurringInvoice::findOrFail($id);

    $recurring->status = 'cancelled';
    $recurring->save();

    return response()->json([
        'message' => 'Recurring invoice cancelled successfully',
        'data' => $recurring
    ]);
}

public function process()
{
    $today = Carbon::today();

    // Get active recurring invoices due today or earlier
    $recurrings = RecurringInvoice::where('status', 'active')
        ->whereDate('next_invoice_date', '<=', $today)
        ->get();

    foreach ($recurrings as $recurring) {

    
        if ($recurring->frequency === 'daily') {
            $recurring->next_invoice_date = Carbon::parse($recurring->next_invoice_date)->addDay();
        }

        if ($recurring->frequency === 'weekly') {
            $recurring->next_invoice_date = Carbon::parse($recurring->next_invoice_date)->addWeek();
        }

        if ($recurring->frequency === 'monthly') {
            $recurring->next_invoice_date = Carbon::parse($recurring->next_invoice_date)->addMonth();
        }

        // Handle end conditions
        if ($recurring->end_type === 'occurrences') {
            $recurring->occurrences -= 1;

            if ($recurring->occurrences <= 0) {
                $recurring->status = 'completed';
            }
        }

        if ($recurring->end_type === 'date' && $recurring->end_date < $today) {
            $recurring->status = 'completed';
        }

        $recurring->save();
    }

    return response()->json([
        'message' => 'Recurring invoices processed successfully',
        'processed_count' => $recurrings->count(),
    ]);
}
}