<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class VendorController extends Controller
{

   public function __construct()
    {
        $this->middleware('web');
    }

   public function index()
{
    return response()->json(
        Vendor::where('user_id', Auth::id())->get()
    );
}

  public function store(Request $request)
{
    $data = $request->validate([
        'vendor_id' => 'nullable|string',
        'company' => 'nullable|string',
        'vendor_name' => 'nullable|string',
        'contact_person' => 'nullable|string',
        'email' => 'nullable|email',
        'phone' => 'nullable|string',
        'total_orders' => 'nullable|string',
        'country' => 'nullable|string',
        'currency' => 'nullable|string',
        'rating' => 'nullable|string',
        'status' => 'nullable|string',
        'business_registration' => 'nullable|string',
        'business_number' => 'nullable|string',
        'incorporation_details' => 'nullable|string',
        'gst_number' => 'nullable|string',
        'other_tax_details' => 'nullable|string',
        'billing_address' => 'nullable|string',
        'shipping_address' => 'nullable|string',
        'bank_name' => 'nullable|string',
        'account_number' => 'nullable|string',
        'ifsc_code' => 'nullable|string',
        'branch' => 'nullable|string',

        'vendor_type' => 'nullable|string',
        'notes' => 'nullable|string',
        'tags' => 'nullable|string',
        'attachments' => 'nullable|array',
        'gst_certificate' => 'nullable|file',
        'pan_copy' => 'nullable|file',
        'agreement' => 'nullable|file',
        'kyc_documents' => 'nullable|array',
    ]);

    $data['user_id'] = Auth::id();
    
    // Handle file uploads
    if ($request->hasFile('gst_certificate')) {
        $data['gst_certificate'] = $request->file('gst_certificate')->store('vendors/gst');
    }
    if ($request->hasFile('pan_copy')) {
        $data['pan_copy'] = $request->file('pan_copy')->store('vendors/pan');
    }
    if ($request->hasFile('agreement')) {
        $data['agreement'] = $request->file('agreement')->store('vendors/agreements');
    }

    if ($request->hasFile('attachments')) {
    $attachmentPaths = [];

    foreach ($request->file('attachments') as $file) {
        $path = $file->store('vendors/attachments');
        $attachmentPaths[] = $path;
    }

    $data['attachments'] = json_encode($attachmentPaths);
}

    // Handle multiple kyc documents
if ($request->hasFile('kyc_documents')) {
    $kycPaths = [];

    foreach ($request->file('kyc_documents') as $file) {
        $path = $file->store('vendors/kyc');
        $kycPaths[] = $path;
    }

    $data['kyc_documents'] = json_encode($kycPaths);
}

    $vendor = Vendor::create($data);

    return response()->json([
        'message' => 'Vendor created successfully',
        'data' => $vendor
    ], 201);
}

   public function show($id)
{
    $vendor = Vendor::where('id', $id)
        ->where('user_id', Auth::id())
        ->firstOrFail();

    return response()->json($vendor);
}

public function update(Request $request, $id)
{
     $vendor = Vendor::where('id', $id)
        ->where('user_id', Auth::id())
        ->firstOrFail();

    // Validate text fields
    $data = $request->validate([
        'vendor_id' => 'nullable|string',
        'company' => 'nullable|string',
        'vendor_name' => 'nullable|string',
        'contact_person' => 'nullable|string',
        'email' => 'nullable|email',
        'phone' => 'nullable|string',
        'total_orders' => 'nullable|string',
        'country' => 'nullable|string',
        'currency' => 'nullable|string',
        'rating' => 'nullable|string',
        'status' => 'nullable|string',
        'business_registration' => 'nullable|string',
        'business_number' => 'nullable|string',
        'incorporation_details' => 'nullable|string',
        'gst_number' => 'nullable|string',
        'other_tax_details' => 'nullable|string',
        'billing_address' => 'nullable|string',
        'shipping_address' => 'nullable|string',
        'bank_name' => 'nullable|string',
        'account_number' => 'nullable|string',
        'ifsc_code' => 'nullable|string',
        'branch' => 'nullable|string',
        'vendor_type' => 'nullable|string',
        'notes' => 'nullable|string',
        'tags' => 'nullable|string',

        // Single files
        'gst_certificate' => 'nullable|file',
        'pan_copy' => 'nullable|file',
        'agreement' => 'nullable|file',

        // Multiple files
        'attachments' => 'nullable',
        'attachments.*' => 'file',
        'kyc_documents' => 'nullable',
        'kyc_documents.*' => 'file',
    ]);

    // ---------- Single files ----------
    if ($request->hasFile('gst_certificate')) {
        if ($vendor->gst_certificate) Storage::delete($vendor->gst_certificate);
        $data['gst_certificate'] = $request->file('gst_certificate')->store('vendors/gst');
    }

    if ($request->hasFile('pan_copy')) {
        if ($vendor->pan_copy) Storage::delete($vendor->pan_copy);
        $data['pan_copy'] = $request->file('pan_copy')->store('vendors/pan');
    }

    if ($request->hasFile('agreement')) {
        if ($vendor->agreement) Storage::delete($vendor->agreement);
        $data['agreement'] = $request->file('agreement')->store('vendors/agreements');
    }

    // ---------- Multiple files ----------
    if ($request->hasFile('attachments')) {
        $existing = $vendor->attachments ? json_decode($vendor->attachments, true) : [];
        $newFiles = [];
        foreach ($request->file('attachments') as $file) {
            $newFiles[] = $file->store('vendors/attachments');
        }
        $data['attachments'] = json_encode(array_merge($existing, $newFiles));
    }

    if ($request->hasFile('kyc_documents')) {
        $existing = $vendor->kyc_documents ? json_decode($vendor->kyc_documents, true) : [];
        $newFiles = [];
        foreach ($request->file('kyc_documents') as $file) {
            $newFiles[] = $file->store('vendors/kyc');
        }
        $data['kyc_documents'] = json_encode(array_merge($existing, $newFiles));
    }

    $vendor->update($data);

    return response()->json([
        'message' => 'Vendor updated successfully',
        'data' => $vendor
    ]);
}

public function destroy($id)
{
    $vendor = Vendor::where('id', $id)
        ->where('user_id', Auth::id())
        ->firstOrFail();


    if (!$vendor) {
        return response()->json([
            'message' => 'Vendor not found'
        ], 404);
    }

    // Delete files if they exist
    if ($vendor->gst_certificate) Storage::delete($vendor->gst_certificate);
    if ($vendor->pan_copy) Storage::delete($vendor->pan_copy);
    if ($vendor->agreement) Storage::delete($vendor->agreement);

    if ($vendor->attachments) {
        $attachments = json_decode($vendor->attachments, true);
        foreach ($attachments as $file) {
            Storage::delete($file);
        }
    }

    if ($vendor->kyc_documents) {
        $kycDocs = json_decode($vendor->kyc_documents, true);
        foreach ($kycDocs as $file) {
            Storage::delete($file);
        }
    }

    $vendor->delete();

    return response()->json([
        'message' => 'Vendor deleted successfully'
    ]);
}



    public function import(Request $request)
{
    $request->validate([
        'file' => 'required|mimes:csv,txt'
    ]);

    $file = $request->file('file');
    $handle = fopen($file, 'r');

    fgetcsv($handle); // skip header row

    while (($row = fgetcsv($handle)) !== false) {
        Vendor::create([
            'user_id' => Auth::id(),
            'vendor_id' => $row[0],
            'company' => $row[1],
            'contact_person' => $row[2],
            'email' => $row[3],
            'phone' => $row[4],
            'total_orders' => $row[5],
            'rating' => $row[6],
            'status' => $row[7],
            'vendor_name' => $row[8],
        ]);
    }

    fclose($handle);

    return response()->json([
        'message' => 'Vendors imported successfully'
    ]);
}

}
