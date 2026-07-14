<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('warehouse_name')->nullable()->after('name');
            $table->string('warehouse_code')->nullable()->after('warehouse_name');
            $table->string('timezone')->default('UTC-5 (Eastern Time)')->after('warehouse_code');
            $table->decimal('low_stock_threshold', 5, 2)->default(20)->after('timezone');
            $table->decimal('critical_stock_threshold', 5, 2)->default(10)->after('low_stock_threshold');
            $table->boolean('low_stock_alerts_enabled')->default(true)->after('critical_stock_threshold');
            $table->boolean('order_updates_enabled')->default(true)->after('low_stock_alerts_enabled');
            $table->boolean('daily_reports_enabled')->default(true)->after('order_updates_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'warehouse_name',
                'warehouse_code',
                'timezone',
                'low_stock_threshold',
                'critical_stock_threshold',
                'low_stock_alerts_enabled',
                'order_updates_enabled',
                'daily_reports_enabled',
            ]);
        });
    }
};
