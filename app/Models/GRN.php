<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GRN extends Model
{
    protected $table = 'grns';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'grn_number',
        'po_number',
        'vendor',
        'receipt_date',
        'qc_status',
        'notes',
        'created_by',
        'created_at',
        'updated_at'
    ];

    public function items()
{
    return $this->hasMany(GRNItem::class, 'grn_id');
}

protected static function boot()
{
    parent::boot();

    static::creating(function ($model) {
        if (empty($model->id)) {
            $model->id = (string) \Illuminate\Support\Str::uuid();
        }
        if (empty($model->grn_number)) {
            $model->grn_number = 'GRN-' . now()->format('YmdHis') . '-' . rand(100, 999);
        }
        if (empty($model->created_at)) $model->created_at = now();
        if (empty($model->updated_at)) $model->updated_at = now();
    });
}
}
