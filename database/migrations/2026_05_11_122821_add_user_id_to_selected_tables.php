<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'bom_components',
            'bom_headers',
            'bom_operations',
            'categories',
            'company_details',
            'locations',
            'regular_order_templates',
            'storage_bins',
            'supplier_payables',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreignId('user_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('users')
                    ->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'bom_components',
            'bom_headers',
            'bom_operations',
            'categories',
            'company_details',
            'locations',
            'regular_order_templates',
            'storage_bins',
            'supplier_payables',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropConstrainedForeignId('user_id');
            });
        }
    }
};