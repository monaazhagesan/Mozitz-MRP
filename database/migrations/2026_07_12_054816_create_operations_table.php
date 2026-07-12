<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operations', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('department', 100);
            $table->string('operation_name', 150);
            $table->string('machine', 150)->nullable();
            $table->decimal('per_hr_cost', 12, 2)->default(0);
            $table->integer('sequence')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'department', 'operation_name'], 'operations_user_dept_name_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operations');
    }
};
