<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class JobOperation extends Model
{
    use BelongsToOrganization;
    protected $fillable = [
        'job_id',
        'sequence',
        'operation_code',
        'description',
        'work_center',
        'department',
        'run_time',
        'status',
    ];

    public function job()
    {
        return $this->belongsTo(Job::class);
    }
}