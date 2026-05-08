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
       Schema::create('move_transactions', function (Blueprint $table) {
    $table->id();

    // Job reference
    $table->foreignId('job_id')
        ->constrained('jobs')
        ->cascadeOnDelete();
    
    // Operation / sequence
    $table->integer('seq')->index();
    $table->string('operation_name')->nullable();

    // Transaction type
    $table->enum('transaction_type', ['start', 'move', 'reject', 'scrap', 'complete']);

    // Quantities
    $table->integer('quantity')->default(0);

    // Status flow tracking
    $table->string('from_status')->nullable();
    $table->string('to_status')->nullable();

    // Reason (for reject/scrap)
    $table->text('reason')->nullable();

    // Audit fields
    $table->string('user')->nullable();
    $table->timestamp('transaction_time')->useCurrent();

    $table->timestamps();

});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('move_transactions');
    }
};
