<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Job extends Model
{
    protected $fillable = [
        'user_id',
        'job_number',
        'assembly',
        'product_name',
        'sales_order_number',
        'class',
        'status',
        'type',
        'uom',
        'is_firm',
        'start',
        'revision',
        'alternate',
        'mrp_net',
        'start_date',
        'completion_date',
        'priority',
        'notes',
        'bom_id',
    ];

    public function operations()
    {
        return $this->hasMany(JobOperation::class);
    }

     public function components()
    {
        return $this->hasMany(JobComponent::class);
    }

    public function quantities()
    {
        return $this->hasMany(JobQuantity::class);
    }

    public function moves()
    {
        return $this->hasMany(JobMove::class);
    }

    public function lots()
    {
        return $this->hasMany(JobLot::class);
    }

    public function moveTransactions()
    {
        return $this->hasMany(MoveTransaction::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id'); 
    }
} 
