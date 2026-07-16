<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('transfer_id');
            $table->string('item_code');
            $table->string('item_name')->nullable();
            $table->decimal('quantity', 15, 3);
            $table->uuid('from_storage_bin_id')->nullable();
            $table->uuid('to_storage_bin_id')->nullable();
            $table->timestamps();

            $table->foreign('transfer_id')->references('id')->on('stock_transfers')->cascadeOnDelete();
            $table->foreign('from_storage_bin_id')->references('id')->on('storage_bins')->nullOnDelete();
            $table->foreign('to_storage_bin_id')->references('id')->on('storage_bins')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_items');
    }
};
