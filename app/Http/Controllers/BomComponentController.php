<?php

namespace App\Http\Controllers;

use App\Models\BomComponent;
use App\Models\BomHeader;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class BomComponentController extends Controller
{

    public function __construct()
    {
        $this->middleware('web');
    }

    /**
     * Active BOMs are immutable — changes require creating a new Draft
     * revision instead. Returns a 403 response if the given BOM is Active,
     * or null if the write should proceed.
     */
    private function blockIfBomActive(string $bomId)
    {
        $bom = BomHeader::where('user_id', auth()->id())->find($bomId);

        if ($bom && $bom->status === 'Active') {
            return response()->json([
                'message' => 'This BOM is Active and cannot be edited directly. Create a new revision instead.',
            ], 403);
        }

        return null;
    }

     public function index(Request $request)
    {
        $query = BomComponent::where('user_id', auth()->id());

        // filter by bom_id
        if ($request->has('bom_id')) {
            $query->where('bom_id', $request->bom_id);
        }

        return response()->json($query->get());
    }

   public function Detail(Request $request)
{
    $itemCode = $request->item_code;

    if (!$itemCode) {
        return response()->json([]);
    }

    // 1. Find BOM header
       $bomHeader = \DB::table('bom_headers')
            ->where('item_code', $itemCode)
            ->where('user_id', auth()->id())
            ->first();

    if (!$bomHeader) {
        return response()->json([]);
    }

    // 2. Fetch components using BOM UUID
    $components = BomComponent::where('bom_id', $bomHeader->id)
            ->where('user_id', auth()->id())
            ->get();

    return response()->json($components);
}

    public function show($id)
    {
         return BomComponent::where('user_id', auth()->id())
            ->findOrFail($id);
    }

   public function store(Request $request)
{
    try {
        $data = $request->all();

        Log::info('Parsed payload', $data);

        $validator = Validator::make($data, [
            'bom_id' => 'required|string',
            'component' => 'required|string',
            'description' => 'nullable|string',
            'quantity' => 'required|numeric',
            'uom' => 'nullable|string',
            'basis' => 'nullable|string',
            'type' => 'nullable|string',
            'item_seq' => 'nullable|integer',
            'operation_seq' => 'nullable|integer',
             'production_qty' => 'nullable|numeric',
             'total_quantity' => 'nullable|numeric',
             'scrap_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $validator->errors(),
            ], 422);
        }

        if ($blocked = $this->blockIfBomActive($data['bom_id'])) {
            return $blocked;
        }

        $valid = $validator->validated();

        // 🔥 SAFE DEFAULTS (THIS FIXES YOUR ERRORS)
        $valid['id'] = Str::uuid()->toString();

         $valid['user_id'] = auth()->id();


        $valid['item_seq'] = $valid['item_seq'] ?? 0;
        $valid['operation_seq'] = $valid['operation_seq'] ?? 0;
        $valid['description'] = $valid['description'] ?? '';
        $valid['uom'] = $valid['uom'] ?? '';
        $valid['type'] = $valid['type'] ?? '';
        $valid['basis'] = $valid['basis'] ?? 'Standard';
        $valid['status'] = $valid['status'] ?? 'Active';
        $valid['planning_percent'] = $valid['planning_percent'] ?? 100;
        $valid['yield_percent'] = $valid['yield_percent'] ?? 100;
        $valid['scrap_percent'] = $valid['scrap_percent'] ?? 0;
        $valid['include_in_cost_rollup'] = $valid['include_in_cost_rollup'] ?? 0;

        $valid['unit_cost'] = $valid['unit_cost'] ?? 0;
        $valid['total_cost'] = $valid['total_cost'] ?? 0;
        // ✅ NEW FIELDS
$valid['production_qty'] = $valid['production_qty'] ?? 1;

// 🔥 AUTO CALC TOTAL (includes scrap/wastage allowance)
$valid['total_quantity'] = $valid['quantity'] * $valid['production_qty'] * (1 + $valid['scrap_percent'] / 100);

        $created = BomComponent::create($valid);

        return response()->json($created, 201);

    } catch (\Exception $e) {
        Log::error('STORE ERROR', [
            'msg' => $e->getMessage(),
        ]);

        return response()->json([
            'error' => 'Server error',
            'message' => $e->getMessage()
        ], 500);
    }
}

    /**
     * Bulk-create component rows for a BOM in one call — used by the New
     * BOM dialog's Materials tab, which builds up several rows locally
     * before a single submit (mirrors BomOperationController::store()'s
     * existing bulk-array pattern).
     */
    public function storeMany(Request $request)
    {
        $rows = $request->all();

        if (!is_array($rows) || empty($rows)) {
            return response()->json(['error' => 'Expected a non-empty array of component rows'], 422);
        }

        $bomId = $rows[0]['bom_id'] ?? null;
        if ($bomId && ($blocked = $this->blockIfBomActive($bomId))) {
            return $blocked;
        }

        $created = [];

        foreach ($rows as $index => $row) {
            $validator = Validator::make($row, [
                'bom_id' => 'required|string',
                'component' => 'required|string',
                'description' => 'nullable|string',
                'quantity' => 'required|numeric',
                'uom' => 'nullable|string',
                'basis' => 'nullable|string',
                'type' => 'nullable|string',
                'item_seq' => 'nullable|integer',
                'operation_seq' => 'nullable|integer',
                'production_qty' => 'nullable|numeric',
                'scrap_percent' => 'nullable|numeric|min:0|max:100',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validation failed',
                    'details' => $validator->errors(),
                ], 422);
            }

            $valid = $validator->validated();
            $valid['id'] = Str::uuid()->toString();
            $valid['user_id'] = auth()->id();
            $valid['item_seq'] = $valid['item_seq'] ?? ($index + 1) * 10;
            $valid['operation_seq'] = $valid['operation_seq'] ?? 0;
            $valid['description'] = $valid['description'] ?? '';
            $valid['uom'] = $valid['uom'] ?? '';
            $valid['type'] = $valid['type'] ?? '';
            $valid['basis'] = $valid['basis'] ?? 'Standard';
            $valid['status'] = 'Active';
            $valid['planning_percent'] = 100;
            $valid['yield_percent'] = 100;
            $valid['scrap_percent'] = $valid['scrap_percent'] ?? 0;
            $valid['include_in_cost_rollup'] = 0;
            $valid['unit_cost'] = 0;
            $valid['total_cost'] = 0;
            $valid['production_qty'] = $valid['production_qty'] ?? 1;
            $valid['total_quantity'] = $valid['quantity'] * $valid['production_qty'] * (1 + $valid['scrap_percent'] / 100);

            $created[] = BomComponent::create($valid);
        }

        return response()->json($created, 201);
    }

    public function deleteByBomId(Request $request)
{
    $request->validate([
        'bom_id' => 'required|string',
    ]);

    if ($blocked = $this->blockIfBomActive($request->bom_id)) {
        return $blocked;
    }

      $deletedCount = BomComponent::where('bom_id', $request->bom_id)
            ->where('user_id', auth()->id())
            ->delete();

    return response()->json([
        'message' => "$deletedCount component(s) deleted successfully."
    ]);
}


