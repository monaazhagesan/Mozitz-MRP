<?php

namespace App\Models;

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobComponent extends Model
{
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