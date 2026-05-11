<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CreditNote extends Model
{
    protected $table = 'credit_notes';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'user_id',
        'credit_note_number',
        'customer_id',
        'customer_name',
        'invoice_id',
        'invoice_number',
        'credit_date',
        'reason',
        'status',
        'total_amount',
        'applied_amount',
        'notes',
        'created_at',
        'updated_at'
    ];

    // Relationship with items
    public function items()
    {
        return $this->hasMany(CreditNoteItem::class, 'credit_note_id');
    }

    protected static function boot()
{
    parent::boot();

    static::creating(function ($model) {
        if (empty($model->id)) {
            $model->id = (string) Str::uuid();
        }
    });
}

public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
