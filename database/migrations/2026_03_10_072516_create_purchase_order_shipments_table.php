<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
       Schema::create('purchase_order_shipments', function (Blueprint $table) {

    $table->uuid('id')->primary();

    $table->uuid('po_id');

    $table->integer('line_num');

    $table->string('org')->nullable();
    $table->string('ship_to');

    $table->integer('quantity');

    $table->date('promised_date')->nullable();
    $table->date('need_by')->nullable();
    $table->date('original_promise')->nullable();

    $table->string('uom')->default('Each');

    $table->timestamps();

    $table->foreign('po_id')
          ->references('id')
          ->on('purchase_orders')
          ->onDelete('cascade');
});
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_shipments');
    }
};