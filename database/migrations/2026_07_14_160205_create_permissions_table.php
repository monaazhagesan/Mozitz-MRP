<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * The fixed, global permission catalog — the vocabulary is defined by
     * what the app's code actually checks, not something orgs configure.
     * Module-view keys mirror Layout.tsx's nav group names; the rest are the
     * specific actions this step actually enforces (Shop Floor execution,
     * Team/Role/Department management).
     */
    public static function catalog(): array
    {
        return [
            ['key' => 'module.accounting', 'label' => 'View Accounting', 'module' => 'Accounting'],
            ['key' => 'module.procurement', 'label' => 'View Procurement', 'module' => 'Procurement'],
            ['key' => 'module.inventory', 'label' => 'View Inventory', 'module' => 'Inventory'],
            ['key' => 'module.production', 'label' => 'View Production', 'module' => 'Production'],
            ['key' => 'module.analytics', 'label' => 'View Analytics', 'module' => 'Analytics'],
            ['key' => 'module.approvals', 'label' => 'View Approvals', 'module' => 'Approvals'],
            ['key' => 'module.settings', 'label' => 'View Settings', 'module' => 'Settings'],

            ['key' => 'shopfloor.view', 'label' => 'View Shop Floor', 'module' => 'Production'],
            ['key' => 'shopfloor.start', 'label' => 'Start Operation', 'module' => 'Production'],
            ['key' => 'shopfloor.move', 'label' => 'Move Transaction', 'module' => 'Production'],
            ['key' => 'shopfloor.reject', 'label' => 'Reject Quantity', 'module' => 'Production'],
            ['key' => 'shopfloor.scrap', 'label' => 'Scrap Quantity', 'module' => 'Production'],
            ['key' => 'shopfloor.log_delay', 'label' => 'Log Delay', 'module' => 'Production'],

            ['key' => 'settings.manage_team', 'label' => 'Manage Team', 'module' => 'Settings'],
            ['key' => 'settings.manage_roles', 'label' => 'Manage Roles', 'module' => 'Settings'],
            ['key' => 'settings.manage_departments', 'label' => 'Manage Departments', 'module' => 'Settings'],
        ];
    }

    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('key')->unique();
            $table->string('label');
            $table->string('module');
            $table->timestamps();
        });

        $now = now();
        $rows = array_map(function ($p) use ($now) {
            return [
                'id' => (string) Str::uuid(),
                'key' => $p['key'],
                'label' => $p['label'],
                'module' => $p['module'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, self::catalog());

        DB::table('permissions')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
