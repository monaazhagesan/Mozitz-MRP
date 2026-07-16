<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('transfer_number')->unique();
            $table->dateTime('transfer_date');
            // Null from_location_id means the source is the "Unallocated"
            // pool (stock not yet assigned to any warehouse), not a real
            // location row — mirrors WarehouseStockController::unallocated().
            $table->uuid('from_location_id')->nullable();
            $table->uuid('to_location_id');
            $table->enum('status', ['draft', 'completed'])->default('draft');
            $table->text('notes')->nullable();
            $table->unsignedInteger('total_items')->default(0);
            $table->timestamps();

            $table->foreign('from_location_id')->references('id')->on('locations')->nullOnDelete();
            $table->foreign('to_location_id')->references('id')->on('locations')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfers');
    }
};
