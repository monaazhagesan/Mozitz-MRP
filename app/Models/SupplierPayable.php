<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupplierPayable extends Model
{
    protected $table = 'supplier_payables';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'vendor',
        'reference_type',
        'reference_number',
        'transaction_date',
        'debit',
        'credit',
        'balance',
        'status',
        'due_date',
        'notes',
        'created_at',
        'grn_number',
        'po_number',
        'accepted_quantity',
        'unit_price',
        'tax_amount',
        'total_amount',
        'paid_amount',
        'invoice_number',
        'invoice_date',
        'approved_by',
        'approved_at',
        'payment_status',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
        'due_date'         => 'datetime',
        'created_at'       => 'datetime',
        'invoice_date'     => 'datetime',
        'approved_at'      => 'datetime',
        'debit'            => 'decimal:6',
        'credit'           => 'decimal:6',
        'balance'          => 'decimal:6',
        'accepted_quantity'=> 'decimal:6',
        'unit_price'       => 'decimal:6',
        'tax_amount'       => 'decimal:6',
        'total_amount'     => 'decimal:6',
        'paid_amount'      => 'decimal:6',
    ];

     protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }
}

