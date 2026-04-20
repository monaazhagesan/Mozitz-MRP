<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
       Schema::create('purchase_order_taxes', function (Blueprint $table) {

    $table->uuid('id')->primary();

    $table->uuid('po_id');

    $table->integer('line_num');

    $table->string('tax_type')->default('None');
    $table->string('place_of_supply')->nullable(); 

    $table->decimal('cgst',10,2)->default(0);
    $table->decimal('sgst',10,2)->default(0);
    $table->decimal('igst',10,2)->default(0);
    $table->decimal('cess',10,2)->default(0);

    $table->decimal('tax_total',18,2)->default(0);

    $table->timestamps();

    $table->foreign('po_id')
          ->references('id')
          ->on('purchase_orders')
          ->onDelete('cascade');
});
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_taxes');
    }
};