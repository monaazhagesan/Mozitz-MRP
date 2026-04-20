<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str; // ✅ import Str

class GRNItem extends Model
{
    protected $table = 'grn_items';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'grn_id',
        'item_code',
        'description',
        'po_quantity',
        'received_quantity',
        'accepted_quantity',
        'rejected_quantity',
        'balance_quantity',
        'unit_price',
        'total_amount',
        'rejection_reason',
        'created_at'
    ];

    public function grn()
    {
        return $this->belongsTo(GRN::class, 'grn_id');
    }

     protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }
}
