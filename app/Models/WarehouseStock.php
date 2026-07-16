<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class WarehouseStock extends Model
{
    use BelongsToOrganization;

    protected $table = 'warehouse_stock';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'organization_id',
        'item_code',
        'location_id',
        'storage_bin_id',
        'quantity_on_hand',
    ];

    protected $casts = [
        'quantity_on_hand' => 'decimal:3',
    ];

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function storageBin()
    {
        return $this->belongsTo(StorageBin::class, 'storage_bin_id');
    }
}
