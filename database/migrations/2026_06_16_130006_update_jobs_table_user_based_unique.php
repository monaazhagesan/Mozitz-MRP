<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jobs', function (Blueprint $table) {

            // SAFE: drop by column (NOT index name)
          //  $table->dropUnique(['job_number']);

            // new unique constraint (user-based)
            $table->unique(['job_number', 'user_id'], 'jobs_job_number_user_unique');
        });
    }

    public function down(): void
    {
        Schema::table('jobs', function (Blueprint $table) {

            // remove composite unique
            $table->dropUnique('jobs_job_number_user_unique');

            // restore old unique
            $table->unique('job_number', 'jobs_job_number_unique');
        });
    }
};