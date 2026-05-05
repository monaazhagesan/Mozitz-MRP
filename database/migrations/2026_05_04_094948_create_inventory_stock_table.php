<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_stock', function (Blueprint $table) {
            $table->id();
            $table->uuid('location_id')->nullable();

            $table->foreign('location_id')
                ->references('id')
                ->on('locations')
                ->onDelete('set null');

            $table->string('item_code')->nullable();
            $table->string('sku')->nullable();
            $table->string('item_name')->nullable();
            $table->string('description')->nullable();
            $table->string('item_type')->nullable();

            $table->decimal('quantity_on_hand', 15, 2)->default(0);
            $table->decimal('allocated_quantity', 15, 2)->default(0);
            $table->decimal('available_quantity', 15, 2)->default(0);
            $table->decimal('unit_cost', 15, 2)->default(0);

            $table->string('location')->nullable();
            $table->decimal('reorder_point', 15, 2)->default(0);
            $table->decimal('reorder_quantity', 15, 2)->default(0);

            $table->decimal('committed_quantity', 15, 2)->default(0);

            $table->decimal('open_po', 15, 2)->default(0);

            $table->string('barcode')->nullable();
            $table->string('item_mode')->nullable();
            $table->string('variant_name')->nullable();
            $table->string('variant_attributes')->nullable();
            $table->string('default_supplier')->nullable();

            $table->boolean('auto_reorder')->default(false);
            $table->string('categories')->nullable();

            $table->boolean('usability_make')->default(false);
            $table->boolean('usability_buy')->default(false);
            $table->boolean('usability_sell')->default(false);

            $table->integer('lead_time_days')->default(0);
            $table->integer('safety_stock')->default(0);

            // ✅ New columns added
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->string('hsn_code')->nullable();
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->boolean('location_tracking')->default(false);
            $table->boolean('auto_generate_serial')->default(false);
            $table->string('serial_number_format')->nullable();
            $table->boolean('grn_required')->default(false);

            $table->timestamp('last_transaction_date')->nullable();
            $table->timestamps(); // created_at & updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_stock');
    }
};
