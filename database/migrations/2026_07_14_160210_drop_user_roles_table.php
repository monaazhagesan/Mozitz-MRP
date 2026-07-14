<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * user_roles was a disconnected, broken prototype: uuid user_id against
     * users.id (bigint) with no FK, no organization scoping, and a
     * controller whose store()/removeRole() called a roles() relationship
     * that never existed on either model. Replaced entirely by the new
     * roles/permissions/permission_role schema and users.role_id.
     */
    public function up(): void
    {
        Schema::dropIfExists('user_roles');
    }

    public function down(): void
    {
        Schema::create('user_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('role')->nullable();
            $table->timestamps();
        });
    }
};
