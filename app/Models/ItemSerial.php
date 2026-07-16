<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class ItemSerial extends Model
{
    use BelongsToOrganization;
    protected $table = 'item_serials';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'item_code',
        'serial_number',
        'location_id',
        'notes',
    ];

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }
}
