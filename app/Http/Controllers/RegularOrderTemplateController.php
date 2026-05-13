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

    public function store(Request $request)
    {
        $request->validate([
            'template_number' => 'required|unique:regular_order_templates,template_number',
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
}