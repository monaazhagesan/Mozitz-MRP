<?php

namespace App\Http\Controllers;

use App\Models\Stocktake;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StocktakeController extends Controller
{
    public function index()
    {
        return Stocktake::orderBy('created_at', 'desc')->get();
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
        return Stocktake::findOrFail($id);
    }

    public function destroy($id)
    {
        $stocktake = Stocktake::find($id);

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
    $stocktake = Stocktake::findOrFail($id);

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

    $stocktake->update([
        'status' => $data['status'] ?? $stocktake->status,
        'counted_items' => $data['countedItems'] ?? $stocktake->counted_items,
        'variance_value' => $data['varianceValue'] ?? $stocktake->variance_value,
        'variance' => $data['variance'] ?? $stocktake->variance,
        'completed_at' => $data['completedAt'] ?? null,
        'items' => $items,
    ]);

    return response()->json($stocktake);
}
}
