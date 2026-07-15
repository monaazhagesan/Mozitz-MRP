<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class BomComponent extends Model
{
    use BelongsToOrganization;
    protected $table = 'bom_components';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
         'user_id',
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
        'scrap_percent',
        'include_in_cost_rollup',
        'unit_cost',
        'total_cost',
        'production_qty',
    'total_quantity',
        'created_at'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function header()
{
    return $this->belongsTo(BomHeader::class, 'bom_id', 'id');
}
}
