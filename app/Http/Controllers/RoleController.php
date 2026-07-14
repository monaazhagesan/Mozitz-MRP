<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $roles = Role::with('permissions')->withCount('users')->orderBy('name')->get();

        return response()->json($roles);
    }

    public function show($id)
    {
        $role = Role::with('permissions')->findOrFail($id);

        return response()->json($role);
    }

    public function store(Request $request)
    {
        try {
            $data = $this->validateData($request);
            unset($data['permissions']);
            $data['id'] = (string) Str::uuid();
            $data['is_system'] = false;

            $role = Role::create($data);
            $this->syncPermissions($role, $request->input('permissions', []));

            return response()->json($role->load('permissions'), 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        if ($role->is_system) {
            return response()->json([
                'message' => "\"{$role->name}\" is a system role and can't be modified.",
            ], 409);
        }

        try {
            $data = $this->validateData($request, $id);
            unset($data['permissions']);
            $role->update($data);

            if ($request->has('permissions')) {
                $this->syncPermissions($role, $request->input('permissions', []));
            }

            return response()->json($role->load('permissions'));
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        if ($role->is_system) {
            return response()->json([
                'message' => "\"{$role->name}\" is a system role and can't be deleted.",
            ], 409);
        }

        $usersAssigned = $role->users()->count();

        if ($usersAssigned > 0) {
            return response()->json([
                'message' => "Cannot delete: \"{$role->name}\" has {$usersAssigned} team member(s) assigned. Reassign them first.",
            ], 409);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully']);
    }

    private function syncPermissions(Role $role, array $keys): void
    {
        $ids = Permission::whereIn('key', $keys)->pluck('id');
        $role->permissions()->sync($ids);
    }

    private function validateData(Request $request, $id = null)
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('roles', 'name')
                    ->ignore($id)
                    ->where('organization_id', auth()->user()->organization_id),
            ],
            'permissions' => 'sometimes|array',
            'permissions.*' => 'string',
        ]);
    }
}
