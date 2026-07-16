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
        Schema::create('item_batches', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('item_code');
            $table->string('batch_number');
            $table->decimal('quantity', 15, 3);
            $table->uuid('location_id')->nullable();
            $table->date('expiration_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('location_id')->references('id')->on('locations')->nullOnDelete();
            $table->index('item_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_batches');
    }
};
