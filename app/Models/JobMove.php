<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobMove extends Model
{
    use BelongsToOrganization;
    protected $fillable = [
        'job_id',
        'seq',
        'in_queue',
        'running',
        'to_move',
        'rejected',
        'scrapped',
        'completed',
    ];
}
