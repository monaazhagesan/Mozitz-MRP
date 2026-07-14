<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InvoiceItem extends Model
{
    use BelongsToOrganization;
    use HasUuids;

    protected $fillable = [
        'invoice_id',
        'item',           // item name/description
        'hsn',
        'material',
        'description',
        'quantity',
        'rate',
        'sgst_percent',
        'sgst_amount',
        'cgst_percent',
        'cgst_amount',
        'igst_percent',
        'igst_amount',
        'vat_percent',
        'vat_amount',
        'sales_tax_percent',
        'sales_tax_amount',
        'tds_amount',
        'total',
    ];

     protected $casts = [
        'quantity' => 'decimal:2',
        'rate' => 'decimal:2',
        'sgst_percent' => 'decimal:2',
        'sgst_amount' => 'decimal:2',
        'cgst_percent' => 'decimal:2',
        'cgst_amount' => 'decimal:2',
        'igst_percent' => 'decimal:2',
        'igst_amount' => 'decimal:2',
        'vat_percent' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'sales_tax_percent' => 'decimal:2',
        'sales_tax_amount' => 'decimal:2',
        'tds_amount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Automatically calculate taxes and total
     */
   public function calculateTotals()
    {
        $amount = $this->quantity * $this->rate;

        $this->sgst_amount = ($amount * $this->sgst_percent) / 100;
        $this->cgst_amount = ($amount * $this->cgst_percent) / 100;
        $this->igst_amount = ($amount * $this->igst_percent) / 100;
        $this->vat_amount = ($amount * $this->vat_percent) / 100;
        $this->sales_tax_amount = ($amount * $this->sales_tax_percent) / 100;

        $this->total = $amount
            + $this->sgst_amount
            + $this->cgst_amount
            + $this->igst_amount
            + $this->vat_amount
            + $this->sales_tax_amount;
    }
}
