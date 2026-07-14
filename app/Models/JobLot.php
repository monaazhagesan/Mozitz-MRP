<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobLot extends Model
{
    use BelongsToOrganization;
    protected $fillable = [
        'job_id',
        'lot_number',
        'build_seq',
        'task',
    ];
}
