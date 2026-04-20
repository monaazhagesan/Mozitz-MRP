<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrderTax;
use Illuminate\Http\Request;

class PurchaseOrderTaxController extends Controller
{
     public function store(Request $request) {
    $taxes = $request->input('taxes', []); // default empty array

    foreach ($taxes as $tax) {
        PurchaseOrderTax::create([
            'po_id' => $tax['po_id'],
            'line_num' => $tax['line_num'],
            'tax_type' => $tax['tax_type'] ?? 'None',
            'place_of_supply' => $tax['place_of_supply'] ?? null,
            'cgst' => $tax['cgst'] ?? 0,  // ← ensure default 0
            'sgst' => $tax['sgst'] ?? 0,  // ← ensure default 0
            'igst' => $tax['igst'] ?? 0,  // ← ensure default 0
            'cess' => $tax['cess'] ?? 0,  // ← ensure default 0
            'tax_total' => $tax['tax_total'] ?? 0, // ← default 0
        ]);
    }

    return response()->json(['message' => 'Taxes stored successfully']);
}

}