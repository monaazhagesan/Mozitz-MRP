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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  Plus,
  Search,
  Trash2,
  Edit,
  Calculator,
  TrendingDown,
  Package,
  CheckCircle2,
} from "lucide-react";

type MRPItem = {
  id: string;
  item_code: string;
  item_name: string;
  item_type: string | null;
  on_hand: number;
  allocated: number;
  bom_req: number;
  open_po: number;
  safety_stock: number | null;
  reorder_point: number | null;
  lead_time_days: number | null;
};

type Suggestion = "Sufficient" | "Below Reorder" | "Deficit";

interface ComputedRow extends MRPItem {
  available: number;
  net_requirement: number;
  shortage_qty: number;
  suggestion: Suggestion;
  flags: string[];
}

const NUMERIC_FIELDS: Array<keyof MRPItem> = [
  "on_hand",
  "allocated",
  "bom_req",
  "open_po",
  "safety_stock",
  "reorder_point",
  "lead_time_days",
];

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
  else if (reorder != null && onHand < Number(reorder)) suggestion = "Below Reorder";

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
  if (s === "Deficit")
    return <Badge variant="destructive">Deficit</Badge>;
  if (s === "Below Reorder")
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Below Reorder</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700 text-white">Sufficient</Badge>;
}

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
};

export default function MRPPlannerTab() {
  const [items, setItems] = useState<MRPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MRPItem | null>(null);
  const [isNew, setIsNew] = useState(false);


const TYPE_PREFIX: Record<string, string> = {
  Material: "MAT",
  Product: "PRD",
  Component: "CMP",
};

function generateItemCode(type: string, items: MRPItem[]) {
  const prefix = TYPE_PREFIX[type] ?? "ITM";

  const numbers = items
    .filter((i) => i.item_code?.startsWith(prefix))
    .map((i) => {
      const num = i.item_code?.split("-")[1];
      return Number(num);
    })
    .filter((n) => !isNaN(n));

  const max = numbers.length ? Math.max(...numbers) : 0;

  const next = String(max + 1).padStart(4, "0");

  return `${prefix}-${next}`;
}

const fetchData = async () => {
  setLoading(true);

  try {
    console.log("🚀 Fetching inventory-stock...");

    const res = await axios.get("/api/inventory-stock");

    console.log("📦 RAW RESPONSE:", res.data);

    const data = res.data?.items ?? [];

    console.log("📊 ITEMS:", data);

    // ✅ FIX: correct field mapping (IMPORTANT)
   const mapped: MRPItem[] = data.map((r: any) => ({
  id: r.id,

  item_code: r.itemCode ?? r.item_code ?? "",
  item_name: r.itemName ?? r.item_name ?? "",
  item_type: r.item_type ?? "N/A",

  on_hand: Number(
    r.quantityOnHand ?? r.quantity_on_hand ?? 0
  ),

  allocated: Number(
    r.allocatedQuantity ?? r.allocated_quantity ?? 0
  ),

  bom_req: Number(
    r.committedQuantity ?? r.committed_quantity ?? 0
  ),

  // ✅ IMPORTANT FIX: ensure fallback 0 not null
  open_po: 0,

 safety_stock: Number(
  r.safety_stock ??
  r.safetyStock ??
  r.safety_stock_qty ??
  0
),

  reorder_point: Number(
    r.reorderPoint ?? r.reorder_point ?? 0
  ),

  lead_time_days: Number(
    r.leadTimeDays ?? r.lead_time_days ?? 0
  ),
}));
    console.log("🔄 MAPPED DATA:", mapped);

    // PO DATA
    const poRes = await axios.get("/api/purchase-order-lines");
    const poData = poRes.data ?? [];

    const openMap = new Map<string, number>();

    poData.forEach((r: any) => {
      if (r.status === "Cancel") return;

      const pending =
        Number(r.quantity ?? 0) -
        Number(r.received_quantity ?? 0);

      if (pending > 0) {
        openMap.set(
          r.item_code,
          (openMap.get(r.item_code) ?? 0) + pending
        );
      }
    });

    // merge PO
    mapped.forEach((m) => {
      m.open_po = openMap.get(m.item_code) ?? 0;
    });

    console.log("✅ FINAL DATA:", mapped);

    setItems(mapped);
  } catch (error) {
    console.error("❌ ERROR:", error);
    toast.error("Failed to load inventory data");
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchData();
  }, []);

  const computed = useMemo(() => items.map(compute), [items]);

  const filtered = useMemo(() => {
    return computed.filter((r) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !r.item_code.toLowerCase().includes(s) &&
          !r.item_name.toLowerCase().includes(s)
        )
          return false;
      }
      if (typeFilter !== "all" && (r.item_type ?? "N/A") !== typeFilter) return false;
      if (statusFilter !== "all" && r.suggestion !== statusFilter) return false;
      return true;
    });
  }, [computed, search, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: computed.length,
      deficit: computed.filter((c) => c.suggestion === "Deficit").length,
      below: computed.filter((c) => c.suggestion === "Below Reorder").length,
      flagged: computed.filter((c) => c.flags.length > 0).length,
    };
  }, [computed]);


