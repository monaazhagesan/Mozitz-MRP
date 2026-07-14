<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecurringInvoice extends Model
{
    use BelongsToOrganization;
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'customer_name',
        'customer_email',
        'customer_gstin',
        'customer_address',
        'items',
        'tax_type',
        'tax_config',
        'subtotal',
        'tax_amount',
        'total_amount',
        'frequency',
        'start_date',
        'end_type',
        'occurrences',
        'end_date',
        'next_invoice_date',
        'status',
        'notes',
        'send_reminders',
        'reminder_days_before',
        'reminder_on_due_date',
        'reminder_days_after',
    ];

    protected $casts = [
        'items' => 'array',
        'tax_config' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'next_invoice_date' => 'date',
        'send_reminders' => 'boolean',
        'reminder_on_due_date' => 'boolean',
    ];
}