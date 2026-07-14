<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaterialIssueItem extends Model
{
    use BelongsToOrganization;
    use HasFactory;

    protected $fillable = [
        'material_issue_id',
        'item_code',
        'item_name',
        'uom',
        'issued_qty',
        'available_stock',
    ];

    public function issue()
    {
        return $this->belongsTo(MaterialIssue::class, 'material_issue_id');
    }
}