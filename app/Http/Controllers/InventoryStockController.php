<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;


class InventoryStockController extends Controller
{
    // Get all inventory items
   public function index(Request $request)
{
    $query = InventoryStock::query();

    // ✅ FIX: proper grouped search
    if ($request->has('search')) {
        $search = $request->query('search');

        $query->where(function ($q) use ($search) {
            $q->where('item_name', 'like', "%{$search}%")
              ->orWhere('item_code', 'like', "%{$search}%");
        });
    }

    $items = $query->get()->map(function ($item) {

        $quantityOnHand = (float) ($item->quantity_on_hand ?? 0);
        $allocated = (float) ($item->allocated_quantity ?? 0);
        $committed = (float) ($item->committed_quantity ?? 0);

        $unitCost = (float) ($item->unit_cost ?? 0);
        $sellingPrice = (float) ($item->selling_price ?? 0);

        // ✅ FIX: ALWAYS compute fresh (do NOT trust DB field)
        $availableQuantity = $quantityOnHand - $allocated;

        $expectedQuantity = (float) ($item->expected_quantity ?? 0);
        $potential = $availableQuantity + $expectedQuantity;

        return [
            'id' => $item->id,
            // missing
'location_id' => $item->location_id,
            'itemCode' => $item->item_code,
            'itemName' => $item->item_name,
            'sku' => $item->sku,
            'item_type' => $item->item_type ?? 'Product',

            'uom' => $item->uom ?? '',
            'defaultSupplier' => $item->default_supplier ?? '-',
            'open_po' => (float) ($item->open_po ?? 0),

            'unit_cost' => $unitCost,
            'defaultSalesPrice' => $sellingPrice,
            'sellingPrice' => $sellingPrice,

            'quantityOnHand' => $quantityOnHand,
            'allocatedQuantity' => $allocated,
            'committedQuantity' => $committed,

            'availableQuantity' => $availableQuantity,
            'expectedQuantity' => $expectedQuantity,
            'potentialQuantity' => $potential,

            'reorderPoint' => (float) ($item->reorder_point ?? 0),
            'safety_stock' => (float) ($item->safety_stock ?? 0),
            'lead_time_days' => (int) ($item->lead_time_days ?? 0),

            // ✅ SAFE BOOLEAN OUTPUT
            'usabilityMake' => (bool) $item->usability_make,
            'usabilityBuy' => (bool) $item->usability_buy,
            'usabilitySell' => (bool) $item->usability_sell,

            'location' => $item->location ?? '-',
            'grnRequired' => (bool) $item->grn_required,
            'locationTracking' => (bool) $item->location_tracking,

            'hsnCode' => $item->hsn_code,
            'taxRate' => (float) ($item->tax_rate ?? 0),
            'barcode' => $item->barcode ?? '',

            'lastTransactionDate' => $item->last_transaction_date,
            'description' => $item->description ?? '',
            'categories' => $item->categories ?? '',
        ];
    });

    return response()->json([
        'items' => $items,
    ]);
}
    // Get single inventory item
    public function show($id)
    {
        $item = InventoryStock::findOrFail($id);
        return response()->json($item, 200);
    }

