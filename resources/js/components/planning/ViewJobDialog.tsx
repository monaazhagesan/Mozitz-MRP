import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ViewJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  // Sibling jobs whose notes trace back to this job as a rework request (the
  // same "from <job_number>" marker the Create Rework Job feature writes) —
  // used by the Costing section to roll rework cost into this job's total.
  linkedReworkJobs?: any[];
}

const CHART_COLORS = ["#3266ad", "#2f855a", "#c05621", "#9333ea", "#b91c1c", "#0891b2"];

// ---- Production Analytics computation helpers ----
// All operate on real captured data (move_transactions timestamps/operator/
// resource, job_moves quantities, and rate/routing masters) — anything that
// can't be derived from what's actually been captured is returned as `null`
// so the UI can show "—" instead of a fabricated number.

const TERMINAL_TXN_TYPES = ["move", "reject", "scrap", "complete"];

const txnTime = (t: any) => new Date(t.transaction_time || t.created_at).getTime();

const sortByTime = (txns: any[]) => [...txns].sort((a, b) => txnTime(a) - txnTime(b));

interface RunInterval {
  seq: number;
  minutes: number;
  operatorName: string | null;
  resourceId: string | null;
}

// Pairs each 'start' event on a seq with the next terminal event on that same
// seq — a seq can start/stop multiple times, so this can produce several
// intervals per seq, each carrying whichever operator/machine was recorded
// on the 'start' that opened it.
function computeRunIntervals(moveTransactions: any[]): RunInterval[] {
  const sorted = sortByTime(moveTransactions.filter((t) => t.transaction_type !== "delay"));
  const open: Record<number, { ts: number; operatorName: string | null; resourceId: string | null }> = {};
  const intervals: RunInterval[] = [];

  for (const t of sorted) {
    const ts = txnTime(t);
    if (t.transaction_type === "start") {
      open[t.seq] = { ts, operatorName: t.operator_name || null, resourceId: t.resource_id || null };
    } else if (TERMINAL_TXN_TYPES.includes(t.transaction_type) && open[t.seq]) {
      const o = open[t.seq];
      intervals.push({ seq: t.seq, minutes: Math.max(0, (ts - o.ts) / 60000), operatorName: o.operatorName, resourceId: o.resourceId });
      delete open[t.seq];
    }
  }
  return intervals;
}

function sumBy<T>(items: T[], key: (item: T) => string | number | null, value: (item: T) => number): Record<string, number> {
  const out: Record<string, number> = {};
  items.forEach((item) => {
    const k = key(item);
    if (k === null || k === undefined || k === "") return;
    out[String(k)] = (out[String(k)] || 0) + value(item);
  });
  return out;
}

// First transaction to whichever transaction last moved quantity to
// "Completed" (if the job has fully finished) or to now (if it's still
// open) — this is what "calendar duration" and Availability are measured
// against. The literal transaction_type "complete" is never actually sent
// by the Shop Floor UI (a move into the final operation is still logged as
// transaction_type "move", just with to_status "Completed"), so that's the
// real completion signal to look for, not the type field.
function computeCalendarWindow(moveTransactions: any[]): { startedAt: Date | null; endedAt: Date; minutes: number } {
  if (moveTransactions.length === 0) return { startedAt: null, endedAt: new Date(), minutes: 0 };
  const sorted = sortByTime(moveTransactions);
  const startedAt = new Date(txnTime(sorted[0]));
  const completions = sorted.filter((t) => t.to_status === "Completed" || t.transaction_type === "complete");
  const endedAt = completions.length > 0 ? new Date(txnTime(completions[completions.length - 1])) : new Date();
  const minutes = Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 60000);
  return { startedAt, endedAt, minutes };
}

function computeQuality(moves: any[]) {
  const completed = moves.reduce((s, m) => s + Number(m.completed || 0), 0);
  const rejected = moves.reduce((s, m) => s + Number(m.rejected || 0), 0);
  const scrapped = moves.reduce((s, m) => s + Number(m.scrapped || 0), 0);
  const total = completed + rejected + scrapped;
  return { completed, rejected, scrapped, total, rate: total > 0 ? completed / total : null };
}

function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "—";
  const totalMin = Math.round(minutes);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `₹${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

// Portal-style input component (read-only)
const ErpDisplay = ({ value, className = "" }: { value: string | number | undefined; className?: string }) => (
  <div className={`h-7 px-2 text-sm bg-portal-input text-portal-input-foreground border border-portal-border flex items-center ${className}`}>
    {value || "-"}
  </div>
);

// Portal-style label
const ErpLabel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-xs font-medium text-portal-label whitespace-nowrap ${className}`}>{children}</span>
);

// Portal-style fieldset
const ErpFieldset = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="border border-portal-border p-3 bg-portal-fieldset">
    <legend className="px-1 text-xs font-medium text-portal-label">{title}</legend>
    {children}
  </fieldset>
);

// Small stat tile for the Analytics sub-sections
const StatTile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="border border-portal-border bg-white p-2.5">
    <div className="text-[10px] uppercase tracking-wide text-portal-label">{label}</div>
    <div className="text-base font-semibold text-portal-input-foreground mt-0.5">{value}</div>
    {sub && <div className="text-[10px] text-portal-label mt-0.5">{sub}</div>}
  </div>
);

const ANALYTICS_SECTIONS = ["Overview", "Operations", "Costing", "Timeline", "Utilization", "KPIs"] as const;

