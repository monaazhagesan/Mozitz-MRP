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
        Schema::create('jobs', function (Blueprint $table) {
    $table->id();

    $table->string('job_number')->unique();
    $table->string('assembly')->nullable(); // PRD-0001
    $table->string('product_name')->nullable();

    $table->string('sales_order_number')->nullable();
    $table->string('class')->default('Standard');
    $table->string('status')->default('Pending');
    $table->string('type')->default('Standard');
    $table->string('uom')->default('Ea');

    $table->boolean('is_firm')->default(false);

    $table->integer('start')->nullable();
    $table->integer('Mrp_net')->default(0);

    $table->dateTime('start_date')->nullable();
    $table->dateTime('completion_date')->nullable();
    $table->string('alternate')->nullable();
    $table->string('revision')->nullable();

    $table->string('priority')->default('Medium');
    $table->text('notes')->nullable(); 
    $table->string('bom_id')->nullable();

     $table->foreign('bom_id')
    ->references('id')
    ->on('bom_headers')
    ->nullOnDelete();

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jobs');
    }
};
