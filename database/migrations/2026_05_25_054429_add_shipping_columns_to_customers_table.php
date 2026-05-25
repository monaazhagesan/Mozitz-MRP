<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {

            // Shipping Address Fields
            $table->string('shipping_address_line1')->nullable()->after('address_line2');

            $table->string('shipping_address_line2')->nullable()->after('shipping_address_line1');

            $table->string('shipping_city')->nullable()->after('city');

            $table->string('shipping_state')->nullable()->after('shipping_city');

            $table->string('shipping_country')->nullable()->after('country');

            $table->string('shipping_postal_code')->nullable()->after('shipping_country');

            $table->boolean('same_as_billing')->default(false);

        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {

            $table->dropColumn([
                'shipping_address_line1',
                'shipping_address_line2',
                'shipping_city',
                'shipping_state',
                'shipping_country',
                'shipping_postal_code',
                'same_as_billing'
            ]);

        });
    }
};