<?php

namespace App\Http\Controllers;

use App\Models\GRN;
use Illuminate\Http\Request;

class GRNController extends Controller
{
   public function index()
{
    // eager load items
    return GRN::with('items')->orderBy('created_at', 'desc')->get();
}

   public function show($id)
{
    return GRN::with('items')->findOrFail($id);
}


    public function store(Request $request)
    {
        $data = $request->validate([         
            'grn_number' => 'required|string|unique:grns',
            'po_number' => 'required|string',
            'vendor' => 'required|string',
            'receipt_date' => 'nullable|date',
            'qc_status' => 'nullable|string',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|string',
            'created_at' => 'nullable|date',
            'updated_at' => 'nullable|date',
        ]);

        return GRN::create($data);
    }

    public function update(Request $request, $id)
    {
        $grn = GRN::findOrFail($id);

        $grn->update($request->all());

        return response()->json(['message' => 'GRN updated successfully']);
    }

    public function destroy($id)
    {
        GRN::findOrFail($id)->delete();

        return response()->json(['message' => 'GRN deleted successfully']);
    }

      public function check(Request $request)
    {
        $grn_number = $request->query('grn_number');
        $existing = Grn::where('grn_number', $grn_number)->first();
        return response()->json($existing);
    }

}
