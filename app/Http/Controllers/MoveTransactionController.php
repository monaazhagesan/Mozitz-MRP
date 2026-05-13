<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MoveTransaction;
use App\Models\Job;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;


class MoveTransactionController extends Controller
{
    public function __construct()
    {
        $this->middleware('web');
    }


    public function store(Request $request)
    {
        $request->validate([
            'job_id' => 'required|exists:jobs,id',
            'seq' => 'required|integer',
            'transaction_type' => 'required|in:start,move,reject,scrap,complete',
            'quantity' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $job = Job::where('user_id', auth()->id())
                ->findOrFail($request->job_id);

            $transaction = MoveTransaction::create([
                'user_id' => auth()->id(),
                'job_id' => $request->job_id,
                'seq' => $request->seq,
                'operation_name' => $request->operation_name,
                'transaction_type' => $request->transaction_type,
                'quantity' => $request->quantity,
                'from_status' => $request->from_status,
                'to_status' => $request->to_status,
                'reason' => $request->reason,
                'user' => $request->user ?? 'System',
                'transaction_time' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Transaction saved successfully',
                'data' => $transaction
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to save transaction',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all transactions for a job
     */
     public function getByJob($jobId)
    {
        // ✅ Verify ownership
        $job = Job::where('user_id', auth()->id())
            ->findOrFail($jobId);

        $transactions = MoveTransaction::where('user_id', auth()->id())
            ->where('job_id', $job->id)
            ->orderBy('transaction_time', 'desc')
            ->get();

        return response()->json([
            'data' => $transactions
        ]);
    }

    /**
     * Summary (optional for dashboard)
     */
   public function summary($jobId)
    {
        // ✅ Verify ownership
        $job = Job::where('user_id', auth()->id())
            ->findOrFail($jobId);

        $summary = MoveTransaction::select(
                'transaction_type',
                DB::raw('SUM(quantity) as total')
            )
            ->where('user_id', auth()->id())
            ->where('job_id', $job->id)
            ->groupBy('transaction_type')
            ->get();

        return response()->json([
            'data' => $summary
        ]);
    }
}