<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Adds the permission General Settings needs, and grants it to every
     * role that already holds the other settings.manage_* permissions
     * (Admin/Super Admin per the default seed) — same pattern as adding any
     * new permission key to the catalog after roles already exist.
     */
    public function up(): void
    {
        $now = now();
        $permissionId = (string) Str::uuid();

        DB::table('permissions')->insert([
            'id' => $permissionId,
            'key' => 'settings.manage_general',
            'label' => 'Manage General Settings',
            'module' => 'Settings',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $roleIdsWithSettingsAccess = DB::table('permission_role')
            ->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')
            ->where('permissions.key', 'settings.manage_team')
            ->pluck('permission_role.role_id');

        $pivotRows = $roleIdsWithSettingsAccess->map(fn ($roleId) => [
            'role_id' => $roleId,
            'permission_id' => $permissionId,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        if (!empty($pivotRows)) {
            DB::table('permission_role')->insert($pivotRows);
        }
    }

    public function down(): void
    {
        $permission = DB::table('permissions')->where('key', 'settings.manage_general')->first();
        if ($permission) {
            DB::table('permission_role')->where('permission_id', $permission->id)->delete();
            DB::table('permissions')->where('id', $permission->id)->delete();
        }
    }
};
