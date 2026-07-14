<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Job;
use App\Models\JobOperation;
use App\Models\JobComponent;
use App\Models\JobQuantity;
use App\Models\JobMove;
use App\Models\JobLot;
use App\Models\JobAllocation;
use App\Models\StockTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\InventoryStock;
use App\Models\MoveTransaction;

class JobController extends Controller
{
    // Statuses that mean the job is no longer actively consuming reserved stock.
    const TERMINAL_STATUSES = ['Completed', 'Closed', 'Cancelled', 'Ready for Dispatch'];

     public function __construct()
    {
        $this->middleware('web');
    }

    /**
     * Reserve BOM component quantities for a job. Locks each InventoryStock row,
     * validates availability for all components before committing any of them,
     * and returns a shortage list (or null) so the caller can roll back on failure.
     */
    private function reserveComponents($components, string $jobNumber, float $jobQty, ?array &$shortages = null)
    {
        $shortages = [];
        $locked = [];

        foreach ($components as $comp) {
            $itemCode = $comp['component'] ?? null;
            // $comp['qty'] is the per-assembly BOM quantity; the total to
            // reserve for this job is that times the job's own quantity.
            $qty = (float) ($comp['qty'] ?? 0) * $jobQty;
            if (!$itemCode || $qty <= 0) {
                continue;
            }

            $stock = InventoryStock::where('item_code', $itemCode)
                ->lockForUpdate()
                ->first();

            $onHand = $stock ? (float) $stock->quantity_on_hand : 0;
            $allocated = $stock ? (float) $stock->allocated_quantity : 0;
            $available = $onHand - $allocated;

            if ($qty > $available) {
                $shortages[] = [
                    'item_code' => $itemCode,
                    'item_name' => $stock->item_name ?? $itemCode,
                    'required' => $qty,
                    'available' => $available,
                    'deficit' => $qty - $available,
                ];
                continue;
            }

            $locked[] = ['stock' => $stock, 'item_code' => $itemCode, 'qty' => $qty];
        }

        if (!empty($shortages)) {
            return false;
        }

        foreach ($locked as $entry) {
            $entry['stock']->allocated_quantity = (float) $entry['stock']->allocated_quantity + $entry['qty'];
            $entry['stock']->save();

            JobAllocation::create([
                'id' => (string) Str::uuid(),
                'job_number' => $jobNumber,
                'item_code' => $entry['item_code'],
                'allocated_quantity' => $entry['qty'],
                'allocation_date' => now(),
                'status' => 'allocated',
            ]);

            StockTransaction::create([
                'user_id' => Auth::id(),
                'item_code' => $entry['item_code'],
                'transaction_type' => 'Reservation',
                'reference_type' => 'Job',
                'reference_number' => $jobNumber,
                'quantity' => $entry['qty'],
                'notes' => "Reserved for job {$jobNumber}",
            ]);
        }

        return true;
    }

    /**
     * Release the remaining (unissued) reserved quantity for a job's active
     * allocations back to available stock. Does NOT touch quantity_on_hand.
     */
    private function releaseAllocations(string $jobNumber, string $reason)
    {
        $allocations = JobAllocation::where('job_number', $jobNumber)
            ->where('status', 'allocated')
            ->get();

        foreach ($allocations as $allocation) {
            $stock = InventoryStock::where('item_code', $allocation->item_code)
                ->lockForUpdate()
                ->first();

            $remaining = (float) $allocation->allocated_quantity;

            if ($stock && $remaining > 0) {
                $stock->allocated_quantity = max(0, (float) $stock->allocated_quantity - $remaining);
                $stock->save();

                StockTransaction::create([
                    'user_id' => Auth::id(),
                    'item_code' => $allocation->item_code,
                    'transaction_type' => 'Release',
                    'reference_type' => 'Job',
                    'reference_number' => $jobNumber,
                    'quantity' => $remaining,
                    'notes' => $reason,
                ]);
            }

            $allocation->status = 'released';
            $allocation->allocated_quantity = 0;
            $allocation->save();
        }
    }

