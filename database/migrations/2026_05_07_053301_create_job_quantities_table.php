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
        Schema::create('job_quantities', function (Blueprint $table) {
    $table->id();

    $table->foreignId('job_id')->constrained()->cascadeOnDelete();

    $table->string('component');
    $table->string('uom')->default('pcs');

    $table->string('basis')->default('Standard');

    $table->decimal('per_assembly', 12, 2)->default(0);
    $table->decimal('inverse_usage', 12, 4)->default(0);
    $table->decimal('yield', 12, 2)->default(100);

    $table->decimal('required', 12, 2)->default(0);
    $table->decimal('issued', 12, 2)->default(0);
    $table->decimal('open', 12, 2)->default(0);
    $table->decimal('on_hand', 12, 2)->default(0);

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_quantities');
    }
};
