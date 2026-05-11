<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LedgerEntry extends Model
{
    protected $table = 'ledger_entries';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'category',
        'company_name',
        'document_type',
        'document_date',
        'document_number',
        'debit',
        'credit',
    ];

          public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    
}