export const ViewJobDialog = ({ open, onOpenChange, job, linkedReworkJobs = [] }: ViewJobDialogProps) => {
  const [activeTab, setActiveTab] = useState("bill");
  const [analyticsSection, setAnalyticsSection] = useState<typeof ANALYTICS_SECTIONS[number]>("Overview");

  // Masters needed for costing/labeling — fetched once when the dialog opens.
  const [operationsMaster, setOperationsMaster] = useState<any[]>([]);
  const [resourcesMaster, setResourcesMaster] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [bomOperations, setBomOperations] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    axios.get("/api/operations").then((res) => setOperationsMaster(res.data ?? [])).catch(() => setOperationsMaster([]));
    axios.get("/api/resources").then((res) => setResourcesMaster(res.data ?? [])).catch(() => setResourcesMaster([]));
    axios.get("/api/inventory-stock").then((res) => setInventoryItems(res.data?.items ?? [])).catch(() => setInventoryItems([]));
  }, [open]);

  useEffect(() => {
    if (!open || !job?.bom_id) {
      setBomOperations([]);
      return;
    }
    axios.get("/api/bom-operations", { params: { bom_id: job.bom_id } })
      .then((res) => setBomOperations(res.data ?? []))
      .catch(() => setBomOperations([]));
  }, [open, job?.bom_id]);

  // Get BOM items and operations from job data. `components` is the real
  // relation returned by JobController::show()/index() (job_components
  // table); `bomItems` is kept as a fallback for any legacy caller that
  // still passes it directly.
  const bomItems = job?.components || job?.bomItems || [];
  const operations = job?.operations || [];
