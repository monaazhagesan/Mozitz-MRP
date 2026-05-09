<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\InventoryItem; // Assuming you have inventory table
use App\Models\InventoryStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'order_no' => 'nullable|string|unique:orders,order_no',
            'customer' => 'required|string',
            'order_type' => 'nullable|string',

            'order_date' => 'nullable|date',
            'expected_dispatch_date' => 'nullable|date',
            'status' => 'nullable|string',

            'items' => 'required|array|min:1',

            'items.*.item_code' => 'nullable|string',
            'items.*.item_name' => 'nullable|string',
            'items.*.item_type' => 'nullable|string',
            'items.*.uom' => 'nullable|string',

            'items.*.quantity' => 'nullable|numeric|min:1',
            'items.*.available_stock' => 'nullable|numeric|min:1',
            'items.*.rate' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
            'items.*.total_amount' => 'nullable|numeric|min:0',
            'dispatch_mode' => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {

            foreach ($request->items ?? [] as $item) {

            $availableStock = null;

if (isset($item['available_stock'])) {
    $availableStock = ($item['available_stock'] ?? 0) - ($item['quantity'] ?? 0);
}

                Order::create([
                    'order_no' => $request->order_no,
                    'customer_id' => $request->customer_id,
                    'customer' => $request->customer,
                    'order_type' => $request->order_type,

                    // ✅ FIXED FIELDS (NOW INCLUDED)
                    'contact_person' => $request->contact_person,
                    'contact_number' => $request->contact_number,
                    'email' => $request->email,
                    'location' => $request->location,

                    'order_date' => $request->order_date,
                    'expected_dispatch_date' => $request->expected_dispatch_date,
                    'status' => $request->status ?? 'Pending',

                    'expected_delivery_date' => $request->expected_delivery_date,

                    'reference_no' => $request->reference_no,
                    'remarks' => $request->remarks,
                    'payment_terms' => $request->payment_terms,


                    // ITEM DATA STORED IN SAME TABLE
                    'item_code' => $item['item_code'] ?? null,
                    'item_name' => $item['item_name'] ?? null,
                    'item_type' => $item['item_type'] ?? null,
                    'uom' => $item['uom'] ?? 'pcs',
                   'available_stock' => $availableStock,
                    'quantity' => $item['quantity'] ?? 0,
                    'rate' => $item['rate'] ?? 0,
                    'tax' => $item['tax'] ?? 0,
                    'total_amount' => $item['total_amount'] ?? 0,
                    'dispatch_mode' => $request->dispatch_mode,
                ]);

                // Inventory update
                if (!empty($item['item_code'])) {

                    $inventoryItem = InventoryStock::where('item_code', $item['item_code'])->first();

                    if ($inventoryItem) {
                        $inventoryItem->allocated_quantity =
                            ($inventoryItem->allocated_quantity ?? 0) + ($item['quantity'] ?? 0);

                        $inventoryItem->save();
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Order created successfully'
            ], 201);
        } catch (\Exception $e) {

            DB::rollBack();

            Log::error('Order creation failed', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Failed to create order',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    // Fetch all orders
   public function index(Request $request)
{
    try {
        $customerId = $request->query('customer_id');

        $query = Order::orderBy('order_date', 'desc');

        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        $orders = $query->get();

        // Build items array for frontend
        $orders->transform(function ($order) {
            $order->items = [
                [
                    'item_code' => $order->item_code,
                    'item_name' => $order->item_name,
                    'uom' => $order->uom,
                    'quantity' => $order->quantity,
                    'rate' => $order->rate,
                    'tax' => $order->tax,
                    'total_amount' => $order->total_amount,
                    'item_location' => $order->item_location,
                    'available_stock' => $order->available_stock,
                ]
            ];

            $order->order_total = $order->total_amount;

            return $order;
        });

        return response()->json([
            'success' => true,
            'data' => $orders
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch orders',
            'error' => $e->getMessage()
        ], 500);
    }
}

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string',
        ]);

        $order = Order::findOrFail($id);
        $order->status = $request->status;
        $order->save();

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully',
            'data' => $order
        ]);
    }

    public function generateInsights(Request $request)
    {
        $orders = $request->input('orders', []);

        if (empty($orders)) {
            return response()->json([
                'insights' => null,
                'message' => 'No orders provided',
            ], 400);
        }

        try {
            // Example: call OpenAI or other AI service
            // Here we just generate a simple summary for demo purposes
            $summary = "Total Orders: " . count($orders) . "\n";
            $totalAmount = array_sum(array_map(fn($o) => $o['orderTotal'] ?? 0, $orders));
            $summary .= "Total Amount: ₹" . number_format($totalAmount, 2) . "\n";

            $deliveredCount = count(array_filter($orders, fn($o) => $o['deliveryStatus'] === 'Delivered'));
            $summary .= "Delivered Orders: " . $deliveredCount . "\n";

            $pendingCount = count(array_filter($orders, fn($o) => $o['deliveryStatus'] !== 'Delivered'));
            $summary .= "Pending Orders: " . $pendingCount . "\n";

            // You can replace above with AI API call, e.g., OpenAI
            // $aiResponse = Http::withHeaders([...])->post(...);

            return response()->json([
                'insights' => $summary,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'insights' => null,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function getNextSONumber()
    {
        $year = date('Y');

        $lastOrder = Order::whereYear('created_at', $year)
            ->whereNotNull('order_no')
            ->orderBy('id', 'desc')
            ->first();

        $next = 1;

        if ($lastOrder && $lastOrder->order_no) {
            $parts = explode('-', $lastOrder->order_no);
            $next = isset($parts[2]) ? ((int)$parts[2] + 1) : 1;
        }

        return response()->json([
            'success' => true,
            'data' => 'SO-' . $year . '-' . str_pad($next, 5, '0', STR_PAD_LEFT)
        ]);
    }
}