    /**
     * Reconcile a job's reservation against an edited BOM: for each component,
     * reserve additional qty (validated against available stock) or release
     * excess qty back, relative to the existing allocated_quantity.
     */
    private function reconcileComponents($components, string $jobNumber, float $jobQty, ?array &$shortages = null)
    {
        $shortages = [];

        foreach ($components as $comp) {
            $itemCode = $comp['component'] ?? null;
            // $comp['qty'] is the (possibly edited) per-assembly BOM quantity;
            // the total reservation target is that times the job's quantity.
            $newQty = (float) ($comp['qty'] ?? 0) * $jobQty;
            if (!$itemCode) {
                continue;
            }

            $allocation = JobAllocation::where('job_number', $jobNumber)
                ->where('item_code', $itemCode)
                ->where('status', 'allocated')
                ->first();

            $existingQty = $allocation ? (float) $allocation->allocated_quantity : 0;
            $delta = $newQty - $existingQty;

            if (abs($delta) < 0.0001) {
                continue;
            }

            $stock = InventoryStock::where('item_code', $itemCode)
                ->lockForUpdate()
                ->first();

            if ($delta > 0) {
                $onHand = $stock ? (float) $stock->quantity_on_hand : 0;
                $allocated = $stock ? (float) $stock->allocated_quantity : 0;
                $available = $onHand - $allocated;

                if ($delta > $available) {
                    $shortages[] = [
                        'item_code' => $itemCode,
                        'item_name' => $stock->item_name ?? $itemCode,
                        'required' => $delta,
                        'available' => $available,
                        'deficit' => $delta - $available,
                    ];
                    continue;
                }
            }

            if ($stock) {
                $stock->allocated_quantity = max(0, (float) $stock->allocated_quantity + $delta);
                $stock->save();
            }

            if ($allocation) {
                $allocation->allocated_quantity = max(0, $existingQty + $delta);
                if ($allocation->allocated_quantity <= 0) {
                    $allocation->status = 'released';
                }
                $allocation->save();
            } elseif ($delta > 0) {
                JobAllocation::create([
                    'id' => (string) Str::uuid(),
                    'job_number' => $jobNumber,
                    'item_code' => $itemCode,
                    'allocated_quantity' => $delta,
                    'allocation_date' => now(),
                    'status' => 'allocated',
                ]);
            }

            StockTransaction::create([
                'user_id' => Auth::id(),
                'item_code' => $itemCode,
                'transaction_type' => 'Reservation Adjustment',
                'reference_type' => 'Job',
                'reference_number' => $jobNumber,
                'quantity' => $delta,
                'notes' => "BOM qty changed for job {$jobNumber} ({$existingQty} -> {$newQty})",
            ]);
        }

        return empty($shortages);
    }

