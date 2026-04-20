<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PoReturn;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PoReturnController extends Controller
{
    // Create new PO Return
    public function store(Request $request)
    {
        $request->validate([
            'return_number' => 'required|string|unique:po_returns,return_number',
            'grn_number' => 'required|string',
            'po_number' => 'required|string',
            'vendor' => 'required|string',
            'return_date' => 'required|date',
            'subtotal' => 'required|numeric',
            'total' => 'required|numeric',
        ]);

        $poReturn = PoReturn::create([
            'id' => Str::uuid(),
            'return_number' => $request->return_number,
            'grn_number' => $request->grn_number,
            'po_number' => $request->po_number,
            'vendor' => $request->vendor,
            'return_date' => $request->return_date,
            'status' => $request->status ?? 'Submitted',
            'reason' => $request->reason ?? null,
            'notes' => $request->notes ?? null,
            'subtotal' => $request->subtotal,
            'tax' => $request->tax ?? 0,
            'total' => $request->total,
        ]);

        return response()->json($poReturn, 201);
    }

    // Optional: list all PO Returns
    public function index()
    {
        $returns = PoReturn::with('items')->get();
        return response()->json($returns);
    }

    // Optional: get a single PO Return
    public function show($id)
    {
        $poReturn = PoReturn::with('items')->findOrFail($id);
        return response()->json($poReturn);
    }
}