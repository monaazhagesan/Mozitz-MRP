import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  Calculator,
  TrendingDown,
  Package,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  GitBranch,

  Info,
} from "lucide-react";
import ItemTransactionsTab from "@/components/inventory/ItemTransactionsTab";
import { ClipboardList, Lock } from "lucide-react";
import { BomMaterialsEditor } from "@/components/bom/BomMaterialsEditor";
import { BomOperationsEditor } from "@/components/bom/BomOperationsEditor";
import type { NewMaterialRow, NewOperationRow } from "@/components/bom/types";


type MRPItem = {
  id: string;
  location_id: string | null;
  item_code: string;
  item_name: string;
  item_type: string | null;
  location: string | null;
  on_hand: number;
  allocated: number;
  bom_req: number;
  open_po: number;
  safety_stock: number | null;
  reorder_point: number | null;
  lead_time_days: number | null;
  unit_cost: number | null;
  uom: string | null;
  barcode?: string | null;
};

type BarcodeSettings = {
  barcode_prefix: string;
  barcode_suffix: string;
  barcode_starting_number: number;
  barcode_number_length: number;
};

function generateBarcode(settings: BarcodeSettings, items: MRPItem[]) {
  const nextNumber = settings.barcode_starting_number + items.length;
  const paddedNumber = String(nextNumber).padStart(settings.barcode_number_length || 4, "0");
  return [settings.barcode_prefix, paddedNumber, settings.barcode_suffix].filter(Boolean).join("-");
}

type Suggestion = "Sufficient" | "Below Reorder" | "Deficit";

interface ComputedRow extends MRPItem {
  available: number;
  net_requirement: number;
  shortage_qty: number;
  suggestion: Suggestion;
  flags: string[];
}

type OperationMaster = {
  id: string;
  department: string;
  operation_name: string;
  machine: string | null;
  per_hr_cost: string | number;
};

const NUMERIC_FIELDS: Array<keyof MRPItem> = [
  "on_hand",
  "allocated",
  "bom_req",
  "open_po",
  "safety_stock",
  "reorder_point",
  "lead_time_days",
  "unit_cost",
];

const TYPE_PREFIX: Record<string, string> = {
  Material: "MAT",
  Product: "PRD",
  Component: "CMP",
};

