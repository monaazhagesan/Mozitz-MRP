<?php

namespace App\Http\Controllers;

use App\Models\BomOperation;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class BomOperationController extends Controller
{
   public function index(Request $request)
{
    $request->validate([
        'bom_id' => 'required|string',
    ]);

    $bomId = $request->bom_id;

    $operations = BomOperation::where('bom_id', $bomId)->get();

    return response()->json($operations);
}
    public function show($id)
    {
        return BomOperation::findOrFail($id);
    }

   public function store(Request $request)
{
    try {
        $operations = $request->all();
        $inserted = [];

        foreach ($operations as $opData) {
            $validator = Validator::make($opData, [
                'bom_id' => 'required|string',
                'operation_seq' => 'nullable|integer',
                'operation_code' => 'nullable|string',
                'operation_type' => 'nullable|string|in:Setup,Process',
                'description' => 'nullable|string',
                'department' => 'nullable|string',
                'work_center' => 'nullable|string',
                'routing_enabled' => 'boolean',
                'labor_cost' => 'nullable|numeric',
                'machine_cost' => 'nullable|numeric',
                'overhead_cost' => 'nullable|numeric',
                'cost_per_hour' => 'nullable|numeric|min:0',
                'setup_time' => 'nullable|numeric',
                'run_time' => 'nullable|numeric',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validation failed',
                    'details' => $validator->errors(),
                ], 422);
            }

            $validData = $validator->validated();
            $validData['id'] = Str::uuid()->toString();
            $validData['user_id'] = auth()->id();
            $inserted[] = BomOperation::create($validData);
        }

        return response()->json($inserted, 201);

    } catch (\Exception $e) {
        Log::error('BOMOperation bulk store failed', [
            'payload' => $request->all(),
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'error' => 'Internal Server Error',
            'message' => $e->getMessage()
        ], 500);
    }
}

public function deleteByBomId(Request $request)
{
    $request->validate([
        'bom_id' => 'required|string',
    ]);

    $deletedOperations = \App\Models\BomOperation::where('bom_id', $request->bom_id)->delete();
    $deletedComponents = \App\Models\BomComponent::where('bom_id', $request->bom_id)->delete();

    return response()->json([
        'message' => "$deletedOperations operation(s) and $deletedComponents component(s) deleted successfully."
    ]);
}

// Deletes only bom_operations rows for a bom_id (leaves bom_components untouched),
// used when re-saving the routing from the Production Operations step.
public function deleteOperationsByBomId(Request $request)
{
    $request->validate([
        'bom_id' => 'required|string',
    ]);

    $deleted = BomOperation::where('bom_id', $request->bom_id)
        ->delete();

    return response()->json([
        'message' => "$deleted operation(s) deleted successfully."
    ]);
}

public function update(Request $request, $id)
{
    $requestData = $request->all();

    // Convert string booleans/numbers
    $requestData['routing_enabled'] = isset($requestData['routing_enabled']) ? filter_var($requestData['routing_enabled'], FILTER_VALIDATE_BOOLEAN) : null;
    $requestData['labor_cost'] = isset($requestData['labor_cost']) ? (float)$requestData['labor_cost'] : null;
    $requestData['machine_cost'] = isset($requestData['machine_cost']) ? (float)$requestData['machine_cost'] : null;
    $requestData['overhead_cost'] = isset($requestData['overhead_cost']) ? (float)$requestData['overhead_cost'] : null;
    $requestData['cost_per_hour'] = isset($requestData['cost_per_hour']) ? (float)$requestData['cost_per_hour'] : null;
    $requestData['setup_time'] = isset($requestData['setup_time']) ? (float)$requestData['setup_time'] : null;
    $requestData['run_time'] = isset($requestData['run_time']) ? (float)$requestData['run_time'] : null;

    $validator = Validator::make($requestData, [
        'routing_enabled' => 'nullable|boolean',
        'operation_code' => 'nullable|string',
        'operation_type' => 'nullable|string|in:Setup,Process',
        'description' => 'nullable|string',
        'department' => 'nullable|string',
        'work_center' => 'nullable|string',
        'labor_cost' => 'nullable|numeric',
        'machine_cost' => 'nullable|numeric',
        'overhead_cost' => 'nullable|numeric',
        'cost_per_hour' => 'nullable|numeric|min:0',
        'setup_time' => 'nullable|numeric',
        'run_time' => 'nullable|numeric',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'Validation failed',
            'errors' => $validator->errors()
        ], 422);
    }

    $operation = \App\Models\BomOperation::findOrFail($id);
    $operation->update($validator->validated());

    return response()->json([
        'message' => 'Operation updated successfully',
        'operation' => $operation
    ]);
}
}
