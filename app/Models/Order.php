<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    // ✅ Add all columns from the table here
    protected $fillable = [
        'order_no',
        'customer',
        'contact_person',
        'contact_number',
        'email',
        'billing_address',
        'shipping_address',
        'order_type',
        'priority',
        'remarks',
        'dispatch_mode',
        'transporter_name',
        'vehicle_no',
        'order_date',
        'expected_delivery_date',
        'delivery_status',
        'warehouse_location',
        'location',
        'payment_type',
        'payment_terms',
        'advance_amount',
       
        'invoice_required',
        'status',
        // ✅ Add item-related columns since your table stores items in orders
        'item_type',
        'item_code',
        'item_name',
        'uom',
        'available_stock',
        'quantity',
        'item_location',
        'rate',
        'tax',
        'total_amount',
        'expected_dispatch_date', // date field
        'reference_no',
        'order_id', // nullable self-referencing FK
    ];

  
    // Auto-generate order_no if not provided
    protected static function booted()
{
    static::creating(function ($order) {

        // Generate SO number BEFORE insert
        if (!$order->order_no) {

            $year = date('Y');

            // Get last order of same year
            $lastOrder = self::whereYear('created_at', $year)
                ->orderBy('id', 'desc')
                ->first();

            $nextNumber = 1;

            if ($lastOrder && $lastOrder->order_no) {
                $parts = explode('-', $lastOrder->order_no);
                $nextNumber = (int) end($parts) + 1;
            }

            $order->order_no = 'SO-' . $year . '-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
        }

        // Normalize fields
        $order->invoice_required = (bool) $order->invoice_required;

        $order->advance_amount = $order->advance_amount ?? 0;
        $order->quantity = $order->quantity ?? 0;
        $order->rate = $order->rate ?? 0;
        $order->tax = $order->tax ?? 0;
        $order->total_amount = $order->total_amount ?? 0;
    });
}
}