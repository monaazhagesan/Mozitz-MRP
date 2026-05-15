<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RfqVendor extends Model
{
    protected $table = 'rfq_vendors';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'rfq_id',
        'vendor_name',
        'vendor_email',
        'vendor_contact',
        'status',
        'sent_at',
        'responded_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

     public function rfq()
    {
        return $this->belongsTo(Rfq::class, 'rfq_id');
    }
}
