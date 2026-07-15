<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;


class BomHeader extends Model
{
    use BelongsToOrganization;
    protected $table = 'bom_headers';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'user_id',
        'bom_number',
        'item_type',
        'item_code',
        'item_name',
        'vendor',
        'alternate',
        'revision',
        'uom',
        'implemented_only',
        'status',
        'effective_date',
        'remarks',
        'created_at',
        'updated_at',
        'created_by',
        'revision_reason',
        'parent_bom_id',
        'revision_number',
        'document',
    ];
    protected $casts = [
    'implemented_only' => 'boolean',
];

    protected static function booted()
    {
        static::creating(function ($model) {
            if (!$model->created_at) {
                $model->created_at = now();
            }
            if (!$model->updated_at) {
                $model->updated_at = now();
            }
        });

        static::updating(function ($model) {
            $model->updated_at = now();
        });
    }

     public function components()
    {
        return $this->hasMany(BomComponent::class, 'bom_id', 'id');
    }

    public function operations()
    {
        return $this->hasMany(BomOperation::class, 'bom_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