    // Create inventory item
  public function store(Request $request)
{
    try {

        $data = $this->validateData($request);

        // Defaults
        $data['item_type'] = $data['item_type'] ?? 'Product';
        $data['sku'] = $data['sku'] ?? null;
        $data['location'] = $data['location'] ?? '-';

        $data['selling_price'] = (float) ($data['selling_price'] ?? 0);
        $data['unit_cost'] = (float) ($data['unit_cost'] ?? 0);
        $data['tax_rate'] = (float) ($data['tax_rate'] ?? 0);

        $data['quantity_on_hand'] = (float) ($data['quantity_on_hand'] ?? 0);
        $data['allocated_quantity'] = (float) ($data['allocated_quantity'] ?? 0);
        $data['committed_quantity'] = (float) ($data['committed_quantity'] ?? 0);
        $data['available_quantity'] = $data['quantity_on_hand'] - $data['allocated_quantity'];
        $data['open_po'] = (float) ($data['open_po'] ?? 0);

        // ✅ AUTO ITEM CODE
        if (empty($data['item_code'])) {

            $prefix = match ($data['item_type']) {
                'Product' => 'PRD',
                'Component' => 'MAT',
                default => 'IT'
            };

            $last = InventoryStock::orderBy('id', 'desc')->first();

            $lastNumber = 0;
            if ($last && preg_match('/-(\d+)$/', $last->item_code, $m)) {
                $lastNumber = (int) $m[1];
            }

            $data['item_code'] = $prefix . '-' . str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        }

        // ✅ AUTO BARCODE
if (empty($data['barcode'])) {
    $data['barcode'] = $this->generateBarcode();
}

// ✅ Resolve location name from ID
if (!empty($data['location_id'])) {
    $location = \App\Models\Location::find($data['location_id']);

    if ($location) {
        $data['location'] = $location->location_name; // store name
    }
}

        // ✅ BOOLEAN FIX
        foreach ([
            'auto_reorder',
            'grn_required',
            'usability_make',
            'usability_buy',
            'usability_sell',
            'location_tracking',
            'auto_generate_serial'
        ] as $field) {
            $data[$field] = filter_var($request->input($field), FILTER_VALIDATE_BOOLEAN);
        }

    
        $item = InventoryStock::create($data);

        return response()->json($item, 201);

    } catch (ValidationException $e) {
        return response()->json([
            'message' => 'Validation Failed',
            'errors' => $e->errors()
        ], 422);

    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Server Error',
            'error' => $e->getMessage()
        ], 500);
    }
}
    // Update inventory item
     public function update(Request $request, $id)
{
    $item = InventoryStock::findOrFail($id);

    try {

        $data = $this->validateData($request);

        // fallback values
        foreach ([
            'quantity_on_hand',
            'allocated_quantity',
            'open_po',
            'committed_quantity',
            'unit_cost',
            'selling_price'
        ] as $field) {
            $data[$field] = isset($data[$field])
                ? (float) $data[$field]
                : (float) $item->$field;
        }

        $data['unit_cost'] = isset($data['unit_cost'])
    ? (float) $data['unit_cost']
    : (float) $item->unit_cost;

        // recalc
        $data['available_quantity'] =
            $data['quantity_on_hand']
            - $data['allocated_quantity']
            ;

        // booleans
        foreach ([
            'auto_reorder',
            'grn_required',
            'usability_make',
            'usability_buy',
            'usability_sell',
            'location_tracking',
            'auto_generate_serial'
        ] as $field) {
            $data[$field] = filter_var(
                $request->input($field),
                FILTER_VALIDATE_BOOLEAN
            );
        }

        if ($request->filled('last_transaction_date')) {
    $data['last_transaction_date'] = Carbon::parse($request->input('last_transaction_date'))
        ->timezone('Asia/Kolkata')
        ->format('Y-m-d H:i:s');
}

if (empty($item->barcode)) {
    $data['barcode'] = $this->generateBarcode();
}

// ✅ Resolve location name from ID
if (!empty($data['location_id'])) {
    $location = \App\Models\Location::find($data['location_id']);

    if ($location) {
        $data['location'] = $location->location_name; // store name
    }
}

        $item->update($data);

        return response()->json($item, 200);

    } catch (ValidationException $e) {
        return response()->json([
            'message' => 'Validation Failed',
            'errors' => $e->errors()
        ], 422);

    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Update failed',
            'error' => $e->getMessage()
        ], 500);
    }
}
    // Delete inventory item
    public function destroy($id)
    {
        $item = InventoryStock::findOrFail($id);
        $item->delete();

        return response()->json([
            'message' => 'Inventory item deleted successfully'
        ], 200);
    }

    // Centralized validation
     private function validateData(Request $request)
    {
        return $request->validate([
            'location_id' => 'nullable|uuid', 
            'item_code' => 'nullable|string|max:50',
            'item_name' => 'nullable|string|max:100',
            'sku' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:500',
            'item_type' => 'nullable|string|in:Product,Component,Material,N/A',
            'quantity_on_hand' => 'nullable|numeric|min:0',
            'allocated_quantity' => 'nullable|numeric|min:0',
            'open_po' => 'nullable|numeric|min:0',
            
            'unit_cost' => 'nullable|numeric|min:0',
            'selling_price' => 'nullable|numeric|min:0',
            'hsn_code' => 'nullable|string|max:20',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'location' => 'nullable|string|max:100',
            'reorder_point' => 'nullable|numeric|min:0',
            'last_transaction_date' => 'nullable|date',
            'committed_quantity' => 'nullable|numeric|min:0',
            'barcode' => 'nullable|string|max:50',
            'item_mode' => 'nullable|string|in:batch,variant',
            'variant_name' => 'nullable|string|max:100',
            'variant_attributes' => 'nullable|string|max:200',
            'default_supplier' => 'nullable|string|max:100',
            'auto_reorder' => 'nullable|boolean',
            'grn_required' => 'nullable|boolean',
            'categories' => 'nullable|string',
            'usability_make' => 'nullable|boolean',
            'usability_buy' => 'nullable|boolean',
            'usability_sell' => 'nullable|boolean',
            'location_tracking' => 'nullable|boolean',
            'auto_generate_serial' => 'nullable|boolean',
            'serial_number_format' => 'nullable|string|max:50',
            'lead_time_days' => 'nullable|integer|min:0',
            'safety_stock' => 'nullable|integer|min:0',
        ]);
    }
    private function toBool($request, $field)
{
    return filter_var($request->input($field), FILTER_VALIDATE_BOOLEAN);
}
    

public function allocate(Request $request)
{
    $request->validate([
        'itemCode' => 'required|string',
        'quantity' => 'required|numeric|min:0.01',
    ]);

    $item = InventoryStock::where('item_code', $request->itemCode)->firstOrFail();

    $allocated = (float) ($item->allocated_quantity ?? 0);
    $quantity = (float) $request->quantity;

    $item->allocated_quantity = $allocated + $quantity;
    $item->save();

    return response()->json([
        'message' => 'Allocated successfully',
        'item' => $item
    ]);
}


private function generateBarcode()
{
    do {
        $barcode = 'BC' . now()->format('ymdHis') . rand(100, 999);
    } while (InventoryStock::where('barcode', $barcode)->exists());

    return $barcode;
}


public function checkStock(Request $request)
{
    $request->validate([
        'item_code' => 'required|string'
    ]);

    $stock = InventoryStock::where('item_code', $request->item_code)->first();

    if (!$stock) {
        return response()->json([
            'message' => 'Stock not found'
        ], 404);
    }

    $available = (float)$stock->quantity_on_hand - (float)$stock->allocated_quantity;

    return response()->json([
        'itemCode' => $stock->item_code,
        'itemName' => $stock->item_name,
        'quantityOnHand' => (float)$stock->quantity_on_hand,
        'allocatedQuantity' => (float)$stock->allocated_quantity,
        'availableQuantity' => $available
    ]);
}
}