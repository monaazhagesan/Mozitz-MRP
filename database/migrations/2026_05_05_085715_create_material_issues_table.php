<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('material_issues', function (Blueprint $table) {
            $table->id();
            $table->string('issue_no')->unique();
            $table->date('issue_date');
            $table->string('issue_type'); // job / order
            $table->string('reference_no')->nullable();
            $table->string('reference_name')->nullable();

            $table->string('issued_by')->nullable();
            $table->string('warehouse')->nullable();
            $table->text('remarks')->nullable();

            $table->string('status')->default('Issued');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_issues');
    }
};