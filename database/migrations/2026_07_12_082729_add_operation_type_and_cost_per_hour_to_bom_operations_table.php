<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bom_operations', function (Blueprint $table) {
            $table->string('operation_type', 20)->default('Process')->after('operation_code');
            $table->decimal('cost_per_hour', 12, 2)->default(0)->after('overhead_cost');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bom_operations', function (Blueprint $table) {
            $table->dropColumn(['operation_type', 'cost_per_hour']);
        });
    }
};
