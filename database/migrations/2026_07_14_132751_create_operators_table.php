<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operators', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('employee_code', 50);
            $table->string('department', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'name'], 'operators_user_name_unique');
            $table->unique(['user_id', 'employee_code'], 'operators_user_code_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operators');
    }
};
