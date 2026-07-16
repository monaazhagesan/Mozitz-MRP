import { Fragment, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatCard from "@/components/StatCard";
import {
  Plus, X, Package as PackageIcon, AlertTriangle, TrendingDown, Download, FileText, Trash2, Eye, Pencil,
  PackageSearch, Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type LocationRow = { id: string; location_name: string };

type BatchRow = {
  id: string;
  item_code: string;
  item_name: string;
  item_type: string;
  batch_number: string;
  batch_date: string | null;
  quantity: number;
  location_id: string | null;
  location_name: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  is_synthetic: false;
};

type UnbatchedRow = {
  id: number | string;
  item_code: string;
  item_name: string;
  item_type: string;
  item_mode: string | null;
  uom: string | null;
  quantity: number;
  has_batches: boolean;
  show_by_default: boolean;
  is_synthetic: true;
};

type Row = BatchRow | UnbatchedRow;

type Stats = { total_batches: number; active_batches: number; expiring_soon: number; total_stock: number };

type GroupItem = { item_code: string; item_name: string; quantity: number; expiration_date: string };

const round3 = (n: number) => Math.round(n * 1000) / 1000;

const BatchesTab = () => {
  const { toast } = useToast();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [unbatched, setUnbatched] = useState<UnbatchedRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total_batches: 0, active_batches: 0, expiring_soon: 0, total_stock: 0 });
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  const [enablePickerOpen, setEnablePickerOpen] = useState(false);
  const [enablePickItemCode, setEnablePickItemCode] = useState("");
  const [enabling, setEnabling] = useState(false);

  const [typeFilter, setTypeFilter] = useState<"all" | "Product" | "Material">("all");
  const [showEmpty, setShowEmpty] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [colName, setColName] = useState("");
  const [colItemCode, setColItemCode] = useState("");
  const [colBatchNumber, setColBatchNumber] = useState("");
  const [colInStock, setColInStock] = useState("");
  const [colExpiration, setColExpiration] = useState("");
  const [colCreated, setColCreated] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatchNumber, setEditingBatchNumber] = useState<string | null>(null);
  const [editingOriginalRows, setEditingOriginalRows] = useState<BatchRow[]>([]);
  const [viewingBatchNumber, setViewingBatchNumber] = useState<string | null>(null);
  const [batchNumber, setBatchNumber] = useState("");
  const [batchDate, setBatchDate] = useState("");
  const [batchLocationId, setBatchLocationId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [groupItems, setGroupItems] = useState<GroupItem[]>([]);
  const [pick, setPick] = useState({ item_code: "", quantity: 0, expiration_date: "" });
  const [saving, setSaving] = useState(false);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/batches");
      setBatches(res.data?.batches ?? []);
      setUnbatched(res.data?.unbatched ?? []);
      setStats(res.data?.stats ?? { total_batches: 0, active_batches: 0, expiring_soon: 0, total_stock: 0 });
      setTrackingEnabled(!!res.data?.tracking_enabled);
    } catch (error: any) {
      toast({ title: "Failed to load batches", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    const res = await axios.get("/api/locations");
    setLocations(res.data?.data ?? []);
  };

  useEffect(() => { loadBatches(); loadLocations(); }, []);

  // When editing an existing group, its own current quantities are still
  // "available" to keep — the server frees them the moment the group is
  // replaced, so add them back on top of the normal unbatched remainder.
  const eligibleItems = useMemo(() => {
    return unbatched
      .filter(u => u.item_mode !== "variant")
      .map(u => {
        const heldByThisGroup = editingOriginalRows.find(r => r.item_code === u.item_code)?.quantity ?? 0;
        return { ...u, quantity: round3(u.quantity + heldByThisGroup) };
      })
      .filter(u => u.quantity > 0.0001);
  }, [unbatched, editingOriginalRows]);

  // Items already added to this group reduce what's still pickable for the rest of the group.
  const availableForPick = useMemo(
    () => eligibleItems
      .filter(i => !groupItems.some(g => g.item_code === i.item_code))
      .map(i => ({ ...i })),
    [eligibleItems, groupItems]
  );

  const resetDialog = () => {
    setEditingBatchNumber(null);
    setEditingOriginalRows([]);
    setBatchNumber(`B-${Date.now().toString().slice(-8)}`);
    setBatchDate(new Date().toISOString().slice(0, 10));
    setBatchLocationId("none");
    setNotes("");
    setGroupItems([]);
    setPick({ item_code: "", quantity: 0, expiration_date: "" });
  };

  const openDialog = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const openEditDialog = (batchNum: string) => {
    const rows = batches.filter(b => b.batch_number === batchNum);
    if (rows.length === 0) return;
    setEditingBatchNumber(batchNum);
    setEditingOriginalRows(rows);
    setBatchNumber(rows[0].batch_number);
    setBatchDate(rows[0].batch_date ?? "");
    setBatchLocationId(rows[0].location_id ?? "none");
    setNotes(rows[0].notes ?? "");
    setGroupItems(rows.map(r => ({
      item_code: r.item_code, item_name: r.item_name, quantity: r.quantity, expiration_date: r.expiration_date ?? "",
    })));
    setPick({ item_code: "", quantity: 0, expiration_date: "" });
    setDialogOpen(true);
  };

  const addItemRow = () => {
    const src = eligibleItems.find(i => i.item_code === pick.item_code);
    if (!src || pick.quantity <= 0) {
      toast({ title: "Select an item and enter a quantity greater than zero", variant: "destructive" });
      return;
    }
    if (pick.quantity > src.quantity + 0.0001) {
      toast({ title: `Only ${src.quantity} of ${src.item_code} is unbatched`, variant: "destructive" });
      return;
    }
    if (groupItems.some(g => g.item_code === src.item_code)) {
      toast({ title: "This item is already in the batch", variant: "destructive" });
      return;
    }
    setGroupItems(prev => [...prev, {
      item_code: src.item_code, item_name: src.item_name, quantity: pick.quantity, expiration_date: pick.expiration_date,
    }]);
    setPick({ item_code: "", quantity: 0, expiration_date: "" });
  };

  const removeItemRow = (itemCode: string) => setGroupItems(prev => prev.filter(g => g.item_code !== itemCode));

  const saveBatch = async () => {
    if (!batchNumber.trim()) {
      toast({ title: "Enter a batch number", variant: "destructive" });
      return;
    }
    if (groupItems.length === 0) {
      toast({ title: "Add at least one item to this batch", variant: "destructive" });
      return;
    }

    const payload = {
      batch_number: batchNumber,
      batch_date: batchDate || null,
      location_id: batchLocationId === "none" ? null : batchLocationId,
      notes: notes || null,
      items: groupItems.map(g => ({
        item_code: g.item_code,
        quantity: g.quantity,
        expiration_date: g.expiration_date || null,
      })),
    };

    setSaving(true);
    try {
      if (editingBatchNumber) {
        await axios.put(`/api/batches/by-number/${encodeURIComponent(editingBatchNumber)}`, payload);
        toast({ title: "Batch updated" });
      } else {
        await axios.post("/api/batches", payload);
        toast({ title: groupItems.length > 1 ? "Batch created with " + groupItems.length + " items" : "Batch created" });
      }
      setDialogOpen(false);
      resetDialog();
      await loadBatches();
    } catch (error: any) {
      toast({ title: "Failed to save batch", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteBatch = async (id: string) => {
    try {
      await axios.delete(`/api/batches/${id}`);
      toast({ title: "Batch item deleted" });
      await loadBatches();
    } catch (error: any) {
      toast({ title: "Failed to delete", description: error.response?.data?.message || error.message, variant: "destructive" });
    }
  };

  const deleteGroup = async (batchNum: string) => {
    try {
      await axios.delete(`/api/batches/by-number/${encodeURIComponent(batchNum)}`);
      toast({ title: "Batch deleted" });
      await loadBatches();
    } catch (error: any) {
      toast({ title: "Failed to delete batch", description: error.response?.data?.message || error.message, variant: "destructive" });
    }
  };

  const viewingRows = useMemo(
    () => viewingBatchNumber ? batches.filter(b => b.batch_number === viewingBatchNumber) : [],
    [viewingBatchNumber, batches]
  );

  // Candidates for "Choose an item for batch tracking" — anything not
  // already explicitly enabled.
  const trackingCandidates = useMemo(
    () => unbatched.filter(u => u.item_mode !== "batch" && u.item_mode !== "variant"),
    [unbatched]
  );

  const confirmEnableTracking = async () => {
    const target = trackingCandidates.find(i => i.item_code === enablePickItemCode);
    if (!target) {
      toast({ title: "Select an item", variant: "destructive" });
      return;
    }
    setEnabling(true);
    try {
      await axios.patch(`/api/inventory-stock/${target.id}/enable-batch-tracking`);
      toast({ title: `Batch tracking enabled for ${target.item_code}` });
      setEnablePickerOpen(false);
      setEnablePickItemCode("");
      await loadBatches();
    } catch (error: any) {
      toast({ title: "Failed to enable batch tracking", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setEnabling(false);
    }
  };

  const mergedRows: Row[] = useMemo(() => {
    const unbatchedRows: Row[] = unbatched
      .filter(u => u.show_by_default || showEmpty)
      .map(u => ({ ...u }));
    return [...batches, ...unbatchedRows];
  }, [batches, unbatched, showEmpty]);

  const filteredRows = useMemo(() => {
    return mergedRows.filter(r => {
      if (typeFilter !== "all" && r.item_type !== typeFilter) return false;
      if (locationFilter !== "all") {
        if (r.is_synthetic) return false;
        if (r.location_id !== locationFilter) return false;
      }
      if (colName && !r.item_name?.toLowerCase().includes(colName.toLowerCase())) return false;
      if (colItemCode && !r.item_code?.toLowerCase().includes(colItemCode.toLowerCase())) return false;
      if (colBatchNumber) {
        const bn = r.is_synthetic ? "unbatched" : r.batch_number.toLowerCase();
        if (!bn.includes(colBatchNumber.toLowerCase())) return false;
      }
      if (colInStock && Number(r.quantity) < Number(colInStock)) return false;
      if (colExpiration) {
        const exp = r.is_synthetic ? null : r.expiration_date;
        if (!exp || exp < colExpiration) return false;
      }
      if (colCreated) {
        const created = r.is_synthetic ? null : r.created_at;
        if (!created || created.slice(0, 10) < colCreated) return false;
      }
      return true;
    });
  }, [mergedRows, typeFilter, locationFilter, colName, colItemCode, colBatchNumber, colInStock, colExpiration, colCreated]);

  const hasColumnFilters = !!(colName || colItemCode || colBatchNumber || colInStock || colExpiration || colCreated);

  // Real batch rows sharing a batch_number were created together — group them
  // under one header with a bulk-delete action; single-item batches and the
  // synthetic "Unbatched" rows render as plain rows, unchanged.
  const { groupedBatches, syntheticRows } = useMemo(() => {
    const real = filteredRows.filter((r): r is BatchRow => !r.is_synthetic);
    const synthetic = filteredRows.filter((r): r is UnbatchedRow => r.is_synthetic);
    const byNumber = new Map<string, BatchRow[]>();
    real.forEach(r => {
      const arr = byNumber.get(r.batch_number) ?? [];
      arr.push(r);
      byNumber.set(r.batch_number, arr);
    });
    return { groupedBatches: Array.from(byNumber.entries()), syntheticRows: synthetic };
  }, [filteredRows]);

  const exportRows = () =>
    filteredRows.map(r => ({
      Name: r.item_name,
      "Item code": r.item_code,
      "Batch number": r.is_synthetic ? "Unbatched" : r.batch_number,
      "In stock": r.quantity,
      "Expiration date": r.is_synthetic ? "-" : (r.expiration_date ?? "-"),
      "Created date": r.is_synthetic ? "-" : new Date(r.created_at).toLocaleDateString(),
    }));

  const exportXLSX = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export for this filter.", variant: "destructive" });
      return;
    }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Batches");
    XLSX.writeFile(workbook, `batches_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported", description: "Batches exported to XLSX." });
  };

  const exportPDF = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export for this filter.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Batches", 14, 15);
    const head = [Object.keys(rows[0])];
    const body = rows.map(r => Object.values(r).map(v => String(v ?? "")));
    autoTable(doc, { head, body, startY: 22, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 235] } });
    doc.save(`batches_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: "Exported", description: "Batches exported to PDF." });
  };

  const totalRowCount = filteredRows.length;

  const enableTrackingDialog = (
    <Dialog open={enablePickerOpen} onOpenChange={(o) => { setEnablePickerOpen(o); if (!o) setEnablePickItemCode(""); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Choose an item for batch tracking</DialogTitle></DialogHeader>
        <div>
          <Label className="text-xs">Item</Label>
          <Select value={enablePickItemCode} onValueChange={setEnablePickItemCode}>
            <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
            <SelectContent>
              {trackingCandidates.length === 0 ? (
                <SelectItem value="none" disabled>All items already have batch tracking enabled</SelectItem>
              ) : (
                trackingCandidates.map(i => (
                  <SelectItem key={i.item_code} value={i.item_code}>
                    {i.item_code} — {i.item_name} ({i.item_type})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEnablePickerOpen(false)} disabled={enabling}>Cancel</Button>
          <Button onClick={confirmEnableTracking} disabled={enabling}>{enabling ? "Enabling…" : "Enable Batch Tracking"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!trackingEnabled) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border p-8 md:p-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <PackageSearch className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Batch tracking</h2>
              <p className="text-muted-foreground mt-1 max-w-md">
                Batch tracking provides full traceability of materials and products throughout their
                lifecycle, from purchasing and manufacturing to sales and beyond.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              {[
                "Monitor product and material movement across your supply chain",
                "Assign unique batch numbers to each set of purchased or manufactured items",
                "Set expiry dates to manage shelf life",
              ].map(text => (
                <div key={text} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span className="text-sm">{text}</span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">How batch tracking works:</h3>
              <div className="space-y-3">
                {[
                  "Enable batch tracking for each product or material on the item card",
                  "Assign batches to purchased items, and choose items from specific batches for manufacturing or sales",
                  "Assigning batches to manufactured items enables you to choose specific batches for sales, providing a full traceability line",
                ].map((text, idx) => (
                  <div key={text} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-sm">{text}</span>
                  </div>
                ))}
              </div>

              <Button className="mt-6" onClick={() => setEnablePickerOpen(true)}>
                Choose an item for batch tracking
              </Button>
            </div>
          </div>
        </div>

        {enableTrackingDialog}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Batches" value={stats.total_batches} icon={PackageIcon} />
        <StatCard title="Active Batches" value={stats.active_batches} icon={PackageIcon} />
        <StatCard title="Expiring Soon" value={stats.expiring_soon} icon={AlertTriangle} />
        <StatCard title="Total Stock" value={stats.total_stock} icon={TrendingDown} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant={typeFilter === "all" ? "default" : "outline"} onClick={() => setTypeFilter("all")}>All</Button>
            <Button variant={typeFilter === "Product" ? "default" : "outline"} onClick={() => setTypeFilter("Product")}>Products</Button>
            <Button variant={typeFilter === "Material" ? "default" : "outline"} onClick={() => setTypeFilter("Material")}>Materials</Button>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch id="show-empty" checked={showEmpty} onCheckedChange={setShowEmpty} />
              <Label htmlFor="show-empty" className="text-sm">Show empty batches</Label>
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.location_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" title="Export XLSX" onClick={exportXLSX}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Export PDF" onClick={exportPDF}>
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setEnablePickerOpen(true)}>
              <PackageSearch className="h-4 w-4 mr-1" /> Enable Tracking
            </Button>
            <Button onClick={openDialog}>
              <Plus className="h-4 w-4 mr-1" /> New Batch
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <span className="text-sm font-medium">{totalRowCount} row{totalRowCount === 1 ? "" : "s"}</span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>
                      <span>Name</span>
                      <Input placeholder="Filter" className="h-7 mt-1 text-xs" value={colName} onChange={(e) => setColName(e.target.value)} />
                    </TableHead>
                    <TableHead>
                      <span>Item code</span>
                      <Input placeholder="Filter" className="h-7 mt-1 text-xs" value={colItemCode} onChange={(e) => setColItemCode(e.target.value)} />
                    </TableHead>
                    <TableHead>
                      <span>Batch number</span>
                      <Input placeholder="Filter" className="h-7 mt-1 text-xs" value={colBatchNumber} onChange={(e) => setColBatchNumber(e.target.value)} />
                    </TableHead>
                    <TableHead className="text-right">
                      <span>In stock</span>
                      <Input placeholder="Min qty" type="number" className="h-7 mt-1 text-xs" value={colInStock} onChange={(e) => setColInStock(e.target.value)} />
                    </TableHead>
                    <TableHead>
                      <span>Expiration date</span>
                      <Input type="date" className="h-7 mt-1 text-xs" value={colExpiration} onChange={(e) => setColExpiration(e.target.value)} />
                    </TableHead>
                    <TableHead>
                      <span>Created date</span>
                      <Input type="date" className="h-7 mt-1 text-xs" value={colCreated} onChange={(e) => setColCreated(e.target.value)} />
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totalRowCount === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        {hasColumnFilters || typeFilter !== "all" || locationFilter !== "all"
                          ? "No batches match the selected filters."
                          : "No batches yet. Click New Batch to tag stock into a batch."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {groupedBatches.map(([batchNum, rows]) => (
                        <Fragment key={`group-${batchNum}`}>
                          {rows.length > 1 && (
                            <TableRow className="bg-muted/20">
                              <TableCell colSpan={2} className="font-semibold text-xs">
                                <span className="font-mono">{batchNum}</span>
                                <span className="text-muted-foreground font-normal ml-2">({rows.length} items)</span>
                              </TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px]">Group</Badge></TableCell>
                              <TableCell colSpan={3} />
                              <TableCell className="text-right whitespace-nowrap">
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="View" onClick={() => setViewingBatchNumber(batchNum)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => openEditDialog(batchNum)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" title="Delete whole batch" onClick={() => deleteGroup(batchNum)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )}
                          {rows.map(r => (
                            <TableRow key={r.id}>
                              <TableCell className={rows.length > 1 ? "pl-6" : ""}>
                                <span className="text-primary hover:underline cursor-pointer">{r.item_name}</span>
                              </TableCell>
                              <TableCell>{r.item_code}</TableCell>
                              <TableCell><span className="font-mono text-xs">{r.batch_number}</span></TableCell>
                              <TableCell className="text-right">
                                <span className="text-primary hover:underline cursor-pointer">{r.quantity}</span>
                              </TableCell>
                              <TableCell>{r.expiration_date ?? "-"}</TableCell>
                              <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {rows.length === 1 && (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" title="View" onClick={() => setViewingBatchNumber(r.batch_number)}>
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => openEditDialog(r.batch_number)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" title="Delete" onClick={() => deleteBatch(r.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      ))}
                      {syntheticRows.map(r => (
                        <TableRow key={`unbatched-${r.item_code}`}>
                          <TableCell><span className="text-primary hover:underline cursor-pointer">{r.item_name}</span></TableCell>
                          <TableCell>{r.item_code}</TableCell>
                          <TableCell><Badge variant="secondary">Unbatched</Badge></TableCell>
                          <TableCell className="text-right">
                            <span className="text-primary hover:underline cursor-pointer">{r.quantity}</span>
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell className="text-right" />
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* New / Edit Batch dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingBatchNumber ? "Edit Batch" : "New Batch"}</DialogTitle></DialogHeader>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Batch Number *</Label>
              <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Batch Date</Label>
              <Input type="date" value={batchDate} onChange={(e) => setBatchDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Select value={batchLocationId} onValueChange={setBatchLocationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location</SelectItem>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.location_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Items</Label>
            {groupItems.length > 0 && (
              <div className="border rounded-md divide-y">
                {groupItems.map(g => (
                  <div key={g.item_code} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-semibold">{g.item_code}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{g.item_name}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground w-24">{g.expiration_date || "no expiry"}</div>
                    <div className="text-sm font-medium w-20 text-right">{g.quantity}</div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => removeItemRow(g.item_code)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border rounded-md p-3 bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Select value={pick.item_code} onValueChange={(v) => setPick(p => ({ ...p, item_code: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                    <SelectContent>
                      {availableForPick.length === 0 ? (
                        <SelectItem value="none" disabled>No unbatched stock available</SelectItem>
                      ) : (
                        availableForPick.map(i => (
                          <SelectItem key={i.item_code} value={i.item_code}>
                            {i.item_code} — {i.item_name} [{i.quantity} available]
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  min={0.001}
                  step={0.001}
                  placeholder="Qty"
                  className="w-24 shrink-0"
                  value={pick.quantity || ""}
                  onChange={(e) => setPick(p => ({ ...p, quantity: Number(e.target.value) }))}
                />
                <Input
                  type="date"
                  className="w-40 shrink-0"
                  title="Expiration date (optional)"
                  value={pick.expiration_date}
                  onChange={(e) => setPick(p => ({ ...p, expiration_date: e.target.value }))}
                />
                <Button size="icon" variant="outline" className="shrink-0" title="Add item to batch" onClick={addItemRow}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {availableForPick.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No items with batch tracking enabled have unbatched stock.{" "}
                  <button type="button" className="text-primary underline" onClick={() => { setDialogOpen(false); setEnablePickerOpen(true); }}>
                    Enable tracking for an item
                  </button>
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes about this batch…" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveBatch} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Batch dialog */}
      <Dialog open={!!viewingBatchNumber} onOpenChange={(o) => { if (!o) setViewingBatchNumber(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Batch {viewingBatchNumber}</DialogTitle></DialogHeader>
          {viewingRows.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Batch Date</p>
                  <p className="font-medium">{viewingRows[0].batch_date ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{viewingRows[0].location_name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="font-medium">{viewingRows.length}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm">Items</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Expiration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingRows.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.item_code}</TableCell>
                          <TableCell>{r.item_name}</TableCell>
                          <TableCell className="text-right">{r.quantity}</TableCell>
                          <TableCell>{r.expiration_date ?? "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {viewingRows[0].notes && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Notes</h3>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">{viewingRows[0].notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {enableTrackingDialog}
    </div>
  );
};

export default BatchesTab;
