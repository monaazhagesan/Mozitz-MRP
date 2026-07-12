<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MaterialIssue;
use App\Models\MaterialIssueItem;
use App\Models\InventoryStock;
use App\Models\Job;
use App\Models\JobAllocation;
use App\Models\JobQuantity;
use App\Models\StockTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class MaterialIssueController extends Controller
{
    const TERMINAL_JOB_STATUSES = ['Completed', 'Closed', 'Cancelled', 'Ready for Dispatch'];

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

    /**
     * Job material issue: atomically validates, records, and applies stock
     * movement for one or more BOM components issued against a job.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'job_number' => 'required|string',
            'warehouse' => 'nullable|string',
            'issued_by' => 'nullable|string',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'required|string',
            'items.*.item_name' => 'nullable|string',
            'items.*.uom' => 'nullable|string',
            'items.*.issued_qty' => 'required|numeric|min:0.0001',
        ]);

        DB::beginTransaction();

        try {
            $job = Job::where('user_id', auth()->id())
                ->where('job_number', $data['job_number'])
                ->first();

            if (!$job) {
                DB::rollBack();
                return response()->json(['message' => 'Job not found'], 404);
            }

            if (in_array($job->status, self::TERMINAL_JOB_STATUSES)) {
                DB::rollBack();
                return response()->json([
                    'message' => "Cannot issue to a {$job->status} job",
                ], 422);
            }

            // Validate every line before applying any of them.
            $errors = [];
            $locked = [];

            foreach ($data['items'] as $item) {
                $issuedQty = (float) $item['issued_qty'];

                $allocation = JobAllocation::where('job_number', $data['job_number'])
                    ->where('item_code', $item['item_code'])
                    ->where('status', 'allocated')
                    ->lockForUpdate()
                    ->first();

                $stock = InventoryStock::where('user_id', auth()->id())
                    ->where('item_code', $item['item_code'])
                    ->lockForUpdate()
                    ->first();

                $remainingReserved = $allocation ? (float) $allocation->allocated_quantity : 0;
                $onHand = $stock ? (float) $stock->quantity_on_hand : 0;
                $maxIssuable = min($remainingReserved, $onHand);

                if ($issuedQty > $maxIssuable) {
                    $errors[] = [
                        'item_code' => $item['item_code'],
                        'requested' => $issuedQty,
                        'max_issuable' => $maxIssuable,
                    ];
                    continue;
                }

                $locked[] = [
                    'item' => $item,
                    'allocation' => $allocation,
                    'stock' => $stock,
                    'issued_qty' => $issuedQty,
                ];
            }

            if (!empty($errors)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'One or more items exceed issuable quantity',
                    'errors' => $errors,
                ], 422);
            }

            // 1. Create Issue Header
            $issue = MaterialIssue::create([
                'user_id' => auth()->id(),
                'issue_no' => $request->issue_no ?? ('ISS-' . str_pad((string) (MaterialIssue::where('user_id', auth()->id())->count() + 1), 5, '0', STR_PAD_LEFT)),
                'issue_date' => $request->issue_date ?? now()->toDateString(),
                'issue_type' => 'job',
                'reference_no' => $data['job_number'],
                'reference_name' => $job->product_name,
                'issued_by' => $data['issued_by'] ?? null,
                'warehouse' => $data['warehouse'] ?? null,
                'remarks' => $data['remarks'] ?? null,
                'status' => 'Issued',
            ]);

            // 2. Apply each line: decrement stock + allocation, write audit trail.
            foreach ($locked as $entry) {
                $item = $entry['item'];
                $issuedQty = $entry['issued_qty'];
                $stock = $entry['stock'];
                $allocation = $entry['allocation'];

                if ($stock) {
                    $stock->quantity_on_hand = max(0, (float) $stock->quantity_on_hand - $issuedQty);
                    $stock->allocated_quantity = max(0, (float) $stock->allocated_quantity - $issuedQty);
                    $stock->save();
                }

                if ($allocation) {
                    $allocation->allocated_quantity = max(0, (float) $allocation->allocated_quantity - $issuedQty);
                    $allocation->status = $allocation->allocated_quantity <= 0 ? 'consumed' : 'allocated';
                    $allocation->save();
                }

                StockTransaction::create([
                    'user_id' => auth()->id(),
                    'item_code' => $item['item_code'],
                    'transaction_type' => 'Issue',
                    'reference_type' => 'Job',
                    'reference_number' => $data['job_number'],
                    'quantity' => -$issuedQty,
                    'notes' => "Issued {$issuedQty} to job {$data['job_number']}",
                ]);

                MaterialIssueItem::create([
                    'material_issue_id' => $issue->id,
                    'item_code' => $item['item_code'],
                    'item_name' => $item['item_name'] ?? null,
                    'uom' => $item['uom'] ?? null,
                    'issued_qty' => $issuedQty,
                    'available_stock' => $stock ? (float) $stock->quantity_on_hand : 0,
                ]);

                // Keep the job's Quantities snapshot (shown in View Job / Planning)
                // in sync with what's actually been issued.
                $jobQuantity = JobQuantity::where('job_id', $job->id)
                    ->where('component', $item['item_code'])
                    ->first();

                if ($jobQuantity) {
                    $jobQuantity->issued = (float) $jobQuantity->issued + $issuedQty;
                    $jobQuantity->open = max(0, (float) $jobQuantity->required - $jobQuantity->issued);
                    $jobQuantity->save();
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Material issue created successfully',
                'data' => $issue->load('items'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Material issue store FAILED', [
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'message' => 'Failed to create material issue',
                'error' => $e->getMessage(),
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