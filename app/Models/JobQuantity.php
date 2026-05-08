<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobQuantity extends Model
{
    protected $fillable = [
        'job_id',
        'component',
        'uom',
        'basis',
        'per_assembly',
        'inverse_usage',
        'yield',
        'required',
        'issued',
        'open',
        'on_hand',
    ];
}
