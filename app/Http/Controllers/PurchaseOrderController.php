<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // ✅ Add this import
use Illuminate\Support\Facades\Auth;


class PurchaseOrderController extends Controller
{

      public function __construct()
    {
        $this->middleware('web');
    }

    public function index()
{
    $userId = Auth::id();

    return PurchaseOrder::with(['lines','shipments','taxes'])
        ->where('user_id', $userId)
        ->get();
}

    public function show($id)
{
    $userId = Auth::id();

    $po = PurchaseOrder::with(['lines','shipments','taxes'])
        ->where('user_id', $userId)
        ->findOrFail($id);

    return response()->json($po);
}

    public function store(Request $request)
{
    $po = PurchaseOrder::create([
        'user_id'         => Auth::id(),
        'po_number'       => $request->po_number,
        'operating_unit'  => $request->operating_unit,
        'po_rev'          => $request->po_rev ?? 0,
        'type'            => $request->type,
        'vendor'          => $request->vendor,
        'site'            => $request->site,
        'currency'        => $request->currency,
        'contact'         => $request->contact,
        'ship_to'         => $request->ship_to,
        'bill_to'         => $request->bill_to,
        'expected_date'   => $request->expected_date,
        'status'          => $request->status,
        'subtotal'        => $request->subtotal,
        'tax'             => $request->tax,
        'total'           => $request->total,
        'description'     => $request->description,
        'payment_terms'   => $request->payment_terms,
        'notes'           => $request->notes,
        'line_items_count'=> $request->line_items_count,
    ]);

    return response()->json($po);
}

//    public function update(Request $request, $id)
 //   {
 //       $po = PurchaseOrder::findOrFail($id);

 //       $po->update($request->all());

 //       return $po;
//    }

    public function destroy($id)
{
    $po = PurchaseOrder::where('user_id', Auth::id())
            ->findOrFail($id);

    $po->delete();

    return response()->json([
        'message' => 'Deleted successfully'
    ]);
}

    public function showByNumber($po_number)
{
    $userId = Auth::id();

    $po = PurchaseOrder::with(['lines.taxes', 'shipments', 'taxes'])
        ->where('user_id', $userId)
        ->where('po_number', $po_number)
        ->firstOrFail();

    return response()->json($po);
}

public function updateStatus(Request $request, $id)
{
    $request->validate([
        'status' => 'required|in:Approved,Cancel,Partial,Completed',
    ]);

    $po = PurchaseOrder::where('user_id', Auth::id())
            ->findOrFail($id);

    // Only update the status field
    $po->status = $request->status;
    $po->save();

    return response()->json([
        'message' => "PO status updated successfully",
        'po' => $po
    ]);
}

public function generatePDF(Request $request)
{
    $poNumber = $request->input('poNumber');

    $po = PurchaseOrder::with(['lines'])
        ->where('user_id', Auth::id())
        ->where('po_number', $poNumber)
        ->first();

    if (!$po) {
        return response()->json([
            'error' => 'Purchase order not found'
        ], 404);
    }

    $html = view('pdf.purchase-order', compact('po'))->render();

    return response()->json(['html' => $html]);
}

 public function update(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            // 1️⃣ Fetch PO
           $po = PurchaseOrder::where('user_id', Auth::id())
        ->findOrFail($id);

            // 2️⃣ Update PO header
            $po->update([
                'po_number'        => $request->po_number,
                'operating_unit'   => $request->operating_unit,
                'po_rev'           => $request->po_rev ?? 0,
                'type'             => $request->type,
                'vendor'           => $request->vendor,
                'site'             => $request->site,
                'currency'         => $request->currency,
                'contact'          => $request->contact,
                'ship_to'          => $request->ship_to,
                'bill_to'          => $request->bill_to,
                'expected_date'    => $request->expected_date,
                'status'           => $request->status,
                'subtotal'         => $request->subtotal,
                'tax'              => $request->tax,
                'total'            => $request->total,
                'description'      => $request->description,
                'payment_terms'    => $request->payment_terms,
                'notes'            => $request->notes,
                'line_items_count' => $request->line_items_count,
            ]);

            // 3️⃣ Delete old lines, taxes, shipments
            $po->lines()->delete();
            $po->taxes()->delete();
            $po->shipments()->delete();

            // 4️⃣ Insert new lines
            if ($request->has('lines') && is_array($request->lines)) {
                foreach ($request->lines as $line) {
                    $po->lines()->create($line);
                }
            }

            // 5️⃣ Insert new taxes
            if ($request->has('taxes') && is_array($request->taxes)) {
                foreach ($request->taxes as $tax) {
                    $po->taxes()->create($tax);
                }
            }

            // 6️⃣ Insert new shipments
            if ($request->has('shipments') && is_array($request->shipments)) {
                foreach ($request->shipments as $shipment) {
                    $po->shipments()->create($shipment);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Purchase Order updated successfully',
                'po'      => $po->load(['lines', 'taxes', 'shipments']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error updating PO',
                'error'   => $e->getMessage(), // ✅ include exact error
            ], 500);
        }
    }
}