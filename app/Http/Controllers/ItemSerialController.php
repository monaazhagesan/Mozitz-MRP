<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\ItemSerial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ItemSerialController extends Controller
{
    public function index(Request $request)
    {
        $items = InventoryStock::where('user_id', auth()->id())->get();
        $serials = ItemSerial::with('location')
            ->where('user_id', auth()->id())
            ->orderBy('created_at')
            ->get();

        $serialsByItem = $serials->groupBy('item_code');
        $itemsByCode = $items->keyBy('item_code');

        $serialRows = $serials->map(function (ItemSerial $s) use ($itemsByCode) {
            $item = $itemsByCode->get($s->item_code);
            return [
                'id' => $s->id,
                'item_code' => $s->item_code,
                'item_name' => $item->item_name ?? $s->item_code,
                'item_type' => $item->item_type ?? 'Product',
                'serial_number' => $s->serial_number,
                'location_id' => $s->location_id,
                'location_name' => $s->location?->location_name,
                'notes' => $s->notes,
                'created_at' => $s->created_at,
                'is_synthetic' => false,
            ];
        });

        $unserializedRows = $items
            ->map(function (InventoryStock $item) use ($serialsByItem) {
                $itemSerials = $serialsByItem->get($item->item_code, collect());
                $serializedCount = $itemSerials->count();
                $onHand = (float) ($item->quantity_on_hand ?? 0);
                $remainder = round($onHand - $serializedCount, 3);

                return [
                    'id' => $item->id,
                    'item_code' => $item->item_code,
                    'item_name' => $item->item_name,
                    'item_type' => $item->item_type ?? 'Product',
                    'auto_generate_serial' => (bool) $item->auto_generate_serial,
                    'uom' => $item->uom,
                    'quantity' => max(0, $remainder),
                    'has_serials' => $serializedCount > 0,
                    'show_by_default' => $serializedCount === 0 || $remainder > 0.0001,
                    'is_synthetic' => true,
                ];
            })
            ->values();

        $stats = [
            'total_serials' => $serials->count(),
            'items_tracked' => $serialsByItem->count(),
            'unserialized_stock' => (float) $unserializedRows->sum('quantity'),
        ];

        $trackingEnabled = $serials->count() > 0 || $items->contains(fn (InventoryStock $i) => (bool) $i->auto_generate_serial);

        return response()->json([
            'serials' => $serialRows->values(),
            'unserialized' => $unserializedRows,
            'stats' => $stats,
            'tracking_enabled' => $trackingEnabled,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'item_code' => 'required|string|exists:inventory_stock,item_code',
            'location_id' => 'nullable|string|exists:locations,id',
            'notes' => 'nullable|string|max:1000',
            'serial_numbers' => 'required|array|min:1',
            'serial_numbers.*' => 'required|string|max:100',
        ]);

        $item = InventoryStock::where('user_id', auth()->id())
            ->where('item_code', $request->item_code)
            ->first();

        if (!$item) {
            return response()->json(['message' => "Item {$request->item_code} not found"], 422);
        }

        if (!$item->auto_generate_serial) {
            return response()->json(['message' => "Serial tracking is not enabled for {$item->item_code}."], 422);
        }

        $serialNumbers = collect($request->serial_numbers)->map(fn ($s) => trim($s))->filter();
        if ($serialNumbers->count() !== $serialNumbers->unique()->count()) {
            return response()->json(['message' => 'Duplicate serial numbers in this submission.'], 422);
        }

        $existing = ItemSerial::where('user_id', auth()->id())
            ->whereIn('serial_number', $serialNumbers->values())
            ->pluck('serial_number');
        if ($existing->isNotEmpty()) {
            return response()->json(['message' => "Serial number(s) already in use: {$existing->join(', ')}"], 422);
        }

        $serializedCount = ItemSerial::where('user_id', auth()->id())->where('item_code', $item->item_code)->count();
        $remainder = round((float) $item->quantity_on_hand - $serializedCount, 3);
        if ($serialNumbers->count() > $remainder + 0.0001) {
            return response()->json([
                'message' => "Cannot add {$serialNumbers->count()} serial number(s) — only {$remainder} unit(s) of {$item->item_code} are unserialized.",
            ], 422);
        }

        DB::beginTransaction();
        try {
            $created = [];
            foreach ($serialNumbers as $serial) {
                $created[] = ItemSerial::create([
                    'id' => (string) Str::uuid(),
                    'user_id' => auth()->id(),
                    'item_code' => $item->item_code,
                    'serial_number' => $serial,
                    'location_id' => $request->location_id,
                    'notes' => $request->notes,
                ]);
            }
            DB::commit();

            return response()->json(['message' => 'Serial numbers added', 'items' => $created], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Error saving serial numbers',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy($id)
    {
        ItemSerial::where('user_id', auth()->id())
            ->where('id', $id)
            ->delete();

        return response()->json(['message' => 'Serial number deleted successfully']);
    }
}