const moveQuantities = Array.isArray(job?.moves) ? job.moves : [];

  // The job header has no completed/rejected/scrapped columns of its own —
  // those only exist per-operation on job_moves, so the header-level total
  // has to be summed here rather than read off a (nonexistent) job field.
  const completedQty = moveQuantities.reduce((sum: number, m: any) => sum + Number(m.completed || 0), 0);
  const rejectedQty = moveQuantities.reduce((sum: number, m: any) => sum + Number(m.rejected || 0), 0);
  const scrappedQty = moveQuantities.reduce((sum: number, m: any) => sum + Number(m.scrapped || 0), 0);

  // ---- Production Analytics: derived from job.move_transactions (the real
  // event log with timestamps/operator/machine, eager-loaded server-side)
  // plus the fetched rate/routing masters. Recomputed only when the
  // underlying data actually changes. ----
  const moveTransactions: any[] = Array.isArray(job?.move_transactions) ? job.move_transactions : [];

  const analytics = useMemo(() => {
    const intervals = computeRunIntervals(moveTransactions);
    const seqMinutes = sumBy(intervals, (iv) => iv.seq, (iv) => iv.minutes);
    const totalRunningMinutes = Object.values(seqMinutes).reduce((s, m) => s + m, 0);

    const calendar = computeCalendarWindow(moveTransactions);
    const quality = computeQuality(moveQuantities);

    const delayTxns = moveTransactions.filter((t) => t.transaction_type === "delay");
    const totalDelayMinutes = delayTxns.reduce((s, t) => s + Number(t.duration_minutes || 0), 0);
    const delayByReason = sumBy(delayTxns, (t) => t.reason || "Unspecified", (t) => Number(t.duration_minutes || 0));
    const delayByResource = sumBy(delayTxns.filter((t) => t.resource_id), (t) => t.resource_id, (t) => Number(t.duration_minutes || 0));

    const operatorMinutes = sumBy(intervals, (iv) => iv.operatorName, (iv) => iv.minutes);
    const resourceMinutes = sumBy(intervals, (iv) => iv.resourceId, (iv) => iv.minutes);

    // Performance = ideal time (standard run_time × qty completed at that
    // seq) / actual elapsed time — only meaningful where a matching routing
    // step with a standard run_time exists.
    let idealMinutes = 0;
    let idealKnown = false;
    moveQuantities.forEach((m: any) => {
      const bomOp = bomOperations.find((b: any) => Number(b.operation_seq) === Number(m.seq));
      const completedAtSeq = Number(m.completed || 0);
      if (bomOp && Number(bomOp.run_time) > 0 && completedAtSeq > 0) {
        idealKnown = true;
        idealMinutes += Number(bomOp.run_time) * completedAtSeq;
      }
    });
    const performance = idealKnown && totalRunningMinutes > 0 ? idealMinutes / totalRunningMinutes : null;

    const availability = calendar.minutes > 0 ? Math.max(0, Math.min(1, (calendar.minutes - totalDelayMinutes) / calendar.minutes)) : null;

    const oeeParts = [availability, performance, quality.rate];
    const oee = oeeParts.every((p) => p !== null) ? (oeeParts as number[]).reduce((a, b) => a * b, 1) : null;

    // Costing — Material from real issued qty × inventory unit cost; Labour/
    // Machine from actual elapsed time × the operations-master hourly rate,
    // split using the matching BOM operation's labor:machine weighting;
    // Overhead from the BOM operation's standard overhead × qty completed;
    // Scrap valued at accrued per-unit material cost; Rework rolled up from
    // any linked rework job(s) via a recursive call.
    const quantities = job?.quantities || [];
    let material = 0;
    let materialKnown = quantities.length > 0;
    quantities.forEach((q: any) => {
      const inv = inventoryItems.find((i: any) => i.itemCode === q.component);
      if (inv) material += Number(q.issued || 0) * Number(inv.unit_cost || 0);
      else materialKnown = false;
    });

    let labour = 0;
    let machine = 0;
    let rateKnown = false;
    moveQuantities.forEach((m: any) => {
      const minutes = seqMinutes[m.seq] || 0;
      if (minutes <= 0) return;
      const bomOp = bomOperations.find((b: any) => Number(b.operation_seq) === Number(m.seq));
      const opMaster = bomOp
        ? operationsMaster.find((o: any) => o.operation_name === bomOp.operation_code || o.department === bomOp.department)
        : null;
      const rate = opMaster ? Number(opMaster.per_hr_cost || 0) : null;
      if (rate === null) return;
      rateKnown = true;
      const cost = (minutes / 60) * rate;
      const laborWeight = Number(bomOp?.labor_cost || 0);
      const machineWeight = Number(bomOp?.machine_cost || 0);
      const totalWeight = laborWeight + machineWeight;
      if (totalWeight > 0) {
        labour += cost * (laborWeight / totalWeight);
        machine += cost * (machineWeight / totalWeight);
      } else {
        labour += cost / 2;
        machine += cost / 2;
      }
    });

    let overhead = 0;
    let overheadKnown = false;
    moveQuantities.forEach((m: any) => {
      const bomOp = bomOperations.find((b: any) => Number(b.operation_seq) === Number(m.seq));
      if (bomOp) {
        overheadKnown = true;
        overhead += Number(bomOp.overhead_cost || 0) * Number(m.completed || 0);
      }
    });

    const plannedQty = Number(job?.start || 0);
    const unitMaterialCost = materialKnown && plannedQty > 0 ? material / plannedQty : 0;
    const scrapCost = materialKnown ? quality.scrapped * unitMaterialCost : null;

    const reworkCost = linkedReworkJobs.length > 0
      ? linkedReworkJobs.reduce((sum, rj) => {
          const rjQuantities = rj?.quantities || [];
          let rjMaterial = 0;
          rjQuantities.forEach((q: any) => {
            const inv = inventoryItems.find((i: any) => i.itemCode === q.component);
            if (inv) rjMaterial += Number(q.issued || 0) * Number(inv.unit_cost || 0);
          });
          return sum + rjMaterial;
        }, 0)
      : null;

    const total = material + labour + machine + overhead + (scrapCost || 0) + (reworkCost || 0);

    return {
      seqMinutes,
      totalRunningMinutes,
      calendar,
      quality,
      delayTxns,
      totalDelayMinutes,
      delayByReason,
      delayByResource,
      operatorMinutes,
      resourceMinutes,
      performance,
      availability,
      oee,
      costing: {
        material: materialKnown ? material : null,
        labour: rateKnown ? labour : null,
        machine: rateKnown ? machine : null,
        overhead: overheadKnown ? overhead : null,
        scrap: scrapCost,
        rework: reworkCost,
        total,
      },
    };
  }, [moveTransactions, moveQuantities, bomOperations, operationsMaster, inventoryItems, linkedReworkJobs, job?.quantities, job?.start]);

  const resourceName = (id: string) => resourcesMaster.find((r: any) => r.id === id)?.machine_name || id;

  // Issued quantities map (synced from Material Issues module)
  const issuedQuantities: Record<string, number> = job?.issuedQuantities || {};

  // Quantities come from the job's `quantities` snapshot, which has proper
  // separate per_assembly/required/issued/open fields (Required = Job Qty ×
  // Per Assembly, computed server-side at job creation/reconciliation time).
  // Fall back to deriving from bomItems only for legacy jobs with no
  // quantities snapshot at all.
  const jobQuantities = job?.quantities || [];

  const bomQuantities = jobQuantities.length > 0
    ? jobQuantities.map((q: any) => {
        const required = Number(q.required ?? 0);
        const issued = Number(q.issued ?? 0);
        return {
          component: q.component || "-",
          uom: q.uom || "pcs",
          per_assembly: Number(q.per_assembly ?? 0),
          required,
          issued,
          open: Number(q.open ?? Math.max(0, required - issued)),
        };
      })
    : bomItems.map((item: any) => {
        const itemCode = item.itemCode || item.item_code || item.component;
        const qty = Number(item.qty ?? item.quantity ?? item.required_qty ?? 0);
        const issued = Number(issuedQuantities[itemCode] ?? item.issuedQty ?? 0);

        return {
          component: item.component || item.itemCode || "-",
          uom: item.uom || "pcs",
          per_assembly: isNaN(qty) ? 0 : qty,
          required: isNaN(qty) ? 0 : qty,
          issued: isNaN(issued) ? 0 : issued,
          open: Math.max(0, qty - issued),
        };
      });
  
  // Get operation sequences for move quantities display
 const operationSequences = [
  ...new Set(
    moveQuantities.map((m: any) => Number(m.seq))
  )
].sort((a, b) => a - b);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "complete":
        return "bg-green-100 text-green-800";
      case "in progress":
      case "released":
        return "bg-blue-100 text-blue-800";
      case "on hold":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-white z-[999] border-2 border-portal-border shadow-lg">
          {/* Header Bar - Portal Style */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-portal-header text-portal-header-foreground">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">View Job - {job.job_number || job.id}</span>
            <Badge className={`${getStatusColor(job.status)} text-[10px] ml-2`}>
              {job.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 text-portal-header-foreground hover:bg-portal-header/80"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Top Section - Job Details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {/* Left Column */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ErpLabel className="w-20 text-right">Job</ErpLabel>
                <ErpDisplay value={job.job_number || job.id} className="flex-1" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-20 text-right">Assembly</ErpLabel>
                <ErpDisplay value={job.assembly || job.item_code} className="flex-1" />
                <ErpDisplay value={job.item_description || job.product_name} className="flex-1" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-20 text-right">Class</ErpLabel>
                <ErpDisplay value={job.jobClass || "STANDARD"} className="flex-1" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-20 text-right">Status</ErpLabel>
                <div className="flex-1 h-7 px-2 text-sm bg-portal-input border border-portal-border flex items-center">
                  <Badge className={`${getStatusColor(job.status)} text-[10px]`}>
                    {job.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ErpLabel className="w-16 text-right">Type</ErpLabel>
                <ErpDisplay value={job.jobType || "Standard"} className="flex-1" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-16 text-right">UOM</ErpLabel>
                <ErpDisplay value={job.uom || "EA"} className="w-20" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-16 text-right">Priority</ErpLabel>
                <ErpDisplay value={job.priority || "Medium"} className="flex-1" />
              </div>

              <div className="flex items-center gap-2">
                <ErpLabel className="w-16 text-right">Order</ErpLabel>
                <ErpDisplay value={job.orderId || "-"} className="flex-1" />
              </div>
            </div>
          </div>

          {/* Quantities and Dates Fieldsets */}
          <div className="grid grid-cols-2 gap-4">
            <ErpFieldset title="Quantities">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-20 text-right">Start</ErpLabel>
                  <ErpDisplay value={job.start} className="w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-20 text-right">Completed</ErpLabel>
                  <ErpDisplay value={completedQty} className="w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-20 text-right">Rejected</ErpLabel>
                  <ErpDisplay value={rejectedQty} className="w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-20 text-right">Scrapped</ErpLabel>
                  <ErpDisplay value={scrappedQty} className="w-32" />
                </div>
              </div>
            </ErpFieldset>

            <ErpFieldset title="Dates">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-24 text-right">Start</ErpLabel>
                  <ErpDisplay 
                    value={job.start_date ? new Date(job.start_date).toLocaleString() : "-"} 
                    className="flex-1" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-24 text-right">Due Date</ErpLabel>
                  <ErpDisplay 
                    value={job.completion_date ? new Date(job.completion_date).toLocaleString() : "-"} 
                    className="flex-1" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-24 text-right">Completion</ErpLabel>
                  <ErpDisplay 
                    value={job.completionDate ? new Date(job.completionDate).toLocaleString() : "-"} 
                    className="flex-1" 
                  />
                </div>
              </div>
            </ErpFieldset>
          </div>

          {/* Tabs Section - Portal Style */}
          <div className="border border-portal-border">
            {/* Tab Headers */}
            <div className="flex bg-portal-fieldset border-b border-portal-border">
              {["Genealogy", "Bill", "Quantities", "Routing", "Job Move", "History", "Production Analytics", "More"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase().replace(" ", "-"))}
                  className={`px-4 py-1.5 text-xs font-medium border-r border-portal-border transition-colors ${
                    activeTab === tab.toLowerCase().replace(" ", "-")
                      ? "bg-portal-tab-active text-portal-tab-active-foreground"
                      : "bg-portal-tab text-portal-label hover:bg-portal-tab-active/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 bg-portal-fieldset min-h-[200px]">
              {activeTab === "genealogy" && (
                <div className="space-y-4">
                  {/* Parent Job Section */}
                  <ErpFieldset title="Parent Job">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Parent Job</ErpLabel>
                        <ErpDisplay value={job.parentJobId || "N/A - This is a top-level job"} className="flex-1" />
                      </div>
                      {job.parentJobId && (
                        <>
                          <div className="flex items-center gap-2">
                            <ErpLabel className="w-20 text-right">Assembly</ErpLabel>
                            <ErpDisplay value={job.parentAssembly || "-"} className="flex-1" />
                          </div>
                        </>
                      )}
                    </div>
                  </ErpFieldset>

                  {/* Source Order Section */}
                  <ErpFieldset title="Source Order">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Order ID</ErpLabel>
                        <ErpDisplay value={job.orderId || "-"} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Order Type</ErpLabel>
                        <ErpDisplay value={job.orderType || "Manufacturing"} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Customer</ErpLabel>
                        <ErpDisplay value={job.customerName || "-"} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Order Date</ErpLabel>
                        <ErpDisplay value={job.orderDate ? new Date(job.orderDate).toLocaleDateString() : "-"} className="flex-1" />
                      </div>
                    </div>
                  </ErpFieldset>

                  {/* Job Hierarchy Tree */}
                  <ErpFieldset title="Job Hierarchy">
                    <div className="bg-white border border-portal-border p-3 min-h-[120px]">
                      {/* Tree visualization */}
                      <div className="space-y-1">
                        {job.parentJobId && (
                          <div className="flex items-center gap-2 text-xs text-portal-label">
                            <span className="w-4 text-center">📁</span>
                            <span className="text-blue-600">{job.parentJobId}</span>
                            <span className="text-gray-400">(Parent)</span>
                          </div>
                        )}
                        <div className={`flex items-center gap-2 text-xs ${job.parentJobId ? "ml-6" : ""}`}>
                          {job.parentJobId && <span className="text-gray-300">└─</span>}
                          <span className="w-4 text-center">📋</span>
                          <span className="font-medium text-portal-input-foreground">{job.jobNumber || job.id}</span>
                          <Badge className={`${getStatusColor(job.status)} text-[9px] px-1`}>{job.status}</Badge>
                          <span className="text-gray-400">(Current)</span>
                        </div>
                        {/* Child Jobs */}
                        {(job.childJobs || []).length > 0 ? (
                          (job.childJobs || []).map((child: any, idx: number) => (
                            <div key={idx} className={`flex items-center gap-2 text-xs ${job.parentJobId ? "ml-12" : "ml-6"}`}>
                              <span className="text-gray-300">{idx === (job.childJobs || []).length - 1 ? "└─" : "├─"}</span>
                              <span className="w-4 text-center">📋</span>
                              <span className="text-blue-600">{child.jobNumber || child.id}</span>
                              <Badge variant="outline" className="text-[9px] px-1">{child.status}</Badge>
                              <span className="text-gray-400">(Child)</span>
                            </div>
                          ))
                        ) : (
                          <div className={`flex items-center gap-2 text-xs ${job.parentJobId ? "ml-12" : "ml-6"} text-gray-400`}>
                            <span className="text-gray-300">└─</span>
                            <span className="italic">No child jobs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </ErpFieldset>

                  {/* Production History */}
                  <ErpFieldset title="Production History">
                    <div className="border border-portal-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-portal-tab">
                            <TableHead className="text-xs py-1">Event</TableHead>
                            <TableHead className="text-xs py-1">Date/Time</TableHead>
                            <TableHead className="text-xs py-1">User</TableHead>
                            <TableHead className="text-xs py-1">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="bg-portal-input">
                            <TableCell className="text-xs py-1">Job Created</TableCell>
                            <TableCell className="text-xs py-1">{job.createdAt ? new Date(job.createdAt).toLocaleString() : "-"}</TableCell>
                            <TableCell className="text-xs py-1">{job.createdBy || "System"}</TableCell>
                            <TableCell className="text-xs py-1">Initial quantity: {job.quantity}</TableCell>
                          </TableRow>
                          {job.releasedAt && (
                            <TableRow className="bg-white">
                              <TableCell className="text-xs py-1">Job Released</TableCell>
                              <TableCell className="text-xs py-1">{new Date(job.releasedAt).toLocaleString()}</TableCell>
                              <TableCell className="text-xs py-1">{job.releasedBy || "System"}</TableCell>
                              <TableCell className="text-xs py-1">Released to production</TableCell>
                            </TableRow>
                          )}
                          {job.startDate && (
                            <TableRow className="bg-portal-input">
                              <TableCell className="text-xs py-1">Production Started</TableCell>
                              <TableCell className="text-xs py-1">{new Date(job.startDate).toLocaleString()}</TableCell>
                              <TableCell className="text-xs py-1">{job.startedBy || "Operator"}</TableCell>
                              <TableCell className="text-xs py-1">Work began on first operation</TableCell>
                            </TableRow>
                          )}
                          {job.completionDate && (
                            <TableRow className="bg-white">
                              <TableCell className="text-xs py-1">Job Completed</TableCell>
                              <TableCell className="text-xs py-1">{new Date(job.completionDate).toLocaleString()}</TableCell>
                              <TableCell className="text-xs py-1">{job.completedBy || "System"}</TableCell>
                              <TableCell className="text-xs py-1">Completed qty: {completedQty}</TableCell>
                            </TableRow>
                          )}
                          {(!job.releasedAt && !job.startDate && !job.completionDate) && (
                            <TableRow className="bg-white">
                              <TableCell colSpan={4} className="text-xs py-4 text-center text-gray-400">
                                No additional production events recorded yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </ErpFieldset>
                </div>
              )}

              {activeTab === "bill" && (
                <div className="space-y-3">
                  {bomItems.length > 0 ? (
                    <div className="border border-portal-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-portal-tab">
                            <TableHead className="text-xs py-1">Seq</TableHead>
                            <TableHead className="text-xs py-1">Component</TableHead>
                            <TableHead className="text-xs py-1">Description</TableHead>
                            <TableHead className="text-xs py-1">Qty</TableHead>
                            <TableHead className="text-xs py-1">UOM</TableHead>
                            <TableHead className="text-xs py-1">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bomItems.map((item: any, idx: number) => (
                            <TableRow key={idx} className="bg-portal-input">
                              <TableCell className="text-xs py-1">{item.seq || item.itemSeq || idx + 1}</TableCell>
                              <TableCell className="text-xs py-1">{item.component}</TableCell>
                              <TableCell className="text-xs py-1">{item.description}</TableCell>
                              <TableCell className="text-xs py-1">{item.qty ?? item.quantity}</TableCell>
                              <TableCell className="text-xs py-1">{item.uom}</TableCell>
                              <TableCell className="text-xs py-1">
                                <Badge variant="outline" className="text-[10px]">{item.status || "Available"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-portal-label py-8">
                      No BOM components available for this job.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "quantities" && (
                <div className="border border-portal-border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-portal-tab hover:bg-portal-tab">
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border">Component</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border">UOM</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Per Assembly</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Required</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Issued</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground text-right">Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomQuantities.length > 0 ? (
                        bomQuantities.map((item: any, index: number) => (
                          <TableRow 
                            key={index} 
                            className={`${index % 2 === 0 ? "bg-white" : "bg-portal-input"} hover:bg-blue-50 border-b border-portal-border`}
                          >
                            <TableCell className="text-[11px] py-1 px-2 font-medium border-r border-portal-border">{item.component}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border">{item.uom}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right">{Number(item.per_assembly || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right bg-yellow-100 font-medium">{item.required}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right">{item.issued}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 text-right">{item.open}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-portal-label py-4">
                            No component quantities available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {activeTab === "routing" && (
                <div>
                  {operations.length > 0 ? (
                    <div className="border border-portal-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-portal-tab">
                            <TableHead className="text-xs py-1">Seq</TableHead>
                            <TableHead className="text-xs py-1">Operation</TableHead>
                            <TableHead className="text-xs py-1">Description</TableHead>
                            <TableHead className="text-xs py-1">Duration</TableHead>
                            <TableHead className="text-xs py-1">Work Center</TableHead>
                            <TableHead className="text-xs py-1">Department</TableHead>
                            <TableHead className="text-xs py-1">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {operations.map((op: any, idx: number) => (
                            <TableRow key={idx} className="bg-portal-input">
                              <TableCell className="text-xs py-1">{op.sequence || op.operationSeq || op.operation_seq}</TableCell>
                              <TableCell className="text-xs py-1">{op.operationCode || op.operation_code || op.name}</TableCell>
                              <TableCell className="text-xs py-1">{op.description || op.name}</TableCell>
                              <TableCell className="text-xs py-1">{op.duration || op.runTime || op.run_time || "-"}</TableCell>
                              <TableCell className="text-xs py-1">{op.workCenter || op.work_center || "-"}</TableCell>
                              <TableCell className="text-xs py-1">{op.department || "-"}</TableCell>
                              <TableCell className="text-xs py-1">
                                <Badge variant="outline" className="text-[10px]">{op.status || "Pending"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-portal-label py-8">
                      No routing operations available for this job.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "job-move" && (
                <div className="space-y-4">
                  <div className="border border-portal-border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-portal-tab hover:bg-portal-tab">
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border">Op Seq</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border">Operation</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">In Queue</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Running</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Rejected</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground text-right">Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                     <TableBody>
  {operationSequences.length > 0 ? (
    operationSequences.map((seq: number, idx: number) => {
      const op = operations.find(
        (o: any) => Number(o.sequence ?? o.seq ?? o.operationSeq ?? o.operation_seq) === Number(seq)
      );

      const raw = moveQuantities.find(
        (m: any) => Number(m.seq) === Number(seq)
      );

      const qtyData = {
        inQueue: raw?.in_queue ?? 0,
        running: raw?.running ?? 0,
        rejected: raw?.rejected ?? 0,
        completed: raw?.completed ?? 0,
      };

      return (
        <TableRow
          key={seq}
          className={`${idx % 2 === 0 ? "bg-white" : "bg-portal-input"} hover:bg-blue-50 border-b border-portal-border`}
        >
          <TableCell className="text-[11px] py-1 px-2 font-medium border-r border-portal-border">
            {seq}
          </TableCell>

          <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border">
            {op?.operationCode || op?.operation_code || op?.name || op?.description || `Operation ${seq}`}
          </TableCell>

          <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right">
            {qtyData.inQueue}
          </TableCell>

          <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right">
            {qtyData.running}
          </TableCell>

          <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right text-red-600 font-medium">
            {qtyData.rejected}
          </TableCell>

          <TableCell className="text-[11px] py-1 px-2 text-right text-green-600 font-medium">
            {qtyData.completed}
          </TableCell>
        </TableRow>
      );
    })
  ) : (
    <TableRow>
      <TableCell colSpan={6} className="text-center text-sm text-portal-label py-4">
        No move transactions recorded.
      </TableCell>
    </TableRow>
  )}
</TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-portal-label">Rejection Transactions</h4>
                  {moveTransactions.filter((t) => t.transaction_type === "reject").length > 0 ? (
                    <div className="border border-portal-border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-portal-tab">
                            <TableHead className="text-xs py-1">Op Seq</TableHead>
                            <TableHead className="text-xs py-1">Quantity</TableHead>
                            <TableHead className="text-xs py-1">Reason</TableHead>
                            <TableHead className="text-xs py-1">Timestamp</TableHead>
                            <TableHead className="text-xs py-1">User</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {moveTransactions.filter((t) => t.transaction_type === "reject").map((txn: any, idx: number) => (
                            <TableRow key={idx} className="bg-portal-input">
                              <TableCell className="text-xs py-1">{txn.seq}</TableCell>
                              <TableCell className="text-xs py-1 text-red-600 font-medium">{txn.quantity}</TableCell>
                              <TableCell className="text-xs py-1">{txn.reason}</TableCell>
                              <TableCell className="text-xs py-1">{new Date(txn.transaction_time || txn.created_at).toLocaleString()}</TableCell>
                              <TableCell className="text-xs py-1">{txn.user}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-portal-label py-8">
                      No rejection transactions recorded.
                    </div>
                  )}

                  <h4 className="text-xs font-medium text-portal-label mt-6">Job Notes</h4>
                  <div className="p-3 bg-portal-input border border-portal-border text-sm min-h-[60px]">
                    {job.notes || "No notes available."}
                  </div>
                </div>
              )}

              {activeTab === "production-analytics" && (
                <div className="space-y-4">
                  <div className="flex gap-1 border-b border-portal-border pb-2 flex-wrap">
                    {ANALYTICS_SECTIONS.map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setAnalyticsSection(sec)}
                        className={`px-3 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                          analyticsSection === sec
                            ? "bg-portal-tab-active text-portal-tab-active-foreground border-portal-border"
                            : "bg-white text-portal-label border-portal-border hover:bg-portal-tab-active/30"
                        }`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>

                  {analyticsSection === "Overview" && (() => {
                    const plannedQty = Number(job.start || 0);
                    const remainingQty = Math.max(0, plannedQty - completedQty - rejectedQty - scrappedQty);
                    const elapsedHours = analytics.calendar.minutes / 60;
                    const throughputPerHour = elapsedHours > 0 && completedQty > 0 ? completedQty / elapsedHours : null;
                    const etaHours = throughputPerHour && throughputPerHour > 0 ? remainingQty / throughputPerHour : null;
                    const progressPct = plannedQty > 0
                      ? Math.min(100, ((completedQty + rejectedQty + scrappedQty) / plannedQty) * 100)
                      : 0;

                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          <StatTile label="Status" value={job.status || "-"} />
                          <StatTile label="Total Running Time" value={formatMinutes(analytics.totalRunningMinutes)} sub="sum across all operations" />
                          <StatTile
                            label="Elapsed (calendar)"
                            value={formatMinutes(analytics.calendar.minutes)}
                            sub={analytics.calendar.startedAt ? `since ${analytics.calendar.startedAt.toLocaleString()}` : "not started"}
                          />
                          <StatTile
                            label="Est. Completion"
                            value={etaHours !== null ? `${etaHours.toFixed(1)}h remaining` : "—"}
                            sub={remainingQty > 0 ? `${remainingQty} units left` : "fully dispositioned"}
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-portal-label mb-1">
                            <span>Progress (completed + rejected + scrapped / planned)</span>
                            <span>{progressPct.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-portal-input border border-portal-border">
                            <div className="h-full bg-blue-600" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {analyticsSection === "Operations" && (() => {
                    const allSeqs = Array.from(
                      new Set([...moveQuantities.map((m: any) => Number(m.seq)), ...Object.keys(analytics.seqMinutes).map(Number)])
                    ).sort((a, b) => a - b);

                    const chartData = allSeqs.map((seq) => {
                      const bomOp = bomOperations.find((b: any) => Number(b.operation_seq) === Number(seq));
                      const completedAtSeq = moveQuantities.find((m: any) => Number(m.seq) === seq)?.completed || 0;
                      const standard = bomOp ? Number(bomOp.run_time || 0) * completedAtSeq : 0;
                      return { name: `Seq ${seq}`, actual: Math.round(analytics.seqMinutes[seq] || 0), standard: Math.round(standard) };
                    });

                    return (
                      <div className="space-y-4">
                        <div className="border border-portal-border overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-portal-tab">
                                <TableHead className="text-xs py-1">Seq</TableHead>
                                <TableHead className="text-xs py-1">Operators</TableHead>
                                <TableHead className="text-xs py-1">Machines</TableHead>
                                <TableHead className="text-xs py-1 text-right">Standard Time</TableHead>
                                <TableHead className="text-xs py-1 text-right">Actual Time</TableHead>
                                <TableHead className="text-xs py-1 text-right">Variance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allSeqs.length > 0 ? allSeqs.map((seq) => {
                                const bomOp = bomOperations.find((b: any) => Number(b.operation_seq) === Number(seq));
                                const completedAtSeq = moveQuantities.find((m: any) => Number(m.seq) === seq)?.completed || 0;
                                const standard = bomOp && completedAtSeq > 0 ? Number(bomOp.run_time || 0) * completedAtSeq : null;
                                const actual = analytics.seqMinutes[seq] || 0;
                                const seqOperators = Array.from(new Set(
                                  moveTransactions.filter((t: any) => Number(t.seq) === seq && t.operator_name).map((t: any) => t.operator_name)
                                ));
                                const seqResources = Array.from(new Set(
                                  moveTransactions.filter((t: any) => Number(t.seq) === seq && t.resource_id).map((t: any) => t.resource_id)
                                ));
                                return (
                                  <TableRow key={seq} className="bg-portal-input">
                                    <TableCell className="text-xs py-1">{seq}</TableCell>
                                    <TableCell className="text-xs py-1">{seqOperators.length ? seqOperators.join(", ") : "—"}</TableCell>
                                    <TableCell className="text-xs py-1">{seqResources.length ? seqResources.map((id) => resourceName(id as string)).join(", ") : "—"}</TableCell>
                                    <TableCell className="text-xs py-1 text-right">{standard !== null ? formatMinutes(standard) : "—"}</TableCell>
                                    <TableCell className="text-xs py-1 text-right">{actual > 0 ? formatMinutes(actual) : "—"}</TableCell>
                                    <TableCell className="text-xs py-1 text-right">
                                      {standard !== null && actual > 0 ? (
                                        <span className={actual > standard ? "text-red-600" : "text-green-600"}>
                                          {actual > standard ? "+" : ""}{formatMinutes(actual - standard)}
                                        </span>
                                      ) : "—"}
                                    </TableCell>
                                  </TableRow>
                                );
                              }) : (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-sm text-portal-label py-4">No operations recorded yet.</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {chartData.some((d) => d.actual > 0 || d.standard > 0) && (
                          <div className="border border-portal-border bg-white p-2">
                            <div className="text-[11px] font-medium text-portal-label mb-2">Actual vs Standard Time (minutes)</div>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="standard" fill={CHART_COLORS[0]} name="Standard" />
                                <Bar dataKey="actual" fill={CHART_COLORS[2]} name="Actual" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {analyticsSection === "Costing" && (() => {
                    const c = analytics.costing;
                    const rows = [
                      { label: "Material", value: c.material },
                      { label: "Labour", value: c.labour },
                      { label: "Machine", value: c.machine },
                      { label: "Overhead", value: c.overhead },
                      { label: "Scrap", value: c.scrap },
                      { label: "Rework", value: c.rework },
                    ];
                    const pieData = rows.filter((r) => r.value !== null && r.value > 0).map((r) => ({ name: r.label, value: r.value as number }));

                    return (
                      <div className="space-y-4">
                        <div className="border border-portal-border overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-portal-tab">
                                <TableHead className="text-xs py-1">Cost Component</TableHead>
                                <TableHead className="text-xs py-1 text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rows.map((r) => (
                                <TableRow key={r.label} className="bg-portal-input">
                                  <TableCell className="text-xs py-1">{r.label}</TableCell>
                                  <TableCell className="text-xs py-1 text-right">{formatCurrency(r.value)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-portal-tab font-semibold">
                                <TableCell className="text-xs py-1">Total</TableCell>
                                <TableCell className="text-xs py-1 text-right">{formatCurrency(c.total)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>

                        {pieData.length > 0 && (
                          <div className="border border-portal-border bg-white p-2">
                            <div className="text-[11px] font-medium text-portal-label mb-2">Cost Breakdown</div>
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry: any) => entry.name}>
                                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        <div className="text-[10px] text-portal-label">
                          "—" means this figure couldn't be derived from captured rate/routing data for this job's operations yet.
                        </div>
                      </div>
                    );
                  })()}

                  {analyticsSection === "Timeline" && (
                    <div className="border border-portal-border overflow-auto max-h-[360px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-portal-tab">
                            <TableHead className="text-xs py-1">Time</TableHead>
                            <TableHead className="text-xs py-1">Type</TableHead>
                            <TableHead className="text-xs py-1">Seq</TableHead>
                            <TableHead className="text-xs py-1">Qty</TableHead>
                            <TableHead className="text-xs py-1">Operator</TableHead>
                            <TableHead className="text-xs py-1">Machine</TableHead>
                            <TableHead className="text-xs py-1">Detail</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {moveTransactions.length > 0 ? (
                            [...moveTransactions].sort((a, b) => txnTime(b) - txnTime(a)).map((t: any) => (
                              <TableRow key={t.id} className="bg-portal-input">
                                <TableCell className="text-xs py-1 whitespace-nowrap">{new Date(t.transaction_time || t.created_at).toLocaleString()}</TableCell>
                                <TableCell className="text-xs py-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      t.transaction_type === "delay"
                                        ? "border-amber-400 text-amber-700"
                                        : t.transaction_type === "reject" || t.transaction_type === "scrap"
                                          ? "border-red-400 text-red-700"
                                          : ""
                                    }`}
                                  >
                                    {t.transaction_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-1">{t.seq}</TableCell>
                                <TableCell className="text-xs py-1">{t.transaction_type === "delay" ? `${t.duration_minutes || 0}m` : t.quantity}</TableCell>
                                <TableCell className="text-xs py-1">{t.operator_name || "—"}</TableCell>
                                <TableCell className="text-xs py-1">{t.resource_id ? resourceName(t.resource_id) : "—"}</TableCell>
                                <TableCell className="text-xs py-1">{t.reason || (t.from_status && t.to_status ? `${t.from_status} → ${t.to_status}` : "—")}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-sm text-portal-label py-4">No transaction history recorded.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {analyticsSection === "Utilization" && (() => {
                    const calMin = analytics.calendar.minutes;
                    const operatorRows = Object.entries(analytics.operatorMinutes).map(([name, active]) => ({
                      name, active, idle: Math.max(0, calMin - active),
                    }));
                    const resourceRows = Object.entries(analytics.resourceMinutes).map(([id, active]) => ({
                      name: resourceName(id), active, idle: Math.max(0, calMin - active), delay: analytics.delayByResource[id] || 0,
                    }));

                    return (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[11px] font-medium text-portal-label mb-1">By Operator</div>
                          {operatorRows.length > 0 ? (
                            <div className="border border-portal-border overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-portal-tab">
                                    <TableHead className="text-xs py-1">Operator</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Active Time</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Idle Time</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Utilization</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {operatorRows.map((r) => (
                                    <TableRow key={r.name} className="bg-portal-input">
                                      <TableCell className="text-xs py-1">{r.name}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{formatMinutes(r.active)}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{formatMinutes(r.idle)}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{calMin > 0 ? formatPercent(r.active / calMin) : "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : <div className="text-center text-sm text-portal-label py-4">No operator captured yet.</div>}
                        </div>

                        <div>
                          <div className="text-[11px] font-medium text-portal-label mb-1">By Machine</div>
                          {resourceRows.length > 0 ? (
                            <div className="border border-portal-border overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-portal-tab">
                                    <TableHead className="text-xs py-1">Machine</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Active Time</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Idle Time</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Delay Time</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Utilization</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {resourceRows.map((r) => (
                                    <TableRow key={r.name} className="bg-portal-input">
                                      <TableCell className="text-xs py-1">{r.name}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{formatMinutes(r.active)}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{formatMinutes(r.idle)}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{formatMinutes(r.delay)}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{calMin > 0 ? formatPercent(r.active / calMin) : "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : <div className="text-center text-sm text-portal-label py-4">No machine captured yet.</div>}
                        </div>
                      </div>
                    );
                  })()}

                  {analyticsSection === "KPIs" && (() => {
                    const plannedQty = Number(job.start || 0);
                    const delayRows = Object.entries(analytics.delayByReason).sort((a, b) => b[1] - a[1]);

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-2">
                          <StatTile label="OEE" value={formatPercent(analytics.oee)} />
                          <StatTile label="Availability" value={formatPercent(analytics.availability)} />
                          <StatTile label="Performance" value={formatPercent(analytics.performance)} />
                          <StatTile label="Quality" value={formatPercent(analytics.quality.rate)} />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <StatTile label="Planned Qty" value={String(plannedQty)} />
                          <StatTile
                            label="Completed Qty"
                            value={String(analytics.quality.completed)}
                            sub={`${analytics.quality.rejected} rejected, ${analytics.quality.scrapped} scrapped`}
                          />
                        </div>

                        <div>
                          <div className="text-[11px] font-medium text-portal-label mb-1">Delay Reasons</div>
                          {delayRows.length > 0 ? (
                            <div className="border border-portal-border overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-portal-tab">
                                    <TableHead className="text-xs py-1">Reason</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Total Time</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {delayRows.map(([reason, minutes]) => (
                                    <TableRow key={reason} className="bg-portal-input">
                                      <TableCell className="text-xs py-1">{reason}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{formatMinutes(minutes)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : <div className="text-center text-sm text-portal-label py-4">No delays logged.</div>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === "more" && (
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-24 text-right">Created</ErpLabel>
                    <ErpDisplay 
                      value={job.created_at ? new Date(job.created_at).toLocaleString() : "-"} 
                      className="flex-1" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-24 text-right">Created By</ErpLabel>
                    <ErpDisplay value={job.createdBy || "-"} className="flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-24 text-right">Modified</ErpLabel>
                    <ErpDisplay 
                      value={job.modifiedAt ? new Date(job.modifiedAt).toLocaleString() : "-"} 
                      className="flex-1" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-24 text-right">Modified By</ErpLabel>
                    <ErpDisplay value={job.modifiedBy || "-"} className="flex-1" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-portal-tab border-portal-border text-portal-input-foreground hover:bg-portal-tab-active hover:text-portal-tab-active-foreground"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
