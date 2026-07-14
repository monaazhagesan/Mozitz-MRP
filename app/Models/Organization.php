<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    protected $fillable = [
        'name',
        'warehouse_name',
        'warehouse_code',
        'timezone',
        'low_stock_threshold',
        'critical_stock_threshold',
        'low_stock_alerts_enabled',
        'order_updates_enabled',
        'daily_reports_enabled',
        'default_sales_location_id',
        'default_manufacturing_location_id',
        'default_purchases_location_id',
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
    ];

    protected $casts = [
        'low_stock_threshold' => 'decimal:2',
        'critical_stock_threshold' => 'decimal:2',
        'low_stock_alerts_enabled' => 'boolean',
        'order_updates_enabled' => 'boolean',
        'daily_reports_enabled' => 'boolean',
        'barcode_width' => 'integer',
        'barcode_height' => 'integer',
        'barcode_show_item_code' => 'boolean',
        'barcode_show_item_name' => 'boolean',
        'barcode_show_location' => 'boolean',
        'barcode_starting_number' => 'integer',
        'barcode_number_length' => 'integer',
        'barcode_labels_per_row' => 'integer',
        'barcode_margin' => 'integer',
        'barcode_auto_print_on_creation' => 'boolean',
        'barcode_camera_scanning_enabled' => 'boolean',
        'barcode_beep_on_scan' => 'boolean',
        'barcode_vibrate_on_scan' => 'boolean',
        'barcode_auto_redirect_on_scan' => 'boolean',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function defaultSalesLocation()
    {
        return $this->belongsTo(Location::class, 'default_sales_location_id');
    }

    public function defaultManufacturingLocation()
    {
        return $this->belongsTo(Location::class, 'default_manufacturing_location_id');
    }

    public function defaultPurchasesLocation()
    {
        return $this->belongsTo(Location::class, 'default_purchases_location_id');
    }
}
