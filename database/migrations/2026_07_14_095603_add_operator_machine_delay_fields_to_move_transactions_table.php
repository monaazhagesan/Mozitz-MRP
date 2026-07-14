<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('move_transactions', function (Blueprint $table) {
            $table->string('operator_name')->nullable()->after('reason');
            $table->string('resource_id')->nullable()->after('operator_name');
            $table->integer('duration_minutes')->nullable()->after('resource_id');
        });

        DB::statement("ALTER TABLE move_transactions MODIFY transaction_type ENUM('start','move','reject','scrap','complete','delay')");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE move_transactions MODIFY transaction_type ENUM('start','move','reject','scrap','complete')");

        Schema::table('move_transactions', function (Blueprint $table) {
            $table->dropColumn(['operator_name', 'resource_id', 'duration_minutes']);
        });
    }
};
