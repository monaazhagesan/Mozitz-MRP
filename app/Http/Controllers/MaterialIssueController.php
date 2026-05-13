<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MaterialIssue;
use App\Models\MaterialIssueItem;
use App\Models\InventoryStock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class MaterialIssueController extends Controller
{
      public function __construct()
    {
        $this->middleware('web');
    }
    public function index()
    {
        return MaterialIssue::with('items')
            ->where('user_id', auth()->id())
            ->latest()
            ->get();
    }

    public function show($id)
    {
         return MaterialIssue::with('items')
            ->where('user_id', auth()->id())
            ->findOrFail($id);
    }

   public function store(Request $request)
{
    $request->validate([
        'issue_no' => 'required|string|unique:material_issues',
        'issue_date' => 'required|date',
        'issue_type' => 'required|string',
        'items' => 'required|array|min:1',
    ]);

    DB::beginTransaction();

    try {

        // 1. Create Issue Header
        $issue = MaterialIssue::create([
              'user_id' => auth()->id(),
            'issue_no' => $request->issue_no,
            'issue_date' => $request->issue_date,
            'issue_type' => $request->issue_type,
            'reference_no' => $request->reference_no,
            'reference_name' => $request->reference_name,
            'issued_by' => $request->issued_by,
            'warehouse' => $request->warehouse,
            'remarks' => $request->remarks,
            'status' => 'Issued',
        ]);

        // 2. Process Items
        foreach ($request->items as $item) {

            $stock = InventoryStock::where('item_code', $item['item_code'])->first();

            if (!$stock) {
                throw new \Exception("Stock not found: " . $item['item_code']);
            }

            // ✅ CORRECT AVAILABLE STOCK CALCULATION (DO NOT USE available_stock COLUMN)
            $quantityOnHand = (float) ($stock->quantity_on_hand ?? 0);
            $allocated = (float) ($stock->allocated_quantity ?? 0);
            $available = $quantityOnHand - $allocated;

            $qty = (float) $item['issued_qty'];

            // ❌ STOCK VALIDATION FIX
            if ($qty > $available) {
                throw new \Exception("Insufficient stock for " . $item['item_code']);
            }

            // ✅ UPDATE STOCK (only allocated increases, on_hand stays system controlled)
            $stock->allocated_quantity = $allocated + $qty;
            $stock->save();

            // Save issue item
            MaterialIssueItem::create([
                'material_issue_id' => $issue->id,
                'item_code' => $item['item_code'],
                'item_name' => $item['item_name'] ?? null,
                'uom' => $item['uom'] ?? null,
                'issued_qty' => $qty,
                'available_stock' => $available,
            ]);
        }

        DB::commit();

        return response()->json([
            'message' => 'Material issue created successfully',
            'data' => $issue->load('items')
        ], 201);

    } catch (\Exception $e) {

        DB::rollBack();

        return response()->json([
            'message' => 'Failed to create material issue',
            'error' => $e->getMessage()
        ], 500);
    }
}
    public function destroy($id)
    {
         $issue = MaterialIssue::where('user_id', auth()->id())
            ->findOrFail($id);
            
        $issue->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}