<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;


class Location extends Model
{
    use BelongsToOrganization;
    protected $table = 'locations';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $keyType = 'string';

    protected $fillable = [
        'id',
         'user_id',
        'location_name',
        'legal_name',
        'address',
        'sell_enabled',
        'make_enabled',
        'buy_enabled',
    ];

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
