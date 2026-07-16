<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class ItemBatch extends Model
{
    use BelongsToOrganization;
    protected $table = 'item_batches';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'item_code',
        'batch_number',
        'batch_date',
        'quantity',
        'location_id',
        'expiration_date',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'batch_date' => 'date',
        'expiration_date' => 'date',
    ];

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }
}
