<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class StockTransfer extends Model
{
    use BelongsToOrganization;
    protected $table = 'stock_transfers';

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = true;

    protected $fillable = [
        'id',
        'user_id',
        'transfer_number',
        'transfer_date',
        'from_location_id',
        'to_location_id',
        'status',
        'notes',
        'total_items',
    ];

    protected $casts = [
        'transfer_date' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(StockTransferItem::class, 'transfer_id');
    }

    public function fromLocation()
    {
        return $this->belongsTo(Location::class, 'from_location_id');
    }

    public function toLocation()
    {
        return $this->belongsTo(Location::class, 'to_location_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
