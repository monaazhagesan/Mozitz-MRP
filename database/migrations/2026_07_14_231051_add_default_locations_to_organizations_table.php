<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            // Match locations.id's exact column type ($table->uuid('id')) —
            // a plain string() column is VARCHAR(255) vs uuid()'s CHAR(36),
            // and MySQL foreign keys require the referencing/referenced
            // column types to match.
            $table->uuid('default_sales_location_id')->nullable()->after('daily_reports_enabled');
            $table->uuid('default_manufacturing_location_id')->nullable()->after('default_sales_location_id');
            $table->uuid('default_purchases_location_id')->nullable()->after('default_manufacturing_location_id');

            $table->foreign('default_sales_location_id')->references('id')->on('locations')->nullOnDelete();
            $table->foreign('default_manufacturing_location_id')->references('id')->on('locations')->nullOnDelete();
            $table->foreign('default_purchases_location_id')->references('id')->on('locations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropForeign(['default_sales_location_id']);
            $table->dropForeign(['default_manufacturing_location_id']);
            $table->dropForeign(['default_purchases_location_id']);
            $table->dropColumn([
                'default_sales_location_id',
                'default_manufacturing_location_id',
                'default_purchases_location_id',
            ]);
        });
    }
};
