<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('po_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('return_number')->unique();
            $table->string('grn_number');
            $table->string('po_number');
            $table->string('vendor');
            $table->date('return_date');
            $table->enum('status', ['Submitted', 'Approved', 'Rejected'])->default('Submitted');
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('subtotal', 18, 2);
            $table->decimal('tax', 18, 2)->nullable();
            $table->decimal('total', 18, 2);
            $table->timestamps(); // created_at and updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('po_returns');
    }
};