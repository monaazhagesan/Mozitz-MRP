<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('order_id')
                ->constrained('orders')
                ->onDelete('cascade');

            $table->string('item_code')->nullable();
            $table->string('item_name')->nullable();
            $table->string('item_type')->nullable();
            $table->string('uom')->nullable();

            $table->decimal('quantity', 10, 2)->default(0);
             $table->decimal('available_stock', 10, 2)->default(0);
              $table->string('item_location')->nullable();
            $table->decimal('rate', 10, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
