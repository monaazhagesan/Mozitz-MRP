<?php

namespace App\Http\Controllers;

use App\Models\SupplierPayable;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SupplierPayableController extends Controller
{
   public function index()
{
    return response()->json(
        SupplierPayable::orderBy('transaction_date','desc')->get()
    );
}

    public function import(Request $request)
    {
        $file = $request->file('csv');

        $rows = file($file);
        foreach ($rows as $row) {
            $cols = explode(';', trim($row));

            SupplierPayable::create([
                'id'                => $cols[0] ?? Str::uuid(),
                'vendor'            => $cols[1] ?? null,
                'reference_type'    => $cols[2] ?? null,
                'reference_number'  => $cols[3] ?? null,
                'transaction_date'  => $cols[4] ?? null,
                'debit'             => (float)($cols[5] ?? 0),
                'credit'            => (float)($cols[6] ?? 0),
                'balance'           => (float)($cols[7] ?? 0),
                'status'            => $cols[8] ?? null,
                'due_date'          => $cols[9] ?? null,
                'notes'             => $cols[10] ?? null,
                'created_at'        => $cols[11] ?? null,
                'grn_number'        => $cols[12] ?? null,
                'po_number'         => $cols[13] ?? null,
                'accepted_quantity' => (float)($cols[14] ?? 0),
                'unit_price'        => (float)($cols[15] ?? 0),
                'tax_amount'        => (float)($cols[16] ?? 0),
                'total_amount'      => (float)($cols[17] ?? 0),
                'paid_amount'       => (float)($cols[18] ?? 0),
                'invoice_number'    => $cols[19] ?? null,
                'invoice_date'      => $cols[20] ?? null,
                'approved_by'       => $cols[21] ?? null,
                'approved_at'       => $cols[22] ?? null,
                'payment_status'    => $cols[23] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Imported successfully');
    }

     public function store(Request $request)
    {
        $data = $request->validate([
            'vendor' => 'nullable|string|max:255',
            'reference_type' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'transaction_date' => 'nullable|date',
            'debit' => 'nullable|numeric',
            'credit' => 'nullable|numeric',
            'balance' => 'nullable|numeric',
            'status' => 'nullable|string|max:50',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'grn_number' => 'nullable|string|max:255',
            'po_number' => 'nullable|string|max:255',
            'accepted_quantity' => 'nullable|numeric',
            'unit_price' => 'nullable|numeric',
            'tax_amount' => 'nullable|numeric',
            'total_amount' => 'nullable|numeric',
            'paid_amount' => 'nullable|numeric',
            'invoice_number' => 'nullable|string|max:255',
            'invoice_date' => 'nullable|date',
            'approved_by' => 'nullable|string|max:255',
            'approved_at' => 'nullable|date',
            'payment_status' => 'nullable|string|max:50',
        ]);

        $payable = SupplierPayable::create($data);

        return response()->json([
            'success' => true,
            'data' => $payable
        ]);
    }
   
}

