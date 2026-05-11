<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'vendor_id',
        'company',
        'vendor_name',
        'contact_person',
        'email',
        'phone',
        'total_orders',
        'country',
        'currency',
        'rating',
        'status',
        'business_registration',
        'business_number',
        'incorporation_details',
        'gst_number',
        'other_tax_details',
        'billing_address',
        'shipping_address',
        'bank_name',
        'account_number',
        'ifsc_code',
        'branch',
        'vendor_type',
        'notes',
        'tags',
        'attachments',
        'gst_certificate',
        'pan_copy',
        'agreement',
        'kyc_documents',
    ];

     public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
