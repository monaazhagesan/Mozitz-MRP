<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PurchaseOrderTax extends Model
{
    use BelongsToOrganization;
    protected $table = 'purchase_order_taxes';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'po_id',
        'line_id',
        'tax_type',
        'place_of_supply',
        'cgst',
        'sgst',
        'igst',
        'cess',
        'tax_total'
    ];

   protected static function boot()
{
    parent::boot();

    static::creating(function ($model) {
        if (!$model->id) {
            $model->id = (string) Str::uuid();
        }

        if (!$model->line_num) {
            $maxLine = self::where('po_id', $model->po_id)->max('line_num');
            $model->line_num = $maxLine ? $maxLine + 1 : 1;
        }
    });
}

    public function line()
    {
        return $this->belongsTo(PurchaseOrderLine::class, 'line_id');
    }
}