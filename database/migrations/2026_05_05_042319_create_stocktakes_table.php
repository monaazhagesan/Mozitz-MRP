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
    Schema::create('stocktakes', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->string('stocktake_no')->unique();
        $table->string('location_id')->nullable();
         $table->foreign('location_id')
            ->references('id')
            ->on('locations')
            ->onDelete('set null');
        $table->string('name');
        $table->string('status')->default('Draft');
        $table->string('location')->nullable();
        $table->integer('counted_items')->default(0);
        $table->integer('total_items')->default(0);
        $table->decimal('variance', 12, 2)->default(0);           
        $table->decimal('variance_value', 12, 2)->default(0);
        $table->text('notes')->nullable();
        $table->json('items')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stocktakes');
    }
};
