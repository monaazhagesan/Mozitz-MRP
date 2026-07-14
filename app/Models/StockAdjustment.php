<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;


class StockAdjustment extends Model
{
    use BelongsToOrganization;
    protected $table = 'stock_adjustments';

    public $incrementing = false;
    protected $keyType = 'string';

    public $timestamps = true;

    protected $fillable = [
        'id',
        'user_id',
        'adjustment_number',
        'adjustment_date',
        'reason',
        'additional_info',
        'status',
        'total_value'
    ];

    protected $casts = [
        'adjustment_date' => 'datetime:Y-m-d\TH:i',
        'total_value' => 'decimal:2'
    ];

    public function items()
    {
        return $this->hasMany(StockAdjustmentItem::class, 'adjustment_id');
    }

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}