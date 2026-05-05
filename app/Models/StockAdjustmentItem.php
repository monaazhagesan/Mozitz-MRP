<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockAdjustmentItem extends Model
{
    protected $table = 'stock_adjustment_items';

    public $timestamps = true;

    protected $fillable = [
        'adjustment_id',
        'item_code',
        'item_name',
        'barcode',
        'in_stock',
        'adjustment_qty',
        'cost_per_unit',
        'adjustment_value'
    ];

    public function adjustment()
    {
        return $this->belongsTo(StockAdjustment::class, 'adjustment_id');
    }
}