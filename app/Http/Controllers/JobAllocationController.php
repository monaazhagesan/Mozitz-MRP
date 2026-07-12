<?php

namespace App\Http\Controllers;

use App\Models\JobAllocation;
use App\Models\InventoryStock;
use App\Models\StockTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class JobAllocationController extends Controller
{
    public function index(Request $request)
    {
        $query = JobAllocation::query();

        if ($request->has('job_number')) {
            $query->where('job_number', $request->query('job_number'));
        }

        return $query->get();
    }

    public function show($id)
    {
        return JobAllocation::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'job_number' => 'nullable|string',
            'item_code' => 'nullable|string',
            'allocated_quantity' => 'nullable|numeric',
            'allocation_date' => 'nullable|date',
            'status' => 'nullable|string',
            'created_at' => 'nullable|date',
            'updated_at' => 'nullable|date',
        ]);

        return JobAllocation::create($data);
    }

    public function update(Request $request, $id)
    {
        $allocation = JobAllocation::findOrFail($id);

        $data = $request->validate([
            'allocated_quantity' => 'nullable|numeric',
            'status' => 'nullable|string',
        ]);

        $allocation->update($data);

        return response()->json($allocation);
    }

    public function active(Request $request)
    {
        $jobNumbers = $request->input('job_numbers', []);

        $rows = JobAllocation::whereIn('job_number', $jobNumbers)
            ->where('status', 'allocated')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function breakup(Request $request)
    {
        $itemCode = $request->input('item_code');
        $jobNumbers = $request->input('job_numbers', []);

        $rows = JobAllocation::where('item_code', $itemCode)
            ->whereIn('job_number', $jobNumbers)
            ->where('status', 'allocated')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function deallocate(Request $request)
    {
        $jobNumber = $request->input('job_number');

        JobAllocation::where('job_number', $jobNumber)
            ->where('status', 'allocated')
            ->update(['status' => 'released', 'allocated_quantity' => 0]);

        return response()->json(['message' => 'Deallocated']);
    }

    /**
     * Issue material against a job's reservation: reduces both on-hand and
     * reserved quantity by the issued amount, and writes an audit entry.
     * Blocks (422) if the issued quantity exceeds what remains reserved.
     */
    public function issue(Request $request, $id)
    {
        $data = $request->validate([
            'issued_qty' => 'required|numeric|min:0.0001',
        ]);

        DB::beginTransaction();

        try {
            $allocation = JobAllocation::where('id', $id)->lockForUpdate()->firstOrFail();
            $issuedQty = (float) $data['issued_qty'];
            $remaining = (float) $allocation->allocated_quantity;

            if ($issuedQty > $remaining) {
                DB::rollBack();

                return response()->json([
                    'message' => 'Issued quantity exceeds remaining reserved quantity',
                    'remaining' => $remaining,
                ], 422);
            }

            $stock = InventoryStock::where('item_code', $allocation->item_code)
                ->lockForUpdate()
                ->first();

            if ($stock) {
                $stock->quantity_on_hand = max(0, (float) $stock->quantity_on_hand - $issuedQty);
                $stock->allocated_quantity = max(0, (float) $stock->allocated_quantity - $issuedQty);
                $stock->save();
            }

            $allocation->allocated_quantity = max(0, $remaining - $issuedQty);
            $allocation->status = $allocation->allocated_quantity <= 0 ? 'consumed' : 'allocated';
            $allocation->save();

            StockTransaction::create([
                'user_id' => Auth::id(),
                'item_code' => $allocation->item_code,
                'transaction_type' => 'Issue',
                'reference_type' => 'Job',
                'reference_number' => $allocation->job_number,
                'quantity' => -$issuedQty,
                'notes' => "Issued {$issuedQty} to job {$allocation->job_number}",
            ]);

            DB::commit();

            return response()->json([
                'allocation' => $allocation,
                'stock' => $stock,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            return response()->json(['message' => 'Allocation not found'], 404);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
