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
use Illuminate\Support\Facades\Storage;

class BomHeaderController extends Controller
{
   public function index()
{
    return BomHeader::where('status', 'Active')->get();
}

    public function show($id)
    {
       try {
        return BomHeader::with(['components', 'operations'])->findOrFail($id);
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
            'status' => 'nullable|string',
            'created_at' => 'nullable|date',
            'updated_at' => 'nullable|date',
            'created_by' => 'nullable|string',
            'revision_reason' => 'nullable|string',
            'parent_bom_id' => 'nullable|string',
            'revision_number' => 'nullable|integer',
            'document' => 'nullable|string',
        ]);

         $data['id'] = Str::uuid()->toString();
        return BomHeader::create($data);
    }

    public function destroy($id)
{
    // Find the BOM header to get the item_code
    $bom = \App\Models\BomHeader::findOrFail($id);
    $itemCode = $bom->item_code;

    // Get all BOM headers with the same item_code
    $boms = \App\Models\BomHeader::where('item_code', $itemCode)->get();

    $totalComponentsDeleted = 0;
    $totalBomsDeleted = $boms->count();

    foreach ($boms as $bom) {
        // Delete all related components for each BOM
        $deletedComponents = \App\Models\BomComponent::where('bom_id', $bom->id)->delete();
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
        'status' => 'nullable|string',
        'updated_at' => 'nullable|date',
        'created_by' => 'nullable|string',
        'revision_reason' => 'nullable|string',
        'parent_bom_id' => 'nullable|string',
        'revision_number' => 'nullable|integer',
        'document' => 'nullable|string',
    ]);

    // Find the BOM by ID
    $bom = BomHeader::findOrFail($id);

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
    return BomHeader::where('item_code', $request->item_code)
        ->orderByDesc('revision_number')
        ->get();
}
}
