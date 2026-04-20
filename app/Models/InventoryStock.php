<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryStock extends Model
{
    protected $table = 'inventory_stock';

    protected $fillable = [
        'item_code',
        'item_name',
        'description',
        'item_type',
        'quantity_on_hand',
        'allocated_quantity',
        'committed_quantity',
        'unit_cost',
        'selling_price',
        'reorder_point',
        'lead_time_days',
        'safety_stock',
    ];

    protected $casts = [
        'quantity_on_hand' => 'float',
        'allocated_quantity' => 'float',
        'committed_quantity' => 'float',
        'unit_cost' => 'float',
        'selling_price' => 'float',
        'reorder_point' => 'float',
        'lead_time_days' => 'integer',
        'safety_stock' => 'integer',
        'last_transaction_date' => 'datetime',
        'categories' => 'array',
        'variant_attributes' => 'array',
    ];

    public function getAvailableQuantityAttribute()
    {
        return max(0, 
            $this->quantity_on_hand 
            - $this->allocated_quantity 
            - $this->committed_quantity
        );
    }
}