const SAMPLE_COMPONENTS = [
  "SKF Bearing 6205",
  "Hydraulic Oil VG46",
  "SS Sheet 304 2mm",
  "Copper Wire 1.2mm",
  "Gasket Set",
  "O-Ring Kit",
  "Pump Shaft 32mm",
  "Motor Winding Copper",
  "Steel Bolt M12 x 40",
  "Rubber Seal 50mm",
  "Impeller Casting",
  "Housing Cap",
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function compute(item: MRPItem): ComputedRow {
  const onHand = Number(item.on_hand ?? 0);
  const allocated = Number(item.allocated ?? 0);
  const bomReq = Number(item.bom_req ?? 0);
  const openPo = Number(item.open_po ?? 0);
  const safety = item.safety_stock == null ? 0 : Number(item.safety_stock);
  const reorder = item.reorder_point;

  const available = onHand - allocated;
  const netReq = Math.max(0, bomReq + safety - (available + openPo));
  const shortage = available;

  let suggestion: Suggestion = "Sufficient";
  if (available < 0) suggestion = "Deficit";
  else if (reorder != null && onHand < Number(reorder))
    suggestion = "Below Reorder";

  const flags: string[] = [];
  if (!item.item_code || !item.item_name) flags.push("Incomplete Record");
  if (allocated > onHand) flags.push("Over-allocated");
  if (openPo > 0 && item.lead_time_days == null) flags.push("Lead time missing");

  return {
    ...item,
    available,
    net_requirement: netReq,
    shortage_qty: shortage,
    suggestion,
    flags,
  };
}

function generateItemCode(type: string, items: MRPItem[]) {
  const prefix = TYPE_PREFIX[type] ?? "ITM";
  const numbers = items
    .filter((i) => i.item_code?.startsWith(prefix))
    .map((i) => Number(i.item_code?.split("-")[1]))
    .filter((n) => !isNaN(n));
  const max = numbers.length ? Math.max(...numbers) : 0;
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

// ─────────────────────────────────────────────
// SMALL UI COMPONENTS
// ─────────────────────────────────────────────

function StockBar({ onHand, reorder }: { onHand: number; reorder: number | null }) {
  if (reorder == null || reorder <= 0) {
    return <div className="text-xs text-muted-foreground">—</div>;
  }
  const pct = Math.min(200, Math.max(0, (onHand / reorder) * 100));
  const color =
    pct < 50 ? "bg-destructive" : pct < 100 ? "bg-amber-500" : "bg-green-600";
  return (
    <div className="w-28">
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{Math.round(pct)}%</div>
    </div>
  );
}

function SuggestionBadge({ s }: { s: Suggestion }) {
  if (s === "Deficit") return <Badge variant="destructive">Deficit</Badge>;
  if (s === "Below Reorder")
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Below Reorder</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700 text-white">Sufficient</Badge>;
}

// Live preview pill used in the modal
function LivePill({ oh, ss }: { oh: number; ss: number }) {
  if (oh < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
        <X className="h-2.5 w-2.5" /> Deficit
      </span>
    );

  if (oh === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
        <X className="h-2.5 w-2.5" /> Out of stock
      </span>
    );

  if (ss > 0 && oh <= ss)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
        <AlertTriangle className="h-2.5 w-2.5" /> Low stock
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800">
      <Check className="h-2.5 w-2.5" /> Sufficient
    </span>
  );
}

// Stepper used in BOM step
const STEPPER_LABELS: Record<1 | 2 | 3, string> = {
  1: "Item details",
  2: "Bill of materials",
  3: "Production operations",
};

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center mb-5">
      {([1, 2, 3] as const).map((n, idx) => (
        <>
          {idx > 0 && (
            <div
              key={`line-${n}`}
              className={`flex-1 h-px mx-3 transition-all ${
                step >= n ? "bg-green-600" : "bg-border"
              }`}
            />
          )}
          <div key={`step-${n}`} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all flex-shrink-0 ${
                step === n
                  ? "border-green-600 text-green-600 bg-green-50"
                  : step > n
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-border text-muted-foreground bg-card"
              }`}
            >
              {step > n ? <Check className="h-3 w-3" /> : n}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Step {n}
              </span>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  step === n
                    ? "text-green-600"
                    : step > n
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {STEPPER_LABELS[n]}
              </span>
            </div>
          </div>
        </>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD ITEM DIALOG  (the main converted modal)
// ─────────────────────────────────────────────

const emptyItem: Omit<MRPItem, "id"> = {
  item_code: "",
  item_name: "",
  item_type: "Material",
  on_hand: 0,
  allocated: 0,
  bom_req: 0,
  open_po: 0,
  safety_stock: null,
  reorder_point: null,
  lead_time_days: null,
  unit_cost: null,
  location: null,
  location_id: null,
  uom: "Nos",
  barcode: "",
};

const ACTIVE_JOB_STATUSES = new Set(["Pending", "In Progress"]);

const getActiveJobNumbers = () => {
  try {
    const saved = localStorage.getItem("jobs");
    const jobs: any[] = saved ? JSON.parse(saved) : [];
    return new Set(
      jobs
        .filter((job) => ACTIVE_JOB_STATUSES.has(job.status))
        .map((job) => job.id || job.jobNumber)
        .filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
};

type AddItemDialogProps = {
  open: boolean;
  saving: boolean;
  onOpenChange: (v: boolean) => void;
  isNew: boolean;
  editing: MRPItem | null;
  setEditing: React.Dispatch<React.SetStateAction<MRPItem | null>>;
  items: MRPItem[];
  locations: { id: string; location_name: string }[];
  receiptType: string;

  materialRows: NewMaterialRow[];
setMaterialRows: React.Dispatch<React.SetStateAction<NewMaterialRow[]>>;

  operationRows: NewOperationRow[];
setOperationRows: React.Dispatch<React.SetStateAction<NewOperationRow[]>>;
  operationsMaster: OperationMaster[];

  // Status of the Product's existing BOM (if any) as of when the dialog was
  // opened for edit — null for a new item or one with no BOM yet. Active
  // BOMs are immutable; Steps 2/3 render read-only in that case.
  editingBomStatus: "Draft" | "Active" | null;
  activateBomNow: boolean;
  setActivateBomNow: React.Dispatch<React.SetStateAction<boolean>>;

setReceiptType: React.Dispatch<React.SetStateAction<string>>;

receiptDate: string;
setReceiptDate: React.Dispatch<React.SetStateAction<string>>;

poGrnRef: string;
setPoGrnRef: React.Dispatch<React.SetStateAction<string>>;

stockUom: string;
setStockUom: React.Dispatch<React.SetStateAction<string>>;

addQty: number;
setAddQty: React.Dispatch<React.SetStateAction<number>>;
  onSave: () => Promise<void>;
};

function AddItemDialog({
  open,
  onOpenChange,
  isNew,
  editing,
   saving,
  onSave,
  setEditing,
  items,
  locations,
  receiptType,
  materialRows,
setMaterialRows,
operationRows,
setOperationRows,
operationsMaster,
editingBomStatus,
activateBomNow,
setActivateBomNow,
setReceiptType,

receiptDate,
setReceiptDate,

poGrnRef,
setPoGrnRef,

stockUom,
setStockUom,

addQty,
setAddQty,

}: AddItemDialogProps) {
  // Which top-level tab: "new" | "stock"
  const [mainTab, setMainTab] = useState<"new" | "stock">("new");
  // Which step (only relevant for Product new items)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // BOM rows
  // Add-stock panel state
  const [stockItem, setStockItem] = useState<{ cur: number; uom: string } | null>(null);
  const isProduct = editing?.item_type === "Product";
  const bomIsActive = editingBomStatus === "Active";

  // Reset when dialog opens/closes
 useEffect(() => {
  if (open) {
    setMainTab("new");
    setStep(1);
    setStockItem(null);
    setAddQty(0);

    if (isNew) {
      setMaterialRows([]);
      setOperationRows([]);
    }
  }
}, [open, isNew]);

  // Live preview calculations
  const onHand = Number(editing?.on_hand ?? 0);
const allocated = Number(editing?.allocated ?? 0);
const openPo = Number(editing?.open_po ?? 0);
const bomReq = Number(editing?.bom_req ?? 0);
const safety = Number(editing?.safety_stock ?? 0);

// MRP available stock
const available = onHand - allocated;

// projected stock after supply/demand
const projectedAvailable = onHand + openPo - allocated;

// MRP net requirement (same logic as table)
const netRequirement = Math.max(
  0,
  bomReq + safety - projectedAvailable
);

  const handleSubmit = async () => {
    if (mainTab === "stock") {
  await onSave();
  return;
}
    if (isProduct && step === 1) {
      setStep(2);
      return;
    }
    if (isProduct && step === 2) {
      setStep(3);
      return;
    }
    await onSave();
  };

  const handleTypeChange = (v: string) => {
    if (!editing) return;
    const shouldGenerate = isNew || !editing.item_code;
    setEditing({
      ...editing,
      item_type: v,
      item_code: shouldGenerate ? generateItemCode(v, items) : editing.item_code,
    });
  };

  // Submit label / icon
  const submitLabel = () => {
    if (mainTab === "stock") return "Add stock";
    if (isProduct && step === 1) return "Next: Map BOM";
    if (isProduct && step === 2) return "Next: Operations";
    if (isProduct && step === 3) return "Save item & BOM";
    return isNew ? "Add item" : "Save";
  };

  const submitIcon = () => {
    if (mainTab === "stock") return <Check className="h-4 w-4" />;
    if (isProduct && (step === 1 || step === 2)) return <ArrowRight className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  };

  // ── dialog title + sub ────────────────────────

  const dialogTitle = () => {
    if (mainTab === "stock") return "Add stock";
    if (step === 2) return "Bill of materials";
    if (step === 3) return "Production operations";
    return isNew ? "Add item" : "Edit item";
  };

  const dialogSub = () => {
    if (step === 2)
      return `Step 2 of 3 — Mapping for: ${editing?.item_name || "Product"}`;
    if (step === 3)
      return `Step 3 of 3 — Routing for: ${editing?.item_name || "Product"}`;
    if (isProduct) return "Step 1 of 3 — Item details";
    return isNew
      ? "Type: Material — raw material for production"
      : `Editing: ${editing?.item_code}`;
  };

  // ── render ────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${step === 3 && mainTab === "new" ? "max-w-4xl" : "max-w-2xl"} max-h-[93vh] overflow-hidden flex flex-col p-0 gap-0`}>
        {/* ── HEADER ── */}
        <div className="px-6 pt-5 pb-0 flex-shrink-0">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0">
              {mainTab === "stock" ? (
                <Plus className="h-4 w-4" />
              ) : step === 2 ? (
                <GitBranch className="h-4 w-4" />
              ) : step === 3 ? (
                <ClipboardList className="h-4 w-4" />
              ) : (
                <Package className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold leading-tight">
                {dialogTitle()}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{dialogSub()}</p>
            </div>
          </div>

          {/* Main tabs */}
          <div className="flex border-b border-border -mx-0">
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ════ NEW ITEM — STEP 1 ════ */}
          {mainTab === "new" && step === 1 && editing && (
            <div>
              {/* Stepper (only for Product) */}
              {isProduct && <Stepper step={1} />}

              {/* Live preview bar */}
              <div className="flex items-center gap-4 flex-wrap bg-muted/40 border border-border rounded-lg px-4 py-2.5 mb-5 text-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Live preview
                </span>
                <span>
                  Available:{" "}
                  <span className="font-semibold">{available}</span>
                </span>
               <LivePill oh={available} ss={safety} />
              </div>

              {/* Section: Basic info */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <Info className="h-3 w-3" /> Basic info
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Item code (readonly) */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Item code
                  </Label>
                  <Input
                    value={editing.item_code}
                    disabled
                    className="bg-muted opacity-80 cursor-not-allowed"
                  />
                </div>

                {/* Item name */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Item name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={editing.item_name}
                    placeholder="e.g. Pump Assembly Unit"
                    onChange={(e) =>
                      setEditing({ ...editing, item_name: e.target.value })
                    }
                  />
                </div>

                {/* Barcode (auto-generated from Settings > Barcodes, editable) */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Barcode
                  </Label>
                  <Input
                    value={editing.barcode ?? ""}
                    placeholder="Auto-generated"
                    onChange={(e) =>
                      setEditing({ ...editing, barcode: e.target.value })
                    }
                  />
                </div>

                {/* Type */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={editing.item_type ?? "Material"}
                    onValueChange={handleTypeChange}
                     disabled={!isNew}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Material">Material</SelectItem>
                      <SelectItem value="Product">Product (manufactured)</SelectItem>

                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
    Unit of measure <span className="text-destructive">*</span>
  </Label>

   <Select value={stockUom} onValueChange={setStockUom}>
    <SelectTrigger>
      <SelectValue placeholder="Select UOM" />
    </SelectTrigger>
    <SelectContent>
      {["Nos", "Kg", "Ltr", "Mtr", "Set", "Box", "Pcs"].map((u) => (
        <SelectItem key={u} value={u}>
          {u}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
                {/* On hand */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    On hand qty <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={editing.on_hand}
                    onChange={(e) =>
                      setEditing({ ...editing, on_hand: Number(e.target.value) })
                    }
                  />
                </div>

                {/* Unit cost */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Unit cost (₹)
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={editing.unit_cost ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        unit_cost: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>

                {/* Location */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={editing.location_id || ""}
                    onValueChange={(value) => {
                      const selectedLoc = locations.find((l) => l.id === value);
                      setEditing({
                        ...editing,
                        location_id: value,
                        location: selectedLoc?.location_name || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.location_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border my-4" />

              {/* Section: Reorder settings */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <Calculator className="h-3 w-3" /> Reorder settings
                <span className="ml-1 text-[10px] font-medium text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5 normal-case tracking-normal">
                  optional
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Safety stock */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Safety stock
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 10"
                    value={editing.safety_stock ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        safety_stock:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Buffer qty — triggers reorder before hitting 0
                  </span>
                </div>

                {/* Reorder point */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Reorder point
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 20"
                    value={editing.reorder_point ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        reorder_point:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Stock level that auto-raises a Purchase Request
                  </span>
                </div>

                {/* Lead time */}
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Lead time (days)
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 7"
                    value={editing.lead_time_days ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        lead_time_days:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Days from order placed to stock arriving
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ════ NEW ITEM — STEP 2 (BOM) — Product only ════ */}
          {mainTab === "new" && step === 2 && editing && (
            <div>
              <Stepper step={2} />

              {/* Product context banner */}
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-[12px] text-blue-900">
                <GitBranch className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Enter how many of each component is needed to make{" "}
                  <strong>1 unit</strong> of{" "}
                  <strong>{editing.item_name || "Product"}</strong>.
                </span>
              </div>

              {bomIsActive && (
                <div className="flex items-start gap-2.5 bg-muted border border-border rounded-lg px-4 py-3 mb-4 text-[12px]">
                  <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    This BOM is Active and read-only. To change materials, create a revision from{" "}
                    <a href="/bom" className="underline font-medium">the BOM module</a>.
                  </span>
                </div>
              )}

              {/* Section label */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <ClipboardList className="h-3 w-3" /> Components
              </div>

              <BomMaterialsEditor
                rows={materialRows}
                onRowsChange={setMaterialRows}
                inventoryItems={items
                  .filter((i) => i.item_type === "Material" || i.item_type === "Component")
                  .map((i) => ({
                    item_code: i.item_code,
                    item_name: i.item_name,
                    item_type: i.item_type,
                    quantity_on_hand: Number(i.on_hand ?? 0),
                  }))}
                stock={Object.fromEntries(items.map((i) => [i.item_code, Number(i.on_hand ?? 0)]))}
                readOnly={bomIsActive}
              />
            </div>
          )}

          {/* ════ NEW ITEM — STEP 3 (Production Operations) — Product only ════ */}
          {mainTab === "new" && step === 3 && editing && (
            <div>
              <Stepper step={3} />

              {/* Context banner */}
              <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-[12px] text-blue-900">
                <ClipboardList className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Define the manufacturing routing for{" "}
                  <strong>{editing.item_name || "Product"}</strong> by selecting Operations
                  already configured in <strong>Settings → Operations</strong>. Machine/Resource
                  is assigned later, at Job / Shop Floor execution.
                </span>
              </div>

              {bomIsActive && (
                <div className="flex items-start gap-2.5 bg-muted border border-border rounded-lg px-4 py-3 mb-4 text-[12px]">
                  <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    This BOM is Active and read-only. To change operations, create a revision from{" "}
                    <a href="/bom" className="underline font-medium">the BOM module</a>.
                  </span>
                </div>
              )}

              {operationsMaster.length === 0 && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-[12px] text-amber-900">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>No Operations configured yet. Go to Settings to add them, then reopen this dialog.</span>
                </div>
              )}

              {/* Section label */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <ClipboardList className="h-3 w-3" /> Operation steps
              </div>

              <BomOperationsEditor
                rows={operationRows}
                onRowsChange={setOperationRows}
                operationsMaster={operationsMaster.map((o) => ({ operation_name: o.operation_name, department: o.department }))}
                readOnly={bomIsActive}
              />

              {!bomIsActive && materialRows.length > 0 && (
                <label className="flex items-center gap-2 mt-4 text-sm">
                  <Checkbox
                    checked={activateBomNow}
                    onCheckedChange={(v) => setActivateBomNow(!!v)}
                    disabled={operationRows.length === 0}
                  />
                  <span>
                    Activate this BOM now
                    {operationRows.length === 0 && (
                      <span className="text-muted-foreground"> (add at least one operation first)</span>
                    )}
                  </span>
                </label>
              )}
            </div>
          )}

          {/* ════ ADD STOCK PANEL ════ */}
          {mainTab === "stock" && (
            <div>
              {/* Stock preview bar */}
              <div className="flex items-center gap-4 flex-wrap bg-muted/40 border border-border rounded-lg px-4 py-2.5 mb-5 text-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Stock preview
                </span>
                <span>
                  Current:{" "}
                  <span className="font-semibold">
                    {stockItem != null ? stockItem.cur : "—"}
                  </span>
                </span>
                <span>
                  Adding: <span className="font-semibold">{addQty}</span>
                </span>
                <span>
                  New total:{" "}
                  <span className="font-semibold">
                    {stockItem != null ? stockItem.cur + addQty : "—"}
                  </span>
                </span>
              </div>

              {/* Select item */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <Search className="h-3 w-3" /> Select item
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Item <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(v) => {
                      const [cur] = v.split("|");
                      setStockItem({ cur: Number(cur), uom: "Nos" });
                      setAddQty(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search or select…" />
                    </SelectTrigger>
                   <SelectContent>
  {items.map((item) => (
    <SelectItem
      key={item.id}
      value={`${item.on_hand}|${item.uom ?? "Nos"}`}
    >
      {item.item_code} — {item.item_name}
    </SelectItem>
  ))}
</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Qty to add <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={addQty}
                    onChange={(e) => setAddQty(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              {/* Out-of-stock warning */}
              {stockItem?.cur === 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-[12px] text-amber-900">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    This item is currently <strong>out of stock.</strong> Adding stock
                    will update available quantity immediately.
                  </span>
                </div>
              )}

              {/* Stock breakdown */}
              <div className="border border-border rounded-lg overflow-hidden mb-4">
                {[
                  { label: "Current on hand", value: stockItem != null ? stockItem.cur : "—" },
                  {
                    label: "Quantity being added",
                    value: `+${addQty}`,
                    className: "text-green-700 font-semibold",
                  },
                  {
                    label: "New on hand total",
                    value: stockItem != null ? stockItem.cur + addQty : "—",
                    bold: true,
                  },
                ].map(({ label, value, className, bold }) => (
                  <div
                    key={label}
                    className={`flex justify-between items-center px-4 py-2.5 border-b border-border last:border-b-0 text-sm ${bold ? "font-semibold" : ""}`}
                  >
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className={className}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border my-4" />

              {/* Receipt details */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <ClipboardList className="h-3 w-3" /> Receipt details
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Receipt type <span className="text-destructive">*</span>
                  </Label>
                  <Select onValueChange={setReceiptType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grn">Purchase receipt (GRN)</SelectItem>
                      <SelectItem value="opening">Opening stock</SelectItem>
                      <SelectItem value="return">Return from production</SelectItem>
                      <SelectItem value="transfer">Transfer in</SelectItem>
                      <SelectItem value="adjustment">Adjustment — surplus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Receipt date <span className="text-destructive">*</span>
                  </Label>
                  <Input
  type="date"
  value={receiptDate}
  onChange={(e) => setReceiptDate(e.target.value)}
/>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    PO / GRN reference
                  </Label>
                 <Input
  placeholder="e.g. PO-2024-0156"
  value={poGrnRef}
  onChange={(e) => setPoGrnRef(e.target.value)}
/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 py-3.5 border-t border-border flex items-center justify-between flex-shrink-0">
          {/* Left info */}
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            {isProduct && step === 1
              ? <>Type set to <strong className="text-foreground">Product</strong> — BOM mapping on next step</>
              : step === 2
              ? "You can edit this BOM later from Item Settings"
              : step === 3
              ? "Production operations are optional and editable later"
              : <>Fields marked <span className="text-destructive font-bold">*</span> are required</>}
          </span>

          {/* Right buttons */}
          <div className="flex items-center gap-2">
            {/* Back btn — steps 2 and 3 only */}
            {(step === 2 || step === 3) && mainTab === "new" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step === 3 ? 2 : 1)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
           <Button
  size="sm"
  className="bg-green-700 hover:bg-green-800 text-white"
  onClick={handleSubmit}
  disabled={saving} // ✅ ADD THIS
>
  {saving ? (
    <>
      <svg className="animate-spin h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Saving...
    </>
  ) : (
    <>
      {submitIcon()}
      <span className="ml-1.5">{submitLabel()}</span>
    </>
  )}
</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// MAIN MRP PLANNER TAB
// ─────────────────────────────────────────────

export default function MRPPlannerTab() {
  const [items, setItems] = useState<MRPItem[]>([]);
  const [barcodeSettings, setBarcodeSettings] = useState<BarcodeSettings>({
    barcode_prefix: "INV",
    barcode_suffix: "",
    barcode_starting_number: 1001,
    barcode_number_length: 6,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MRPItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [locations, setLocations] = useState<{ id: string; location_name: string }[]>([]);

  const [receiptType, setReceiptType] = useState("");
const [receiptDate, setReceiptDate] = useState("");
const [poGrnRef, setPoGrnRef] = useState("");
const [stockUom, setStockUom] = useState("Nos");
const [addQty, setAddQty] = useState(0);

const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<any | null>(null);

const [materialRows, setMaterialRows] = useState<NewMaterialRow[]>([]);
const [operationRows, setOperationRows] = useState<NewOperationRow[]>([]);
const [operationsMaster, setOperationsMaster] = useState<OperationMaster[]>([]);
const [editingBomId, setEditingBomId] = useState<string | null>(null);
const [editingBomStatus, setEditingBomStatus] = useState<"Draft" | "Active" | null>(null);
const [activateBomNow, setActivateBomNow] = useState(true);

useEffect(() => {
  axios.get("/api/operations").then((res) => {
    setOperationsMaster(Array.isArray(res.data) ? res.data : []);
  }).catch(() => setOperationsMaster([]));
}, []);

const [saving, setSaving] = useState(false);

  const [breakupOpen, setBreakupOpen] = useState(false);
  const [breakupItem, setBreakupItem] = useState<{ code: string; name: string; total: number } | null>(null);
  const [breakupRows, setBreakupRows] = useState<any[]>([]);
  const [breakupLoading, setBreakupLoading] = useState(false);

  const openBreakup = async (row: ComputedRow) => {
  try {
    setBreakupItem({
      code: row.item_code,
      name: row.item_name,
      total: row.allocated,
    });

    setBreakupRows([]);
    setBreakupOpen(true);
    setBreakupLoading(true);

    const activeJobNumbers = Array.from(getActiveJobNumbers());

    // No active jobs
    if (activeJobNumbers.length === 0) {
      setBreakupItem({
        code: row.item_code,
        name: row.item_name,
        total: 0,
      });

      setBreakupLoading(false);

      // Sync inventory allocated qty to 0
      if (Number(row.allocated ?? 0) !== 0) {
        await axios.patch(
          `/api/inventory-stock/${row.id}`,
          {
            allocated_quantity: 0,
          }
        );

        fetchData();
      }

      return;
    }

    // Get allocations from API
    const res = await axios.post(
      "/api/job-allocations/breakup",
      {
        item_code: row.item_code,
        job_numbers: activeJobNumbers,
      }
    );

    const rows = res.data?.data || [];

    const sum = rows.reduce(
      (total: number, r: any) =>
        total + Number(r.allocated_quantity ?? 0),
      0
    );

    setBreakupRows(rows);

    setBreakupItem({
      code: row.item_code,
      name: row.item_name,
      total: sum,
    });

    // Sync inventory allocated qty
    if (sum !== Number(row.allocated ?? 0)) {
      await axios.patch(
        `/api/inventory-stock/${row.id}`,
        {
          allocated_quantity: sum,
        }
      );

      fetchData();
    }
  } catch (error) {
    console.error(error);
    toast.error("Failed to load allocation breakup");
  } finally {
    setBreakupLoading(false);
  }
};


const syncAllocatedFromActiveJobs = async () => {
  const activeJobNumbers = Array.from(getActiveJobNumbers());

  try {
    // ==================================
    // Release allocations for closed jobs
    // ==================================
    const saved = localStorage.getItem("jobs");

    const jobs: any[] = saved
      ? JSON.parse(saved)
      : [];

    const closingStatuses = new Set([
      "Completed",
      "Closed",
      "Cancelled",
      "Ready for Dispatch",
    ]);

    const closedJobIds = jobs
      .filter((j) => closingStatuses.has(j.status))
      .map((j) => j.id);

    // Backend should release allocations
    await Promise.all(
      closedJobIds.map((jobId) =>
        axios.post("/api/job-allocations/deallocate", {
          job_number: jobId,
        })
      )
    );
  } catch (err) {
    console.error("Deallocation error:", err);
  }

  try {
    // ==================================
    // Load active allocations
    // ==================================
    let activeAllocs: any[] = [];

    if (activeJobNumbers.length > 0) {
      const allocRes = await axios.post(
        "/api/job-allocations/active",
        {
          job_numbers: activeJobNumbers,
        }
      );

      activeAllocs = allocRes.data?.data || [];
    }

    // ==================================
    // Sum allocations per item
    // ==================================
    const sumByItem = new Map<string, number>();

    activeAllocs.forEach((a) => {
      const qty = Number(a.allocated_quantity || 0);

      sumByItem.set(
        a.item_code,
        (sumByItem.get(a.item_code) || 0) + qty
      );
    });

    // ==================================
    // Load inventory items
    // ==================================
    const stockRes = await axios.get(
      "/api/inventory-stock"
    );

    const stockRows =
      stockRes.data?.items ||
      stockRes.data?.data ||
      [];

    // ==================================
    // Find mismatches
    // ==================================
    const updates: Array<{
      item_code: string;
      allocated_quantity: number;
    }> = [];

    stockRows.forEach((s: any) => {
      const code = s.itemCode ?? s.item_code;
      if (!code) return;

      const actual =
        sumByItem.get(code) || 0;

      const current =
        Number(
          s.allocated_quantity ??
          s.allocatedQuantity ??
          0
        );

      if (current !== actual) {
        updates.push({
          item_code: code,
          allocated_quantity: actual,
        });
      }
    });

    // ==================================
    // Update inventory allocated qty
    // ==================================
    await Promise.all(
      updates.map((u) =>
        axios.patch(
          `/api/inventory-stock/by-code/${u.item_code}`,
          {
            allocated_quantity:
              u.allocated_quantity,
          }
        )
      )
    );
  } catch (err) {
    console.error(
      "Allocation sync failed:",
      err
    );
  }
};

  const fetchData = async () => {
    setLoading(true);
    await syncAllocatedFromActiveJobs();
    try {
      const res = await axios.get("/api/inventory-stock");
      const data = res.data?.items ?? [];
      const mapped: MRPItem[] = data.map((r: any) => ({
        id: r.id,
        item_code: r.itemCode ?? r.item_code ?? "",
        item_name: r.itemName ?? r.item_name ?? "",
        item_type: r.item_type ?? "N/A",
        location: r.location ?? "Default",
        location_id: r.location_id ?? null,
        on_hand: Number(r.quantityOnHand ?? r.quantity_on_hand ?? 0),
        allocated: Number(r.allocatedQuantity ?? r.allocated_quantity ?? 0),
        bom_req: Number(r.committedQuantity ?? r.committed_quantity ?? 0),
        open_po: Number(r.open_po ?? 0),
        safety_stock: Number(r.safety_stock ?? r.safetyStock ?? r.safety_stock_qty ?? 0),
        reorder_point: Number(r.reorderPoint ?? r.reorder_point ?? 0),
        lead_time_days: Number(r.leadTimeDays ?? r.lead_time_days ?? 0),
        unit_cost: Number(r.unit_cost ?? r.unitCost ?? 0),
        uom: r.uom ?? r.unitOfMeasure ?? r.unit_of_measure ?? "Nos", // ✅ ADD THIS
        barcode: r.barcode ?? "",
      }));
      setItems(mapped);
    } catch (error) {
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const loadBarcodeSettings = async () => {
      try {
        const res = await axios.get("/api/organization-settings");
        setBarcodeSettings({
          barcode_prefix: res.data.barcode_prefix || "",
          barcode_suffix: res.data.barcode_suffix || "",
          barcode_starting_number: Number(res.data.barcode_starting_number ?? 1001),
          barcode_number_length: Number(res.data.barcode_number_length ?? 6),
        });
      } catch (error) {
        // Fall back to the defaults above if settings can't be loaded.
      }
    };
    loadBarcodeSettings();
  }, []);


  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get("/api/locations");
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setLocations(data);
      } catch {
        toast.error("Failed to load locations");
      }
    };
    fetchLocations();
  }, []);

  const computed = useMemo(() => items.map(compute), [items]);

  const filtered = useMemo(() => {
    return computed.filter((r) => {
      if (search) {
        const s = search.toLowerCase();
        if (!r.item_code.toLowerCase().includes(s) && !r.item_name.toLowerCase().includes(s))
          return false;
      }
      if (typeFilter !== "all" && (r.item_type ?? "N/A") !== typeFilter) return false;
      if (statusFilter !== "all" && r.suggestion !== statusFilter) return false;
      return true;
    });
  }, [computed, search, typeFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: computed.length,
    deficit: computed.filter((c) => c.suggestion === "Deficit").length,
    below: computed.filter((c) => c.suggestion === "Below Reorder").length,
    flagged: computed.filter((c) => c.flags.length > 0).length,
  }), [computed]);

  const persistField = async (id: string, dbField: string, value: number | null) => {
    try {
      await axios.patch(`/api/inventory-stock/${id}`, { [dbField]: value });
      toast.success("Updated");
    } catch {
      toast.error("Update failed");
      fetchData();
    }
  };


const openEdit = async (row: ComputedRow) => {
  setIsNew(false);
  setMaterialRows([]);
  setOperationRows([]);
  setEditingBomId(null);
  setEditingBomStatus(null);
  setActivateBomNow(true);
  setEditOpen(false); // prevent UI glitch

  setEditing({
    id: row.id,
    item_code: row.item_code,
    item_name: row.item_name,
    item_type: row.item_type,
    on_hand: row.on_hand,
    allocated: row.allocated,
    bom_req: row.bom_req,
    open_po: row.open_po,
    safety_stock: row.safety_stock,
    reorder_point: row.reorder_point,
    lead_time_days: row.lead_time_days,
    unit_cost: row.unit_cost,
    location: row.location,
    location_id: row.location_id ? String(row.location_id) : null,
    uom: (row as any).uom ?? "Nos",
  });

  try {
    const headerRes = await axios.get(
      `/api/bom-headers/by-item-code`,
      {
        params: { item_code: row.item_code },
        validateStatus: () => true, // 🔥 IMPORTANT: stop Axios throwing 500
      }
    );

    if (headerRes.status !== 200) {
      console.error("HEADER API FAILED:", headerRes.data);
      setEditOpen(true);
      return;
    }

    const headers = headerRes.data?.data || [];

    if (!headers.length) {
      setEditOpen(true);
      return;
    }

    const bomHeader = headers[0];
    setEditingBomId(bomHeader.id);
    setEditingBomStatus(bomHeader.status === "Active" ? "Active" : "Draft");

    const compRes = await axios.get(
      `/api/bom-components`,
      {
        params: { bom_id: bomHeader.id },
        validateStatus: () => true,
      }
    );

    const rows: NewMaterialRow[] = (compRes.data || []).map((c: any) => ({
      tempId: crypto.randomUUID(),
      component: c.component,
      description: c.description || c.item_name || c.component,
      uom: c.uom ?? "",
      quantity: Number(c.quantity ?? 0),
      scrap_percent: Number(c.scrap_percent ?? 0),
      stock: Number(row.on_hand ?? 0),
    }));

    setMaterialRows(rows);

    const opsRes = await axios.get("/api/bom-operations", {
      params: { bom_id: bomHeader.id },
      validateStatus: () => true,
    });

    const opRows: NewOperationRow[] = (Array.isArray(opsRes.data) ? opsRes.data : []).map((op: any) => ({
      tempId: crypto.randomUUID(),
      operation_seq: Number(op.operation_seq ?? 0),
      operation_code: op.operation_code || op.description || "",
      department: op.department || "",
      work_center: op.work_center || op.department || "",
      setup_time: Number(op.setup_time ?? 0),
      run_time: Number(op.run_time ?? 0),
      labor_cost: Number(op.labor_cost ?? 0),
      qc_required: !!op.qc_required,
    }));

    setOperationRows(opRows);

  } catch (err) {
    console.error("BOM load error:", err);
    setMaterialRows([]);
    setOperationRows([]);
  } finally {
    setEditOpen(true);
  }
};

const buildBomOperationPayload = (bomId: string, row: NewOperationRow, index: number) => ({
  bom_id: bomId,
  operation_seq: (index + 1) * 10,
  operation_code: row.operation_code,
  department: row.department || null,
  work_center: row.work_center || null,
  setup_time: Number(row.setup_time ?? 0),
  run_time: Number(row.run_time ?? 0),
  labor_cost: Number(row.labor_cost ?? 0),
  qc_required: !!row.qc_required,
});

const saveBomOperations = async (bomId: string, opRows: NewOperationRow[]) => {
  await axios.post("/api/bom-operations/delete-by-bom", { bom_id: bomId });

  const validRows = opRows.filter((r) => r.operation_code.trim());
  if (validRows.length === 0) return;

  await axios.post(
    "/api/bom-operations",
    validRows.map((row, index) => buildBomOperationPayload(bomId, row, index))
  );
};

// Only ever called when the BOM is Draft (or doesn't exist yet) — Step 2/3
// render read-only for an Active BOM, so this path never runs against one.
// The backend's Active-BOM immutability guard is defense in depth on top.
const ensureBomAndUpdate = async (itemCode: string, itemName: string, uom: string, rows: NewMaterialRow[], opRows: NewOperationRow[] = []) => {
  const headerRes = await axios.get("/api/bom-headers/by-item-code", {
    params: { item_code: itemCode },
  });

  let bomHeader = headerRes.data?.data?.[0];

  if (!bomHeader) {
    const createRes = await axios.post("/api/bom-headers", {
      item_type: "Product",
      item_code: itemCode,
      item_name: itemName,
      uom,
      revision: "A",
    });

    bomHeader = createRes.data?.data || createRes.data;
  }

  if (!bomHeader?.id) return null;

  await axios.post("/api/bom-components/delete-by-bom", { bom_id: bomHeader.id });

  if (rows.length > 0) {
    await axios.post(
      "/api/bom-components/bulk",
      rows.map((row) => ({
        bom_id: bomHeader.id,
        component: row.component,
        description: row.description || row.component,
        quantity: row.quantity,
        uom: row.uom,
        scrap_percent: row.scrap_percent,
      }))
    );
  }

  await saveBomOperations(String(bomHeader.id), opRows);

  return String(bomHeader.id);
};

  const openAdd = () => {
     setMaterialRows([]);
    setOperationRows([]);
    setEditingBomId(null);
    setEditingBomStatus(null);
    setActivateBomNow(true);
    const defaultType = "Material";
    setEditing({
      id: "",
      ...emptyItem,
      item_type: defaultType,
      item_code: generateItemCode(defaultType, items),
      barcode: generateBarcode(barcodeSettings, items),
    });
    setIsNew(true);
    setEditOpen(true);
  };

 const saveEdit = async () => {
  if (saving) return; // ✅ prevent double click
  setSaving(true);    // ✅ lock


  if (!editing) return;

  // ✅ REQUIRED FIELD CHECK (ONLY FOR NEW)
  if (
    isNew &&
    (!editing.item_code?.trim() || !editing.item_name?.trim())
  ) {
    toast.error("Item code and name are required");
    return;
  }

  // ✅ RECEIPT VALIDATION
  if (addQty > 0) {
    if (!stockUom) return toast.error("UOM is required");
    if (!receiptType) return toast.error("Receipt type is required");
    if (!receiptDate) return toast.error("Receipt date is required");
    if (Number(addQty) <= 0)
      return toast.error("Quantity added must be greater than 0");
  }

  const payload = {
    item_code: editing.item_code?.trim() || null,
    item_name: editing.item_name?.trim(),
    item_type: editing.item_type || "Product",
    location: editing.location?.trim() || "Default",
    location_id: editing.location_id,
    barcode: editing.barcode?.trim() || null,

    uom: stockUom || editing.uom || "Nos",
    qty_to_add: Number(addQty ?? 0),

    open_po: Number(editing.open_po ?? 0),
    quantity_on_hand: Number(editing.on_hand ?? 0),
    allocated_quantity: Number(editing.allocated ?? 0),
    available_quantity:
      Number(editing.on_hand ?? 0) - Number(editing.allocated ?? 0),

    committed_quantity: Number(editing.bom_req ?? 0),
    safety_stock: Number(editing.safety_stock ?? 0),
    reorder_point: Number(editing.reorder_point ?? 0),
    lead_time_days: Number(editing.lead_time_days ?? 0),
    unit_cost: Number(editing.unit_cost ?? 0),
  };

  try {
    let bomIdToMaybeActivate: string | null = null;

    // =========================
    // CREATE NEW ITEM FLOW
    // =========================
    if (isNew) {
      const itemRes = await axios.post("/api/inventory-stock", payload);
      const createdItem = itemRes.data?.data || itemRes.data;

      const itemType = editing.item_type || payload.item_type;

      if (itemType === "Product" && materialRows.length > 0) {
        const bomHeaderRes = await axios.post("/api/bom-headers", {
          item_type: "Product",
          item_code: createdItem.item_code,
          item_name: createdItem.item_name,
          uom: stockUom || editing.uom || "Nos",
          revision: "A",
        });

        const bomHeaderId = bomHeaderRes.data?.id || bomHeaderRes.data?.data?.id;

        if (!bomHeaderId) {
          toast.error("BOM Header creation failed");
          return;
        }

        await axios.post(
          "/api/bom-components/bulk",
          materialRows.map((row) => ({
            bom_id: String(bomHeaderId),
            component: row.component,
            description: row.description || row.component,
            quantity: row.quantity,
            uom: row.uom,
            scrap_percent: row.scrap_percent,
          }))
        );

        await saveBomOperations(String(bomHeaderId), operationRows);
        bomIdToMaybeActivate = String(bomHeaderId);
      }

      toast.success("Item added successfully");
    }

    // =========================
    // UPDATE ITEM FLOW
    // =========================
   else {
  await axios.put(
    `/api/inventory-stock/${editing.id}`,
    payload
  );

  toast.success("Item updated successfully");

  if (editing.item_type === "Product" && editingBomStatus !== "Active") {
    bomIdToMaybeActivate = await ensureBomAndUpdate(
      editing.item_code,
      editing.item_name || editing.item_code,
      stockUom || editing.uom || "Nos",
      materialRows,
      operationRows
    );
  }
}

    // =========================
    // ACTIVATE BOM (if requested and possible)
    // =========================
    if (bomIdToMaybeActivate && activateBomNow && operationRows.length > 0) {
      try {
        await axios.post(`/api/bom-headers/${bomIdToMaybeActivate}/activate`);
      } catch (activateError: any) {
        toast.error(
          activateError?.response?.data?.message ||
            "Item and BOM saved, but the BOM could not be activated — it remains a Draft."
        );
      }
    }

    // =========================
    // STOCK RECEIPT
    // =========================
    if (addQty > 0) {
      await axios.post("/api/stock-receipts", {
        item_id: editing.id,
        qty_added: Number(addQty),
        uom: stockUom || "Nos",
        receipt_type: receiptType,
        receipt_date: receiptDate,
        po_grn_reference: poGrnRef,
      });
    }

    // =========================
    // CLEANUP
    // =========================
    setMaterialRows([]);
    setOperationRows([]);
    setEditingBomId(null);
    setEditingBomStatus(null);
    setEditOpen(false);
    fetchData();
  }
  catch (error: any) {
    console.error("SAVE ERROR:", error?.response?.data || error);

    toast.error(
      error?.response?.data?.message ||
        JSON.stringify(error?.response?.data?.errors) ||
        "Save failed"
    );
  }finally {
    setSaving(false); // ✅ always unlock
  }
};

 const openItemDetails = (row: ComputedRow) => {
  setSelectedItem({
    // Basic
    code: row.item_code,
    name: row.item_name,
    type: row.item_type,
    location: row.location,
    uom: row.uom,
    unit_cost: row.unit_cost,

    // Stock
    quantityOnHand: row.on_hand,
    allocated: row.allocated,
    availableQuantity: row.available,
    open_po: row.open_po,
    bom_req: row.bom_req,

    // Reorder
    reorderPoint: row.reorder_point,
    safety_stock: row.safety_stock,
    lead_time_days: row.lead_time_days,

    // Computed MRP
    net_requirement: row.net_requirement,
    suggestion: row.suggestion,
    flags: row.flags,
  });
  setViewDetailsOpen(true);
};

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await axios.delete(`/api/inventory-stock/${id}`);
      toast.success("Deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Delete failed");
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} item(s)?`)) return;
    try {
      await Promise.all(Array.from(selected).map((id) => axios.delete(`/api/inventory-stock/${id}`)));
      toast.success(`${selected.size} item(s) deleted`);
      setSelected(new Set());
      fetchData();
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const exportCsv = () => {
    const headers = [
      "Item Code","Item Name","Type","On Hand","Allocated","Available",
      "BOM Req","Open PO","Safety","Reorder Pt","Lead Days",
      "Net Req","Shortage","Suggestion","Flags",
    ];
    const rows = filtered.map((r) => [
      r.item_code, r.item_name, r.item_type ?? "",
      r.on_hand, r.allocated, r.available,
      r.bom_req, r.open_po, r.safety_stock ?? "",
      r.reorder_point ?? "", r.lead_time_days ?? "",
      r.net_requirement, r.shortage_qty, r.suggestion, r.flags.join("|"),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mrp-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };


  const types = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.item_type ?? "N/A"));
    return Array.from(set);
  }, [items]);

  const renderTable = (rows: ComputedRow[]) => (
    <div className="overflow-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-10">
              <Checkbox
                checked={rows.length > 0 && selected.size === rows.length}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Item Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">On Hand</TableHead>
            <TableHead className="text-right">Allocated</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="text-right">BOM Req</TableHead>
            <TableHead className="text-right">Open PO</TableHead>
            <TableHead className="text-right">Safety</TableHead>
            <TableHead className="text-right">Reorder Pt</TableHead>
            <TableHead className="text-right">Lead (d)</TableHead>
            <TableHead className="text-right">Net Req</TableHead>
            <TableHead>Stock %</TableHead>
            <TableHead>Suggestion</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={17} className="h-24 text-center text-muted-foreground">
                {loading ? "Loading..." : "No items"}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id} className={r.suggestion === "Deficit" ? "bg-destructive/5" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      if (v) next.add(r.id); else next.delete(r.id);
                      setSelected(next);
                    }}
                  />
                </TableCell>
               <TableCell className="font-medium text-muted-foreground">
  <button
    className="select-none opacity-80 hover:underline hover:text-primary"
    onClick={() => openItemDetails(r)}
  >
    {r.item_code}
  </button>
</TableCell>
                <TableCell>{r.item_name}</TableCell>
                <TableCell><Badge variant="outline">{r.item_type ?? "N/A"}</Badge></TableCell>
               <TableCell className="text-right">
  {r.on_hand}
</TableCell>

<TableCell className="text-right">
  {r.allocated}
</TableCell>
                <TableCell className={`text-right font-semibold ${r.available < 0 ? "text-destructive" : ""}`}>
                  {r.available}
                </TableCell>
               <TableCell className="text-right">
  {r.bom_req}
</TableCell>
                <TableCell className="text-right">{r.open_po}</TableCell>
                <TableCell className="text-right">{r.safety_stock ?? 0}</TableCell>
                <TableCell className="text-right">
  {r.reorder_point ?? "—"}
</TableCell>

<TableCell className="text-right">
  {r.lead_time_days ?? "—"}
</TableCell>
                <TableCell className={`text-right font-semibold ${r.net_requirement > 0 ? "text-amber-600" : ""}`}>
                  {r.net_requirement}
                </TableCell>
                <TableCell><StockBar onHand={r.on_hand} reorder={r.reorder_point} /></TableCell>
                <TableCell><SuggestionBadge s={r.suggestion} /></TableCell>
                <TableCell>
                  {r.flags.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {r.flags.map((f) => (
                        <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                   <Button size="icon" variant="ghost" onClick={() => openItemDetails(r)} title="View details">
      <Eye className="h-4 w-4" />
    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteItem(r.id)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const deficitRows = computed.filter((c) => c.suggestion === "Deficit");
  const belowRows = computed.filter((c) => c.suggestion === "Below Reorder");
  const alertRows = computed.filter(
    (c) => c.suggestion !== "Sufficient" || c.net_requirement > 0 || c.flags.length > 0
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Items</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-destructive" />
            <div>
              <div className="text-2xl font-bold text-destructive">{stats.deficit}</div>
              <div className="text-xs text-muted-foreground">Deficit</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold text-amber-600">{stats.below}</div>
              <div className="text-xs text-muted-foreground">Below Reorder</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{stats.flagged}</div>
              <div className="text-xs text-muted-foreground">Flagged</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Deficit">Deficit</SelectItem>
            <SelectItem value="Below Reorder">Below Reorder</SelectItem>
            <SelectItem value="Sufficient">Sufficient</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" /> CSV
        </Button>
        {selected.size > 0 && (
          <Button variant="destructive" onClick={bulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete ({selected.size})
          </Button>
        )}
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="mrp">MRP Analysis</TabsTrigger>
          <TabsTrigger value="alerts">
            Reorder Alerts
            {alertRows.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5">{alertRows.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          {renderTable(filtered)}
        </TabsContent>

        <TabsContent value="mrp" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4" /> Calculation Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1 font-mono bg-muted/30 rounded">
              <div>• Available = On Hand − Allocated</div>
              <div>• Net Req = MAX(0, BOM Req + Safety − (Available + Open PO))</div>
              <div>• Priority: Deficit → Below Reorder → Sufficient</div>
            </CardContent>
          </Card>
          <h3 className="font-semibold text-destructive">Deficit Items ({deficitRows.length})</h3>
          {renderTable(deficitRows)}
          <h3 className="font-semibold text-amber-600 mt-4">Below Reorder ({belowRows.length})</h3>
          {renderTable(belowRows)}
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Consolidated list of items needing attention (deficit, below reorder, net requirement, or flagged).
          </p>
          {renderTable(alertRows)}
        </TabsContent>
      </Tabs>

      {/* ── THE NEW DIALOG (replaces old one) ── */}
      <AddItemDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        isNew={isNew}
        editing={editing}
        setEditing={setEditing}
        items={items}
        locations={locations}
        onSave={saveEdit}
        receiptType={receiptType}
  setReceiptType={setReceiptType}

  receiptDate={receiptDate}
  setReceiptDate={setReceiptDate}

  poGrnRef={poGrnRef}
  setPoGrnRef={setPoGrnRef}

  stockUom={stockUom}
  setStockUom={setStockUom}

  addQty={addQty}
  setAddQty={setAddQty}

  materialRows={materialRows}
setMaterialRows={setMaterialRows}
operationRows={operationRows}
setOperationRows={setOperationRows}
operationsMaster={operationsMaster}
editingBomStatus={editingBomStatus}
activateBomNow={activateBomNow}
setActivateBomNow={setActivateBomNow}
saving={saving}
      />

      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        Item Details - {selectedItem?.code}
      </DialogTitle>
      <DialogDescription>
        {selectedItem?.name}
      </DialogDescription>
    </DialogHeader>

    {selectedItem && (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

       <TabsContent value="overview" className="space-y-5">

  {/* ── Basic Info ── */}
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
      Basic Info
    </p>
    <div className="grid grid-cols-2 gap-3 border border-border rounded-lg overflow-hidden">
      {[
        { label: "Item Code",  value: <span className="font-mono">{selectedItem.code}</span> },
        { label: "Item Name",  value: selectedItem.name },
        { label: "Item Type",  value: <Badge variant="outline">{selectedItem.type}</Badge> },
        { label: "UOM",        value: selectedItem.uom ?? "—" },
        { label: "Location",   value: selectedItem.location ?? "—" },
        { label: "Unit Cost",  value: selectedItem.unit_cost != null ? `₹${Number(selectedItem.unit_cost).toLocaleString()}` : "—" },
      ].map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5 px-4 py-2.5 border-b border-border last:border-b-0">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className="text-sm font-medium">{value}</span>
        </div>
      ))}
    </div>
  </div>

  {/* ── Stock Levels ── */}
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
      Stock Levels
    </p>
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "On Hand",    value: selectedItem.quantityOnHand, color: "" },
        { label: "Allocated",  value: selectedItem.allocated,      color: "text-amber-600" },
        { label: "Available",  value: selectedItem.availableQuantity,
          color: selectedItem.availableQuantity < 0 ? "text-destructive" : "text-green-700" },
        { label: "Open PO",    value: selectedItem.open_po,        color: "text-blue-600" },
        { label: "BOM Req",    value: selectedItem.bom_req,        color: "" },
        { label: "Net Req",    value: selectedItem.net_requirement,
          color: selectedItem.net_requirement > 0 ? "text-amber-600 font-bold" : "" },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex flex-col gap-0.5 border border-border rounded-lg px-3 py-2.5 bg-muted/20">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className={`text-xl font-bold ${color}`}>{value ?? 0}</span>
        </div>
      ))}
    </div>
  </div>

  {/* ── Reorder Settings ── */}
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
      Reorder Settings
    </p>
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Safety Stock",   value: selectedItem.safety_stock ?? "Not set" },
        { label: "Reorder Point",  value: selectedItem.reorderPoint ?? "Not set" },
        { label: "Lead Time (d)",  value: selectedItem.lead_time_days ?? "Not set" },
      ].map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5 border border-border rounded-lg px-3 py-2.5 bg-muted/20">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold">{value}</span>
        </div>
      ))}
    </div>
  </div>

  {/* ── MRP Status ── */}
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
      MRP Status
    </p>
    <div className="flex flex-wrap items-center gap-3 border border-border rounded-lg px-4 py-3 bg-muted/20">
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] text-muted-foreground">Suggestion</span>
        <SuggestionBadge s={selectedItem.suggestion} />
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="flex flex-col gap-1 flex-1">
        <span className="text-[11px] text-muted-foreground">Flags</span>
        {selectedItem.flags?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedItem.flags.map((f: string) => (
              <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-green-700 font-medium">No issues</span>
        )}
      </div>
    </div>
  </div>

</TabsContent>

        <TabsContent value="transactions">
          <ItemTransactionsTab itemCode={selectedItem.code} />
        </TabsContent>

        <TabsContent value="history" className="text-center text-muted-foreground py-8">
          Item history coming soon...
        </TabsContent>

        <div className="flex justify-end pt-4 border-t mt-4">
          <Button onClick={() => setViewDetailsOpen(false)}>
            Close
          </Button>
        </div>
      </Tabs>
    )}
  </DialogContent>
</Dialog>
    </div>
  );
}