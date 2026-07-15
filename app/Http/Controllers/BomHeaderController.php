<?php

namespace App\Http\Controllers;

use App\Models\BomHeader;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\BomComponent;
use App\Models\BomOperation;
use App\Models\BomDeletionLog;
use App\Models\InventoryStock;
use App\Models\Department;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;


class BomHeaderController extends Controller
{

    public function __construct()
    {
        $this->middleware('web');
    }

   public function index(Request $request)
{
    $query = BomHeader::where('user_id', auth()->id());

    if ($request->filled('status')) {
        $query->where('status', $request->query('status'));
    }

    if ($request->filled('item_code')) {
        $query->where('item_code', $request->query('item_code'));
    }

    return $query->get();
}

    public function show($id)
    {
       try {
           return BomHeader::with(['components', 'operations'])
                ->where('user_id', auth()->id())
                ->findOrFail($id);

    } catch (\Exception $e) {
        Log::error("BOM show error: " . $e->getMessage());
        return response()->json(['error' => $e->getMessage()], 500);
    }
    }

    public function store(Request $request)
    {
        $data = $request->validate([

            'item_type' => 'nullable|string',
            'item_code' => 'required|string',
            'item_name' => 'required|string',
            'vendor' => 'nullable|string',
            'alternate' => 'nullable|string',
            'revision' => 'nullable|string',
            'uom' => 'nullable|string',
            'implemented_only' => 'boolean',
            'effective_date' => 'nullable|date',
            'remarks' => 'nullable|string',
            'created_at' => 'nullable|date',
            'updated_at' => 'nullable|date',
            'created_by' => 'nullable|string',
            'revision_reason' => 'nullable|string',
            'parent_bom_id' => 'nullable|string',
            'revision_number' => 'nullable|integer',
            'document' => 'nullable|string',
        ]);

        $data['id'] = Str::uuid()->toString();
        $data['user_id'] = auth()->id();
        $data['item_type'] = $data['item_type'] ?? '';
        $data['bom_number'] = $this->generateBomNumber();
        // A BOM is never Active on create — it must pass activate()'s
        // validation first (see activate() below). Any 'status' the client
        // sent is intentionally ignored here.
        $data['status'] = 'Draft';

        return BomHeader::create($data);
    }

