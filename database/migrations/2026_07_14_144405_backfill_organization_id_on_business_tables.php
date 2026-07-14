<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'customers', 'orders', 'order_packages', 'invoices', 'invoice_items',
        'credit_notes', 'credit_note_items', 'payments', 'payment_history',
        'recurring_invoices',
        'purchase_orders', 'purchase_order_lines', 'purchase_order_shipments',
        'purchase_order_taxes', 'grns', 'grn_items', 'po_returns', 'po_return_items',
        'rfqs', 'rfq_items', 'rfq_vendors', 'vendors',
        'stock_adjustments', 'stock_adjustment_items', 'stock_transactions',
        'stocktakes', 'material_issues', 'material_issue_items',
        'move_transactions', 'inventory_stock',
        'jobs', 'job_allocations', 'job_components', 'job_operations',
        'job_lots', 'job_moves', 'job_quantities',
        'bom_components', 'bom_headers', 'bom_operations', 'categories',
        'company_details', 'locations', 'regular_order_templates',
        'storage_bins', 'supplier_payables',
        'resources', 'operations', 'operators',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName) || !Schema::hasColumn($tableName, 'organization_id')) {
                continue;
            }

            DB::statement("
                UPDATE `{$tableName}` t
                JOIN `users` u ON u.id = t.user_id
                SET t.organization_id = u.organization_id
                WHERE t.organization_id IS NULL AND u.organization_id IS NOT NULL
            ");
        }
    }

    public function down(): void
    {
        // Backfill is not reversible in a meaningful way (the source
        // organization_id values would be lost); the down() of the
        // preceding "add organization_id" migration already drops the
        // column entirely, which covers rollback.
    }
};
