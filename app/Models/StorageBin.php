<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class StorageBin extends Model
{
    use BelongsToOrganization;
    protected $table = 'storage_bins';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'location_id',
        'bin_name',
    ];

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }
}

