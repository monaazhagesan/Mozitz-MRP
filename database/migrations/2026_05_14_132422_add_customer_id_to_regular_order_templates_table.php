<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('regular_order_templates', function (Blueprint $table) {
            $table->foreignId('customer_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('customers')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('regular_order_templates', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn('customer_id');
        });
    }
};