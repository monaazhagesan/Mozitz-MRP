<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {

            // 💰 CURRENCY & EXCHANGE
            $table->string('currency')->default('INR');
            $table->decimal('exchange_rate', 10, 4)->default(1);

            // 📦 ORDER INFO
            $table->string('order_reference')->nullable();
            $table->date('delivery_date')->nullable();
            $table->string('dispatch_type')->nullable();
            $table->text('remarks')->nullable();

            // 👤 CUSTOMER EXTRA
            $table->string('customer_email')->nullable();
            $table->string('contact_person')->nullable();
            $table->text('billing_address')->nullable();
            $table->text('delivery_address')->nullable();

            // 🚚 SHIPPING & CHARGES
            $table->decimal('shipping_charge', 10, 2)->default(0);
            $table->decimal('other_charges', 10, 2)->default(0);

            // 🧾 DISCOUNT
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('discount_percent', 5, 2)->default(0);

        }); // ✅ correct closure
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'currency',
                'exchange_rate',
                'order_reference',
                'delivery_date',
                'dispatch_type',
                'remarks',
                'customer_email',
                'contact_person',
                'billing_address',
                'delivery_address',
                'shipping_charge',
                'other_charges',
                'discount_amount',
                'discount_percent',
            ]);
        });
    }
};