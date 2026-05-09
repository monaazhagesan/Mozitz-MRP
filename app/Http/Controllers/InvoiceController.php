<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    // 🔹 Get All Invoices
   public function index(Request $request)
{
    $customerId = $request->query('customer_id');

    $query = Invoice::with(['items', 'payments']);

    if ($customerId) {
        $query->where('customer_id', $customerId);
    }

    return $query->latest()->get();
}

    public function update(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        DB::beginTransaction();

        try {
            // Update main invoice fields
            $invoice->update($request->only([
                'invoice_date',
                'due_date',
                'customer_id',
                'customer_name',
                'customer_gstin',
                'customer_address',
                'customer_phone',
                'company_name',
                'company_gstin',
                'company_address',
                'company_phone',
                'company_pan',
                'contact_phone',
                'contact_email',
                'terms',
                'signatory',
                'reference_number',
                'subtotal',
                'tax_amount',
                'total_amount',
                'notes',

                // Bank & account details
                'account_name',
                'bank_name',
                'account_number',
                'ifsc_code',
                'branch_name',
                'account_type',

                // Flags
                'use_digital_signature',

                // Tax/GST Fields
                'tax_type',
                'place_of_supply',
                'gst_type',
                'cess_percentage',

                // Recurring/Frequency
                'frequency',
                'start_date',
                'end_after',
                'end_date',

                // Reminder Fields
                'before_due_days',
                'overdue_reminder_days',

                // =========================
                // ✅ ADDED MISSING FIELDS
                // =========================
                'currency',
                'exchange_rate',
                'order_reference',

                'customer_email',
                'contact_person',

                'billing_address',
                'delivery_address',

                'delivery_date',
                'dispatch_type',

                'remarks',

                'shipping_charge',
                'other_charges',
                 'type',
                 'status',
            ]));

            // Update items
            if ($request->has('items')) {
                // Delete existing items and recreate
                $invoice->items()->delete();
                foreach ($request->items as $item) {
                    $invoice->items()->create($item);
                }
            }

            $invoice->updateStatus();

            DB::commit();

            return response()->json($invoice->load('items'), 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
    // 🔹 Store Invoice with Items
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {

            $invoice = Invoice::create($request->only([
                'invoice_number',

                'invoice_date',
                'due_date',
                'customer_id',
                'customer_name',
                'customer_gstin',
                'customer_address',
                'customer_phone',
                'company_name',
                'company_gstin',
                'company_address',
                'company_phone',
                'company_pan',
                'contact_phone',
                'contact_email',
                'terms',
                'signatory',
                'reference_number',
                'subtotal',
                'tax_amount',
                'total_amount',
                'notes',

                // Bank & account details
                'account_name',
                'bank_name',
                'account_number',
                'ifsc_code',
                'branch_name',
                'account_type',

                // Flags
                'use_digital_signature',

                // Tax/GST Fields
                'tax_type',
                'place_of_supply',
                'gst_type',
                'cess_percentage',

                // Recurring/Frequency
                'frequency',
                'start_date',
                'end_after',
                'end_date',

                // Reminder Fields
                'before_due_days',
                'overdue_reminder_days',

                // =========================
                // ✅ ADDED MISSING FIELDS
                // =========================
                'currency',
                'exchange_rate',
                'order_reference',

                'customer_email',
                'contact_person',

                'billing_address',
                'delivery_address',

                'delivery_date',
                'dispatch_type',

                'remarks',

                'shipping_charge',
                'other_charges',
                 'type',
                 'status',
            ]));
            // Save Items
            foreach ($request->items as $item) {
                $invoice->items()->create($item);
            }

            $invoice->updateStatus();

            DB::commit();

            return response()->json($invoice->load('items'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // 🔹 Show Single Invoice
    public function show($id)
    {
        return Invoice::with(['items', 'payments'])->findOrFail($id);
    }

    // 🔹 Record Payment
    public function recordPayment(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        DB::beginTransaction();

        try {

            $payment = $invoice->payments()->create([
                'payment_date' => $request->payment_date ?? now(),
                'amount' => $request->amount,
                'method' => $request->method,
                'reference' => $request->reference,
            ]);

            $invoice->amount_paid += $request->amount;
            $invoice->save();

            $invoice->updateStatus();

            DB::commit();

            return response()->json([
                'message' => 'Payment recorded successfully',
                'invoice' => $invoice->load('payments')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
