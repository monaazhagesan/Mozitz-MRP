<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockAdjustment extends Model
{
    protected $table = 'stock_adjustments';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'adjustment_number',
        'adjustment_date',
        'reason',
        'additional_info',
        'status',
        'total_value'
    ];

    public function items()
    {
        return $this->hasMany(StockAdjustmentItem::class, 'adjustment_id');
    }
}
