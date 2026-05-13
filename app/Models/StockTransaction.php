<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\User;


class StockTransaction extends Model
{
    protected $table = 'stock_transactions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'item_code',
        'transaction_type',
        'reference_type',
        'reference_number',
        'quantity',
        'unit_cost',
        'transaction_date',
        'notes',
        'additional_info',
    ];

    protected $casts = [
        'quantity'         => 'decimal:6',
        'unit_cost'        => 'decimal:6',
        'transaction_date' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::uuid()->toString();
            }

            if (empty($model->transaction_date)) {
                $model->transaction_date = now();
            }
        });
    }

      public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
}

