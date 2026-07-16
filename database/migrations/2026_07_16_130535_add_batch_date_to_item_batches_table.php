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
        Schema::table('item_batches', function (Blueprint $table) {
            $table->date('batch_date')->nullable()->after('batch_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('item_batches', function (Blueprint $table) {
            $table->dropColumn('batch_date');
        });
    }
};
