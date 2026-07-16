<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_stock', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('item_code');
            $table->uuid('location_id');
            $table->uuid('storage_bin_id')->nullable();
            $table->decimal('quantity_on_hand', 15, 3)->default(0);
            $table->timestamps();

            $table->foreign('location_id')->references('id')->on('locations')->cascadeOnDelete();
            $table->foreign('storage_bin_id')->references('id')->on('storage_bins')->nullOnDelete();

            $table->unique(
                ['organization_id', 'item_code', 'location_id', 'storage_bin_id'],
                'warehouse_stock_unique_allocation'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_stock');
    }
};
