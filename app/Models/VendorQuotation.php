<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class VendorQuotation extends Model
{
    protected $table = 'vendor_quotations';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'rfq_id',
        'user_id',
        'vendor_name',
        'item_code',
        'item_name',
        'quantity',
        'quoted_price',
        'tax_percent',
        'tax_amount',
        'total_amount',
        'delivery_days',
        'warranty',
        'terms',
        'status',
        'is_selected',
        'notes',
        'received_at',
    ];

    protected $casts = [
        'is_selected' => 'boolean',
        'received_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function rfq()
    {
        return $this->belongsTo(Rfq::class, 'rfq_id');
    }
}
