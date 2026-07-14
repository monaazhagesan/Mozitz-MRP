<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use App\Models\User;

use Illuminate\Database\Eloquent\Model;

class OrderPackage extends Model
{
    use BelongsToOrganization;
    protected $table = 'order_packages';

    protected $fillable = [
        'user_id',
        'order_number',
        'customer_name',
        'package_slip',
        'date',
        'status',
        'carrier',
        'tracking_number',
        'internal_notes',
        'items',
    ];

    protected $casts = [
        'items' => 'array', // Automatically cast JSON <-> array
    ];

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function order()
{
    return $this->belongsTo(Order::class, 'order_id');
}
}