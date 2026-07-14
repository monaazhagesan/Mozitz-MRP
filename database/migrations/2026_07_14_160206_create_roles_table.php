<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('organization_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            // Protects the seeded Super Admin role from edit/delete; also the
            // fast-path User::hasPermission() uses to grant every permission
            // without needing every row synced to the pivot.
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['organization_id', 'name'], 'roles_org_name_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
