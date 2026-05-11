<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Invoice extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'invoice_number',
        'invoice_date',
        'due_date',
        'customer_id',
        'customer_name',
        'customer_gstin',
        'customer_address',
        'customer_phone',
        'company_name',
        'company_gstin',
        'company_address',
        'company_phone',
        'contact_phone',
        'contact_email',
        'company_pan',
        'terms',
        'signatory',
        'reference_number',
        'subtotal',
        'tax_amount',
        'total_amount',
        'amount_paid',
        'status',
        'type',
        'notes',

        'account_name',
    'bank_name',
    'account_number',
    'ifsc_code',
    'branch_name',
    'account_type',
     'use_digital_signature',

      // Tax / GST Fields
        'tax_type',
        'place_of_supply',
        'gst_type',
        'cess_percentage',

        // Recurring / Frequency
        'frequency',
        'start_date',
        'end_after',
        'end_date',

        // Reminder Fields
        'before_due_days',
        'overdue_reminder_days',

                // =========================
        // NEW MISSING FIELDS (ADDED)
        // =========================

        'currency',
        'exchange_rate',

        'order_reference',

        'customer_email',
        'contact_person',

        'billing_address',
        'delivery_address',

        'delivery_date',
        'dispatch_type',

        'shipping_charge',
        'other_charges',

        'remarks',
        
    ];

       protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'cess_percentage' => 'decimal:2',
        'end_after' => 'integer',
        'before_due_days' => 'integer',
        'overdue_reminder_days' => 'integer',
        'use_digital_signature' => 'boolean',
                'delivery_date' => 'date',

        'exchange_rate' => 'decimal:4',

        'shipping_charges' => 'decimal:2',
        'other_charges' => 'decimal:2',
    ];

    // Relationships
    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    // Auto Status Update
   public function updateStatus()
{
    if ($this->status === 'Draft') {
        return; // ❗ do not override
    }

    $amountDue = $this->total_amount - $this->amount_paid;

    if ($amountDue <= 0) {
        $this->status = 'Paid';
    } elseif (now()->gt($this->due_date)) {
        $this->status = 'Overdue';
    } elseif ($this->amount_paid > 0) {
        $this->status = 'Pending';
    } else {
        $this->status = 'Sent';
    }

    $this->save();
}
    
     public function isProforma(): bool
    {
        return $this->type === 'proforma';
    }

    public function isInvoice(): bool
    {
        return $this->type === 'invoice';
    }

    public function isRecurring(): bool
    {
        return $this->type === 'recurring';
    }

    public function invoice()
{
    return $this->belongsTo(Invoice::class, 'invoice_id', 'id');
}

public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    } 
}
