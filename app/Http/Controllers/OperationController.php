<?php

namespace App\Http\Controllers;

use App\Models\BomOperation;
use App\Models\JobOperation;
use App\Models\Operation;
use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OperationController extends Controller
{
    public function index(Request $request)
    {
        $operations = Operation::where('user_id', auth()->id())
            ->orderBy('sequence')
            ->orderBy('created_at')
            ->get();

        return response()->json($operations);
    }

    public function show($id)
    {
        $operation = Operation::where('user_id', auth()->id())->findOrFail($id);

        return response()->json($operation);
    }

    public function store(Request $request)
    {
        try {
            $data = $this->validateData($request);
            $data['id'] = (string) Str::uuid();
            $data['user_id'] = auth()->id();
            $data['sequence'] = (int) (Operation::where('user_id', auth()->id())->max('sequence') ?? 0) + 1;

            $operation = Operation::create($data);

            return response()->json($operation, 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function update(Request $request, $id)
    {
        $operation = Operation::where('user_id', auth()->id())->findOrFail($id);

        try {
            $data = $this->validateData($request, $id);
            $operation->update($data);

            return response()->json($operation);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function destroy($id)
    {
        $operation = Operation::where('user_id', auth()->id())->findOrFail($id);

        // Business rule: a machine name that a Resource has registered as its
        // "parent machine" must keep resolving to a real Operation, otherwise
        // the Resource is left pointing at nothing.
        if (!empty($operation->machine)) {
            $dependentResources = Resource::where('user_id', auth()->id())
                ->where('parent_machine', $operation->machine)
                ->count();

            if ($dependentResources > 0) {
                return response()->json([
                    'message' => "Cannot delete: {$dependentResources} resource(s) reference \"{$operation->machine}\" as their parent machine.",
                ], 409);
            }
        }

        // Business rule: an operation/department already used in a BOM or Job
        // routing cannot be silently removed out from under production.
        $bomUsage = BomOperation::where('user_id', auth()->id())
            ->where('department', $operation->department)
            ->count();

        if ($bomUsage > 0) {
            return response()->json([
                'message' => "Cannot delete: this department is used in {$bomUsage} BOM routing operation(s).",
            ], 409);
        }

        $jobUsage = JobOperation::where('user_id', auth()->id())
            ->where('department', $operation->department)
            ->whereNotIn('status', ['Completed', 'Cancelled'])
            ->count();

        if ($jobUsage > 0) {
            return response()->json([
                'message' => "Cannot delete: this department is used in {$jobUsage} active job operation(s).",
            ], 409);
        }

        $operation->delete();

        return response()->json(['message' => 'Operation deleted successfully']);
    }

    private function validateData(Request $request, $id = null)
    {
        return $request->validate([
            'department' => 'required|string|max:100',
            'operation_name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('operations', 'operation_name')
                    ->ignore($id)
                    ->where('user_id', auth()->id())
                    ->where('department', $request->input('department')),
            ],
            'machine' => 'nullable|string|max:150',
            'per_hr_cost' => 'nullable|numeric|min:0|max:999999.99',
        ]);
    }
}
