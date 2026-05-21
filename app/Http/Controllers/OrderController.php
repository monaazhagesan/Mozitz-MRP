<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\InventoryItem; // Assuming you have inventory table
use App\Models\InventoryStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;


class OrderController extends Controller
{

    public function __construct()
    {
        $this->middleware('web');
    }

    public function store(Request $request)
{
    $request->validate([
        'order_no' => 'nullable|string|unique:orders,order_no',
        'customer_id' => 'required|numeric',
        'customer' => 'required|string',

        'items' => 'required|array|min:1',
        'items.*.item_code' => 'nullable|string',
        'items.*.quantity' => 'required|numeric|min:1',
    ]);

    DB::beginTransaction();

    try {

        // 1. CREATE ORDER ONCE
        $order = Order::create([
            'user_id' => Auth::id(),
            'order_no' => $request->order_no,
            'customer_id' => $request->customer_id,
            'customer' => $request->customer,
            'order_type' => $request->order_type,

            'contact_person' => $request->contact_person,
            'contact_number' => $request->contact_number,
            'email' => $request->email,
            'location' => $request->location,

            'shipping_address' => $request->shipping_address,
            'order_date' => $request->order_date,
            'expected_dispatch_date' => $request->expected_dispatch_date,
            'expected_delivery_date' => $request->expected_delivery_date,

            'status' => $request->status ?? 'Pending',

            'reference_no' => $request->reference_no,
            'remarks' => $request->remarks,
            'payment_terms' => $request->payment_terms,
            'dispatch_mode' => $request->dispatch_mode,
        ]);

        // 2. INSERT MULTIPLE ITEMS
        foreach ($request->items as $item) {

          $availableStock = null;

    if (isset($item['available_stock'])) {
        $availableStock = $item['available_stock'];
    }

            OrderItem::create([
                'order_id' => $order->id,
                'item_code' => $item['item_code'] ?? null,
                'item_name' => $item['item_name'] ?? null,
                'item_type' => $item['item_type'] ?? null,
                 'available_stock' => $availableStock,
                'uom' => $item['uom'] ?? 'pcs',
                'quantity' => $item['quantity'],
                'rate' => $item['rate'] ?? 0,
                'tax' => $item['tax'] ?? 0,
                'total_amount' => $item['total_amount'] ?? 0,
            ]);

            // Inventory update
            if (!empty($item['item_code'])) {

                $stock = InventoryStock::where('item_code', $item['item_code'])->first();

                if ($stock) {
                    $stock->allocated_quantity =
                        ($stock->allocated_quantity ?? 0) + $item['quantity'];

                    $stock->save();
                }
            }
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Order created successfully',
            'order_id' => $order->id
        ], 201);

    } catch (\Exception $e) {

        DB::rollBack();

        Log::error('Order creation failed', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
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

        $query = Order::with('items')
            ->where('user_id', Auth::id())
            ->orderBy('order_date', 'desc');

        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        $orders = $query->get();

foreach ($orders as $order) {

    // get all packages for this order
  $packages = \App\Models\OrderPackage::where('order_number', $order->order_no)
    ->where('user_id', Auth::id())
    ->where('status', 'Delivered')
    ->get();
    
    $packedMap = [];

    foreach ($packages as $pkg) {

        $items = $pkg->items;

        // decode JSON if needed
        if (is_string($items)) {
            $items = json_decode($items, true);
        }

        if (!is_array($items)) {
            $items = [];
        }

        foreach ($items as $pkgItem) {

            $code = strtolower(trim($pkgItem['item_code'] ?? ''));

            if (!$code) {
                continue;
            }

            $packedQty = (int) (
                $pkgItem['packed_quantity']
                ?? 0
            );

            $packedMap[$code] =
                ($packedMap[$code] ?? 0) + $packedQty;
        }
    }

    // attach delivered_qty into order items
    foreach ($order->items as $item) {

        $code = strtolower(trim($item->item_code));

        $item->delivered_qty =
            $packedMap[$code] ?? 0;
    }
}

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
             'status' => 'required|string|in:Pending,Confirmed,Approved,Processing,Packed,Shipped,Delivered,Cancelled,
        Partially Fulfilled',
        ]);

