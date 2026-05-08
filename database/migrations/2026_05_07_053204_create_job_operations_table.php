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
        Schema::create('job_operations', function (Blueprint $table) {
    $table->id();

    $table->foreignId('job_id')
        ->constrained('jobs')
        ->cascadeOnDelete();

    $table->integer('sequence')->nullable();
    $table->string('operation_code');
    $table->string('description')->nullable();

    $table->string('work_center')->nullable();
    $table->string('department')->nullable();

    $table->decimal('run_time', 10, 2)->nullable();

    $table->string('status')->default('Pending');

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_operations');
    }
};
