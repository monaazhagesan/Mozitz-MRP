<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('adjustment_number')->unique();
            $table->date('adjustment_date');
            $table->text('reason')->nullable();
            $table->text('additional_info')->nullable();
            $table->enum('status', ['draft', 'completed'])->default('draft');
            $table->decimal('total_value', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustments');
    }
};