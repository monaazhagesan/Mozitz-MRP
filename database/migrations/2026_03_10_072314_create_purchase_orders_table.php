<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
      Schema::create('purchase_orders', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->string('po_number');

    $table->string('vendor');
    $table->string('site')->nullable();
    $table->string('contact')->nullable();
    $table->string('operating_unit')->nullable();
    $table->integer('po_rev')->default(0);
    $table->string('type')->default('Standard Purchase Order');

    $table->string('currency')->default('INR');

    $table->string('ship_to');
    $table->string('bill_to');
    $table->date('expected_date')->nullable();

    $table->decimal('subtotal',18,2)->default(0);
    $table->decimal('tax',18,2)->default(0);
    $table->decimal('total',18,2)->default(0);

    $table->string('status')->default('Draft');
    $table->text('description')->nullable();
    $table->string('payment_terms')->nullable();
    $table->text('notes')->nullable();
    $table->integer('line_items_count')->default(0);

    $table->timestamps();
});
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};