<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bom_headers', function (Blueprint $table) {
            $table->string('bom_number')->nullable()->after('id');
            $table->date('effective_date')->nullable()->after('revision');
            $table->text('remarks')->nullable()->after('effective_date');
        });
    }

    public function down(): void
    {
        Schema::table('bom_headers', function (Blueprint $table) {
            $table->dropColumn(['bom_number', 'effective_date', 'remarks']);
        });
    }
};
