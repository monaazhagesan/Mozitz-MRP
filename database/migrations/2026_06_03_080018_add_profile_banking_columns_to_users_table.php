<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {

            // Contact + Tax details
            $table->string('phone')->nullable()->after('currency');
            $table->string('gstin')->nullable()->after('phone');
            $table->string('pan')->nullable()->after('gstin');
            $table->text('address')->nullable()->after('pan');

            $table->string('bank_account_name')->nullable()->after('address');
            $table->string('bank_account_number')->nullable()->after('bank_account_name');
            $table->string('ifsc')->nullable()->after('bank_account_number');
            $table->string('account_type')->nullable()->after('ifsc');
            $table->string('bank_name')->nullable()->after('account_type');
            $table->string('branch')->nullable()->after('bank_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {

            $table->dropColumn([
                'phone',
                'gstin',
                'pan',
                'address',
                'bank_account_name',
                'bank_account_number',
                'ifsc',
                'account_type',
                'bank_name',
                'branch',
            ]);
        });
    }
};
