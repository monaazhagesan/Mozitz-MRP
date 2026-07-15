<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bom_operations', function (Blueprint $table) {
            $table->boolean('qc_required')->default(false)->after('run_time');
        });
    }

    public function down(): void
    {
        Schema::table('bom_operations', function (Blueprint $table) {
            $table->dropColumn('qc_required');
        });
    }
};
