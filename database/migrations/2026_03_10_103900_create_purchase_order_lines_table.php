<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_order_lines', function (Blueprint $table) {

    $table->uuid('id')->primary();

    $table->uuid('po_id');

    $table->integer('line_num');

    $table->string('item_code');
    $table->string('hsn_code')->nullable();
    $table->text('description')->nullable();

    $table->integer('quantity');
    $table->decimal('unit_price',18,2);

    $table->decimal('amount',18,2);
    $table->decimal('total',18,2);

    $table->string('uom')->default('Each');

    $table->timestamps();

    // foreign key
    $table->foreign('po_id')
          ->references('id')
          ->on('purchase_orders')
          ->onDelete('cascade');
});
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_lines');
    }
};