    /**
     * CREATE FULL JOB (HEADER + ALL CHILD TABLES)
     */
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {

        $existingJob = Job::where('job_number', $request->job_number)
    ->first();

if ($existingJob) {
    return response()->json([
        'success' => false,
        'message' => 'Job already exists for this user'
    ], 409);
}

            // 1. CREATE JOB HEADER
            $job = Job::create([
                'user_id' => Auth::id(),
                'job_number' => $request->job_number,
                'assembly' => $request->assembly,
                'product_name' => $request->product_name,
                'sales_order_number' => $request->sales_order_number,
                'customer_id' => $request->customer_id,
                'customer_name' => $request->customer_name,
                'class' => $request->class ?? 'Standard',
                'status' => $request->status ?? 'Pending',
                'type' => $request->type ?? 'Standard',
                'uom' => $request->uom ?? 'Ea',
                'is_firm' => $request->is_firm ?? false,
                'start' => $request->start,
                'revision' => $request->revision ?? 1,
                'alternate' => $request->alternate ?? 0,
                'mrp_net' => $request->mrp_net ?? 0,
                'start_date' => $request->start_date,
                'completion_date' => $request->completion_date,
                'priority' => $request->priority ?? 'Medium',
                'notes' => $request->notes,
                'bom_id' => $request->bom_id ?? null,
            ]);

            // 2. JOB COMPONENTS
            if (!empty($request->components)) {
                foreach ($request->components as $comp) {
                    JobComponent::create([
                        'job_id' => $job->id,
                        'seq' => $comp['seq'] ?? 10,
                        'component' => $comp['component'],
                        'description' => $comp['description'] ?? null,
                        'qty' => $comp['qty'] ?? 0,
                        'uom' => $comp['uom'] ?? 'pcs',
                        'status' => $comp['status'] ?? 'Available',
                    ]);
                }
            }

            // 3. JOB QUANTITIES
            if (!empty($request->quantities)) {
                foreach ($request->quantities as $q) {
                    JobQuantity::create([
                        'job_id' => $job->id,
                        'component' => $q['component'],
                        'uom' => $q['uom'] ?? 'pcs',
                        'basis' => $q['basis'] ?? 'Standard',
                        'per_assembly' => $q['per_assembly'] ?? 0,
                        'inverse_usage' => $q['inverse_usage'] ?? 0,
                        'yield' => $q['yield'] ?? 100,
                        'required' => $q['required'] ?? 0,
                        'issued' => $q['issued'] ?? 0,
                        'open' => $q['open'] ?? 0,
                        'on_hand' => $q['on_hand'] ?? 0,
                    ]);
                }
            }

            // 4. JOB OPERATIONS
            if (!empty($request->operations)) {
                foreach ($request->operations as $op) {
                    JobOperation::create([
                        'job_id' => $job->id,
                        'sequence' => $op['sequence'] ?? null,
                        'operation_code' => $op['operation_code'],
                        'description' => $op['description'] ?? null,
                        'work_center' => $op['work_center'] ?? null,
                        'department' => $op['department'] ?? null,
                        'run_time' => $op['run_time'] ?? 0,
                        'status' => $op['status'] ?? 'Pending',
                    ]);
                }
            }

            // 5. JOB MOVES
            if (!empty($request->moves)) {
                foreach ($request->moves as $mv) {
                    JobMove::create([
                        'job_id' => $job->id,
                        'seq' => $mv['seq'] ?? 10,
                        'in_queue' => $mv['in_queue'] ?? 0,
                        'running' => $mv['running'] ?? 0,
                        'to_move' => $mv['to_move'] ?? 0,
                        'rejected' => $mv['rejected'] ?? 0,
                        'scrapped' => $mv['scrapped'] ?? 0,
                        'completed' => $mv['completed'] ?? 0,
                    ]);
                }
            }

            // 6. JOB LOTS
            if (!empty($request->lots)) {
                foreach ($request->lots as $lot) {
                    JobLot::create([
                        'job_id' => $job->id,
                        'lot_number' => $lot['lot_number'] ?? null,
                        'build_seq' => $lot['build_seq'] ?? null,
                        'task' => $lot['task'] ?? null,
                    ]);
                }
            }

            // Reserve BOM component quantities for active jobs, blocking on shortage.
            if (in_array($job->status, ['Pending', 'In Progress']) && !empty($request->components)) {
                $shortages = [];
                $ok = $this->reserveComponents($request->components, $job->job_number, (float) $job->start, $shortages);

                if (!$ok) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'Insufficient stock to reserve this job',
                        'shortages' => $shortages,
                    ], 422);
                }
            }

            // Link back to the sales order this job fulfills, if one was
            // entered and matches a real order for this user. Only advances
            // orders still in their pre-production state, so an order that's
            // already Processing/Delivered/Cancelled isn't silently overwritten.
            if (!empty($job->sales_order_number)) {
                $linkedOrder = \App\Models\Order::where('order_no', $job->sales_order_number)
                    ->first();

                if ($linkedOrder && in_array($linkedOrder->status, ['Awaiting Confirmation', 'Confirmed'])) {
                    $linkedOrder->status = 'Processing';
                    $linkedOrder->save();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Job created successfully',
                'data' => $job->load([
                    'components',
                    'quantities',
                    'operations',
                    'moves',
                    'lots'
                ])
            ], 201);

        } catch (\Throwable $e) {

    DB::rollBack();

    \Log::error('Job store FAILED', [
        'message' => $e->getMessage(),
        'line' => $e->getLine(),
        'file' => $e->getFile(),
        'trace' => $e->getTraceAsString(),
        'request' => $request->all()
    ]);

    return response()->json([
        'success' => false,
        'message' => $e->getMessage()
    ], 500);
}
    }

    /**
     * GET JOB WITH ALL DETAILS
     */
    public function show($id)
    {
        $job = Job::with([
            'components',
            'quantities',
            'operations',
            'moves',
            'lots',
            'moveTransactions'
       ])->findOrFail($id);

        return response()->json($job);
    }

    /**
     * LIST JOBS
     */
    public function index(Request $request)
{
   $query = Job::with([
        'components',
        'quantities',
        'operations',
        'moves',
        'lots',
        'moveTransactions'
    ])
    ->latest();

    if ($request->has('job_number')) {
        $query->where('job_number', $request->query('job_number'));
    }

    if ($request->filled('sales_order_number')) {
        $query->where('sales_order_number', $request->query('sales_order_number'));
    }

    return $query->paginate(20);
}

