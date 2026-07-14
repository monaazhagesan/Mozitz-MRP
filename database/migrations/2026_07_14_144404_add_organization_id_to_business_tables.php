<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Every table that currently carries a `user_id` scoping column (per
     * database/migrations/2026_05_11_074158_add_user_id_to_all_tables.php
     * and 2026_05_11_122821_add_user_id_to_selected_tables.php), plus
     * `resources`/`operations`/`operators`, which were created later with
     * `user_id` baked in from the start rather than via those retrofits.
     */
    private array $tables = [
        // Sales
        'customers', 'orders', 'order_packages', 'invoices', 'invoice_items',
        'credit_notes', 'credit_note_items', 'payments', 'payment_history',
        'recurring_invoices',

        // Purchase
        'purchase_orders', 'purchase_order_lines', 'purchase_order_shipments',
        'purchase_order_taxes', 'grns', 'grn_items', 'po_returns', 'po_return_items',

        // RFQ / Vendor
        'rfqs', 'rfq_items', 'rfq_vendors', 'vendors',

        // Stock / Inventory
        'stock_adjustments', 'stock_adjustment_items', 'stock_transactions',
        'stocktakes', 'material_issues', 'material_issue_items',
        'move_transactions', 'inventory_stock',

        // Jobs
        'jobs', 'job_allocations', 'job_components', 'job_operations',
        'job_lots', 'job_moves', 'job_quantities',

        // BOM / masters (from the 2nd retrofit migration)
        'bom_components', 'bom_headers', 'bom_operations', 'categories',
        'company_details', 'locations', 'regular_order_templates',
        'storage_bins', 'supplier_payables',

        // Production masters created later with user_id baked in directly
        'resources', 'operations', 'operators',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName) && !Schema::hasColumn($tableName, 'organization_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->foreignId('organization_id')
                        ->nullable()
                        ->after('id')
                        ->constrained()
                        ->cascadeOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'organization_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropConstrainedForeignId('organization_id');
                });
            }
        }
    }
};
