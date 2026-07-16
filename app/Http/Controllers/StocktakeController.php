<?php

namespace App\Http\Controllers;

use App\Models\Stocktake;
use App\Models\InventoryStock;
use App\Models\StockTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class StocktakeController extends Controller
{

  public function __construct()
    {
        $this->middleware('web');
    }

    public function index()
    {
       return Stocktake::where('user_id', auth()->id())
    ->orderBy('created_at', 'desc')
    ->get();
    }

    // 🔥 SAFE STOCKTAKE NUMBER GENERATOR
    private function generateStocktakeNo()
    {
        $last = DB::table('stocktakes')
            ->orderBy('created_at', 'desc')
            ->value('stocktake_no');

        if (!$last) {
            return 'STK-00001';
        }

        $number = (int) str_replace('STK-', '', $last);
        $next = $number + 1;

        return 'STK-' . str_pad($next, 5, '0', STR_PAD_LEFT);
    }

    public function store(Request $request)
    {
        Log::info('Stocktake Request:', $request->all());

        $data = $request->validate([
            'name' => 'required|string',
            'status' => 'nullable|string',
            'location' => 'nullable|string',
            'location_id' => 'nullable|string|exists:locations,id',
            'countedItems' => 'nullable|integer',
            'totalItems' => 'nullable|integer',
            'variance' => 'nullable|numeric',
            'varianceValue' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
        ]);

        // 🔥 NORMALIZE ITEMS (IMPORTANT FIX)
        $items = collect($data['items'] ?? [])->map(function ($item) {
            return [
                'id' => $item['id'] ?? null,

                // ✅ KEEP THESE ALWAYS
                'item_code' => $item['itemCode'] ?? $item['item_code'] ?? null,
                'item_name' => $item['itemName'] ?? $item['item_name'] ?? null,

                'systemQty' => $item['systemQty'] ?? 0,
                'countedQty' => $item['countedQty'] ?? null,

                'variance' => $item['variance'] ?? 0,
                'varianceValue' => $item['varianceValue'] ?? 0,

                'unitCost' => $item['unitCost'] ?? 0,
                'uom' => $item['uom'] ?? 'EA',

                'counted' => $item['counted'] ?? false,

                'barcode' => $item['barcode'] ?? null,
            ];
        })->toArray();

        $stocktake = Stocktake::create([
            'user_id' => auth()->id(), 
            'id' => (string) Str::uuid(),
            'stocktake_no' => $this->generateStocktakeNo(),
            'name' => $data['name'],
            'status' => $data['status'] ?? 'Draft',
            'location' => $data['location'] ?? null,
            'location_id' => $data['location_id'] ?? null,
            'counted_items' => $data['countedItems'] ?? 0,
            'total_items' => $data['totalItems'] ?? 0,
            'variance_value' => $data['varianceValue'] ?? 0,
            'variance' => $data['variance'] ?? 0,
            'notes' => $data['notes'] ?? null,

            // 🔥 FIXED ITEMS STORAGE
            'items' => $items,
        ]);

        Log::info('Stocktake Created:', $stocktake->toArray());

        return response()->json($stocktake);
    }

    public function show($id)
    {
       return Stocktake::where('user_id', auth()->id())
    ->findOrFail($id);

    }

    public function destroy($id)
    {
       $stocktake = Stocktake::where('user_id', auth()->id())
    ->find($id);

        if (!$stocktake) {
            return response()->json([
                'message' => 'Stocktake not found'
            ], 404);
        }

        $stocktake->delete();

        return response()->json([
            'message' => 'Stocktake deleted successfully'
        ]);
    }

    public function update(Request $request, $id)
{
   $stocktake = Stocktake::where('user_id', auth()->id())
    ->findOrFail($id);

    $data = $request->validate([
        'status' => 'nullable|string',
        'countedItems' => 'nullable|integer',
        'varianceValue' => 'nullable|numeric',
        'variance' => 'nullable|numeric',
        'items' => 'nullable|array',
        'completedAt' => 'nullable|date',
    ]);

    // 🔥 RE-CALCULATE ITEMS (IMPORTANT)
    $items = collect($data['items'] ?? [])->map(function ($item) {

        $systemQty = (float) ($item['systemQty'] ?? 0);
        $countedQty = $item['countedQty'] ?? null;

        $variance = $countedQty !== null ? ($countedQty - $systemQty) : 0;

        return [
            'id' => $item['id'] ?? null,
            'item_code' => $item['itemCode'] ?? null,
            'item_name' => $item['itemName'] ?? null,

            'systemQty' => $systemQty,
            'countedQty' => $countedQty,

            'variance' => $variance,
            'varianceValue' => $variance * ($item['unitCost'] ?? 0),

            'unitCost' => $item['unitCost'] ?? 0,

            // ✅ STATUS FIX
            'status' =>
                $countedQty === null
                    ? 'Pending'
                    : ($countedQty == $systemQty
                        ? 'Matched'
                        : ($countedQty > $systemQty ? 'Over' : 'Short')),
        ];
    })->toArray();

    $isCompleting = ($data['status'] ?? null) === 'Completed';

    DB::beginTransaction();

    try {
        // Posting the counted variance to real InventoryStock rows used to
        // happen via a non-atomic loop of GET/PUT calls from the browser,
        // keyed on a client-side item id (which is fake for items added
        // mid-count, so those silently failed to post). Doing it here,
        // keyed on item_code, inside one transaction, fixes both: a failed
        // item now rolls back the whole completion instead of leaving a
        // half-posted stocktake, and mid-count items post correctly.
        if ($isCompleting) {
            foreach ($items as $item) {
                if ($item['item_code'] === null || $item['countedQty'] === null) {
                    continue;
                }

                $variance = (float) $item['variance'];
                if (abs($variance) < 0.0001) {
                    continue;
                }

                $inventory = InventoryStock::where('item_code', $item['item_code'])->first();
                if (!$inventory) {
                    continue;
                }

                $newQty = (float) $item['countedQty'];
                $availableQty = max(0, $newQty - (float) ($inventory->allocated_quantity ?? 0) - (float) ($inventory->committed_quantity ?? 0));

                $inventory->update([
                    'quantity_on_hand' => $newQty,
                    'available_quantity' => $availableQty,
                    'last_transaction_date' => now(),
                ]);

                StockTransaction::create([
                    'item_code' => $item['item_code'],
                    'transaction_type' => 'Adjustment',
                    'quantity' => $variance,
                    'unit_cost' => $item['unitCost'] ?? 0,
                    'reference_type' => 'Stocktake',
                    'reference_number' => $stocktake->stocktake_no,
                    'notes' => "Stocktake adjustment: {$stocktake->name}",
                ]);
            }
        }

        $stocktake->update([
            'status' => $data['status'] ?? $stocktake->status,
            'counted_items' => $data['countedItems'] ?? $stocktake->counted_items,
            'variance_value' => $data['varianceValue'] ?? $stocktake->variance_value,
            'variance' => $data['variance'] ?? $stocktake->variance,
            'completed_at' => $data['completedAt'] ?? null,
            'items' => $items,
        ]);

        DB::commit();
    } catch (\Exception $e) {
        DB::rollBack();

        return response()->json([
            'message' => 'Failed to complete stocktake',
            'error' => $e->getMessage(),
        ], 500);
    }

    return response()->json($stocktake);
}
}
