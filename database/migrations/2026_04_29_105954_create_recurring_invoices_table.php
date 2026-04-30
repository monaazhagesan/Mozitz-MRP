<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('recurring_invoices', function (Blueprint $table) {
            $table->id();

            $table->uuid('invoice_id');

            $table->string('customer_name')->nullable();
            $table->string('customer_email')->nullable();
            $table->string('customer_gstin')->nullable();
            $table->text('customer_address')->nullable();

            $table->json('items');

            $table->string('tax_type')->nullable();
            $table->json('tax_config')->nullable();

            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);

            $table->string('frequency'); // daily, weekly, monthly, yearly
            $table->date('start_date');
            $table->string('end_type')->nullable(); // occurrences | date
            $table->integer('occurrences')->nullable();
            $table->date('end_date')->nullable();

            $table->date('next_invoice_date');

            $table->string('status')->default('active');

            $table->text('notes')->nullable();

            $table->boolean('send_reminders')->default(false);
            $table->integer('reminder_days_before')->nullable();
            $table->boolean('reminder_on_due_date')->default(false);
            $table->integer('reminder_days_after')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_invoices');
    }
};