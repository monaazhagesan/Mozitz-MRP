<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Customer extends Model
{
    use BelongsToOrganization;
    protected $table = 'customers';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = true;

   protected $fillable = [
        'user_id',
        'customer_name',
        'customer_code',
        'customer_type',
        'contact_person',
        'primary_contact',
        'mobile',
        'email',
        'phone',
        'billing_address',
        'shipping_address',
        'address_line1',
        'address_line2',
        'city',
        'state',
        'postal_code',
        'country',
        'currency',
        'gst_number',
        'tax_id',
        'tier',
        'status',
        'company_name',
        'pan_number',
        'cin',
        'industry_type',
        'website',

        'shipping_address_line1',
        'shipping_address_line2',
        'shipping_city',
        'shipping_state',
        'shipping_country',
        'shipping_postal_code',
        'same_as_billing',
    ];

      public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Relationship: Customer has many credit notes
    public function creditNotes()
    {
        return $this->hasMany(CreditNote::class, 'customer_id');
    }

    public function regularOrderTemplates()
{
    return $this->hasMany(RegularOrderTemplate::class, 'customer_id');
}
}
