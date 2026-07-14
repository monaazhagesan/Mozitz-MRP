<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;

class PoReturnItem extends Model
{
    use BelongsToOrganization;
    protected $table = 'po_return_items';
    
    public $incrementing = false;
    public $keyType = 'string';

    public $timestamps = false;  // since table has only created_at

    protected $fillable = [
        'id',
        'return_id',
        'grn_item_id',
        'item_code',
        'description',
        'return_quantity',
        'max_returnable_quantity',
        'unit_price',
        'tax_percent',
        'tax_amount',
        'total_amount',
        'created_at',
    ];
    public function poReturn()
    {
        return $this->belongsTo(PoReturn::class, 'return_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}
