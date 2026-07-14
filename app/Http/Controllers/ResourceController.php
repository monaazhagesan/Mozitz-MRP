<?php

namespace App\Http\Controllers;

use App\Models\BomOperation;
use App\Models\JobOperation;
use App\Models\Operation;
use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ResourceController extends Controller
{
    public const MACHINE_TYPES = [
        'CNC Machine',
        'Lathe Machine',
        'Milling Machine',
        'Printing Machine',
        'Laser Cutting Machine',
        'Welding Machine',
        'Assembly Station',
        'Packaging Machine',
        'Other',
    ];

    public function index(Request $request)
    {
        $resources = Resource::orderBy('machine_name')->get();

        return response()->json($resources);
    }

    public function show($id)
    {
        $resource = Resource::findOrFail($id);

        return response()->json($resource);
    }

    public function store(Request $request)
    {
        try {
            $data = $this->validateData($request);
            $data['id'] = (string) Str::uuid();
            $data['user_id'] = auth()->id();

            if (empty($data['machine_code'])) {
                $data['machine_code'] = $this->generateMachineCode();
            }

            $data['is_active'] = $request->has('is_active')
                ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN)
                : true;

            $resource = Resource::create($data);

            return response()->json($resource, 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function update(Request $request, $id)
    {
        $resource = Resource::findOrFail($id);

        try {
            $data = $this->validateData($request, $id);

            if (empty($data['machine_code'])) {
                $data['machine_code'] = $resource->machine_code;
            }

            if ($request->has('is_active')) {
                $data['is_active'] = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
            }

            $resource->update($data);

            return response()->json($resource);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function destroy($id)
    {
        $resource = Resource::findOrFail($id);

        // Business rule: a resource actively used as a BOM/Job work center
        // cannot be removed out from under production planning.
        $bomUsage = BomOperation::where('work_center', $resource->machine_name)
            ->count();

        if ($bomUsage > 0) {
            return response()->json([
                'message' => "Cannot delete: \"{$resource->machine_name}\" is used as a work center in {$bomUsage} BOM routing operation(s).",
            ], 409);
        }

        $jobUsage = JobOperation::where('work_center', $resource->machine_name)
            ->whereNotIn('status', ['Completed', 'Cancelled'])
            ->count();

        if ($jobUsage > 0) {
            return response()->json([
                'message' => "Cannot delete: \"{$resource->machine_name}\" is used as a work center in {$jobUsage} active job operation(s).",
            ], 409);
        }

        $resource->delete();

        return response()->json(['message' => 'Resource deleted successfully']);
    }

    private function generateMachineCode(): string
    {
        $last = Resource::where('machine_code', 'like', 'MCH-%')
            ->orderByRaw('CAST(SUBSTRING(machine_code, 5) AS UNSIGNED) DESC')
            ->first();

        $lastNumber = 0;
        if ($last && preg_match('/-(\d+)$/', $last->machine_code, $m)) {
            $lastNumber = (int) $m[1];
        }

        return 'MCH-' . str_pad((string) ($lastNumber + 1), 3, '0', STR_PAD_LEFT);
    }

    private function validateData(Request $request, $id = null)
    {
        return $request->validate([
            'machine_name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('resources', 'machine_name')
                    ->ignore($id)
                    ->where('organization_id', auth()->user()->organization_id),
            ],
            'machine_code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('resources', 'machine_code')
                    ->ignore($id)
                    ->where('organization_id', auth()->user()->organization_id),
            ],
            'machine_type' => ['nullable', 'string', Rule::in(self::MACHINE_TYPES)],
            'parent_machine' => [
                'nullable',
                'string',
                'max:150',
                function ($attribute, $value, $fail) use ($request) {
                    if (empty($value)) {
                        return;
                    }

                    $exists = Operation::where('machine', $value)
                        ->exists();

                    if (!$exists) {
                        $fail('The selected parent machine must match a machine defined in Operations settings.');
                    }
                },
            ],
            'description' => 'nullable|string|max:500',
        ]);
    }
}
