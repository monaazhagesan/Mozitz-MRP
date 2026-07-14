<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            // Barcode format
            $table->string('barcode_type')->default('code128')->after('daily_reports_enabled');
            $table->unsignedInteger('barcode_width')->default(50)->after('barcode_type');
            $table->unsignedInteger('barcode_height')->default(25)->after('barcode_width');
            $table->string('barcode_label_size')->default('standard')->after('barcode_height');
            $table->boolean('barcode_show_item_code')->default(true)->after('barcode_label_size');
            $table->boolean('barcode_show_item_name')->default(true)->after('barcode_show_item_code');
            $table->boolean('barcode_show_location')->default(false)->after('barcode_show_item_name');

            // Barcode numbering
            $table->string('barcode_prefix')->default('INV')->after('barcode_show_location');
            $table->string('barcode_suffix')->nullable()->after('barcode_prefix');
            $table->unsignedInteger('barcode_starting_number')->default(1001)->after('barcode_suffix');
            $table->unsignedInteger('barcode_number_length')->default(6)->after('barcode_starting_number');

            // Print settings
            $table->string('barcode_printer_type')->default('thermal')->after('barcode_number_length');
            $table->unsignedInteger('barcode_labels_per_row')->default(3)->after('barcode_printer_type');
            $table->string('barcode_page_size')->default('a4')->after('barcode_labels_per_row');
            $table->unsignedInteger('barcode_margin')->default(5)->after('barcode_page_size');
            $table->boolean('barcode_auto_print_on_creation')->default(false)->after('barcode_margin');

            // Scanning settings
            $table->boolean('barcode_camera_scanning_enabled')->default(true)->after('barcode_auto_print_on_creation');
            $table->boolean('barcode_beep_on_scan')->default(true)->after('barcode_camera_scanning_enabled');
            $table->boolean('barcode_vibrate_on_scan')->default(true)->after('barcode_beep_on_scan');
            $table->boolean('barcode_auto_redirect_on_scan')->default(false)->after('barcode_vibrate_on_scan');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'barcode_type',
                'barcode_width',
                'barcode_height',
                'barcode_label_size',
                'barcode_show_item_code',
                'barcode_show_item_name',
                'barcode_show_location',
                'barcode_prefix',
                'barcode_suffix',
                'barcode_starting_number',
                'barcode_number_length',
                'barcode_printer_type',
                'barcode_labels_per_row',
                'barcode_page_size',
                'barcode_margin',
                'barcode_auto_print_on_creation',
                'barcode_camera_scanning_enabled',
                'barcode_beep_on_scan',
                'barcode_vibrate_on_scan',
                'barcode_auto_redirect_on_scan',
            ]);
        });
    }
};
