<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        // Backfill: every existing login becomes the sole member of its own
        // new organization — preserves today's behavior exactly (each user
        // already only ever saw their own data) while giving every user a
        // real organization row that a future teammate can be added to.
        $users = DB::table('users')->whereNull('organization_id')->get(['id', 'company', 'first_name', 'email']);

        foreach ($users as $user) {
            $name = $user->company ?: ($user->first_name ? "{$user->first_name}'s Organization" : "{$user->email}'s Organization");

            $orgId = DB::table('organizations')->insertGetId([
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('users')->where('id', $user->id)->update(['organization_id' => $orgId]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropColumn('organization_id');
        });
    }
};