        $order = Order::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

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

    public function getNextSONumber(Request $request)
    {
        $year = date('Y');
        $userId = $request->user()->id;

        $lastOrder = Order::whereYear('created_at', $year)
            ->where('user_id', $userId)
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

  public function recalculateStatus(Request $request)
{
    $orderNumber = $request->order_number;

   $order = Order::where('order_no', $orderNumber)
    ->where('user_id', Auth::id())
    ->with('items')
    ->first();

    if (!$order) {
        return response()->json([
            'message' => 'Order not found'
        ], 404);
    }

   $packages = \App\Models\OrderPackage::where('order_number', $orderNumber)
    ->where('user_id', Auth::id())
    ->get();

    $shippedMap = [];
    $deliveredMap = [];

    // =========================
    // Build shipped + delivered maps
    // =========================
    foreach ($packages as $pkg) {

       $items = $pkg->items;

// if JSON string → decode
if (is_string($items)) {
    $items = json_decode($items, true);
}

// final safety
if (!is_array($items)) {
    $items = [];
}

        foreach ($items as $item) {

            $code = strtolower(trim($item['item_code'] ?? ''));
            if (!$code) continue;

            $qty = (int) (
                $item['packed_quantity']
                ?? $item['ordered_quantity']
                ?? $item['quantity_to_pack']
                ?? 0
            );

            if (strtolower($pkg->status) === 'shipped') {
                $shippedMap[$code] = ($shippedMap[$code] ?? 0) + $qty;
            }

            if (strtolower($pkg->status) === 'delivered') {
                $deliveredMap[$code] = ($deliveredMap[$code] ?? 0) + $qty;
            }
        }
    }

    // =========================
    // Flags
    // =========================
    $allShipped = true;
    $allDelivered = true;

    $hasAnyShipped = false;
    $hasAnyDelivered = false;

    $hasPartialShip = false;
    $hasPartialDelivery = false;

    // =========================
    // Compare with order items
    // =========================
    foreach ($order->items as $item) {

        $code = strtolower(trim($item->item_code));
        $orderedQty = (int) $item->quantity;

        $shippedQty = $shippedMap[$code] ?? 0;
        $deliveredQty = $deliveredMap[$code] ?? 0;

        if ($shippedQty > 0) {
            $hasAnyShipped = true;
        }

        if ($deliveredQty > 0) {
            $hasAnyDelivered = true;
        }

        if ($shippedQty < $orderedQty) {
            $allShipped = false;
        }

        if ($deliveredQty < $orderedQty) {
            $allDelivered = false;
        }

        if ($shippedQty > 0 && $shippedQty < $orderedQty) {
            $hasPartialShip = true;
        }

        if ($deliveredQty > 0 && $deliveredQty < $orderedQty) {
            $hasPartialDelivery = true;
        }
    }

    // =========================
    // FINAL STATUS LOGIC
    // =========================

    if ($allDelivered) {

        $status = 'Delivered';

    } elseif ($hasPartialShip && $hasPartialDelivery) {

        $status = 'Partially Fulfilled';

    } elseif ($allShipped && !$allDelivered) {

        $status = 'Shipped';

    } elseif ($hasPartialShip) {

        $status = 'Partially Fulfilled';

    } elseif ($hasPartialDelivery) {

        $status = 'Partially Fulfilled';

    } elseif ($hasAnyShipped) {

        $status = 'Shipped';

    } else {

        $status = 'Not Shipped';
    }

    // =========================
    // SAVE
    // =========================
    $order->status = $status;
    $order->delivery_status = $status;
    $order->save();

    return response()->json([
        'success' => true,
        'status' => $order->status,
        'delivery_status' => $order->delivery_status
    ]);
}
}
