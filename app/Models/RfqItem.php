<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RfqItem extends Model
{
    use BelongsToOrganization;
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'rfq_id',
        'demand_id',
        'item_code',
        'item_name',
        'description',
        'quantity',
        'required_date',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->id = (string) \Illuminate\Support\Str::uuid();
        });
    }

     public function rfq()
    {
        return $this->belongsTo(Rfq::class, 'rfq_id');
    }
}
