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
    ];

    protected $casts = [
        'low_stock_threshold' => 'decimal:2',
        'critical_stock_threshold' => 'decimal:2',
        'low_stock_alerts_enabled' => 'boolean',
        'order_updates_enabled' => 'boolean',
        'daily_reports_enabled' => 'boolean',
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
