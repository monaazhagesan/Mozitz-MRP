<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegularOrderTemplate extends Model
{
    protected $fillable = [
        'template_number',
        'customer',
        'item_code',
        'item_name',
        'quantity',
        'frequency',
        'next_order_date',
        'last_ordered',
        'status',
        'price',
    ];
}