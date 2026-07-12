<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Job;
use App\Models\JobAllocation;
use App\Models\InventoryStock;
use App\Models\StockTransaction;

class ReconcileJobAllocations extends Command
{
    protected $signature = 'jobs:reconcile-allocations';

    protected $description = 'Release stale job_allocations rows and recompute inventory_stock.allocated_quantity from the surviving ones';

    const TERMINAL_STATUSES = ['Completed', 'Closed', 'Cancelled', 'Ready for Dispatch'];

    public function handle()
    {
        $activeJobNumbers = Job::whereNotIn('status', self::TERMINAL_STATUSES)
            ->pluck('job_number')
            ->all();

        // Step 1: release job_allocations rows whose job is no longer active
        // (or never existed as a real Job row — e.g. legacy localStorage-only jobs).
        $stale = JobAllocation::where('status', 'allocated')
            ->whereNotIn('job_number', $activeJobNumbers)
            ->get();

        foreach ($stale as $allocation) {
            DB::transaction(function () use ($allocation) {
                $allocation->status = 'released';
                $allocation->allocated_quantity = 0;
                $allocation->save();
            });
        }

        $this->info("Released {$stale->count()} stale allocation row(s).");

        // Step 2: recompute inventory_stock.allocated_quantity from the
        // surviving 'allocated' rows for every item — this also catches drift
        // that never had a job_allocations row at all (e.g. the pre-fix hack
        // in JobController that bumped allocated_quantity directly).
        $correctByItem = JobAllocation::where('status', 'allocated')
            ->selectRaw('item_code, SUM(allocated_quantity) as total')
            ->groupBy('item_code')
            ->pluck('total', 'item_code');

        $fixed = 0;

        InventoryStock::chunkById(100, function ($stocks) use ($correctByItem, &$fixed) {
            foreach ($stocks as $stock) {
                $correct = (float) ($correctByItem[$stock->item_code] ?? 0);
                $current = (float) $stock->allocated_quantity;

                if (abs($correct - $current) < 0.0001) {
                    continue;
                }

                DB::transaction(function () use ($stock, $correct, $current) {
                    $locked = InventoryStock::where('id', $stock->id)->lockForUpdate()->first();
                    $delta = $correct - $current;

                    $locked->allocated_quantity = $correct;
                    $locked->save();

                    StockTransaction::create([
                        'user_id' => $locked->user_id,
                        'item_code' => $locked->item_code,
                        'transaction_type' => 'Release',
                        'reference_type' => 'Reconciliation',
                        'reference_number' => null,
                        'quantity' => abs($delta),
                        'notes' => "Recomputed allocated_quantity from job_allocations ({$current} -> {$correct})",
                    ]);
                });

                $fixed++;
            }
        });

        $this->info("Corrected allocated_quantity on {$fixed} inventory item(s).");
    }
}