/**
 * DELETE JOB WITH ALL RELATED DATA
 */
public function destroy($id)
{
    DB::beginTransaction();

    try {

        $job = Job::findOrFail($id);

        // Delete child records first
        $job->components()->delete();
        $job->quantities()->delete();
        $job->operations()->delete();
        $job->moves()->delete();
        $job->lots()->delete();

        // Release any remaining reserved stock before delete
        $this->releaseAllocations($job->job_number, "Job {$job->job_number} deleted");

        // Delete main job
        $job->delete();

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Job deleted successfully'
        ], 200);

    } catch (\Exception $e) {

        DB::rollBack();

        \Log::error('Job delete FAILED', [
            'message' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => $e->getFile(),
            'job_id' => $id,
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Job deletion failed',
            'error' => $e->getMessage()
        ], 500);
    }
}

public function update(Request $request, $id)
{
    DB::beginTransaction();

    try {

        $job = Job::findOrFail($id);

        $previousStatus = $job->status;
        $newStatus = $request->status ?? $job->status;

        if ($previousStatus === 'Completed' && $newStatus !== $previousStatus) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'This job is Completed and can no longer be modified.',
            ], 422);
        }

        // update job header fields
        $job->update([
            'status' => $newStatus,
            'priority' => $request->priority ?? $job->priority,
            'notes' => $request->notes ?? $job->notes,
            'start_date' => $request->start_date ?? $job->start_date,
            'completion_date' => $request->completion_date ?? $job->completion_date,
        ]);

        // Status entered a terminal state from a non-terminal one: release remaining reserved stock.
        $wasTerminal = in_array($previousStatus, self::TERMINAL_STATUSES);
        $isTerminal = in_array($newStatus, self::TERMINAL_STATUSES);
        if ($isTerminal && !$wasTerminal) {
            $this->releaseAllocations($job->job_number, "Job {$job->job_number} marked {$newStatus}");
        }

        // BOM edited after job creation: reconcile reservation delta per component.
        if ($request->has('components') && !$isTerminal) {
            $shortages = [];
            $ok = $this->reconcileComponents($request->components, $job->job_number, (float) $job->start, $shortages);

            if (!$ok) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient stock to increase reservation for this job',
                    'shortages' => $shortages,
                ], 422);
            }
        }

        // 🔥 SAVE MOVE DATA HERE (THIS FIXES YOUR ISSUE)
        if ($request->moves) {
            foreach ($request->moves as $mv) {

                JobMove::updateOrCreate(
                    [
                        'job_id' => $job->id,
                        'seq' => $mv['seq'],
                    ],
                    [
                        'in_queue' => $mv['in_queue'] ?? 0,
                        'running' => $mv['running'] ?? 0,
                        'to_move' => $mv['to_move'] ?? 0,
                        'rejected' => $mv['rejected'] ?? 0,
                        'scrapped' => $mv['scrapped'] ?? 0,
                        'completed' => $mv['completed'] ?? 0,
                    ]
                );
            }
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Job updated successfully',
            'data' => $job->load([
                'components',
                'quantities',
                'operations',
                'moves'
            ])
        ]);

    } catch (\Exception $e) {

        DB::rollBack();

        \Log::error('Job update FAILED', [
            'message' => $e->getMessage(),
            'line' => $e->getLine(),
            'file' => $e->getFile(),
            'job_id' => $id,
            'request' => $request->all(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Job update failed',
            'error' => $e->getMessage()
        ], 500);
    }
}
// Persists a shop-floor move transaction atomically: job_moves state, the
// move_transactions audit log, job status, and — when the terminal
// operation's completed quantity increases — the resulting finished-goods
// stock posting. Previously these were 2-3 separate, non-atomic requests
// from the frontend, so a failure partway through could leave the audit
// log out of sync with the actual move state, or (before this endpoint
// existed at all) silently drop the move entirely.
// transaction_type -> the permission required to submit that kind of
// Shop Floor transaction. Checked against every type actually present in
// this request's batch, not just the first one, since a single call can
// carry a move + a reject together (see handleRejectTransaction on the
// frontend).
private const TRANSACTION_PERMISSIONS = [
    'start' => 'shopfloor.start',
    'move' => 'shopfloor.move',
    'reject' => 'shopfloor.reject',
    'scrap' => 'shopfloor.scrap',
    'delay' => 'shopfloor.log_delay',
];

