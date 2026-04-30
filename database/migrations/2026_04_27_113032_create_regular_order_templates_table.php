<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('regular_order_templates', function (Blueprint $table) {
            $table->id();
            $table->string('template_number')->unique();
            $table->string('customer');
            $table->string('item_code');
            $table->string('item_name');
            $table->integer('quantity')->default(1);
            $table->string('frequency'); // Weekly, Monthly, etc.
            $table->date('next_order_date');
            $table->date('last_ordered')->nullable();
            $table->string('status')->default('Active');
            $table->decimal('price', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regular_order_templates');
    }
};