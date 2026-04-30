<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_no')->nullable();
             $table->string('customer_id')->nullable();
            $table->string('customer');
            $table->string('contact_person')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('email')->nullable();
            $table->text('billing_address')->nullable();
            $table->text('shipping_address')->nullable();
            
            $table->string('location')->nullable();
            $table->foreignId('order_id')->nullable()->constrained('orders')->onDelete('cascade');
            $table->string('order_type')->nullable();
            $table->string('order_date')->nullable();
            $table->string('expected_delivery_date')->nullable();
            $table->string('reference_no')->nullable();
            $table->string('priority')->default('Normal');
            $table->text('remarks')->nullable();

            $table->string('item_type')->nullable();
            $table->string('item_code')->nullable();
            $table->string('item_name')->nullable();
            $table->string('uom')->nullable();
            $table->string('available_stock')->nullable();
            $table->integer('quantity')->default(0);
            $table->string('item_location')->nullable();
            $table->decimal('rate', 12, 2)->default(0);
            $table->decimal('tax', 5, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->string('dispatch_mode')->nullable();
            $table->string('transporter_name')->nullable();
            $table->string('vehicle_no')->nullable();
            $table->date('expected_dispatch_date')->nullable();
            $table->string('delivery_status')->default('Awaiting');
            $table->string('warehouse_location')->nullable();
            
            $table->string('payment_type')->default('Credit');
            $table->string('payment_terms')->nullable();
            $table->decimal('advance_amount', 12, 2)->default(0);
           
            $table->boolean('invoice_required')->default(true);
            $table->string('status')->default('Awaiting Confirmation');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};