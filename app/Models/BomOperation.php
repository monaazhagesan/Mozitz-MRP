<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;

class BomOperation extends Model
{
    use BelongsToOrganization;
    protected $table = 'bom_operations';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'user_id',
        'bom_id',
        'operation_seq',
        'operation_code',
        'operation_type',
        'description',
        'department',
        'work_center',
        'routing_enabled',
        'labor_cost',
        'machine_cost',
        'overhead_cost',
        'cost_per_hour',
        'setup_time',
        'run_time',
        'qc_required',
        'created_at'
    ];
    protected $casts = [
        'routing_enabled' => 'boolean',
        'labor_cost' => 'decimal:2',
        'machine_cost' => 'decimal:2',
        'overhead_cost' => 'decimal:2',
        'cost_per_hour' => 'decimal:2',
        'setup_time' => 'decimal:2',
        'run_time' => 'decimal:2',
        'qc_required' => 'boolean',
    ];

     protected $attributes = [
        'created_at' => null,
    ];

    protected static function booted()
    {
        static::creating(function ($model) {
            if (!$model->created_at) {
                $model->created_at = now();
            }
        });
    }
}
