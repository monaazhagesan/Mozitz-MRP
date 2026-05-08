<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MoveTransaction;
use App\Models\Job;
use Illuminate\Support\Facades\DB;

class MoveTransactionController extends Controller
{
    /**
     * Store a new move transaction
     */
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

            $job = Job::findOrFail($request->job_id);

            $transaction = MoveTransaction::create([
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
        $transactions = MoveTransaction::where('job_id', $jobId)
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
        $summary = MoveTransaction::select(
                'transaction_type',
                DB::raw('SUM(quantity) as total')
            )
            ->where('job_id', $jobId)
            ->groupBy('transaction_type')
            ->get();

        return response()->json([
            'data' => $summary
        ]);
    }
}