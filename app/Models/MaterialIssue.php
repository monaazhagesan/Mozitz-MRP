<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class MaterialIssue extends Model
{
    use BelongsToOrganization;
    use HasFactory;

    protected $fillable = [
        'user_id',
        'issue_no',
        'issue_date',
        'issue_type',
        'reference_no',
        'reference_name',
        'issued_by',
        'warehouse',
        'remarks',
        'status',
    ];

    public function items()
    {
        return $this->hasMany(MaterialIssueItem::class);
    }

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
}