const persistField = async (
  id: string,
  dbField: string,
  value: number | null
) => {
  try {
    await axios.patch(`/api/inventory-stock/${id}`, {
      [dbField]: value,
    });

    toast.success("Updated");
  } catch (error: any) {
    console.error("Update failed:", error);

    toast.error("Update failed");

    // reload data to keep UI consistent
    fetchData();
  }
};

  const handleInlineEdit = async (id: string, field: keyof MRPItem, raw: string) => {
    const val = raw.trim() === "" ? null : Number(raw);
    if (val != null && Number.isNaN(val)) {
      toast.error("Invalid number");
      return;
    }
    const dbMap: Record<string, string> = {
      on_hand: "quantity_on_hand",
      allocated: "allocated_quantity",
      bom_req: "committed_quantity",
      safety_stock: "safety_stock",
      reorder_point: "reorder_point",
      lead_time_days: "lead_time_days",
    };
    const dbField = dbMap[field as string];
    if (!dbField) return;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val ?? 0 } : it))
    );
    await persistField(id, dbField, val);
  };

  const openEdit = (row: ComputedRow) => {
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
    });
    setIsNew(false);
    setEditOpen(true);
  };

 const openAdd = () => {
  const defaultType = "Material";

  setEditing({
    id: "",
    ...emptyItem,
    item_type: defaultType,
    item_code: generateItemCode(defaultType, items),
  });

  setIsNew(true);
  setEditOpen(true);
};


// CREATE / UPDATE
const saveEdit = async () => {
  if (!editing) return;

  if (!editing.item_code || !editing.item_name) {
    toast.error("Item code and name are required");
    return;
  }

 const payload = {
  item_code: editing.item_code?.trim() || null,
  item_name: editing.item_name?.trim(),
  item_type: editing.item_type || "Product",

  location: editing.location?.trim() || "Default",

  quantity_on_hand: Number(editing.on_hand ?? 0),
  allocated_quantity: Number(editing.allocated ?? 0),
  committed_quantity: Number(editing.bom_req ?? 0),

  safety_stock: Number(editing.safety_stock ?? 0),
  reorder_point: Number(editing.reorder_point ?? 0),
  lead_time_days: Number(editing.lead_time_days ?? 0),
};

  try {
    let res;

    if (isNew) {
      // CREATE
      res = await axios.post("/api/inventory-stock", payload);
      toast.success("Item added successfully");
    } else {
      // UPDATE
      res = await axios.put(
        `/api/inventory-stock/${editing.id}`,
        payload
      );
      toast.success("Item updated successfully");
    }

    setEditOpen(false);
    fetchData();
    return res.data;

  } catch (error: any) {
  console.error("FULL ERROR:", error.response?.data);

  toast.error(
    error?.response?.data?.message ||
    JSON.stringify(error?.response?.data?.errors) ||
    "Save failed"
  );
}
};

// DELETE SINGLE
const deleteItem = async (id: string) => {
  if (!confirm("Delete this item?")) return;

  try {
    await axios.delete(`/api/inventory-stock/${id}`);
    toast.success("Deleted");
    fetchData();
  } catch (error: any) {
    console.error("Delete error:", error);
    toast.error(error?.response?.data?.message || "Delete failed");
  }
};

