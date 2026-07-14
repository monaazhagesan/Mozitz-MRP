<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class RegularOrderTemplate extends Model
{
    use BelongsToOrganization;
    protected $fillable = [
        'user_id',
        'customer_id',
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

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}