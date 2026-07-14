import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Play, CheckCircle, Clock, Factory, ArrowRight, AlertTriangle, XCircle, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

// Fixed reason codes for a delay log — no master table for this yet, matches
// common MES downtime categories closely enough for grouping/reporting.
const DELAY_REASONS = [
  "Material Shortage",
  "Machine Breakdown",
  "Operator Unavailable",
  "Changeover / Setup",
  "Quality Hold",
  "Power Outage",
  "Other",
];

// ERP-style input component
const ErpInput = ({ className = "", ...props }: React.ComponentProps<"input">) => (
  <input
    className={`h-7 px-2 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] ${className}`}
    {...props}
  />
);

// ERP-style label
const ErpLabel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-xs font-medium text-gray-700 whitespace-nowrap ${className}`}>{children}</span>
);

interface MoveQuantity {
  inQueue: number;
  running: number;
  toMove: number;
  toReject: number;
  toScrap: number;
  rejected: number;
  scrapped: number;
  completed: number;
  startQty?: number; // for first operation
  operatorName?: string;
  resourceId?: string;
}

interface RejectionTransaction {
  seq: number;
  quantity: number;
  reason: string;
  timestamp: string;
  user: string;
}

interface MoveTransaction {
  id: string;
  seq: number;
  operationName: string;
  transactionType: 'start' | 'move' | 'reject' | 'scrap' | 'complete';
  quantity: number;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  timestamp: string;
  user: string;
}

// Shape actually returned by GET /api/move-transactions/job/{id}
// (move_transactions table columns — snake_case, unlike the MoveTransaction
// interface above which is only ever used for local, not-yet-persisted
// optimistic objects elsewhere in this file).
interface MoveTransactionRecord {
  id: number;
  job_id: number;
  seq: number;
  operation_name: string | null;
  transaction_type: 'start' | 'move' | 'reject' | 'scrap' | 'complete' | 'delay';
  quantity: number;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  user: string;
  operator_name: string | null;
  resource_id: string | null;
  duration_minutes: number | null;
  transaction_time: string;
  created_at: string;
}

const ShopFloor = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const hasInitializedRef = useRef(false);

  // Load jobs from localStorage
  const [jobs, setJobs] = useState<any[]>(() => {
    const saved = localStorage.getItem("jobs");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isJobMoveDialogOpen, setIsJobMoveDialogOpen] = useState(false);

  // Move quantities state for each operation
  const [moveQuantities, setMoveQuantities] = useState<{ [seq: number]: MoveQuantity }>({});

  // Machine picker source (existing Resources master) — fetched once, reused
  // for the Job Move table's Machine column and the Log Delay dialog.
  const [resources, setResources] = useState<any[]>([]);
  useEffect(() => {
    axios.get("/api/resources").then((res) => {
      setResources(res.data?.data ?? res.data ?? []);
    }).catch(() => setResources([]));
  }, []);

  // Scrap Reason dialog state
  const [isScrapDialogOpen, setIsScrapDialogOpen] = useState(false);
  const [scrapReason, setScrapReason] = useState("");

  // Log Delay dialog state
  const [isDelayDialogOpen, setIsDelayDialogOpen] = useState(false);
  const [delaySeq, setDelaySeq] = useState<number | null>(null);
  const [delayResourceId, setDelayResourceId] = useState("");
  const [delayOperator, setDelayOperator] = useState("");
  const [delayReason, setDelayReason] = useState(DELAY_REASONS[0]);
  const [delayMinutes, setDelayMinutes] = useState("");
  const [delayNotes, setDelayNotes] = useState("");

  console.log("SELECTED JOB:", selectedJob);
  console.log("OPERATIONS:", selectedJob?.operations);
  console.log("MOVE QTY:", moveQuantities);

  // Rejection reason dialog state
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // History dialog state
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<MoveTransactionRecord[]>([]);

  useEffect(() => {
    if (!selectedJob?.id) return;

    axios
      .get(`/api/move-transactions/job/${selectedJob.id}`)
      .then((res) => {
        setTransactions(res.data.data);
      });
  }, [selectedJob]);


  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("/api/jobs");
        const data = await res.json();

        console.log("parsed data:", data);
        console.log("jobs array:", data.data);

        setJobs(data.data); // ✅ FIX HERE
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      }
    };

    fetchJobs();
  }, []);

  // Initialize move quantities when a job is selected
  useEffect(() => {
    if (!selectedJob) return;

    const qty = parseInt(selectedJob.start || selectedJob.start || 0);

    const moves = selectedJob.moves || [];

    const sequences =
      moves.length > 0
        ? moves.map((m: any) => m.seq)
        : [10, 20, 30];

    const initialQuantities: { [seq: number]: MoveQuantity } = {};

    sequences.forEach((seq: number, idx: number) => {
      const move = moves.find((m: any) => m.seq === seq);

      initialQuantities[seq] = {
        inQueue: move?.inQueue ?? move?.in_queue ?? (idx === 0 ? qty : 0),
        running: move?.running ?? 0,
        startQty: move?.startQty ?? 0,
        toMove: move?.toMove ?? move?.to_move ?? 0,
        toReject: move?.toReject ?? 0,
        toScrap: 0,
        rejected: move?.rejected ?? 0,
        scrapped: move?.scrapped ?? 0,
        completed: move?.completed ?? 0,
        operatorName: "",
        resourceId: "",
      };
    });

    setMoveQuantities(initialQuantities);
  }, [selectedJob]);

  const handleOpenJobMove = (job: any) => {
    setSelectedJob(job);
    setIsJobMoveDialogOpen(true);
  };

  // Update individual move quantity cell
  const updateMoveQuantity = (seq: number, field: keyof MoveQuantity, value: number | string) => {
    setMoveQuantities(prev => ({
      ...prev,
      [seq]: {
        ...prev[seq],
        [field]: value,
      },
    }));
  };

  // Calculate total active quantities (excluding rejected/scrapped which are removed from flow)
  const calculateTotalActiveQty = (quantities: any) => {
    let total = 0;

    Object.values(quantities).forEach((q: any) => {
      total += (q.inQueue || 0) + (q.running || 0);
    });

    return total;
  };


  const calculateJobStatus = (quantities: any, job: any) => {
  // Job's planned quantity lives on `start` (jobs.start), not `quantity` —
  // that field never existed on the real job record, so this always
  // evaluated to 0 and `completed (0) >= totalQty (0)` was always true,
  // marking every job "Completed" the instant any move transaction ran,
  // regardless of actual progress.
  const totalQty = Number(job?.start ?? job?.quantity ?? 0);

  const values: any[] = Object.values(quantities);

  const completed = values.reduce((sum, q) => sum + (q.completed || 0), 0);
  const rejected = values.reduce((sum, q) => sum + (q.rejected || 0), 0);
  const scrapped = values.reduce((sum, q) => sum + (q.scrapped || 0), 0);
  const anyInQueue = values.some((q) => (q.inQueue || 0) > 0);
  const anyRunning = values.some((q) => (q.running || 0) > 0);
  const anyToMove = values.some((q) => (q.toMove || 0) > 0);

  // Completed once every planned unit has reached a terminal state — finished
  // the last operation, rejected, or scrapped — AND nothing is left sitting
  // anywhere else in the routing. A job doesn't stay "In Progress" forever
  // just because some of its output was rejected; rejection is a disposition
  // of the quantity, not unfinished work.
  const dispositioned = completed + rejected + scrapped;
  if (totalQty > 0 && dispositioned >= totalQty && !anyInQueue && !anyRunning && !anyToMove) {
    return "Completed";
  }

  if (anyRunning || completed > 0 || rejected > 0 || scrapped > 0) return "In Progress";

  return "Released";
};

  // Handle Move Transaction - moves quantities through the workflow
  // Flow: In Queue -> Running -> To Move -> Next Operation's In Queue (or Completed if last)
  const handleMoveTransaction = async () => {
    if (!selectedJob) return;

    const sequences = Object.keys(moveQuantities)
      .map(Number)
      .sort((a, b) => a - b);

    const newQuantities = { ...moveQuantities };
    // Every seq whose state actually changes this transaction — both the
    // operation being moved FROM and the operation being moved INTO — needs
    // its final state persisted. Collecting them here (instead of pushing a
    // payload entry per loop iteration) avoids the previous bug where only
    // the source operation was ever sent to the backend and the destination
    // operation's incremented in_queue was silently dropped.
    const touchedSeqs = new Set<number>();
    const txnPayloads: any[] = [];

    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i];
      const current = newQuantities[seq];

      const toMoveQty = Number(current?.toMove || 0);
      if (!toMoveQty) continue;

      if (toMoveQty > (current?.running || 0)) {
        toast({
          title: "Error",
          description: `Seq ${seq}: Only ${current.running} running available`,
          variant: "destructive",
        });
        return;
      }

      const nextSeq = sequences[i + 1];

      // 🔥 update UI logic
      newQuantities[seq] = {
        ...current,
        running: (current.running || 0) - toMoveQty,
        toMove: 0,
      };
      touchedSeqs.add(seq);

      if (nextSeq) {
        newQuantities[nextSeq] = {
          ...newQuantities[nextSeq],
          inQueue: (newQuantities[nextSeq]?.inQueue || 0) + toMoveQty,
        };
        touchedSeqs.add(nextSeq);
      } else {
        newQuantities[seq].completed = (newQuantities[seq].completed || 0) + toMoveQty;
      }

      // ================================
      // MOVE TRANSACTION PAYLOAD (audit log entry for this move)
      // ================================
      txnPayloads.push({
        job_id: selectedJob.id,
        seq: seq,
        quantity: toMoveQty,
        transaction_type: "move",
        operation_name: getOperationName(seq),
        from_status: "Running",
        to_status: nextSeq ? "In Queue" : "Completed",
        user: user?.email || "Current User",
        operator_name: current.operatorName || null,
        resource_id: current.resourceId || null,
      });
    }

    if (touchedSeqs.size === 0) {
      toast({
        title: "No Quantities to Move",
        description: "Enter quantities in 'To Move' column first.",
        variant: "destructive",
      });
      return;
    }

    // Final state for every affected seq — sent once, after all seqs in this
    // transaction have been resolved, so a multi-hop move (e.g. seq 10 -> 20
    // where 20 also has its own qty moving to 30) composes correctly instead
    // of racing per-iteration pushes.
    const movesPayload = Array.from(touchedSeqs).map((seq) => ({
      seq,
      in_queue: newQuantities[seq].inQueue || 0,
      running: newQuantities[seq].running || 0,
      to_move: 0,
      rejected: newQuantities[seq].rejected || 0,
      scrapped: newQuantities[seq].scrapped || 0,
      completed: newQuantities[seq].completed || 0,
    }));

    try {
      // ================================
      // UPDATE JOB MOVE STATE + AUDIT LOG (single atomic request — the move
      // state and its audit trail either both save or neither does, instead
      // of two separate requests that could leave them out of sync)
      // ================================
      const jobStatus = calculateJobStatus(newQuantities, selectedJob);

      const res = await axios.post("/api/job-moves/update", {
        job_id: selectedJob.id,
        moves: movesPayload,
        transactions: txnPayloads,
        job_status: jobStatus,
      });

      console.log("📥 DB RESPONSE:", res.data);

      // refresh job
      const refreshed = await axios.get(`/api/jobs/${selectedJob.id}`);
      const job = refreshed.data;

      setSelectedJob(job);

      // rebuild from DB
      const rebuilt: any = {};

      (job.moves || []).forEach((m: any) => {
        rebuilt[m.seq] = {
          inQueue: m.in_queue || 0,
          running: m.running || 0,
          toMove: 0,
          toReject: 0,
          toScrap: 0,
          rejected: m.rejected || 0,
          scrapped: m.scrapped || 0,
          completed: m.completed || 0,
          startQty: 0,
        };
      });

      setMoveQuantities(rebuilt);

      toast({
        title: "Success",
        description: "Move + Transactions saved successfully",
      });
    } catch (err: any) {
      console.error(err);

      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Move from In Queue to Running
  const handleMoveToRunning = async (seq: number, qty: number) => {
    if (!selectedJob) return;

    const current = moveQuantities[seq];
    if (!current) return;

    const startQty = Number(qty || 0);
    const jobQty = Number(selectedJob?.start || 0);

    if (startQty <= 0) return;

    if (startQty > current.inQueue) {
      toast({
        title: "Invalid Quantity",
        description: `Cannot start ${startQty} - only ${current.inQueue} in queue.`,
        variant: "destructive",
      });
      return;
    }

    const updated = {
      ...moveQuantities,
      [seq]: {
        ...current,
        inQueue: current.inQueue - startQty,
        running: current.running + startQty,
        startQty: 0,
      },
    };

    // Validate BEFORE touching any state — starting to mutate first and only
    // validating afterward (the previous order) left the UI showing a state
    // that was never actually saved whenever this check failed.
    const totalActive = calculateTotalActiveQty(updated);
    if (totalActive > jobQty) {
      toast({
        title: "Invalid Operation",
        description: `Total active quantity (${totalActive}) exceeds Job Quantity (${jobQty}).`,
        variant: "destructive",
      });
      return;
    }

    setMoveQuantities(updated);

    // Persist via the same atomic move endpoint as Move/Reject — computing
    // job_status here too, instead of the previous `{...selectedJob, moves}`
    // PUT which blindly re-sent selectedJob's (possibly stale) `status`
    // field, capable of silently resurrecting a wrong "Completed" status on
    // every Start click regardless of actual progress.
    try {
      const jobStatus = calculateJobStatus(updated, selectedJob);

      await axios.post("/api/job-moves/update", {
        job_id: selectedJob.id,
        moves: Object.entries(updated).map(([s, m]) => ({
          seq: Number(s),
          in_queue: m.inQueue,
          running: m.running,
          to_move: m.toMove,
          rejected: m.rejected,
          scrapped: m.scrapped,
          completed: m.completed,
        })),
        transactions: [
          {
            job_id: selectedJob.id,
            seq,
            quantity: startQty,
            transaction_type: "start",
            operation_name: getOperationName(seq),
            from_status: "In Queue",
            to_status: "Running",
            user: user?.email || "Current User",
            operator_name: current.operatorName || null,
            resource_id: current.resourceId || null,
          },
        ],
        job_status: jobStatus,
      });

      const refreshed = await axios.get(`/api/jobs/${selectedJob.id}`);
      const job = refreshed.data;
      setSelectedJob(job);

      const rebuilt: any = {};
      (job.moves || []).forEach((m: any) => {
        rebuilt[m.seq] = {
          inQueue: m.in_queue || 0,
          running: m.running || 0,
          toMove: 0,
          toReject: 0,
          toScrap: 0,
          rejected: m.rejected || 0,
          scrapped: m.scrapped || 0,
          completed: m.completed || 0,
          startQty: 0,
        };
      });
      setMoveQuantities(rebuilt);

      toast({
        title: "Started Successfully",
        description: "Quantity moved to Running.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to start quantity.",
        variant: "destructive",
      });
    }
  };

  // Get operation name by sequence
  const getOperationName = (seq: number) => {
    const operations = selectedJob?.operations || [];
    const op = operations.find((o: any) => (o.sequence || 10) === seq);
    return op?.name || op?.operationCode || op?.description || `Operation ${seq / 10}`;
  };

  // Check if there are quantities to reject
  const hasRejectQuantities = () => {
    const sequences = Object.keys(moveQuantities).map(Number);
    return sequences.some((seq) => (moveQuantities[seq]?.toReject || 0) > 0);
  };

  // Open reject dialog
  const openRejectDialog = () => {
    if (!hasRejectQuantities()) {
      toast({
        title: "No Quantities to Reject",
        description: "Enter quantities in 'To Reject' column first.",
        variant: "destructive",
      });
      return;
    }
    setRejectReason("");
    setIsRejectDialogOpen(true);
  };

  // Check if there are quantities to scrap
  const hasScrapQuantities = () => {
    const sequences = Object.keys(moveQuantities).map(Number);
    return sequences.some((seq) => (moveQuantities[seq]?.toScrap || 0) > 0);
  };

  // Open scrap dialog
  const openScrapDialog = () => {
    if (!hasScrapQuantities()) {
      toast({
        title: "No Quantities to Scrap",
        description: "Enter quantities in 'To Scrap' column first.",
        variant: "destructive",
      });
      return;
    }
    setScrapReason("");
    setIsScrapDialogOpen(true);
  };

  // Handle Reject Transaction - resolves the Running quantity at each
  // operation with a To Reject entry: the rejected portion is removed from
  // the flow, and whatever remains (running - rejected) advances to the
  // next operation's queue (or Completed, if this is the last operation) —
  // same as a normal move, just netted against the rejection.
  const handleRejectTransaction = async () => {
    if (!selectedJob) return;

    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please enter a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    const sequences = Object.keys(moveQuantities).map(Number).sort((a, b) => a - b);

    let errorMessage = "";
    const newQuantities = { ...moveQuantities };
    const touchedSeqs = new Set<number>();
    const txnPayloads: any[] = [];

    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i];
      const current = newQuantities[seq];
      const toRejectQty = Number(current?.toReject || 0);
      if (!toRejectQty) continue;

      if (toRejectQty > (current?.running || 0)) {
        errorMessage = `Seq ${seq}: Cannot reject ${toRejectQty} - only ${current.running} in Running.`;
        break;
      }

      const remainingQty = (current.running || 0) - toRejectQty;
      const nextSeq = sequences[i + 1];
      const opName = getOperationName(seq);

      newQuantities[seq] = {
        ...current,
        running: 0,
        toReject: 0,
        rejected: (current.rejected || 0) + toRejectQty,
      };
      touchedSeqs.add(seq);

      if (remainingQty > 0) {
        if (nextSeq) {
          newQuantities[nextSeq] = {
            ...newQuantities[nextSeq],
            inQueue: (newQuantities[nextSeq]?.inQueue || 0) + remainingQty,
          };
          touchedSeqs.add(nextSeq);
        } else {
          newQuantities[seq].completed = (newQuantities[seq].completed || 0) + remainingQty;
        }
      }

      txnPayloads.push({
        job_id: selectedJob.id,
        seq,
        quantity: toRejectQty,
        transaction_type: "reject",
        operation_name: opName,
        from_status: "Running",
        to_status: "Rejected",
        reason: rejectReason.trim(),
        user: user?.email || "Current User",
        operator_name: current.operatorName || null,
        resource_id: current.resourceId || null,
      });

      if (remainingQty > 0) {
        txnPayloads.push({
          job_id: selectedJob.id,
          seq,
          quantity: remainingQty,
          transaction_type: "move",
          operation_name: opName,
          from_status: "Running",
          to_status: nextSeq ? "In Queue" : "Completed",
          user: user?.email || "Current User",
          operator_name: current.operatorName || null,
          resource_id: current.resourceId || null,
        });
      }
    }

    if (errorMessage) {
      toast({
        title: "Reject Transaction Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    if (touchedSeqs.size === 0) {
      toast({
        title: "No Quantities to Reject",
        description: "Enter quantities in 'To Reject' column first.",
        variant: "destructive",
      });
      return;
    }

    const movesPayload = Array.from(touchedSeqs).map((seq) => ({
      seq,
      in_queue: newQuantities[seq].inQueue || 0,
      running: newQuantities[seq].running || 0,
      to_move: 0,
      rejected: newQuantities[seq].rejected || 0,
      scrapped: newQuantities[seq].scrapped || 0,
      completed: newQuantities[seq].completed || 0,
    }));

    try {
      const jobStatus = calculateJobStatus(newQuantities, selectedJob);

      const res = await axios.post("/api/job-moves/update", {
        job_id: selectedJob.id,
        moves: movesPayload,
        transactions: txnPayloads,
        job_status: jobStatus,
      });

      // rebuild from DB, same as handleMoveTransaction
      const refreshed = await axios.get(`/api/jobs/${selectedJob.id}`);
      const job = refreshed.data;

      setSelectedJob(job);

      const rebuilt: any = {};
      (job.moves || []).forEach((m: any) => {
        rebuilt[m.seq] = {
          inQueue: m.in_queue || 0,
          running: m.running || 0,
          toMove: 0,
          toReject: 0,
          toScrap: 0,
          rejected: m.rejected || 0,
          scrapped: m.scrapped || 0,
          completed: m.completed || 0,
          startQty: 0,
        };
      });
      setMoveQuantities(rebuilt);

      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));

      setIsRejectDialogOpen(false);
      setRejectReason("");

      toast({
        title: "Success",
        description: "Rejection recorded and remaining quantity moved forward",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Handle Scrap Transaction - deducts the scrapped portion from Running at
  // each operation with a To Scrap entry and records it, via the same atomic
  // /api/job-moves/update endpoint Move/Reject already use. Unlike Reject,
  // the remainder simply stays in Running (it wasn't pulled out of process,
  // just reduced) rather than auto-advancing to the next operation.
  const handleScrapTransaction = async () => {
    if (!selectedJob) return;

    if (!scrapReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please enter a reason for scrapping.",
        variant: "destructive",
      });
      return;
    }

    const sequences = Object.keys(moveQuantities).map(Number).sort((a, b) => a - b);

    let errorMessage = "";
    const newQuantities = { ...moveQuantities };
    const touchedSeqs = new Set<number>();
    const txnPayloads: any[] = [];

    for (const seq of sequences) {
      const current = newQuantities[seq];
      const toScrapQty = Number(current?.toScrap || 0);
      if (!toScrapQty) continue;

      if (toScrapQty > (current?.running || 0)) {
        errorMessage = `Seq ${seq}: Cannot scrap ${toScrapQty} - only ${current.running} in Running.`;
        break;
      }

      newQuantities[seq] = {
        ...current,
        running: (current.running || 0) - toScrapQty,
        toScrap: 0,
        scrapped: (current.scrapped || 0) + toScrapQty,
      };
      touchedSeqs.add(seq);

      txnPayloads.push({
        job_id: selectedJob.id,
        seq,
        quantity: toScrapQty,
        transaction_type: "scrap",
        operation_name: getOperationName(seq),
        from_status: "Running",
        to_status: "Scrapped",
        reason: scrapReason.trim(),
        user: user?.email || "Current User",
        operator_name: current.operatorName || null,
        resource_id: current.resourceId || null,
      });
    }

    if (errorMessage) {
      toast({
        title: "Scrap Transaction Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    if (touchedSeqs.size === 0) {
      toast({
        title: "No Quantities to Scrap",
        description: "Enter quantities in 'To Scrap' column first.",
        variant: "destructive",
      });
      return;
    }

    const movesPayload = Array.from(touchedSeqs).map((seq) => ({
      seq,
      in_queue: newQuantities[seq].inQueue || 0,
      running: newQuantities[seq].running || 0,
      to_move: 0,
      rejected: newQuantities[seq].rejected || 0,
      scrapped: newQuantities[seq].scrapped || 0,
      completed: newQuantities[seq].completed || 0,
    }));

    try {
      const jobStatus = calculateJobStatus(newQuantities, selectedJob);

      await axios.post("/api/job-moves/update", {
        job_id: selectedJob.id,
        moves: movesPayload,
        transactions: txnPayloads,
        job_status: jobStatus,
      });

      const refreshed = await axios.get(`/api/jobs/${selectedJob.id}`);
      const job = refreshed.data;

      setSelectedJob(job);

      const rebuilt: any = {};
      (job.moves || []).forEach((m: any) => {
        rebuilt[m.seq] = {
          inQueue: m.in_queue || 0,
          running: m.running || 0,
          toMove: 0,
          toReject: 0,
          toScrap: 0,
          rejected: m.rejected || 0,
          scrapped: m.scrapped || 0,
          completed: m.completed || 0,
          startQty: 0,
          operatorName: "",
          resourceId: "",
        };
      });
      setMoveQuantities(rebuilt);

      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));

      setIsScrapDialogOpen(false);
      setScrapReason("");

      toast({
        title: "Success",
        description: "Scrapped quantities recorded.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Log a Delay transaction — a zero-quantity move_transactions row (no
  // job_moves change, no job_status change) that only records why production
  // stalled, feeding the Production Analytics "Availability"/delay-reasons
  // figures.
  const handleLogDelay = async () => {
    if (!selectedJob || delaySeq === null) return;

    const minutes = Number(delayMinutes);
    if (!minutes || minutes <= 0) {
      toast({
        title: "Duration Required",
        description: "Enter how many minutes this delay lasted.",
        variant: "destructive",
      });
      return;
    }

    try {
      await axios.post("/api/job-moves/update", {
        job_id: selectedJob.id,
        moves: [],
        transactions: [
          {
            job_id: selectedJob.id,
            seq: delaySeq,
            quantity: 0,
            transaction_type: "delay",
            operation_name: getOperationName(delaySeq),
            reason: delayNotes.trim() ? `${delayReason}: ${delayNotes.trim()}` : delayReason,
            duration_minutes: minutes,
            user: user?.email || "Current User",
            operator_name: delayOperator || null,
            resource_id: delayResourceId || null,
          },
        ],
      });

      setIsDelayDialogOpen(false);
      setDelaySeq(null);
      setDelayResourceId("");
      setDelayOperator("");
      setDelayReason(DELAY_REASONS[0]);
      setDelayMinutes("");
      setDelayNotes("");

      toast({
        title: "Delay Logged",
        description: "Downtime recorded for this job.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const safeJobs = Array.isArray(jobs) ? jobs : [];

  const filteredJobs = safeJobs.filter((job: any) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      String(job.job_number ?? "").toLowerCase().includes(search) ||
      String(job.product_name ?? "").toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "all" || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusStyles: { [key: string]: string } = {
      "Released": "bg-green-100 text-green-800 hover:bg-green-100",
      "In Progress": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      "Pending": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      "Completed": "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
    return statusStyles[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Shop Floor</h1>
              <p className="text-muted-foreground mt-1">
                Track and manage job movements on the production floor
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by job number or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Released">Released</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No jobs available. Create jobs from the Planning module.</p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job: any) => (
              <Card
                key={job.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleOpenJobMove(job)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{job.job_number}</CardTitle>
                    <Badge className={getStatusBadge(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                  <CardDescription>{job.product_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="ml-2 font-medium">{job.start}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due:</span>
                      <span className="ml-2 font-medium">{job.completion_date}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge
                        variant="outline"
                        className={`ml-2 ${job.priority === "High" ? "border-red-500 text-red-500" : ""}`}
                      >
                        {job.priority}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Operations:</span>
                      <span className="ml-2 font-medium">{job.operations?.length || 0}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenJobMove(job);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Open Job Move
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Job Move Dialog */}
        <Dialog open={isJobMoveDialogOpen} onOpenChange={setIsJobMoveDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="hidden">
              <DialogTitle>Shop Floor - Job Move</DialogTitle>
            </DialogHeader>
            {/* ERP-style Header */}
            <div className="bg-gradient-to-r from-[#2c5282] to-[#1a365d] text-white px-4 py-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Shop Floor - Job Move</h2>
                <span className="text-xs opacity-80">Job: {selectedJob?.job_number}</span>
              </div>
            </div>

            {selectedJob && (
              <div className="p-4 space-y-4 bg-[#e8e8d8]">
                {/* Job Info Section */}
                <div className="grid grid-cols-4 gap-4 bg-[#f0f0e0] p-3 border border-[#b8b8a0]">
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-16 text-right">Job:</ErpLabel>
                    <ErpInput value={selectedJob.job_number || ""} readOnly className="flex-1 bg-gray-100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-16 text-right">Product:</ErpLabel>
                    <ErpInput value={selectedJob.product_name || ""} readOnly className="flex-1 bg-gray-100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-16 text-right">Quantity:</ErpLabel>
                    <ErpInput value={selectedJob.start || ""} readOnly className="flex-1 bg-gray-100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-16 text-right">Status:</ErpLabel>
                    <Badge
                      className={`text-xs ${selectedJob.status === "In Progress"
                          ? "bg-blue-500 hover:bg-blue-600"
                          : selectedJob.status === "Released"
                            ? "bg-green-500 hover:bg-green-600"
                            : selectedJob.status === "Completed"
                              ? "bg-gray-500 hover:bg-gray-600"
                              : "bg-yellow-500 hover:bg-yellow-600"
                        }`}
                    >
                      {selectedJob.status}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0] text-gray-700"
                    onClick={handleMoveTransaction}
                    disabled={selectedJob.status === "Completed"}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Move Transaction
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
                    onClick={openRejectDialog}
                    disabled={selectedJob.status === "Completed"}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-700"
                    onClick={openScrapDialog}
                    disabled={selectedJob.status === "Completed"}
                  >
                    Scrap
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0] text-gray-700"
                    onClick={() => {
                      setDelaySeq(null);
                      setDelayResourceId("");
                      setDelayOperator("");
                      setDelayReason(DELAY_REASONS[0]);
                      setDelayMinutes("");
                      setDelayNotes("");
                      setIsDelayDialogOpen(true);
                    }}
                  >
                    Log Delay
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0] text-gray-700"
                    onClick={() => setIsHistoryDialogOpen(true)}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    View History
                  </Button>
                  {selectedJob.status === "Completed" && (
                    <Badge className="bg-green-600 ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Job Complete
                    </Badge>
                  )}
                </div>

                {/* Operator name autocomplete, sourced from this job's own transaction history */}
                <datalist id="operator-names">
                  {Array.from(new Set(transactions.map((t) => t.operator_name).filter(Boolean))).map((name) => (
                    <option key={name as string} value={name as string} />
                  ))}
                </datalist>

                {/* Move Table */}
                <div className="border border-[#b8b8a0] overflow-auto bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#d8d8c8] hover:bg-[#d8d8c8]">
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] w-12">Seq</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Operation</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Operator</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Machine</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] bg-green-50">In Queue</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Start Qty</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] bg-blue-50">Running</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] bg-yellow-50">To Move</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] bg-red-50">To Reject</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Rejected</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] bg-orange-50">To Scrap</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Scrapped</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Completed</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 w-16 text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const operations = selectedJob.operations || [];
                        const sequences = operations.length > 0
                          ? operations.map((op: any, idx: number) => ({ seq: op.sequence || (idx + 1) * 10, op }))
                          : [10, 20, 30].map(seq => ({ seq, op: null }));

                        return sequences.map(({ seq, op }: { seq: number; op: any }, index: number) => {
                          const qtyData = moveQuantities[seq] || { inQueue: 0, running: 0, toMove: 0, toReject: 0, toScrap: 0, rejected: 0, scrapped: 0, completed: 0 };
                          const startQtyId = `startQty_${seq}`;

                          return (
                            <TableRow
                              key={seq}
                              className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 border-b border-[#b8b8a0]`}
                            >
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <div className="flex items-center">
                                  <span className="w-1 h-4 bg-blue-600 mr-1"></span>
                                  {seq}
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                {op?.name || op?.operationCode || op?.description || `Operation ${seq / 10}`}
                              </TableCell>
                              {/* Operator - free text, autocompletes from this job's own history */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <input
                                  list="operator-names"
                                  type="text"
                                  value={qtyData.operatorName || ""}
                                  onChange={(e) => updateMoveQuantity(seq, "operatorName", e.target.value)}
                                  placeholder="Operator"
                                  className="w-full h-5 px-1 text-[11px] border border-gray-300 bg-white focus:outline-none focus:border-blue-400"
                                  disabled={selectedJob.status === "Completed"}
                                />
                              </TableCell>
                              {/* Machine - from the Resources master */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <select
                                  value={qtyData.resourceId || ""}
                                  onChange={(e) => updateMoveQuantity(seq, "resourceId", e.target.value)}
                                  className="w-full h-5 px-1 text-[11px] border border-gray-300 bg-white focus:outline-none focus:border-blue-400"
                                  disabled={selectedJob.status === "Completed"}
                                >
                                  <option value="">—</option>
                                  {resources.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.machine_name}</option>
                                  ))}
                                </select>
                              </TableCell>
                              {/* In Queue - Read Only */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0] bg-green-50">
                                <span className="font-medium text-green-700">{qtyData.inQueue}</span>
                              </TableCell>
                              {/* Start Qty - User enters how much to start */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <input
                                  id={startQtyId}
                                  type="number"
                                  min="0"
                                  max={qtyData.inQueue}
                                  value={qtyData.startQty || 0}
                                  onChange={(e) =>
                                    updateMoveQuantity(seq, "startQty", Number(e.target.value))
                                  }
                                  className="w-full h-5 px-1 text-[11px] border border-gray-300 bg-white focus:outline-none focus:border-blue-400"
                                  disabled={selectedJob.status === "Completed"}
                                />
                              </TableCell>
                              {/* Running - Read Only */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0] bg-blue-50">
                                <span className="font-medium text-blue-700">{qtyData.running}</span>
                              </TableCell>
                              {/* To Move - User enters how much to move to next */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0] bg-yellow-50">
                                <input
                                  type="number"
                                  min={0}
                                  max={qtyData.running || 0}
                                  value={qtyData.toMove ?? 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;

                                    updateMoveQuantity(
                                      seq,
                                      "toMove",
                                      Math.min(val, qtyData.running || 0)
                                    );
                                  }}
                                  className="w-full h-5 px-1 text-[11px] border border-gray-300 bg-yellow-50 focus:outline-none focus:border-blue-400"
                                  disabled={
                                    selectedJob.status === "Completed" || qtyData.running === 0
                                  }
                                />
                              </TableCell>
                              {/* To Reject - User enters how much to reject from Running */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0] bg-red-50">
                                <input
                                  type="number"
                                  min="0"
                                  max={qtyData.running}
                                  value={qtyData.toReject || 0}
                                  onChange={(e) => updateMoveQuantity(seq, 'toReject', Math.min(parseInt(e.target.value) || 0, qtyData.running))}
                                  className="w-full h-5 px-1 text-[11px] border border-gray-300 bg-red-50 focus:outline-none focus:border-red-400"
                                  disabled={selectedJob.status === "Completed" || qtyData.running === 0}
                                />
                              </TableCell>
                              {/* Rejected - Read Only (cumulative) */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <span className="font-medium text-red-600">{qtyData.rejected}</span>
                              </TableCell>
                              {/* To Scrap - User enters how much to scrap from Running */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0] bg-orange-50">
                                <input
                                  type="number"
                                  min="0"
                                  max={qtyData.running}
                                  value={qtyData.toScrap || 0}
                                  onChange={(e) => updateMoveQuantity(seq, 'toScrap', Math.min(parseInt(e.target.value) || 0, qtyData.running))}
                                  className="w-full h-5 px-1 text-[11px] border border-gray-300 bg-orange-50 focus:outline-none focus:border-orange-400"
                                  disabled={selectedJob.status === "Completed" || qtyData.running === 0}
                                />
                              </TableCell>
                              {/* Scrapped - Read Only (cumulative) */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <span className="font-medium text-orange-600">{qtyData.scrapped}</span>
                              </TableCell>
                              {/* Completed - Read Only */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <span className="font-medium text-gray-600">{qtyData.completed}</span>
                              </TableCell>
                              {/* Action Button */}
                              <TableCell className="text-[11px] py-1 px-2 text-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-5 px-2 text-[10px] bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                                  disabled={selectedJob.status === "Completed" || qtyData.inQueue === 0}
                                  onClick={() => {
                                    const startQty = qtyData.startQty || 0;

                                    if (startQty > 0 && startQty <= qtyData.inQueue) {
                                      handleMoveToRunning(seq, startQty);
                                    } else if (startQty > qtyData.inQueue) {
                                      toast({
                                        title: "Invalid Quantity",
                                        description: `Cannot start ${startQty} - only ${qtyData.inQueue} in queue.`,
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  Start
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-[#b8b8a0]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsJobMoveDialogOpen(false)}
                    className="bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0]"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rejection Reason Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="sm:max-w-md bg-[#e8e8d8] border-[#b8b8a0]">
            <div className="space-y-4">
              <div className="bg-[#4a5568] text-white px-4 py-2 -mx-6 -mt-6">
                <h3 className="text-sm font-semibold">Rejection Reason</h3>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <ErpLabel>Reason for Rejection *</ErpLabel>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejecting the quantity..."
                    className="w-full h-24 px-2 py-1 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] resize-none mt-1"
                  />
                </div>

                <div className="text-xs text-gray-600">
                  <span className="font-medium">Note:</span> Rejected quantities will be recorded with this reason and timestamp.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#b8b8a0]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRejectDialogOpen(false);
                    setRejectReason("");
                  }}
                  className="bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleRejectTransaction}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Scrap Reason Dialog */}
        <Dialog open={isScrapDialogOpen} onOpenChange={setIsScrapDialogOpen}>
          <DialogContent className="sm:max-w-md bg-[#e8e8d8] border-[#b8b8a0]">
            <div className="space-y-4">
              <div className="bg-[#4a5568] text-white px-4 py-2 -mx-6 -mt-6">
                <h3 className="text-sm font-semibold">Scrap Reason</h3>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <ErpLabel>Reason for Scrapping *</ErpLabel>
                  <textarea
                    value={scrapReason}
                    onChange={(e) => setScrapReason(e.target.value)}
                    placeholder="Enter reason for scrapping the quantity..."
                    className="w-full h-24 px-2 py-1 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] resize-none mt-1"
                  />
                </div>

                <div className="text-xs text-gray-600">
                  <span className="font-medium">Note:</span> Scrapped quantities will be recorded with this reason and timestamp.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#b8b8a0]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsScrapDialogOpen(false);
                    setScrapReason("");
                  }}
                  className="bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleScrapTransaction}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Confirm Scrap
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Log Delay Dialog */}
        <Dialog open={isDelayDialogOpen} onOpenChange={setIsDelayDialogOpen}>
          <DialogContent className="sm:max-w-md bg-[#e8e8d8] border-[#b8b8a0]">
            <div className="space-y-4">
              <div className="bg-[#4a5568] text-white px-4 py-2 -mx-6 -mt-6">
                <h3 className="text-sm font-semibold">Log Delay</h3>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <ErpLabel>Operation *</ErpLabel>
                  <select
                    value={delaySeq ?? ""}
                    onChange={(e) => setDelaySeq(e.target.value ? Number(e.target.value) : null)}
                    className="w-full h-8 px-2 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] mt-1"
                  >
                    <option value="">Select operation...</option>
                    {Object.keys(moveQuantities).map(Number).sort((a, b) => a - b).map((seq) => (
                      <option key={seq} value={seq}>{seq} — {getOperationName(seq)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <ErpLabel>Machine</ErpLabel>
                  <select
                    value={delayResourceId}
                    onChange={(e) => setDelayResourceId(e.target.value)}
                    className="w-full h-8 px-2 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] mt-1"
                  >
                    <option value="">—</option>
                    {resources.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.machine_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <ErpLabel>Operator</ErpLabel>
                  <input
                    list="operator-names"
                    type="text"
                    value={delayOperator}
                    onChange={(e) => setDelayOperator(e.target.value)}
                    placeholder="Operator"
                    className="w-full h-8 px-2 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] mt-1"
                  />
                </div>

                <div>
                  <ErpLabel>Reason *</ErpLabel>
                  <select
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    className="w-full h-8 px-2 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] mt-1"
                  >
                    {DELAY_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <ErpLabel>Duration (minutes) *</ErpLabel>
                  <input
                    type="number"
                    min="1"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full h-8 px-2 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] mt-1"
                  />
                </div>

                <div>
                  <ErpLabel>Notes</ErpLabel>
                  <textarea
                    value={delayNotes}
                    onChange={(e) => setDelayNotes(e.target.value)}
                    placeholder="Optional additional detail..."
                    className="w-full h-16 px-2 py-1 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] resize-none mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#b8b8a0]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDelayDialogOpen(false)}
                  className="bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleLogDelay}
                  className="bg-[#4a5568] hover:bg-[#374151] text-white"
                >
                  Log Delay
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden p-0 bg-[#e8e8d8] border-[#b8b8a0]">
            <div className="bg-gradient-to-r from-[#2c5282] to-[#1a365d] text-white px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <h2 className="text-sm font-medium">Transaction History</h2>
                </div>
                <span className="text-xs opacity-80">Job: {selectedJob?.id}</span>
              </div>
            </div>

            <div className="p-4">
              <ScrollArea className="h-[60vh]">
                {(() => {
                  const transactionsData = transactions || [];

                  if (transactions.length === 0) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No transactions recorded yet.</p>
                        <p className="text-sm mt-2">Transactions will appear here when you move, start, reject, or complete quantities.</p>
                      </div>
                    );
                  }

                  // Sort transactions by timestamp descending (most recent first)
                  const sortedTransactions = [...transactions].sort((a: MoveTransactionRecord, b: MoveTransactionRecord) =>
                    new Date(b.transaction_time || b.created_at).getTime() - new Date(a.transaction_time || a.created_at).getTime()
                  );

                  return (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#d8d8c8] hover:bg-[#d8d8c8]">
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Timestamp</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Type</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Operation</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Qty</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">From → To</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Reason</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">User</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedTransactions.map((txn: MoveTransactionRecord, idx: number) => {
                          const getTypeIcon = () => {
                            switch (txn.transaction_type) {
                              case 'start': return <Play className="h-3 w-3 text-green-600" />;
                              case 'move': return <ArrowRight className="h-3 w-3 text-blue-600" />;
                              case 'reject': return <XCircle className="h-3 w-3 text-red-600" />;
                              case 'scrap': return <AlertTriangle className="h-3 w-3 text-orange-600" />;
                              case 'complete': return <CheckCircle className="h-3 w-3 text-green-600" />;
                              default: return <Clock className="h-3 w-3 text-gray-600" />;
                            }
                          };

                          const getTypeBadge = () => {
                            const styles: Record<string, string> = {
                              start: "bg-green-100 text-green-700 border-green-300",
                              move: "bg-blue-100 text-blue-700 border-blue-300",
                              reject: "bg-red-100 text-red-700 border-red-300",
                              scrap: "bg-orange-100 text-orange-700 border-orange-300",
                              complete: "bg-emerald-100 text-emerald-700 border-emerald-300",
                            };
                            return styles[txn.transaction_type] || "bg-gray-100 text-gray-700 border-gray-300";
                          };

                          return (
                            <TableRow
                              key={txn.id || idx}
                              className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
                            >
                              <TableCell className="text-[11px] py-2 px-3">
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {new Date(txn.transaction_time || txn.created_at).toLocaleDateString()}
                                  </span>
                                  <span className="text-gray-500">
                                    {new Date(txn.transaction_time || txn.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3">
                                <div className="flex items-center gap-1">
                                  {getTypeIcon()}
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${getTypeBadge()}`}
                                  >
                                    {(txn.transaction_type || "unknown")
                                      .charAt(0)
                                      .toUpperCase() +
                                      (txn.transaction_type || "unknown").slice(1)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-600 font-medium">Seq {txn.seq}</span>
                                  <span className="text-gray-500">-</span>
                                  <span>{txn.operation_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3 font-semibold">
                                {txn.quantity}
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3">
                                <div className="flex items-center gap-1 text-gray-600">
                                  <span>{txn.from_status}</span>
                                  <ArrowRight className="h-3 w-3" />
                                  <span>{txn.to_status}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3 max-w-[150px]">
                                {txn.reason ? (
                                  <span className="text-red-600 truncate block" title={txn.reason}>
                                    {txn.reason}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3 text-gray-600">
                                {txn.user}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()}
              </ScrollArea>

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#b8b8a0]">
                <span className="text-xs text-gray-600">
                  Total transactions: {(selectedJob?.moveTransactions || []).length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHistoryDialogOpen(false)}
                  className="bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0]"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ShopFloor;
