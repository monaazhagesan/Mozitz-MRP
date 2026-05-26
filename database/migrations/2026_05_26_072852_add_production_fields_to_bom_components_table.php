<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bom_components', function (Blueprint $table) {
            $table->integer('production_qty')->nullable()->after('quantity');
            $table->integer('total_quantity')->nullable()->after('production_qty');
        });
    }

    public function down(): void
    {
        Schema::table('bom_components', function (Blueprint $table) {
            $table->dropColumn('production_qty');
            $table->dropColumn('total_quantity');
        });
    }
};