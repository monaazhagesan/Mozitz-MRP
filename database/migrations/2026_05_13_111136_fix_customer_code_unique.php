<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {

            // remove old unique
            $table->dropUnique('customers_customer_code_unique');

            // add new composite unique
            $table->unique(['user_id', 'customer_code']);
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {

            $table->dropUnique(['user_id', 'customer_code']);

            $table->unique('customer_code');
        });
    }
};
