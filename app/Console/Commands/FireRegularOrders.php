<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FireRegularOrders extends Command
{
    protected $signature = 'app:fire-regular-orders';

    protected $description = 'Auto fire regular orders from templates';

    public function handle()
    {
        $today = Carbon::today();

        $templates = DB::table('regular_order_templates')
            ->where('status', 'Active')
            ->whereNotNull('next_order_date')
            ->get();

        $due = $templates->filter(function ($t) use ($today) {
            return Carbon::parse($t->next_order_date)->lessThanOrEqualTo($today)
                && $t->last_ordered !== $today->format('Y-m-d');
        });

        $this->info("Auto-fire: {$due->count()} templates due");

        foreach ($due as $template) {

            try {
                DB::beginTransaction();

                /*
                -------------------------------------------------
                GET CUSTOMER DETAILS (MASTER TABLE)
                -------------------------------------------------
                */
                $customer = DB::table('customers')
                    ->where('id', $template->customer_id)
                    ->first();

                if (!$customer) {
                    throw new \Exception("Customer not found ID: {$template->customer_id}");
                }

                /*
                -------------------------------------------------
                GENERATE ORDER NO
                -------------------------------------------------
                */
                $count = DB::table('orders')->count() + 1;

                $orderNo = 'SO-' . now()->format('Y') . '-' .
                    str_pad($count, 5, '0', STR_PAD_LEFT);

                /*
                -------------------------------------------------
                CREATE ORDER HEADER
                -------------------------------------------------
                */
                $orderId = DB::table('orders')->insertGetId([
                    'user_id' => $template->user_id ?? 1,

                    'order_no' => $orderNo,

                    'customer_id' => $customer->id,
                    'customer' => $customer->customer ?? $customer->customer_name ??  'Unknown Customer',
                    'contact_person' => $customer->contact_person ?? null,
                    'contact_number' => $customer->mobile ?? null,
                    'email' => $customer->email ?? null,

                    'billing_address' => $customer->billing_address ?? null,
                    'shipping_address' => $customer->shipping_address_line1 ?? null,
                    'location' => $customer->shipping_city ?? null,

                    'order_type' => 'Regular',
                    'order_date' => $today->format('Y-m-d'),

                    'expected_delivery_date' => $template->expected_delivery_date ?? $today->format('Y-m-d'),

                    'reference_no' => $template->reference_no ?? null,
                    'priority' => $template->priority ?? 'Normal',
                    'remarks' => $template->remarks ?? 'Auto-generated from template',

                    'dispatch_mode' => $template->dispatch_mode ?? 'Courier',

                    'transporter_name' => $template->transporter_name ?? null,
                    'vehicle_no' => $template->vehicle_no ?? null,

                    'expected_dispatch_date' => $template->expected_dispatch_date ?? null,
                    'delivery_status' => 'Awaiting',

                    'warehouse_location' => $template->warehouse_location ?? null,

                    'payment_type' => $template->payment_type ?? 'Credit',
                    'payment_terms' => $template->payment_terms ?? 'Net 30 days',
                    'advance_amount' => $template->advance_amount ?? 0,

                    'invoice_required' => $template->invoice_required ?? 0,

                    'status' => 'Awaiting Confirmation',

                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if (!$orderId) {
                    throw new \Exception("Order creation failed for template ID {$template->id}");
                }

                $this->info("Order Created: {$orderNo}");

                /*
                -------------------------------------------------
                CREATE ORDER ITEM
                -------------------------------------------------
                */
                $rate = $template->price ?? 0;
                $qty = $template->quantity ?? 0;
                $tax = $template->tax ?? 18;

                $total = ($qty * $rate) + $tax;

                $itemType = null;

if (str_starts_with($template->item_code, 'MAT')) {
    $itemType = 'Material';
} elseif (str_starts_with($template->item_code, 'PRD')) {
    $itemType = 'Product';
}

                DB::table('order_items')->insert([
                    'order_id' => $orderId,

                     'item_type' => $itemType,
                    'item_code' => $template->item_code,
                    'item_name' => $template->item_name,
                    'uom' => $template->uom ?? 'pcs',

                    'available_stock' => $template->available_stock ?? 0,
                    'quantity' => $qty,

                    'item_location' => $template->item_location ?? null,

                    'rate' => $rate,
                    'tax' => $tax ?? 18,
                    'total_amount' => $total,

                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                /*
                -------------------------------------------------
                UPDATE TEMPLATE
                -------------------------------------------------
                */
                $current = Carbon::parse($template->next_order_date);

$nextDate = match ($template->frequency) {

    'Weekly'      => $current->copy()->addWeek(),
    'Fortnightly' => $current->copy()->addWeeks(2),
    'Monthly'     => $current->copy()->addMonth(),
    'Quarterly'   => $current->copy()->addMonths(3),

    default       => $current->copy()->addWeek(),
};

                DB::table('regular_order_templates')
                    ->where('id', $template->id)
                    ->update([
                        'last_ordered' => $today->format('Y-m-d'),
                        'next_order_date' => $nextDate->format('Y-m-d'),
                        'updated_at' => now(),
                    ]);

                DB::commit();

                $this->info("✔ Processed Template ID: {$template->id}");

            } catch (\Exception $e) {

                DB::rollBack();

                $this->error("✖ FAILED Template ID: {$template->id}");
                $this->error($e->getMessage());
            }
        }

        return 0;
    }
}