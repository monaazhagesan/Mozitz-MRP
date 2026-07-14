<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TeamController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with(['role.permissions', 'departments'])
            ->where('organization_id', auth()->user()->organization_id)
            ->orderBy('first_name')
            ->get();

        return response()->json($users);
    }

    public function show($id)
    {
        $user = User::with(['role.permissions', 'departments'])
            ->where('organization_id', auth()->user()->organization_id)
            ->findOrFail($id);

        return response()->json($user);
    }

    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'name' => 'required|string|max:255',
                'email' => ['required', 'email', Rule::unique('users', 'email')],
                'mobile' => 'nullable|string|max:20',
                'password' => 'required|string|min:6',
                'role_id' => ['nullable', Rule::exists('roles', 'id')->where('organization_id', auth()->user()->organization_id)],
                'department_ids' => 'sometimes|array',
                'department_ids.*' => ['string', Rule::exists('departments', 'id')->where('organization_id', auth()->user()->organization_id)],
            ]);

            $user = User::create([
                'first_name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['mobile'] ?? null,
                'password' => Hash::make($data['password']),
                'role_id' => $data['role_id'] ?? null,
                // User doesn't use BelongsToOrganization (login must look up
                // any user by email before a session/org context exists),
                // so this has to be stamped explicitly here.
                'organization_id' => auth()->user()->organization_id,
            ]);

            if (!empty($data['department_ids'])) {
                $user->departments()->sync($data['department_ids']);
            }

            return response()->json($user->load(['role.permissions', 'departments']), 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function update(Request $request, $id)
    {
        $user = User::where('organization_id', auth()->user()->organization_id)->findOrFail($id);

        try {
            $data = $request->validate([
                'name' => 'sometimes|string|max:255',
                'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
                'mobile' => 'nullable|string|max:20',
                'password' => 'nullable|string|min:6',
                'role_id' => ['nullable', Rule::exists('roles', 'id')->where('organization_id', auth()->user()->organization_id)],
                'department_ids' => 'sometimes|array',
                'department_ids.*' => ['string', Rule::exists('departments', 'id')->where('organization_id', auth()->user()->organization_id)],
                'is_active' => 'sometimes|boolean',
            ]);

            // Guard: don't let the org's last Super Admin be reassigned away
            // from that role, or deactivated — would lock the organization
            // out of admin access with no one left who can undo it.
            if (array_key_exists('role_id', $data) && $user->isSuperAdmin() && $data['role_id'] !== $user->role_id) {
                $this->assertNotLastSuperAdmin($user);
            }
            if (array_key_exists('is_active', $data) && !$data['is_active'] && $user->isSuperAdmin()) {
                $this->assertNotLastSuperAdmin($user);
            }

            $updates = [];
            if (isset($data['name'])) $updates['first_name'] = $data['name'];
            if (isset($data['email'])) $updates['email'] = $data['email'];
            if (array_key_exists('mobile', $data)) $updates['phone'] = $data['mobile'];
            if (!empty($data['password'])) $updates['password'] = Hash::make($data['password']);
            if (array_key_exists('role_id', $data)) $updates['role_id'] = $data['role_id'];
            if (array_key_exists('is_active', $data)) $updates['is_active'] = $data['is_active'];

            $user->update($updates);

            if (array_key_exists('department_ids', $data)) {
                $user->departments()->sync($data['department_ids']);
            }

            return response()->json($user->load(['role.permissions', 'departments']));
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    public function destroy($id)
    {
        $user = User::where('organization_id', auth()->user()->organization_id)->findOrFail($id);

        if ($user->isSuperAdmin()) {
            $this->assertNotLastSuperAdmin($user);
        }

        $user->is_active = false;
        $user->save();

        return response()->json(['message' => 'Team member deactivated successfully']);
    }

    private function assertNotLastSuperAdmin(User $user): void
    {
        $superAdminCount = User::where('organization_id', $user->organization_id)
            ->whereHas('role', fn ($q) => $q->where('is_system', true))
            ->where('id', '!=', $user->id)
            ->count();

        if ($superAdminCount === 0) {
            abort(response()->json([
                'message' => 'Cannot remove the organization\'s last Super Admin.',
            ], 409));
        }
    }
}