public function updateMoves(Request $request)
{
    $transactions = $request->transactions ?? [];

    $requiredPermissions = collect($transactions)
        ->pluck('transaction_type')
        ->unique()
        ->map(fn ($type) => self::TRANSACTION_PERMISSIONS[$type] ?? null)
        ->filter()
        ->unique();

    foreach ($requiredPermissions as $permission) {
        if (!auth()->user()?->hasPermission($permission)) {
            return response()->json([
                'message' => 'You do not have permission to perform this Shop Floor action.',
            ], 403);
        }
    }

    DB::beginTransaction();

    try {
        $jobId = $request->job_id;

        $job = Job::findOrFail($jobId);

        $moves = $request->moves ?? [];

        $finishedGoodsDelta = 0.0;

        // 1️⃣ Update job_moves table, tracking any increase in completed qty.
        foreach ($moves as $mv) {
            $existing = JobMove::where('job_id', $jobId)
                ->where('seq', $mv['seq'])
                ->first();

            $previousCompleted = (float) ($existing->completed ?? 0);
            $newCompleted = (float) ($mv['completed'] ?? 0);

            if ($newCompleted > $previousCompleted) {
                $finishedGoodsDelta += $newCompleted - $previousCompleted;
            }

            JobMove::updateOrCreate(
                [
                    'job_id' => $jobId,
                    'seq' => $mv['seq'],
                ],
                [
                    'in_queue' => $mv['in_queue'] ?? 0,
                    'running' => $mv['running'] ?? 0,
                    'to_move' => $mv['to_move'] ?? 0,
                    'rejected' => $mv['rejected'] ?? 0,
                    'scrapped' => $mv['scrapped'] ?? 0,
                    'completed' => $mv['completed'] ?? 0,
                ]
            );
        }

        // 2️⃣ Log the move-transaction audit entries in the same transaction
        // as the state change they describe, instead of a separate request.
        foreach ($transactions as $txn) {
            MoveTransaction::create([
                'user_id' => auth()->id(),
                'job_id' => $jobId,
                'seq' => $txn['seq'],
                'operation_name' => $txn['operation_name'] ?? null,
                'transaction_type' => $txn['transaction_type'] ?? 'move',
                'quantity' => $txn['quantity'] ?? 0,
                'from_status' => $txn['from_status'] ?? null,
                'to_status' => $txn['to_status'] ?? null,
                'reason' => $txn['reason'] ?? null,
                'user' => $txn['user'] ?? 'System',
                'operator_name' => $txn['operator_name'] ?? null,
                'resource_id' => $txn['resource_id'] ?? null,
                'duration_minutes' => $txn['duration_minutes'] ?? null,
                'transaction_time' => now(),
            ]);
        }

        // 3️⃣ Update job status.
        if ($request->has('job_status')) {
            $job->status = $request->job_status;
            $job->save();
        }

        // 4️⃣ Quantity that just completed its final operation becomes
        // finished-goods stock for the job's assembly item.
        if ($finishedGoodsDelta > 0 && $job->assembly) {
            $stock = InventoryStock::where('item_code', $job->assembly)
                ->first();

            if ($stock) {
                $stock->quantity_on_hand = (float) $stock->quantity_on_hand + $finishedGoodsDelta;
                $stock->available_quantity = (float) $stock->quantity_on_hand - (float) $stock->allocated_quantity;
                $stock->save();
            } else {
                InventoryStock::create([
                    'user_id' => auth()->id(),
                    'item_code' => $job->assembly,
                    'item_name' => $job->product_name,
                    'item_type' => 'Product',
                    'uom' => $job->uom ?? 'Nos',
                    'quantity_on_hand' => $finishedGoodsDelta,
                    'allocated_quantity' => 0,
                    'available_quantity' => $finishedGoodsDelta,
                ]);
            }

            StockTransaction::create([
                'user_id' => auth()->id(),
                'item_code' => $job->assembly,
                'transaction_type' => 'Production',
                'reference_type' => 'Job',
                'reference_number' => $job->job_number,
                'quantity' => $finishedGoodsDelta,
                'notes' => "Completed via shop floor move transaction for job {$job->job_number}",
            ]);
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Job moves + status updated successfully',
            'finished_goods_posted' => $finishedGoodsDelta,
        ]);

    } catch (\Exception $e) {

        DB::rollBack();

        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
}
}