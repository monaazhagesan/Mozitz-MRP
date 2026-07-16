import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatCard from "@/components/StatCard";
import {
  Plus, X, ScanBarcode, Hash, Boxes, Download, FileText, Trash2, Eye, Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type LocationRow = { id: string; location_name: string };

type SerialRow = {
  id: string;
  item_code: string;
  item_name: string;
  item_type: string;
  serial_number: string;
  location_id: string | null;
  location_name: string | null;
  notes: string | null;
  created_at: string;
  is_synthetic: false;
};

type UnserializedRow = {
  id: number | string;
  item_code: string;
  item_name: string;
  item_type: string;
  auto_generate_serial: boolean;
  uom: string | null;
  quantity: number;
  has_serials: boolean;
  show_by_default: boolean;
  is_synthetic: true;
};

type Row = SerialRow | UnserializedRow;

type Stats = { total_serials: number; items_tracked: number; unserialized_stock: number };

const SerialNumbersTab = () => {
  const { toast } = useToast();
  const [serials, setSerials] = useState<SerialRow[]>([]);
  const [unserialized, setUnserialized] = useState<UnserializedRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total_serials: 0, items_tracked: 0, unserialized_stock: 0 });
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  const [enablePickerOpen, setEnablePickerOpen] = useState(false);
  const [enablePickItemCode, setEnablePickItemCode] = useState("");
  const [enabling, setEnabling] = useState(false);

  const [typeFilter, setTypeFilter] = useState<"all" | "Product" | "Material">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [colName, setColName] = useState("");
  const [colItemCode, setColItemCode] = useState("");
  const [colSerial, setColSerial] = useState("");
  const [colCreated, setColCreated] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickItemCode, setPickItemCode] = useState("");
  const [dialogLocationId, setDialogLocationId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [serialList, setSerialList] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [viewingSerialId, setViewingSerialId] = useState<string | null>(null);

  const loadSerials = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/serial-numbers");
      setSerials(res.data?.serials ?? []);
      setUnserialized(res.data?.unserialized ?? []);
      setStats(res.data?.stats ?? { total_serials: 0, items_tracked: 0, unserialized_stock: 0 });
      setTrackingEnabled(!!res.data?.tracking_enabled);
    } catch (error: any) {
      toast({ title: "Failed to load serial numbers", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    const res = await axios.get("/api/locations");
    setLocations(res.data?.data ?? []);
  };

  useEffect(() => { loadSerials(); loadLocations(); }, []);

  const trackingCandidates = useMemo(
    () => unserialized.filter(u => !u.auto_generate_serial),
    [unserialized]
  );

  const eligibleItems = useMemo(
    () => unserialized.filter(u => u.auto_generate_serial && u.quantity > 0.0001),
    [unserialized]
  );

  const confirmEnableTracking = async () => {
    const target = trackingCandidates.find(i => i.item_code === enablePickItemCode);
    if (!target) {
      toast({ title: "Select an item", variant: "destructive" });
      return;
    }
    setEnabling(true);
    try {
      await axios.patch(`/api/inventory-stock/${target.id}/enable-serial-tracking`);
      toast({ title: `Serial number tracking enabled for ${target.item_code}` });
      setEnablePickerOpen(false);
      setEnablePickItemCode("");
      await loadSerials();
    } catch (error: any) {
      toast({ title: "Failed to enable serial tracking", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setEnabling(false);
    }
  };

  const resetDialog = () => {
    setPickItemCode("");
    setDialogLocationId("none");
    setNotes("");
    setSerialList([]);
    setSerialInput("");
  };

  const openDialog = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const selectedItem = eligibleItems.find(i => i.item_code === pickItemCode);
  const remainingForItem = selectedItem ? selectedItem.quantity - serialList.length : 0;

  const addSerial = () => {
    const value = serialInput.trim();
    if (!pickItemCode) {
      toast({ title: "Select an item first", variant: "destructive" });
      return;
    }
    if (!value) {
      toast({ title: "Enter a serial number", variant: "destructive" });
      return;
    }
    if (serialList.includes(value)) {
      toast({ title: "This serial number is already in the list", variant: "destructive" });
      return;
    }
    if (selectedItem && serialList.length >= selectedItem.quantity) {
      toast({ title: `Only ${selectedItem.quantity} unserialized unit(s) of ${selectedItem.item_code} available`, variant: "destructive" });
      return;
    }
    setSerialList(prev => [...prev, value]);
    setSerialInput("");
  };

  const removeSerial = (value: string) => setSerialList(prev => prev.filter(s => s !== value));

  const saveSerials = async () => {
    if (!pickItemCode) {
      toast({ title: "Select an item", variant: "destructive" });
      return;
    }
    if (serialList.length === 0) {
      toast({ title: "Add at least one serial number", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await axios.post("/api/serial-numbers", {
        item_code: pickItemCode,
        location_id: dialogLocationId === "none" ? null : dialogLocationId,
        notes: notes || null,
        serial_numbers: serialList,
      });
      toast({ title: `${serialList.length} serial number${serialList.length === 1 ? "" : "s"} added` });
      setDialogOpen(false);
      resetDialog();
      await loadSerials();
    } catch (error: any) {
      toast({ title: "Failed to save serial numbers", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteSerial = async (id: string) => {
    try {
      await axios.delete(`/api/serial-numbers/${id}`);
      toast({ title: "Serial number deleted" });
      await loadSerials();
    } catch (error: any) {
      toast({ title: "Failed to delete", description: error.response?.data?.message || error.message, variant: "destructive" });
    }
  };

  const mergedRows: Row[] = useMemo(() => {
    const unserializedRows: Row[] = unserialized.filter(u => u.show_by_default).map(u => ({ ...u }));
    return [...serials, ...unserializedRows];
  }, [serials, unserialized]);

  const filteredRows = useMemo(() => {
    return mergedRows.filter(r => {
      if (typeFilter !== "all" && r.item_type !== typeFilter) return false;
      if (locationFilter !== "all") {
        if (r.is_synthetic) return false;
        if (r.location_id !== locationFilter) return false;
      }
      if (colName && !r.item_name?.toLowerCase().includes(colName.toLowerCase())) return false;
      if (colItemCode && !r.item_code?.toLowerCase().includes(colItemCode.toLowerCase())) return false;
      if (colSerial) {
        const sn = r.is_synthetic ? "unserialized" : r.serial_number.toLowerCase();
        if (!sn.includes(colSerial.toLowerCase())) return false;
      }
      if (colCreated) {
        const created = r.is_synthetic ? null : r.created_at;
        if (!created || created.slice(0, 10) < colCreated) return false;
      }
      return true;
    });
  }, [mergedRows, typeFilter, locationFilter, colName, colItemCode, colSerial, colCreated]);

  const hasColumnFilters = !!(colName || colItemCode || colSerial || colCreated);

  const exportRows = () =>
    filteredRows.map(r => ({
      Name: r.item_name,
      "Item code": r.item_code,
      "Serial number": r.is_synthetic ? "Unserialized" : r.serial_number,
      Quantity: r.is_synthetic ? r.quantity : 1,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Serial Numbers");
    XLSX.writeFile(workbook, `serial_numbers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported", description: "Serial numbers exported to XLSX." });
  };

  const exportPDF = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export for this filter.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Serial Numbers", 14, 15);
    const head = [Object.keys(rows[0])];
    const body = rows.map(r => Object.values(r).map(v => String(v ?? "")));
    autoTable(doc, { head, body, startY: 22, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 235] } });
    doc.save(`serial_numbers_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: "Exported", description: "Serial numbers exported to PDF." });
  };

  const viewingSerial = serials.find(s => s.id === viewingSerialId) ?? null;
  const totalRowCount = filteredRows.length;

  const enableTrackingDialog = (
    <Dialog open={enablePickerOpen} onOpenChange={(o) => { setEnablePickerOpen(o); if (!o) setEnablePickItemCode(""); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Choose an item for serial tracking</DialogTitle></DialogHeader>
        <div>
          <Label className="text-xs">Item</Label>
          <Select value={enablePickItemCode} onValueChange={setEnablePickItemCode}>
            <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
            <SelectContent>
              {trackingCandidates.length === 0 ? (
                <SelectItem value="none" disabled>All items already have serial tracking enabled</SelectItem>
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
          <Button onClick={confirmEnableTracking} disabled={enabling}>{enabling ? "Enabling…" : "Enable Serial Tracking"}</Button>
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
              <ScanBarcode className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Serial number tracking</h2>
              <p className="text-muted-foreground mt-1 max-w-md">
                Serial number tracking allows you to provide a unique identifier for each finished
                product, enabling tracing for every item from production or purchase to sale or assembly.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              {[
                "Product traceability ideal for warranty, quality assurance, and recalls",
                "Monitor items across manufacturing, purchasing, sales, and stock transfers",
                "Combine with batch/lot tracking for full visibility into your inventory",
              ].map(text => (
                <div key={text} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span className="text-sm">{text}</span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">How serial numbers work:</h3>
              <div className="space-y-3">
                {[
                  "Enable serial numbers tracking for products that you want to fully track",
                  "Add serial numbers to products either when purchased or manufactured",
                  "Easily track products back if any recalls or warranty issues arise",
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
                Choose an item for serial tracking
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
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Serial Numbers" value={stats.total_serials} icon={Hash} />
        <StatCard title="Items Tracked" value={stats.items_tracked} icon={ScanBarcode} />
        <StatCard title="Unserialized Stock" value={stats.unserialized_stock} icon={Boxes} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant={typeFilter === "all" ? "default" : "outline"} onClick={() => setTypeFilter("all")}>All</Button>
            <Button variant={typeFilter === "Product" ? "default" : "outline"} onClick={() => setTypeFilter("Product")}>Products</Button>
            <Button variant={typeFilter === "Material" ? "default" : "outline"} onClick={() => setTypeFilter("Material")}>Materials</Button>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
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
              <ScanBarcode className="h-4 w-4 mr-1" /> Enable Tracking
            </Button>
            <Button onClick={openDialog}>
              <Plus className="h-4 w-4 mr-1" /> Add Serial Numbers
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <span className="text-sm font-medium">{totalRowCount} row{totalRowCount === 1 ? "" : "s"}</span>
          </div>
          <div className="overflow-x-auto">
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
                    <span>Serial number</span>
                    <Input placeholder="Filter" className="h-7 mt-1 text-xs" value={colSerial} onChange={(e) => setColSerial(e.target.value)} />
                  </TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
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
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      {hasColumnFilters || typeFilter !== "all" || locationFilter !== "all"
                        ? "No serial numbers match the selected filters."
                        : "No serial numbers yet. Click Add Serial Numbers to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map(r => (
                    <TableRow key={r.is_synthetic ? `unserialized-${r.item_code}` : r.id}>
                      <TableCell><span className="text-primary hover:underline cursor-pointer">{r.item_name}</span></TableCell>
                      <TableCell>{r.item_code}</TableCell>
                      <TableCell>
                        {r.is_synthetic
                          ? <Badge variant="secondary">Unserialized</Badge>
                          : <span className="font-mono text-xs">{r.serial_number}</span>}
                      </TableCell>
                      <TableCell className="text-right">{r.is_synthetic ? r.quantity : 1}</TableCell>
                      <TableCell>{r.is_synthetic ? "-" : new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {!r.is_synthetic && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="View" onClick={() => setViewingSerialId(r.id)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" title="Delete" onClick={() => deleteSerial(r.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add Serial Numbers dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetDialog(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Serial Numbers</DialogTitle></DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Item *</Label>
              <Select value={pickItemCode} onValueChange={(v) => { setPickItemCode(v); setSerialList([]); }}>
                <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                <SelectContent>
                  {eligibleItems.length === 0 ? (
                    <SelectItem value="none" disabled>No serial-tracked items with unserialized stock</SelectItem>
                  ) : (
                    eligibleItems.map(i => (
                      <SelectItem key={i.item_code} value={i.item_code}>
                        {i.item_code} — {i.item_name} [{i.quantity} available]
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {eligibleItems.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No items with serial tracking enabled have unserialized stock.{" "}
                  <button type="button" className="text-primary underline" onClick={() => { setDialogOpen(false); setEnablePickerOpen(true); }}>
                    Enable tracking for an item
                  </button>
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Select value={dialogLocationId} onValueChange={setDialogLocationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location</SelectItem>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.location_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              Serial Numbers {selectedItem && `(${serialList.length}/${selectedItem.quantity})`}
            </Label>
            {serialList.length > 0 && (
              <div className="border rounded-md divide-y">
                {serialList.map(s => (
                  <div key={s} className="flex items-center gap-2 px-3 py-2">
                    <div className="font-mono text-xs font-semibold flex-1">{s}</div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => removeSerial(s)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter serial number…"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSerial(); } }}
              />
              <Button size="icon" variant="outline" className="shrink-0" title="Add serial number" onClick={addSerial}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {selectedItem && remainingForItem <= 0 && (
              <p className="text-xs text-muted-foreground">All unserialized units of this item are now listed.</p>
            )}
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveSerials} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Serial dialog */}
      <Dialog open={!!viewingSerialId} onOpenChange={(o) => { if (!o) setViewingSerialId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Serial {viewingSerial?.serial_number}</DialogTitle></DialogHeader>
          {viewingSerial && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg text-sm">
              <div>
                <p className="text-muted-foreground">Item</p>
                <p className="font-medium">{viewingSerial.item_code} — {viewingSerial.item_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{viewingSerial.location_name ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Added</p>
                <p className="font-medium">{new Date(viewingSerial.created_at).toLocaleString()}</p>
              </div>
              {viewingSerial.notes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Notes</p>
                  <p className="font-medium">{viewingSerial.notes}</p>
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

export default SerialNumbersTab;
