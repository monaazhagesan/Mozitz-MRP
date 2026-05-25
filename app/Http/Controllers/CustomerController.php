<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomerController extends Controller
{
    // List all customers

    public function __construct()
    {
        $this->middleware('web');
    }

    public function index()
{
    return response()->json(
        Customer::where('user_id', Auth::id())->get()
    );
}

    // Show a single customer
    public function show($id)
{
    $customer = Customer::where('id', $id)
        ->where('user_id', Auth::id())
        ->firstOrFail();

    return response()->json($customer);
}

    // Create a new customer
    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_name' => 'required|string',
            'customer_code' => 'nullable|string|unique:customers,customer_code,NULL,id,user_id,' . Auth::id(),
            'customer_type' => 'nullable|string',
            'contact_person' => 'nullable|string',
            'primary_contact' => 'nullable|string',
            'mobile' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'address_line1' => 'nullable|string',
            'address_line2' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'country' => 'nullable|string',
            'currency' => 'nullable|string',

             'shipping_address_line1' => 'nullable|string',
        'shipping_address_line2' => 'nullable|string',
        'shipping_city' => 'nullable|string',
        'shipping_state' => 'nullable|string',
        'shipping_country' => 'nullable|string',
        'shipping_postal_code' => 'nullable|string',

        'same_as_billing' => 'nullable|boolean',

            'gst_number' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'tier' => 'nullable|string',
            'status' => 'nullable|string',
            'company_name' => 'nullable|string',
            'pan_number' => 'nullable|string',
            'cin' => 'nullable|string',
            'industry_type' => 'nullable|string',
            'website' => 'nullable|string',
        ]);

         $data['user_id'] = Auth::id(); // ✅ correct place

        $customer = Customer::create($data);

        return response()->json($customer, 201);
    }

    // Update an existing customer
    public function update(Request $request, $id)
    {
         $customer = Customer::where('id', $id)
        ->where('user_id', Auth::id())
        ->firstOrFail();

        $data = $request->validate([
            'customer_name' => 'required|string',
            'customer_code' => 'nullable|string|unique:customers,customer_code,' . $customer->id . ',id,user_id,' . Auth::id(),
            'customer_type' => 'nullable|string',
            'contact_person' => 'nullable|string',
            'primary_contact' => 'nullable|string',
            'mobile' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'address_line1' => 'nullable|string',
            'address_line2' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'country' => 'nullable|string',

             'shipping_address_line1' => 'nullable|string',
        'shipping_address_line2' => 'nullable|string',
        'shipping_city' => 'nullable|string',
        'shipping_state' => 'nullable|string',
        'shipping_country' => 'nullable|string',
        'shipping_postal_code' => 'nullable|string',

        'same_as_billing' => 'nullable|boolean',

            'currency' => 'nullable|string',
            'gst_number' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'tier' => 'nullable|string',
            'status' => 'nullable|string',
            'company_name' => 'nullable|string',
            'pan_number' => 'nullable|string',
            'cin' => 'nullable|string',
            'industry_type' => 'nullable|string',
            'website' => 'nullable|string',
        ]);

        $customer->update($data);

        return response()->json($customer);
    }

    // Delete a customer
    public function destroy($id)
    {
        $customer = Customer::where('id', $id)
        ->where('user_id', Auth::id())
        ->firstOrFail();

        $customer->delete();

        return response()->json(['message' => 'Customer deleted successfully']);
    }
}
