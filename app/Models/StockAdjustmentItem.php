<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockAdjustmentItem extends Model
{
    protected $table = 'stock_adjustment_items';

    public $timestamps = false;

    protected $fillable = [
        'adjustment_id',
        'item_code',
        'adjustment_qty',
        'cost_per_unit'
    ];

    public function adjustment()
    {
        return $this->belongsTo(StockAdjustment::class, 'adjustment_id');
    }
}
