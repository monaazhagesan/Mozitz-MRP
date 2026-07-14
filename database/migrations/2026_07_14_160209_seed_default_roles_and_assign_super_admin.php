<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * name => permission keys. Mirrors the default role set described in
     * the Teams module plan — every organization gets these 6 roles so the
     * Role Management UI and Teams UI both have something sensible to show
     * on day one, and every already-existing login becomes its own
     * organization's Super Admin (continuing today's unrestricted access,
     * same non-regression principle as the Step 1 tenancy backfill).
     */
    public static function roleDefinitions(): array
    {
        $allModules = ['module.accounting', 'module.procurement', 'module.inventory', 'module.production', 'module.analytics', 'module.approvals', 'module.settings'];
        $allShopfloor = ['shopfloor.view', 'shopfloor.start', 'shopfloor.move', 'shopfloor.reject', 'shopfloor.scrap', 'shopfloor.log_delay'];
        $allSettings = ['settings.manage_team', 'settings.manage_roles', 'settings.manage_departments'];

        return [
            'Super Admin' => ['is_system' => true, 'permissions' => array_merge($allModules, $allShopfloor, $allSettings)],
            'Admin' => ['is_system' => false, 'permissions' => array_merge($allModules, $allShopfloor, $allSettings)],
            'Production Planner' => ['is_system' => false, 'permissions' => ['module.production', 'module.inventory', 'module.accounting']],
            'Department Supervisor' => ['is_system' => false, 'permissions' => array_merge(['module.production'], $allShopfloor)],
            'Operator' => ['is_system' => false, 'permissions' => array_merge(['module.production'], $allShopfloor)],
            'Production Manager' => ['is_system' => false, 'permissions' => array_merge(['module.production', 'module.analytics', 'module.approvals'], $allShopfloor)],
        ];
    }

    public function up(): void
    {
        $permissionIdsByKey = DB::table('permissions')->pluck('id', 'key');
        $now = now();

        $organizationIds = DB::table('organizations')->pluck('id');

        foreach ($organizationIds as $organizationId) {
            $roleIdsByName = [];

            foreach (self::roleDefinitions() as $name => $def) {
                $roleId = (string) Str::uuid();
                DB::table('roles')->insert([
                    'id' => $roleId,
                    'organization_id' => $organizationId,
                    'name' => $name,
                    'is_system' => $def['is_system'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $roleIdsByName[$name] = $roleId;

                $pivotRows = [];
                foreach ($def['permissions'] as $key) {
                    if (!isset($permissionIdsByKey[$key])) {
                        continue;
                    }
                    $pivotRows[] = [
                        'role_id' => $roleId,
                        'permission_id' => $permissionIdsByKey[$key],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
                if (!empty($pivotRows)) {
                    DB::table('permission_role')->insert($pivotRows);
                }
            }

            // Every existing login in this organization becomes Super Admin.
            DB::table('users')
                ->where('organization_id', $organizationId)
                ->update(['role_id' => $roleIdsByName['Super Admin']]);
        }
    }

    public function down(): void
    {
        DB::table('users')->update(['role_id' => null]);
        DB::table('permission_role')->truncate();
        DB::table('roles')->truncate();
    }
};
