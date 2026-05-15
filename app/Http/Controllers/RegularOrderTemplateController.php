<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegularOrderTemplate;
use Illuminate\Support\Facades\Auth;

class RegularOrderTemplateController extends Controller
{
    public function __construct()
    {
        // 🔥 IMPORTANT FIX: must be authenticated user
        $this->middleware('web');
    }

      public function index()
    {
        return RegularOrderTemplate::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'template_number' =>
                'required|unique:regular_order_templates,template_number,NULL,id,user_id,' . Auth::id(),
                'customer_id' => 'required|exists:customers,id',
            'customer' => 'required',
            'item_code' => 'required',
            'item_name' => 'required',
            'quantity' => 'required|integer',
            'frequency' => 'required',
            'next_order_date' => 'required|date',
            'price' => 'nullable|numeric',
        ]);

        $template = RegularOrderTemplate::create([
            'user_id' => Auth::id(), // ✅ now will NOT be null
            'template_number' => $request->template_number,
            'customer_id' => $request->customer_id,
            'customer' => $request->customer,
            'item_code' => $request->item_code,
            'item_name' => $request->item_name,
            'quantity' => $request->quantity,
            'frequency' => $request->frequency,
            'next_order_date' => $request->next_order_date,
            'price' => $request->price ?? 0,
            'status' => 'Active',
        ]);

        return response()->json([
            'message' => 'Regular order template created successfully',
            'data' => $template
        ], 201);
    }

    public function destroy($id)
    {
        $template = RegularOrderTemplate::where('id', $id)
            ->where('user_id', Auth::id())
            ->first();

        if (!$template) {
            return response()->json([
                'message' => 'Template not found or not authorized'
            ], 404);
        }

        $template->delete();

        return response()->json([
            'message' => 'Template deleted successfully'
        ]);
    }

    public function update(Request $request, $id)
{
    $template = RegularOrderTemplate::where('id', $id)
        ->where('user_id', Auth::id())
        ->first();

    if (!$template) {
        return response()->json([
            'message' => 'Template not found or not authorized'
        ], 404);
    }

    $request->validate([
        'last_ordered' => 'nullable|date',
        'next_order_date' => 'nullable|date',
        'status' => 'nullable|string',
    ]);

    $template->update([
        'last_ordered' => $request->last_ordered,
        'next_order_date' => $request->next_order_date,
        'status' => $request->status ?? $template->status,
    ]);

    return response()->json([
        'message' => 'Template updated successfully',
        'data' => $template
    ]);
}
}