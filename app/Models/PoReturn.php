<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Models\User;

class PoReturn extends Model
{
    use BelongsToOrganization;
    use HasFactory, HasUuids;

    protected $table = 'po_returns';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'return_number',
        'grn_number',
        'po_number',
        'vendor',
        'return_date',
        'status',
        'reason',
        'notes',
        'subtotal',
        'tax',
        'total',
    ];

    // Relationship to return items
    public function items()
    {
        return $this->hasMany(PoReturnItem::class, 'return_id');
    }

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
}