    private function generateBomNumber(): string
    {
        $count = BomHeader::where('organization_id', auth()->user()->organization_id)->count();
        return 'BOM-' . str_pad((string) ($count + 1), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Activates a Draft BOM after validating it's actually usable for
     * production, then retires any other Active BOM for the same product
     * (only one Active BOM per product is allowed).
     */
    public function activate($id)
    {
        $bom = BomHeader::with(['components', 'operations'])
            ->where('user_id', auth()->id())
            ->findOrFail($id);

        if ($bom->components->isEmpty()) {
            return response()->json(['message' => 'This BOM has no materials. Add at least one material before activating.'], 422);
        }

        if ($bom->operations->isEmpty()) {
            return response()->json(['message' => 'This BOM has no operations. Add at least one operation before activating.'], 422);
        }

        $itemCodes = $bom->components->pluck('component')->filter();
        $existingItemCodes = InventoryStock::whereIn('item_code', $itemCodes)->pluck('item_code');
        $missingItemCodes = $itemCodes->diff($existingItemCodes);
        if ($missingItemCodes->isNotEmpty()) {
            return response()->json([
                'message' => 'Cannot activate: material(s) no longer exist in the Item Master: ' . $missingItemCodes->implode(', '),
            ], 422);
        }

        $departmentNames = $bom->operations->pluck('department')->filter();
        if ($departmentNames->isNotEmpty()) {
            $activeDepartmentNames = Department::where('organization_id', auth()->user()->organization_id)
                ->where('is_active', true)
                ->whereIn('name', $departmentNames)
                ->pluck('name');
            $inactiveDepartments = $departmentNames->unique()->diff($activeDepartmentNames);
            if ($inactiveDepartments->isNotEmpty()) {
                return response()->json([
                    'message' => 'Cannot activate: operation department(s) are missing or inactive: ' . $inactiveDepartments->implode(', '),
                ], 422);
            }
        }

        if ($bom->components->contains(fn ($c) => (float) $c->quantity <= 0)) {
            return response()->json(['message' => 'Cannot activate: every material must have a quantity greater than zero.'], 422);
        }

        if ($bom->operations->contains(fn ($o) => (float) $o->run_time <= 0)) {
            return response()->json(['message' => 'Cannot activate: every operation must have a cycle time greater than zero.'], 422);
        }

        $duplicateItemCodes = $bom->components->pluck('component')->duplicates();
        if ($duplicateItemCodes->isNotEmpty()) {
            return response()->json(['message' => 'Cannot activate: duplicate material(s) found: ' . $duplicateItemCodes->unique()->implode(', ')], 422);
        }

        $duplicateSeqs = $bom->operations->pluck('operation_seq')->duplicates();
        if ($duplicateSeqs->isNotEmpty()) {
            return response()->json(['message' => 'Cannot activate: duplicate operation sequence number(s) found: ' . $duplicateSeqs->unique()->implode(', ')], 422);
        }

        DB::transaction(function () use ($bom) {
            BomHeader::where('organization_id', auth()->user()->organization_id)
                ->where('item_code', $bom->item_code)
                ->where('status', 'Active')
                ->where('id', '!=', $bom->id)
                ->update(['status' => 'Inactive']);

            $bom->update(['status' => 'Active']);
        });

        return response()->json([
            'message' => 'BOM activated',
            'bom' => $bom->fresh(['components', 'operations']),
        ]);
    }

    public function destroy($id)
{
    // Find the BOM header to get the item_code
    $bom = BomHeader::where('user_id', auth()->id())
            ->findOrFail($id);

    $itemCode = $bom->item_code;

    // Get all BOM headers with the same item_code
     $boms = BomHeader::where('user_id', auth()->id())
            ->where('item_code', $itemCode)
            ->get();

    $totalComponentsDeleted = 0;
    $totalBomsDeleted = $boms->count();

    foreach ($boms as $bom) {
        // Delete all related components for each BOM
         $deletedComponents = BomComponent::where('user_id', auth()->id())
                ->where('bom_id', $bom->id)
                ->delete();

        $totalComponentsDeleted += $deletedComponents;

        // Delete the BOM itself
        $bom->delete();
    }

    return response()->json([
        'message' => "All BOMs with item_code '$itemCode' ($totalBomsDeleted BOM(s)) and $totalComponentsDeleted component(s) deleted successfully."
    ]);
}
public function update(Request $request, $id)
{
    // Validate incoming data
    $data = $request->validate([
        'item_type' => 'nullable|string',
        'item_code' => 'nullable|string',
        'item_name' => 'nullable|string',
        'vendor' => 'nullable|string',
        'alternate' => 'nullable|string',
        'revision' => 'nullable|string',
        'uom' => 'nullable|string',
        'implemented_only' => 'nullable|boolean',
        'effective_date' => 'nullable|date',
        'remarks' => 'nullable|string',
        'updated_at' => 'nullable|date',
        'created_by' => 'nullable|string',
        'revision_reason' => 'nullable|string',
        'parent_bom_id' => 'nullable|string',
        'revision_number' => 'nullable|integer',
        'document' => 'nullable|string',
    ]);

    // Find the BOM by ID
     $bom = BomHeader::where('user_id', auth()->id())
            ->findOrFail($id);

    // Log the previous state for revision before updating
    BomDeletionLog::create([
        'id' => \Illuminate\Support\Str::uuid()->toString(),
        'bom_id' => $bom->id, // same BOM ID
        'item_code' => $bom->item_code,
        'item_name' => $bom->item_name,
        'revision' => $bom->revision,
        'deleted_by' => $data['created_by'] ?? 'Unknown',
        'deleted_at' => now(),
        'reason' => $data['revision_reason'] ?? 'No reason provided',
    ]);

      if ($request->hasFile('document_file')) {
        // Delete old file if exists
        if ($bom->document) {
            Storage::delete($bom->document);
        }

        // Store new file and set path in data
        $data['document'] = $request->file('document_file')->store('bom/documents');
    }
    // Update the existing BOM with new data
    $bom->update($data);

    return response()->json([
        'message' => 'BOM updated successfully',
        'bom' => $bom,
    ]);
}

public function getByItemCode(Request $request)
{
    try {
        $itemCode = $request->query('item_code');

        if (!$itemCode) {
            return response()->json(['data' => []]);
        }

        $userId = auth()->id();

        if (!$userId) {
            return response()->json(['data' => []]);
        }

        $data = BomHeader::where('user_id', $userId)
            ->where('item_code', $itemCode)
            ->latest('revision_number')
            ->get();

        return response()->json(['data' => $data]);

    } catch (\Throwable $e) {
        Log::error($e->getMessage());

        return response()->json([
            'data' => [],
            'error' => $e->getMessage()
        ], 500);
    }
}
}
