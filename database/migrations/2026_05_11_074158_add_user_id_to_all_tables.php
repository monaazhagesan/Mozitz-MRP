<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [

            // Sales
            'customers',
            'orders',
            'order_packages',
            'invoices',
            'invoice_items',
            'credit_notes',
            'credit_note_items',
            'payments',
            'payment_history',
            'recurring_invoices',

            // Purchase
            'purchase_orders',
            'purchase_order_lines',
            'purchase_order_shipments',
            'purchase_order_taxes',
            'grns',
            'grn_items',
            'po_returns',
            'po_return_items',

            // RFQ / Vendor
            'rfqs',
            'rfq_items',
            'rfq_vendors',
            'vendors',

            // Stock / Inventory
            'stock_adjustments',
            'stock_adjustment_items',
            'stock_transactions',
            'stocktakes',
            'material_issues',
            'material_issue_items',
            'move_transactions',
            'inventory_stock',

            // Jobs
            'jobs',
            'job_allocations',
            'job_components',
            'job_operations',
            'job_lots',
            'job_moves',
            'job_quantities',

        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && !Schema::hasColumn($tableName, 'user_id')) {

                Schema::table($tableName, function (Blueprint $table) {
                    $table->foreignId('user_id')
                        ->nullable()
                        ->after('id')
                        ->constrained()
                        ->onDelete('cascade');
                });

            }
        }
    }

    public function down(): void
    {
        $tables = [
            'customers','orders','order_packages','invoices','invoice_items',
            'credit_notes','credit_note_items','payments','payment_history',
            'recurring_invoices','purchase_orders','purchase_order_lines',
            'purchase_order_shipments','purchase_order_taxes','grns','grn_items',
            'po_returns','po_return_items','rfqs','rfq_items','rfq_vendors',
            'vendors','stock_adjustments','stock_adjustment_items','stock_transactions',
            'stocktakes','material_issues','material_issue_items','move_transactions',
            'inventory_stock','jobs','job_allocations','job_components','job_operations',
            'job_lots','job_moves','job_quantities'
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'user_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropConstrainedForeignId('user_id');
                });
            }
        }
    }
};