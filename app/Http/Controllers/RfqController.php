<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Rfq;
use App\Models\RfqItem;
use App\Models\RfqVendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use App\Mail\RFQMail;
use Illuminate\Support\Facades\Log;

class RfqController extends Controller
{


    public function __construct()
    {
        $this->middleware('web');
    }

public function store(Request $request)
{
    // 1. Validate request first (prevents 90% of 500 errors)
    $request->validate([
        'rfq_number' => 'required|string',
        'title' => 'required|string',
        'status' => 'nullable|string',
        'payment_terms' => 'nullable|string',
        'delivery_location' => 'nullable|string',
        'notes' => 'nullable|string',

        'items' => 'required|array',
        'items.*.item_code' => 'required|string',
        'items.*.item_name' => 'required|string',
        'items.*.description' => 'nullable|string',
        'items.*.quantity' => 'required|numeric',
        'items.*.required_date' => 'nullable|date',

        'vendors' => 'required|array',
        'vendors.*.vendor_name' => 'required|string',
        'vendors.*.vendor_email' => 'nullable|email',
        'vendors.*.vendor_contact' => 'nullable|string',
        'vendors.*.status' => 'nullable|string',
    ]);

    // 2. Check authentication
    if (!Auth::check()) {
        return response()->json([
            'message' => 'Unauthorized'
        ], 401);
    }

    DB::beginTransaction();

    try {
        // 3. Create RFQ
        $rfq = Rfq::create([
            'id' => (string) Str::uuid(),
            'user_id' => Auth::id(),
            'rfq_number' => $request->rfq_number,
            'title' => $request->title,
            'status' => $request->status ?? 'draft',
            'payment_terms' => $request->payment_terms,
            'delivery_location' => $request->delivery_location,
            'notes' => $request->notes,
        ]);

        // 4. Insert Items safely
        foreach ($request->items as $item) {
            RfqItem::create([
                'id' => (string) Str::uuid(),
                'rfq_id' => $rfq->id,
                'item_code' => $item['item_code'],
                'item_name' => $item['item_name'],
                'description' => $item['description'] ?? null,
                'quantity' => $item['quantity'],
                'required_date' => $item['required_date'] ?? null,
            ]);
        }

        // 5. Insert Vendors safely
        foreach ($request->vendors as $vendor) {
            RfqVendor::create([
                'id' => (string) Str::uuid(),
                'rfq_id' => $rfq->id,
                'vendor_name' => $vendor['vendor_name'],
                'vendor_email' => $vendor['vendor_email'] ?? null,
                'vendor_contact' => $vendor['vendor_contact'] ?? null,
                'status' => $vendor['status'] ?? 'pending',
            ]);
        }

        DB::commit();

        // 6. Reload relations
        $rfq->load('items', 'vendors');

        // 7. Send emails safely (never break API if mail fails)
        foreach ($rfq->vendors as $vendor) {
            if (!empty($vendor->vendor_email)) {
                try {
                    Mail::to($vendor->vendor_email)
                        ->send(new RFQMail($rfq, $vendor));
                } catch (\Exception $e) {
                    Log::error("RFQ Email failed: " . $e->getMessage());
                }
            }
        }

        return response()->json([
            'message' => 'RFQ created successfully',
            'rfq_id' => $rfq->id
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();

        Log::error("RFQ store failed: " . $e->getMessage());

        return response()->json([
            'message' => 'Something went wrong while creating RFQ',
            'error' => $e->getMessage()
        ], 500);
    }
}

   /**
     * SEND RFQ (Draft → Sent + Email Trigger)
     */
    public function send($id)
    {
        $rfq = Rfq::with('items', 'vendors')->findOrFail($id);

        if ($rfq->status !== Rfq::STATUS_DRAFT) {
            return response()->json([
                'message' => 'Only draft RFQs can be sent'
            ], 400);
        }

        DB::beginTransaction();

        try {
            $rfq->update([
                'status' => Rfq::STATUS_SENT
            ]);

            foreach ($rfq->vendors as $vendor) {
                if (!empty($vendor->vendor_email)) {
                    Mail::to($vendor->vendor_email)
                        ->send(new RFQMail($rfq, $vendor));
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'RFQ sent successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * VIEWED (Sent → Viewed)
     * Call this from email link
     */
    public function markViewed($id)
    {
        $rfq = Rfq::findOrFail($id);

        if ($rfq->status === Rfq::STATUS_SENT) {
            $rfq->update([
                'status' => Rfq::STATUS_VIEWED
            ]);
        }

        return response()->json([
            'message' => 'RFQ marked as viewed'
        ]);
    }

    /**
     * QUOTED (Vendor submitted quote)
     */
    public function markQuoted($id)
    {
        $rfq = Rfq::findOrFail($id);

        if ($rfq->status === Rfq::STATUS_VIEWED) {
            $rfq->update([
                'status' => Rfq::STATUS_QUOTED
            ]);
        }

        return response()->json([
            'message' => 'RFQ marked as quoted'
        ]);
    }

    /**
     * CLOSE RFQ
     */
    public function close($id)
    {
        $rfq = Rfq::findOrFail($id);

        $rfq->update([
            'status' => Rfq::STATUS_CLOSED
        ]);

        return response()->json([
            'message' => 'RFQ closed'
        ]);
    }


public function destroy($id)
{
    DB::beginTransaction();

    try {
        $rfq = Rfq::findOrFail($id);

        // Delete related items
        RfqItem::where('rfq_id', $rfq->id)->delete();

        // Delete related vendors
        RfqVendor::where('rfq_id', $rfq->id)->delete();

        // Delete RFQ itself
        $rfq->delete();

        DB::commit();

        return response()->json([
            'message' => 'RFQ deleted successfully'
        ], 200);

    } catch (\Exception $e) {
        DB::rollBack();

        return response()->json([
            'message' => $e->getMessage()
        ], 500);
    }
}
}
