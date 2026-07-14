<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class JobAllocation extends Model
{
    use BelongsToOrganization;
    protected $table = 'job_allocations';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'job_number',
        'item_code',
        'allocated_quantity',
        'allocation_date',
        'status',
        'created_at',
        'updated_at',
    ];
}
