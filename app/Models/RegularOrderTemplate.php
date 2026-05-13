<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class RegularOrderTemplate extends Model
{
    protected $fillable = [
        'user_id',
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

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}