<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-user exceptions on top of their role's default permissions —
     * `granted = true` explicitly turns a permission on for this one user
     * even if their role doesn't include it; `granted = false` explicitly
     * turns one off even if their role does. No row for a given permission
     * means "inherit whatever the role says." Super Admin (role.is_system)
     * bypasses this table entirely — see User::hasPermission().
     */
    public function up(): void
    {
        Schema::create('user_permission_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('permission_id');
            $table->boolean('granted');
            $table->timestamps();

            $table->foreign('permission_id')->references('id')->on('permissions')->cascadeOnDelete();
            $table->unique(['user_id', 'permission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_permission_overrides');
    }
};
