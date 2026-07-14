<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class Operator extends Model
{
    use BelongsToOrganization;
    protected $table = 'operators';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'name',
        'employee_code',
        'department',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
