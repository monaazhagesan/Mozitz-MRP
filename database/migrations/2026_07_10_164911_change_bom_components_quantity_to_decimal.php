<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE bom_components MODIFY quantity DECIMAL(15,3) NOT NULL');
        DB::statement('ALTER TABLE bom_components MODIFY production_qty DECIMAL(15,3) NULL');
        DB::statement('ALTER TABLE bom_components MODIFY total_quantity DECIMAL(15,3) NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE bom_components MODIFY quantity INT(11) NOT NULL');
        DB::statement('ALTER TABLE bom_components MODIFY production_qty INT(11) NULL');
        DB::statement('ALTER TABLE bom_components MODIFY total_quantity INT(11) NULL');
    }
};
