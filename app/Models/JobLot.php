<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobLot extends Model
{
    protected $fillable = [
        'job_id',
        'lot_number',
        'build_seq',
        'task',
    ];
}
