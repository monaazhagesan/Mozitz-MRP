<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStockTransactionsTable extends Migration
{
    public function up()
    {
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('item_code')->nullable();
            $table->string('transaction_type')->nullable();
            $table->string('reference_type')->nullable();
            $table->string('reference_number')->nullable();
            $table->decimal('quantity', 20, 6)->nullable();
            $table->decimal('unit_cost', 20, 6)->nullable();
            $table->timestampTz('transaction_date')->nullable();
            $table->text('notes')->nullable();
            $table->text('additional_info')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('stock_transactions');
    }
}
