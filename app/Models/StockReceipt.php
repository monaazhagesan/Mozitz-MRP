<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'qty_added',
        'receipt_type',
        'receipt_date',
        'po_grn_reference',
    ];

    public function item()
    {
        return $this->belongsTo(InventoryStock::class, 'item_id');
    }
}
