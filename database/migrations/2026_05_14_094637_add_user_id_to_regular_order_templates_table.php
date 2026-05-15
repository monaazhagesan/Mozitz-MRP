<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('regular_order_templates', function (Blueprint $table) {

            $table->dropUnique(['template_number']);

            // ✅ unique per user
            $table->unique(['user_id', 'template_number']);
        });
    }

    public function down(): void
    {
        Schema::table('regular_order_templates', function (Blueprint $table) {

            // remove composite unique
            $table->dropUnique(['user_id', 'template_number']);

            // restore old unique
            $table->unique('template_number');

            
        });
    }
};