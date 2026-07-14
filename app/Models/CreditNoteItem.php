<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CreditNoteItem extends Model
{
    use BelongsToOrganization;
    protected $table = 'credit_note_items';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'credit_note_id',
        'item_code',
        'item_name',
        'quantity',
        'unit_price',
        'total',
        'created_at'
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
    
}
