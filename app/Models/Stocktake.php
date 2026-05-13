<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\User;


class Stocktake extends Model
{
    protected $table = 'stocktakes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
         'user_id',
        'location_id',
        'stocktake_no',
        'name',
        'status',
        'location',
        'counted_items',
        'total_items',
        'variance', 
        'variance_value',
        'notes',
        'items',
    ];

    protected $casts = [
        'items' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}