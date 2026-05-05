<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('material_issue_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('material_issue_id')
                ->constrained()
                ->onDelete('cascade');

            $table->string('item_code');
            $table->string('item_name')->nullable();
            $table->string('uom')->nullable();

            $table->decimal('issued_qty', 10, 2)->default(0);
            $table->decimal('available_stock', 10, 2)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_issue_items');
    }
};