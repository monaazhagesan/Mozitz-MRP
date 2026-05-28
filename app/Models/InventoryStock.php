<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class InventoryStock extends Model
{
    protected $table = 'inventory_stock';

    protected $fillable = [
         'user_id',
        'location_id',
        'item_code',
        'item_name',
        'description',
        'item_type',
        'quantity_on_hand',
        'allocated_quantity',
        'committed_quantity',
        'available_quantity',
        'unit_cost',
        'selling_price',
        'reorder_point',
        'lead_time_days',
        'safety_stock',
        'open_po',
        'uom',
'qty_to_add',

'receipt_type',
'receipt_date',
'po_grn_reference',
        'last_transaction_date',
        'barcode',
        'location',
    ];

    protected $casts = [
        'quantity_on_hand' => 'float',
        'allocated_quantity' => 'float',
        'committed_quantity' => 'float',
        'unit_cost' => 'float',
        'selling_price' => 'float',
        'reorder_point' => 'float',
        'lead_time_days' => 'integer',
        'safety_stock' => 'integer',
        'last_transaction_date' => 'datetime',
        'categories' => 'array',
        'variant_attributes' => 'array',
        'qty_to_add' => 'integer',
'receipt_date' => 'date',
    ];

    public function location()
{
    return $this->belongsTo(Location::class, 'location_id');
}

 public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function receipts()
{
    return $this->hasMany(StockReceipt::class, 'item_id');
}

public function boms()
{
    return $this->hasMany(BomHeader::class, 'item_code', 'item_code');
}

public function stock_transactions()
{
    return $this->hasMany(StockTransaction::class, 'item_code', 'item_code');
}
}