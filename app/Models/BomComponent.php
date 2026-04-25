<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BomComponent extends Model
{
    protected $table = 'bom_components';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'bom_id',
        'item_seq',
        'operation_seq',
        'component',
        'description',
        'quantity',
        'uom',
        'basis',
        'type',
        'status',
        'planning_percent',
        'yield_percent',
        'include_in_cost_rollup',
        'unit_cost',
        'total_cost',
        'created_at'
    ];
}
