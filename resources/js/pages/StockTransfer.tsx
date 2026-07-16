import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, X, ArrowRightLeft, Trash2, Eye, Printer, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import StockTransferPrintReceipt from "@/components/inventory/StockTransferPrintReceipt";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────── types ───────────────────
type LocationRow = { id: string; location_name: string };
type TransferItem = { item_code: string; item_name: string; quantity: number };
type TransferRow = {
  id: string;
  transfer_number: string;
  transfer_date: string;
  from_location_id: string | null;
  to_location_id: string;
  status: "draft" | "completed";
  notes: string | null;
  total_items: number;
  from_location?: { location_name: string } | null;
  to_location?: { location_name: string } | null;
  items: TransferItem[];
};
type AvailableItem = { item_code: string; item_name: string; available: number };

const UNALLOCATED = "__unallocated";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const statusBadge = (status: string) =>
  status === "completed"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

const StockTransfer = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRow | null>(null);

  const [fromLocationId, setFromLocationId] = useState<string>(UNALLOCATED);
  const [toLocationId, setToLocationId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [availableAtSource, setAvailableAtSource] = useState<AvailableItem[]>([]);
  const [pick, setPick] = useState({ item_code: "", quantity: 0 });
  const [saving, setSaving] = useState(false);

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  const loadLocations = async () => {
    const res = await axios.get("/api/locations");
    setLocations(res.data?.data ?? []);
  };

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/stock-transfers");
      setTransfers(res.data?.data ?? []);
    } catch (error: any) {
      toast({
        title: "Failed to load transfers",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLocations(); loadTransfers(); }, []);

  // Refresh the available-items list whenever the From source changes.
  useEffect(() => {
    const loadAvailable = async () => {
      try {
        if (fromLocationId === UNALLOCATED) {
          const res = await axios.get("/api/warehouse-stock/unallocated");
          setAvailableAtSource((res.data ?? []).map((r: any) => ({
            item_code: r.item_code, item_name: r.item_name, available: r.unallocated,
          })));
        } else {
          const res = await axios.get("/api/warehouse-stock", { params: { location_id: fromLocationId } });
          // The endpoint returns one row per storage bin, so the same item
          // can appear multiple times here — aggregate to one entry per
          // item_code with its total available at this location.
          const byItem = new Map<string, AvailableItem>();
          for (const r of res.data ?? []) {
            const existing = byItem.get(r.item_code);
            if (existing) {
              existing.available += r.quantity_on_hand;
            } else {
              byItem.set(r.item_code, { item_code: r.item_code, item_name: r.item_name, available: r.quantity_on_hand });
            }
          }
          setAvailableAtSource(Array.from(byItem.values()));
        }
      } catch {
        setAvailableAtSource([]);
      }
    };
    if (dialogOpen) loadAvailable();
  }, [fromLocationId, dialogOpen]);

  const resetDialog = () => {
    setFromLocationId(UNALLOCATED);
    setToLocationId("");
    setNotes("");
    setItems([]);
    setPick({ item_code: "", quantity: 0 });
  };

  const openDialog = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const addItemRow = () => {
    const src = availableAtSource.find(a => a.item_code === pick.item_code);
    if (!src || pick.quantity <= 0) {
      toast({ title: "Select an item and enter a quantity greater than zero", variant: "destructive" });
      return;
    }
    if (pick.quantity > src.available) {
      toast({ title: `Only ${src.available} of ${src.item_code} is available at this source`, variant: "destructive" });
      return;
    }
    if (items.some(i => i.item_code === src.item_code)) {
      toast({ title: "This item is already on the list", variant: "destructive" });
      return;
    }
    setItems(prev => [...prev, { item_code: src.item_code, item_name: src.item_name, quantity: pick.quantity }]);
    setPick({ item_code: "", quantity: 0 });
  };

  const removeItemRow = (itemCode: string) => setItems(prev => prev.filter(i => i.item_code !== itemCode));

  const stats = useMemo(() => {
    const completed = transfers.filter(t => t.status === "completed").length;
    const draft = transfers.filter(t => t.status === "draft").length;
    return { total: transfers.length, completed, draft };
  }, [transfers]);

  const availableYears = useMemo(() => {
    const years = new Set(transfers.map(t => new Date(t.transfer_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      const d = new Date(t.transfer_date);
      if (filterDateFrom) {
        const from = new Date(filterDateFrom);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      if (filterMonth !== "all" && d.getMonth() !== Number(filterMonth)) return false;
      if (filterYear !== "all" && d.getFullYear() !== Number(filterYear)) return false;
      return true;
    });
  }, [transfers, filterDateFrom, filterDateTo, filterMonth, filterYear]);

  const hasActiveFilters = !!filterDateFrom || !!filterDateTo || filterMonth !== "all" || filterYear !== "all";

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterMonth("all");
    setFilterYear("all");
  };

  const exportRows = () =>
    filteredTransfers.map(t => ({
      "Transfer #": t.transfer_number,
      "Date": new Date(t.transfer_date).toLocaleString(),
      "From": t.from_location?.location_name ?? "Unallocated",
      "To": t.to_location?.location_name ?? "",
      "Items": t.total_items,
      "Status": t.status,
      "Notes": t.notes ?? "",
    }));

  const exportXLSX = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export for this filter.", variant: "destructive" });
      return;
    }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Transfers");
    XLSX.writeFile(workbook, `stock_transfers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported", description: "Stock transfers exported to XLSX." });
  };

  const exportPDF = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export for this filter.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Stock Transfers", 14, 15);
    const head = [Object.keys(rows[0])];
    const body = rows.map(r => Object.values(r).map(v => String(v ?? "")));
    autoTable(doc, {
      head,
      body,
      startY: 22,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`stock_transfers_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: "Exported", description: "Stock transfers exported to PDF." });
  };

  const saveTransfer = async (status: "draft" | "completed") => {
    if (!toLocationId) {
      toast({ title: "Select a destination warehouse", variant: "destructive" });
      return;
    }
    if (fromLocationId !== UNALLOCATED && fromLocationId === toLocationId) {
      toast({ title: "From and To warehouses must differ", variant: "destructive" });
      return;
    }
    // If a row is still sitting in the picker (item + qty chosen but the
    // user never clicked "+"), fold it in automatically instead of making
    // them lose it — the picker looks like part of the same form.
    let finalItems = items;
    if (pick.item_code && pick.quantity > 0) {
      const src = availableAtSource.find(a => a.item_code === pick.item_code);
      if (!src) {
        toast({ title: "Selected item is no longer available at this source", variant: "destructive" });
        return;
      }
      if (pick.quantity > src.available) {
        toast({ title: `Only ${src.available} of ${src.item_code} is available at this source`, variant: "destructive" });
        return;
      }
      if (!items.some(i => i.item_code === src.item_code)) {
        finalItems = [...items, { item_code: src.item_code, item_name: src.item_name, quantity: pick.quantity }];
      }
    }

    if (finalItems.length === 0) {
      toast({ title: "Add at least one item to transfer", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await axios.post("/api/stock-transfers", {
        id: crypto.randomUUID(),
        transfer_number: `ST-${Date.now().toString().slice(-8)}`,
        transfer_date: new Date().toISOString(),
        from_location_id: fromLocationId === UNALLOCATED ? null : fromLocationId,
        to_location_id: toLocationId,
        status,
        notes: notes || null,
        items: finalItems,
      });
      toast({ title: status === "completed" ? "Transfer completed" : "Transfer saved as draft" });
      setDialogOpen(false);
      resetDialog();
      await loadTransfers();
    } catch (error: any) {
      toast({
        title: "Failed to save transfer",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleViewTransfer = (transfer: TransferRow) => {
    setSelectedTransfer(transfer);
    setViewOpen(true);
  };

  const handlePrintTransfer = (transfer: TransferRow) => {
    setSelectedTransfer(transfer);
    setPrintOpen(true);
  };

  const deleteTransfer = async (id: string) => {
    try {
      await axios.delete(`/api/stock-transfers/${id}`);
      toast({ title: "Transfer deleted" });
      await loadTransfers();
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-[#e8eef4] p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Stock Transfer</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Move Stock Between Warehouses · Inventory</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportXLSX}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Export XLSX
              </Button>
              <Button variant="outline" onClick={exportPDF}>
                <FileText className="h-4 w-4 mr-1" /> Export PDF
              </Button>
              <Button onClick={openDialog}>
                <Plus className="h-4 w-4 mr-1" /> New Transfer
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total Transfers" value={stats.total} accent="bg-blue-500" />
            <StatCard label="Completed" value={stats.completed} accent="bg-emerald-500" />
            <StatCard label="Draft" value={stats.draft} accent="bg-amber-500" />
          </div>

          <Card>
            <CardHeader className="py-3 space-y-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" /> Transfers
              </CardTitle>

              {/* Filters */}
              <div className="flex items-end flex-wrap gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">From Date</Label>
                  <Input type="date" className="h-8 w-36" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">To Date</Label>
                  <Input type="date" className="h-8 w-36" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Month</Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {MONTH_NAMES.map((m, idx) => (
                        <SelectItem key={m} value={String(idx)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Year</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button size="sm" variant="ghost" className="h-8" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
              ) : transfers.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No transfers yet. Click <strong>New Transfer</strong> to move stock between warehouses.
                </div>
              ) : filteredTransfers.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No transfers match the selected filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransfers.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs font-semibold">{t.transfer_number}</TableCell>
                        <TableCell className="text-xs">{new Date(t.transfer_date).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{t.from_location?.location_name ?? "Unallocated"}</TableCell>
                        <TableCell className="text-xs">{t.to_location?.location_name ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{t.total_items}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] capitalize ${statusBadge(t.status)}`}>{t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="View" onClick={() => handleViewTransfer(t)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Print Receipt" onClick={() => handlePrintTransfer(t)}>
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" title="Delete" onClick={() => deleteTransfer(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── New Transfer dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From *</Label>
              <Select value={fromLocationId} onValueChange={(v) => { setFromLocationId(v); setItems([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNALLOCATED}>Unallocated Stock</SelectItem>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.location_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">To *</Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger><SelectValue placeholder="Select destination…" /></SelectTrigger>
                <SelectContent>
                  {locations.filter(l => l.id !== fromLocationId).map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.location_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Items</Label>
            {items.length > 0 && (
              <div className="border rounded-md divide-y">
                {items.map(i => (
                  <div key={i.item_code} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-semibold">{i.item_code}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{i.item_name}</div>
                    </div>
                    <div className="text-sm font-medium w-20 text-right">{i.quantity}</div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => removeItemRow(i.item_code)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border rounded-md p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Select value={pick.item_code} onValueChange={(v) => setPick(p => ({ ...p, item_code: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                    <SelectContent>
                      {availableAtSource.length === 0 ? (
                        <SelectItem value="none" disabled>Nothing available at this source</SelectItem>
                      ) : (
                        availableAtSource.map(a => (
                          <SelectItem key={a.item_code} value={a.item_code}>
                            {a.item_code} — {a.item_name} [{a.available} available]
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
                <Button size="icon" variant="outline" className="shrink-0" title="Add item to transfer" onClick={addItemRow}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes about this transfer…" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="outline" onClick={() => saveTransfer("draft")} disabled={saving}>Save as Draft</Button>
            <Button onClick={() => saveTransfer("completed")} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Transfer dialog ── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transfer Details - {selectedTransfer?.transfer_number}</DialogTitle></DialogHeader>
          {selectedTransfer && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-medium">{selectedTransfer.from_location?.location_name ?? "Unallocated"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-medium">{selectedTransfer.to_location?.location_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`text-[10px] capitalize mt-1 ${statusBadge(selectedTransfer.status)}`}>{selectedTransfer.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transfer Date</p>
                  <p className="font-medium">{new Date(selectedTransfer.transfer_date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="font-medium">{selectedTransfer.total_items}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransfer.items?.map(item => (
                        <TableRow key={item.item_code}>
                          <TableCell className="font-mono text-xs font-medium">{item.item_code}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedTransfer.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">{selectedTransfer.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Print receipt dialog ── */}
      <StockTransferPrintReceipt open={printOpen} onOpenChange={setPrintOpen} transfer={selectedTransfer} />
    </Layout>
  );
};

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default StockTransfer;
