<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class JobComponent extends Model
{
    use BelongsToOrganization;
    protected $fillable = [
        'job_id',
        'seq',
        'component',
        'description',
        'qty',
        'uom',
        'status',
    ];

    public function job()
    {
        return $this->belongsTo(Job::class);
    }
}