<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $departments = Department::orderBy('name')->get();

        return response()->json($departments);
    }

    public function show($id)
    {
        $department = Department::findOrFail($id);

        return response()->json($department);
    }

    public function store(Request $request)
    {
        try {
            $data = $this->validateData($request);
            $data['id'] = (string) Str::uuid();

            $data['is_active'] = $request->has('is_active')
                ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN)
                : true;

            $department = Department::create($data);

            return response()->json($department, 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function update(Request $request, $id)
    {
        $department = Department::findOrFail($id);

        try {
            $data = $this->validateData($request, $id);

            if ($request->has('is_active')) {
                $data['is_active'] = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
            }

            $department->update($data);

            return response()->json($department);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function destroy($id)
    {
        $department = Department::findOrFail($id);

        $usersAssigned = $department->users()->count();

        if ($usersAssigned > 0) {
            return response()->json([
                'message' => "Cannot delete: \"{$department->name}\" has {$usersAssigned} team member(s) assigned. Reassign them first.",
            ], 409);
        }

        $department->delete();

        return response()->json(['message' => 'Department deleted successfully']);
    }

    private function validateData(Request $request, $id = null)
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('departments', 'name')
                    ->ignore($id)
                    ->where('organization_id', auth()->user()->organization_id),
            ],
        ]);
    }
}
