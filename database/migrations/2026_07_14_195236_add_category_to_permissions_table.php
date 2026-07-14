<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Classifies the existing permission catalog into the same three-bucket
     * shape as this app's nav/action model naturally already has:
     * "visibility" (module.* — what a role can see), "workflow" (shopfloor.*
     * — actions a role can take), "admin" (settings.manage_* — system
     * administration). This isn't a new taxonomy grafted on top; it's
     * naming a distinction the catalog already had.
     */
    public function up(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->string('category', 20)->default('visibility')->after('module');
        });

        DB::table('permissions')->where('key', 'like', 'module.%')->update(['category' => 'visibility']);
        DB::table('permissions')->where('key', 'like', 'shopfloor.%')
            ->where('key', '!=', 'shopfloor.view')
            ->update(['category' => 'workflow']);
        DB::table('permissions')->where('key', 'shopfloor.view')->update(['category' => 'visibility']);
        DB::table('permissions')->where('key', 'like', 'settings.manage_%')->update(['category' => 'admin']);
    }

    public function down(): void
    {
        Schema::table('permissions', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
