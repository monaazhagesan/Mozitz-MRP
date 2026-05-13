<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class MoveTransaction extends Model
{
    use HasFactory;

    protected $table = 'move_transactions';

    protected $fillable = [
         'user_id',
        'job_id',
        'seq',
        'operation_name',
        'transaction_type',
        'quantity',
        'from_status',
        'to_status',
        'reason',
        'user',
        'transaction_time',
    ];

    protected $casts = [
        'transaction_time' => 'datetime',
    ];

    // Relationship: each transaction belongs to a job
    public function job()
    {
        return $this->belongsTo(Job::class);
    }

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}