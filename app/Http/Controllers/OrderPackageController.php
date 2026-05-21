<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderPackage;
use Illuminate\Support\Facades\Auth;

class OrderPackageController extends Controller
{
     public function __construct()
    {
        $this->middleware('web');
    }

   public function index()
{
    $packages = OrderPackage::with('order')
        ->where('user_id', Auth::id())
        ->latest()
        ->get();

    return response()->json([
        'status' => true,
        'data' => $packages->map(function ($pkg) {
            return [
                'id' => $pkg->id,
                'order_id' => $pkg->order_id,
                'order_number' => $pkg->order_number,
                'customer_name' => $pkg->customer_name,
                'package_slip' => $pkg->package_slip,
                'date' => $pkg->date,
                'status' => $pkg->status,
                'carrier' => $pkg->carrier,
                'tracking_number' => $pkg->tracking_number,

                   'items' => json_decode($pkg->items, true),

                // ✅ FROM ORDER TABLE
                'contact_person' => $pkg->order->contact_person ?? null,
                'contact_number' => $pkg->order->contact_number ?? null,
                'email' => $pkg->order->email ?? null,
                'shipping_address' => $pkg->order->shipping_address ?? null,
            ];
        })
    ]);
}

    // Store package
    public function store(Request $request)
    {
        $request->validate([
            'order_number' => 'required',
            'customer_name' => 'required',
            'date' => 'required|date',
        ]);

         $package = OrderPackage::create([
            'user_id' => Auth::id(),
            'order_id' => $request->order_id,
            'order_number' => $request->order_number,
            'customer_name' => $request->customer_name,
            'package_slip' => $request->package_slip,
            'date' => $request->date,
            'status' => $request->status,
            'internal_notes' => $request->internal_notes,
            'items' => json_encode($request->items),
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Package created successfully',
            'data' => $package
        ]);
    }

    // Show single package
    public function show($id)
    {
        $package = OrderPackage::where('user_id', Auth::id())
            ->find($id);

        if (!$package) {
            return response()->json([
                'status' => false,
                'message' => 'Package not found'
            ]);
        }

        return response()->json($package);
    }

    // Update package
    public function update(Request $request, $id)
    {
        $package = OrderPackage::where('user_id', Auth::id())
            ->find($id);

        if (!$package) {
            return response()->json([
                'status' => false,
                'message' => 'Package not found'
            ]);
        }

         $package->update([
            'order_id' => $request->order_id ?? $package->order_id,
            'order_number' => $request->order_number ?? $package->order_number,
            'customer_name' => $request->customer_name ?? $package->customer_name,
            'package_slip' => $request->package_slip ?? $package->package_slip,
            'date' => $request->date ?? $package->date,

            // IMPORTANT
        'carrier' => $request->carrier ?? $package->carrier,
        'tracking_number' => $request->tracking_number ?? $package->tracking_number,


            'status' => $request->status ?? $package->status,
            'internal_notes' => $request->internal_notes ?? $package->internal_notes,
            'items' => $request->items
                ? json_encode($request->items)
                : $package->items,
        ]);


        return response()->json([
            'status' => true,
            'message' => 'Package updated successfully',
            'data' => $package
        ]);
    }

    // Delete package
    public function destroy($id)
    {
        $package = OrderPackage::where('user_id', Auth::id())
            ->find($id);

        if (!$package) {
            return response()->json([
                'status' => false,
                'message' => 'Package not found'
            ]);
        }

        $package->delete();

        return response()->json([
            'status' => true,
            'message' => 'Package deleted successfully'
        ]);
    }
}