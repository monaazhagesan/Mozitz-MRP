<?php

namespace App\Http\Controllers;

use App\Models\BomComponent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class BomComponentController extends Controller
{
    public function index(Request $request)
{
    // If bom_id is provided → filter
    if ($request->has('bom_id')) {
        return response()->json(
            BomComponent::where('bom_id', $request->bom_id)->get()
        );
    }

    // Otherwise return all
    return response()->json(BomComponent::all());
}

   public function Detail(Request $request)
{
    $itemCode = $request->item_code;

    if (!$itemCode) {
        return response()->json([]);
    }

    // 1. Find BOM header
    $bomHeader = \DB::table('bom_headers')
        ->where('item_code', $itemCode)
        ->first();

    if (!$bomHeader) {
        return response()->json([]);
    }

    // 2. Fetch components using BOM UUID
    $components = BomComponent::where('bom_id', $bomHeader->id)->get();

    return response()->json($components);
}

    public function show($id)
    {
        return BomComponent::findOrFail($id);
    }

   public function store(Request $request)
{
    try {
        $data = $request->all();

        Log::info('Parsed payload', $data);

        $validator = Validator::make($data, [
            'bom_id' => 'required|string',
            'component' => 'required|string',
            'description' => 'nullable|string',
            'quantity' => 'required|numeric',
            'uom' => 'nullable|string',
            'basis' => 'nullable|string',
            'type' => 'nullable|string',
            'item_seq' => 'nullable|integer',
            'operation_seq' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $validator->errors(),
            ], 422);
        }

        $valid = $validator->validated();

        // 🔥 SAFE DEFAULTS (THIS FIXES YOUR ERRORS)
        $valid['id'] = Str::uuid()->toString();

        $valid['basis'] = $valid['basis'] ?? 'Standard';
        $valid['status'] = $valid['status'] ?? 'Active';
        $valid['planning_percent'] = $valid['planning_percent'] ?? 100;
        $valid['yield_percent'] = $valid['yield_percent'] ?? 100;
        $valid['include_in_cost_rollup'] = $valid['include_in_cost_rollup'] ?? 0;

        $valid['unit_cost'] = $valid['unit_cost'] ?? 0;
        $valid['total_cost'] = $valid['total_cost'] ?? 0;

        $created = BomComponent::create($valid);

        return response()->json($created, 201);

    } catch (\Exception $e) {
        Log::error('STORE ERROR', [
            'msg' => $e->getMessage(),
        ]);

        return response()->json([
            'error' => 'Server error',
            'message' => $e->getMessage()
        ], 500);
    }
}

    public function deleteByBomId(Request $request)
{
    $request->validate([
        'bom_id' => 'required|string',
    ]);

    $deletedCount = \App\Models\BomComponent::where('bom_id', $request->bom_id)->delete();

    return response()->json([
        'message' => "$deletedCount component(s) deleted successfully."
    ]);
}


public function update(Request $request, $id)
{
    try {
        $component = BomComponent::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'item_seq' => 'nullable|integer',
            'operation_seq' => 'nullable|integer',
            'component' => 'nullable|string',
            'description' => 'nullable|string',
            'quantity' => 'nullable|integer',
            'uom' => 'nullable|string',
            'basis' => 'nullable|string',
            'type' => 'nullable|string',
            'status' => 'nullable|string',
            'planning_percent' => 'nullable|integer',
            'yield_percent' => 'nullable|integer',
            'include_in_cost_rollup' => 'nullable|boolean',
            'unit_cost' => 'nullable|numeric',
            'total_cost' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $validator->errors(),
            ], 422);
        }

        $component->update($validator->validated());

        return response()->json([
            'message' => 'Component updated successfully',
            'data' => $component
        ]);

    } catch (\Exception $e) {
        Log::error('BOMComponent update failed', [
            'id' => $id,
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'error' => 'Internal Server Error',
            'message' => $e->getMessage()
        ], 500);
    }
}

public function destroy($id)
{
    $component = BomComponent::findOrFail($id);
    $component->delete();

    return response()->json([
        'message' => 'Deleted successfully'
    ]);
}
}