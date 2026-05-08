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
       Schema::create('job_components', function (Blueprint $table) {
    $table->id();

    $table->foreignId('job_id')
        ->constrained('jobs')
        ->cascadeOnDelete();

    $table->integer('seq')->default(10);
    $table->string('component');
    $table->string('description')->nullable();

    $table->decimal('qty', 12, 2)->default(0);
    $table->string('uom')->default('pcs');

    $table->string('status')->default('Available');

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_components');
    }
};
