<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockTransferItem extends Model
{
    protected $table = 'stock_transfer_items';

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = true;

    protected $fillable = [
        'id',
        'transfer_id',
        'item_code',
        'item_name',
        'quantity',
        'from_storage_bin_id',
        'to_storage_bin_id',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
    ];

    public function transfer()
    {
        return $this->belongsTo(StockTransfer::class, 'transfer_id');
    }
}
