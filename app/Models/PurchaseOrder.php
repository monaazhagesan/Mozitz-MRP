<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Models\User;


class PurchaseOrder extends Model
{
    use BelongsToOrganization;
    protected $table = 'purchase_orders';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'po_number',
        'vendor',
        'site',
        'contact',
        'operating_unit',   // <-- allow mass assignment
        'po_rev',           // <-- allow mass assignment
        'type',             // <-- allow mass assignment
        'currency',
        'ship_to',
        'bill_to',
        'expected_date',
        'subtotal',
        'tax',
        'total',
        'status',
        'description',
        'payment_terms',
        'notes',
        'line_items_count',
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

    public function lines()
    {
        return $this->hasMany(PurchaseOrderLine::class, 'po_id');
    }

    public function shipments()
    {
        return $this->hasMany(PurchaseOrderShipment::class, 'po_id');
    }

    public function taxes()
    {
        return $this->hasMany(PurchaseOrderTax::class, 'po_id');
    }

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}