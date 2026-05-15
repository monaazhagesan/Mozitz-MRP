<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'item_type',
        'item_code',
        'item_name',
        'uom',
        'quantity',
        'available_stock',
         'item_location',
        'rate',
        'tax',
        'total_amount',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
