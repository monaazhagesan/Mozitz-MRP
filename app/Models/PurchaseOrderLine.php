<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PurchaseOrderLine extends Model
{
    protected $table = 'purchase_order_lines';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'po_id',
        'line_num',
        'item_code',
         'hsn_code', 
        'description',
        'quantity',
        'unit_price',
        'amount',
        'total',
        'uom'
    ];

   protected static function boot()
{
    parent::boot();

    static::creating(function ($model) {
        if (!$model->id) {
            $model->id = (string) Str::uuid();
        }

        // auto-increment line_num per purchase order
        if (!$model->line_num) {
            $maxLine = self::where('po_id', $model->po_id)->max('line_num');
            $model->line_num = $maxLine ? $maxLine + 1 : 1;
        }
    });
}

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id');
    }

//    public function taxes()
 //   {
//        return $this->hasMany(PurchaseOrderTax::class, 'line_id');
 //   }
    public function taxes()
{
    return $this->hasMany(PurchaseOrderTax::class, 'po_id', 'po_id');
}
}