// BULK DELETE
const bulkDelete = async () => {
  if (selected.size === 0) return;

  if (!confirm(`Delete ${selected.size} item(s)?`)) return;

  try {
    // Option 1: loop (works immediately with your current API)
    await Promise.all(
      Array.from(selected).map((id) =>
        axios.delete(`/api/inventory-stock/${id}`)
      )
    );

    toast.success(`${selected.size} item(s) deleted`);
    setSelected(new Set());
    fetchData();
  } catch (error: any) {
    console.error("Bulk delete error:", error);
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

  const InlineNumber = ({
    row,
    field,
    nullable = false,
  }: {
    row: ComputedRow;
    field: keyof MRPItem;
    nullable?: boolean;
  }) => {
    const [editing, setEditing] = useState(false);
    const initial = (row[field] as number | null) ?? "";
    const [value, setValue] = useState(String(initial));

    if (!editing) {
      return (
        <button
          onDoubleClick={() => {
            setValue(String((row[field] as number | null) ?? ""));
            setEditing(true);
          }}
          className="w-full text-left px-1 py-0.5 rounded hover:bg-muted/60 transition"
          title="Double-click to edit"
        >
          {row[field] == null ? <span className="text-muted-foreground">—</span> : String(row[field])}
        </button>
      );
    }
    return (
      <Input
        autoFocus
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          handleInlineEdit(row.id, field, value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-20 text-sm"
      />
    );
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
                      if (v) next.add(r.id);
                      else next.delete(r.id);
                      setSelected(next);
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium text-muted-foreground">
  <span className="select-none opacity-80">{r.item_code}</span>
</TableCell>
                <TableCell>{r.item_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{r.item_type ?? "N/A"}</Badge>
                </TableCell>
                <TableCell className="text-right"><InlineNumber row={r} field="on_hand" /></TableCell>
                <TableCell className="text-right"><InlineNumber row={r} field="allocated" /></TableCell>
                <TableCell className={`text-right font-semibold ${r.available < 0 ? "text-destructive" : ""}`}>
                  {r.available}
                </TableCell>
                <TableCell className="text-right"><InlineNumber row={r} field="bom_req" /></TableCell>
                <TableCell className="text-right">{r.open_po}</TableCell>
                <TableCell className="text-right">{r.safety_stock ?? 0}</TableCell>
                <TableCell className="text-right"><InlineNumber row={r} field="reorder_point" nullable /></TableCell>
                <TableCell className="text-right"><InlineNumber row={r} field="lead_time_days" nullable /></TableCell>
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

      {/* 3 Tabs */}
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
          <p className="text-xs text-muted-foreground mt-2">
            💡 Double-click any numeric cell to edit inline.
          </p>
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

      {/* Edit/Add modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Item" : "Edit Item"}</DialogTitle>
            <DialogDescription>
              {editing && (
                <span>
                  Live preview — Available:{" "}
                  <strong>{compute(editing).available}</strong>, Net Req:{" "}
                  <strong>{compute(editing).net_requirement}</strong>,{" "}
                  <SuggestionBadge s={compute(editing).suggestion} />
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Item Code *</Label>
                <Input
  value={editing.item_code}
  disabled
  className="bg-muted opacity-80 cursor-not-allowed"
/>
              </div>
              <div>
                <Label>Item Name *</Label>
                <Input
                  value={editing.item_name}
                  onChange={(e) => setEditing({ ...editing, item_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
  value={editing.item_type ?? "Material"}
  onValueChange={(v) => {
    setEditing((prev) => {
      if (!prev) return prev;

      const shouldGenerate = isNew || !prev.item_code;

      return {
        ...prev,
        item_type: v,
        item_code: shouldGenerate
          ? generateItemCode(v, items)
          : prev.item_code,
      };
    });
  }}
>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Material">Material</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Component">Component</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {NUMERIC_FIELDS.map((f) => (
                <div key={f}>
                  <Label className="capitalize">{f.replace(/_/g, " ")}</Label>
                  <Input
                    type="number"
                    value={editing[f] == null ? "" : String(editing[f])}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      setEditing({ ...editing, [f]: v as any });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>{isNew ? "Add" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
