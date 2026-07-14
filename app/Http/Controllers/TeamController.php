<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TeamController extends Controller
{
    private const OVERRIDE_RELATIONS = ['role.permissions', 'departments', 'permissionOverrides.permission'];

    public function index(Request $request)
    {
        $users = User::with(self::OVERRIDE_RELATIONS)
            ->where('organization_id', auth()->user()->organization_id)
            ->orderBy('first_name')
            ->get();

        return response()->json($users);
    }

    public function show($id)
    {
        $user = User::with(self::OVERRIDE_RELATIONS)
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
                'granted_permissions' => 'sometimes|array',
                'granted_permissions.*' => 'string',
                'revoked_permissions' => 'sometimes|array',
                'revoked_permissions.*' => 'string',
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

            if (!empty($data['granted_permissions']) || !empty($data['revoked_permissions'])) {
                $this->applyPermissionOverrides($user, $data['granted_permissions'] ?? [], $data['revoked_permissions'] ?? []);
            }

            return response()->json($user->load(self::OVERRIDE_RELATIONS), 201);
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

            return response()->json($user->load(self::OVERRIDE_RELATIONS));
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors(),
            ], 422);
        }
    }

    /**
     * Replaces this user's permission overrides wholesale — the "Customize
     * permissions" action, separate from the main edit form. Sending a key
     * in neither list clears any existing override for it (reverts to the
     * role's default).
     */
    public function updatePermissions(Request $request, $id)
    {
        $user = User::where('organization_id', auth()->user()->organization_id)->findOrFail($id);

        $data = $request->validate([
            'granted_permissions' => 'sometimes|array',
            'granted_permissions.*' => 'string',
            'revoked_permissions' => 'sometimes|array',
            'revoked_permissions.*' => 'string',
        ]);

        $this->applyPermissionOverrides($user, $data['granted_permissions'] ?? [], $data['revoked_permissions'] ?? [], true);

        return response()->json($user->load(self::OVERRIDE_RELATIONS));
    }

    private function applyPermissionOverrides(User $user, array $grantedKeys, array $revokedKeys, bool $replaceAll = false): void
    {
        if ($replaceAll) {
            $user->permissionOverrides()->delete();
        }

        $permissionIdsByKey = Permission::whereIn('key', array_merge($grantedKeys, $revokedKeys))->pluck('id', 'key');

        $rows = [];
        foreach ($grantedKeys as $key) {
            if (isset($permissionIdsByKey[$key])) {
                $rows[] = ['user_id' => $user->id, 'permission_id' => $permissionIdsByKey[$key], 'granted' => true];
            }
        }
        foreach ($revokedKeys as $key) {
            if (isset($permissionIdsByKey[$key])) {
                $rows[] = ['user_id' => $user->id, 'permission_id' => $permissionIdsByKey[$key], 'granted' => false];
            }
        }

        foreach ($rows as $row) {
            \App\Models\UserPermissionOverride::updateOrCreate(
                ['user_id' => $row['user_id'], 'permission_id' => $row['permission_id']],
                ['granted' => $row['granted']]
            );
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
