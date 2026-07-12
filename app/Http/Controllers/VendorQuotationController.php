<?php

namespace App\Http\Controllers;

use App\Models\VendorQuotation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VendorQuotationController extends Controller
{
    public function __construct()
    {
        $this->middleware('web');
    }

    public function index(Request $request)
    {
        $query = VendorQuotation::query();

        if ($request->has('rfq_id')) {
            $query->where('rfq_id', $request->query('rfq_id'));
        }

        return response()->json($query->orderByDesc('received_at')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'rfq_id' => 'nullable|string',
            'vendor_name' => 'nullable|string',
            'item_code' => 'nullable|string',
            'item_name' => 'nullable|string',
            'quantity' => 'nullable|numeric',
            'quoted_price' => 'nullable|numeric',
            'tax_percent' => 'nullable|numeric',
            'tax_amount' => 'nullable|numeric',
            'total_amount' => 'nullable|numeric',
            'delivery_days' => 'nullable|integer',
            'warranty' => 'nullable|string',
            'terms' => 'nullable|string',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
            'received_at' => 'nullable|date',
        ]);

        $data['user_id'] = Auth::id();

        $quotation = VendorQuotation::create($data);

        return response()->json($quotation, 201);
    }

    public function select($id)
    {
        $quotation = VendorQuotation::findOrFail($id);

        VendorQuotation::where('rfq_id', $quotation->rfq_id)->update(['is_selected' => false]);

        $quotation->update(['is_selected' => true, 'status' => 'Selected']);

        return response()->json($quotation);
    }
}
