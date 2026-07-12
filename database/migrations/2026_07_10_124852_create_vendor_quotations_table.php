<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateVendorQuotationsTable extends Migration
{
    public function up()
    {
        Schema::create('vendor_quotations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rfq_id')->nullable();
            $table->uuid('user_id')->nullable();
            $table->string('vendor_name')->nullable();
            $table->string('item_code')->nullable();
            $table->string('item_name')->nullable();
            $table->decimal('quantity', 15, 3)->nullable();
            $table->decimal('quoted_price', 15, 2)->nullable();
            $table->decimal('tax_percent', 5, 2)->nullable();
            $table->decimal('tax_amount', 15, 2)->nullable();
            $table->decimal('total_amount', 15, 2)->nullable();
            $table->integer('delivery_days')->nullable();
            $table->string('warranty')->nullable();
            $table->text('terms')->nullable();
            $table->string('status')->nullable();
            $table->boolean('is_selected')->default(false);
            $table->text('notes')->nullable();
            $table->timestampTz('received_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('vendor_quotations');
    }
}