public function update(Request $request, $id)
{
    try {
        $component = BomComponent::where('user_id', auth()->id())
                ->findOrFail($id);

        if ($blocked = $this->blockIfBomActive($component->bom_id)) {
            return $blocked;
        }

        $validator = Validator::make($request->all(), [
            'item_seq' => 'nullable|integer',
            'operation_seq' => 'nullable|integer',
            'component' => 'nullable|string',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric',
            'uom' => 'nullable|string',
            'basis' => 'nullable|string',
            'type' => 'nullable|string',
            'status' => 'nullable|string',
            'planning_percent' => 'nullable|integer',
            'yield_percent' => 'nullable|integer',
            'scrap_percent' => 'nullable|numeric|min:0|max:100',
            'include_in_cost_rollup' => 'nullable|boolean',
            'unit_cost' => 'nullable|numeric',
            'total_cost' => 'nullable|numeric',
            'production_qty' => 'nullable|numeric',
'total_quantity' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $validator->errors(),
            ], 422);
        }

        $component->update($validator->validated());

        return response()->json([
            'message' => 'Component updated successfully',
            'data' => $component
        ]);

    } catch (\Exception $e) {
        Log::error('BOMComponent update failed', [
            'id' => $id,
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'error' => 'Internal Server Error',
            'message' => $e->getMessage()
        ], 500);
    }
}

public function destroy($id)
{
     $component = BomComponent::where('user_id', auth()->id())
            ->findOrFail($id);

    if ($blocked = $this->blockIfBomActive($component->bom_id)) {
        return $blocked;
    }

    $component->delete();

    return response()->json([
        'message' => 'Deleted successfully'
    ]);
}
}