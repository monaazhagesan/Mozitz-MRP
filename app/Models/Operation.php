<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class Operation extends Model
{
    use BelongsToOrganization;
    protected $table = 'operations';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'department',
        'operation_name',
        'machine',
        'per_hr_cost',
        'sequence',
    ];

    protected $casts = [
        'per_hr_cost' => 'decimal:2',
        'sequence' => 'integer',
    ];
}
