<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Job;
use App\Models\JobOperation;
use App\Models\JobComponent;
use App\Models\JobQuantity;
use App\Models\JobMove;
use App\Models\JobLot;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\InventoryStock;

class JobController extends Controller
{

     public function __construct()
    {
        $this->middleware('web');
    }

    /**
     * CREATE FULL JOB (HEADER + ALL CHILD TABLES)
     */
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {

        $existingJob = Job::where('user_id', Auth::id())
    ->where('job_number', $request->job_number)
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

            $stock = InventoryStock::where('user_id', Auth::id())
    ->where('item_code', $job->assembly)
    ->first();

if ($stock) {

    $qty = (float) $job->start; // or better: use a proper quantity field

    $stock->allocated_quantity = (float) $stock->allocated_quantity + $qty;

    $stock->save();
} else {
    \Log::warning('Stock not found for job allocation', [
        'user_id' => Auth::id(),
        'item_code' => $job->assembly
    ]);
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
            'lots'
       ])->where('user_id', auth()->id())
  ->findOrFail($id);

        return response()->json($job);
    }

    /**
     * LIST JOBS
     */
    public function index()
{
   return Job::where('user_id', auth()->id())
    ->with([
        'components',
        'quantities',
        'operations',
        'moves',
        'lots'
    ])
    ->latest()
    ->paginate(20);
}

/**
 * DELETE JOB WITH ALL RELATED DATA
 */
public function destroy($id)
{
    DB::beginTransaction();

    try {

        $job = Job::where('user_id', auth()->id())
    ->findOrFail($id);

        // Delete child records first
        $job->components()->delete();
        $job->quantities()->delete();
        $job->operations()->delete();
        $job->moves()->delete();
        $job->lots()->delete();

        // 🔥 RELEASE ALLOCATED STOCK BEFORE DELETE
$stock = InventoryStock::where('user_id', auth()->id())
    ->where('item_code', $job->assembly)
    ->first();

if ($stock) {

    $qty = (float) $job->start;

    $stock->allocated_quantity =
        max(0, (float) $stock->allocated_quantity - $qty);

    $stock->save();
}
        // Delete main job
        $job->delete();

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Job deleted successfully'
        ], 200);

    } catch (\Exception $e) {

        DB::rollBack();

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

        $job = Job::where('user_id', auth()->id())
    ->findOrFail($id);

        // update job header fields
        $job->update([
            'status' => $request->status ?? $job->status,
            'priority' => $request->priority ?? $job->priority,
            'notes' => $request->notes ?? $job->notes,
            'start_date' => $request->start_date ?? $job->start_date,
            'completion_date' => $request->completion_date ?? $job->completion_date,
        ]);

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

        return response()->json([
            'success' => false,
            'message' => 'Job update failed',
            'error' => $e->getMessage()
        ], 500);
    }
}
public function updateMoves(Request $request)
{
    DB::beginTransaction();

    try {

        $jobId = $request->job_id;
        $moves = $request->moves;

        // 1️⃣ Update job_moves table
        foreach ($moves as $mv) {

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

        // 2️⃣ Update job status (IMPORTANT FIX)
        if ($request->has('job_status')) {
            Job::where('user_id', auth()->id())
    ->where('id', $jobId)
    ->update([
        'status' => $request->job_status
    ]);
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Job moves + status updated successfully'
        ]);

    } catch (\Exception $e) {

        DB::rollBack();

        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
}
public function updateMoveTransaction(Request $request)
{
    $jobId = $request->job_id;

    // ✅ Verify ownership
    $job = Job::where('user_id', auth()->id())
        ->findOrFail($jobId);

    $moves = $request->moves;

    foreach ($moves as $mv) {

        $row = JobMove::where('job_id', $job->id)
            ->where('seq', $mv['seq'])
            ->first();

        if ($row) {
            $row->in_queue = $mv['in_queue'];
            $row->running = $mv['running'];
            $row->to_move = $mv['to_move'];
            $row->rejected = $mv['rejected'];
            $row->scrapped = $mv['scrapped'];
            $row->completed = $mv['completed'];
            $row->save();
        }
    }

    return response()->json([
        'success' => true,
        'message' => 'Moves updated'
    ]);
}

public function bulkUpdate(Request $request)
{
    DB::beginTransaction();

    try {

        $jobId = $request->job_id;

        // ✅ Verify ownership
        $job = Job::where('user_id', auth()->id())
            ->findOrFail($jobId);

        $moves = $request->moves;

        foreach ($moves as $move) {

            JobMove::updateOrCreate(
                [
                    'job_id' => $job->id,
                    'seq' => $move['seq'],
                ],
                [
                    'in_queue' => $move['in_queue'] ?? 0,
                    'running' => $move['running'] ?? 0,
                    'to_move' => $move['to_move'] ?? 0,
                    'rejected' => $move['rejected'] ?? 0,
                    'scrapped' => $move['scrapped'] ?? 0,
                    'completed' => $move['completed'] ?? 0,
                ]
            );
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Move updated successfully'
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