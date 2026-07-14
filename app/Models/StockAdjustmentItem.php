<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class StockAdjustmentItem extends Model
{
    use BelongsToOrganization;
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