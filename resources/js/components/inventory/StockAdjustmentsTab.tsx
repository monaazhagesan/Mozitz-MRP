import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Eye, Edit, Trash2, FileText, ChevronDown, X, Save, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AdjustmentItem {
  id: string;
  itemCode: string;
  itemName: string;
  barcode: string;
  adjustmentQty: number;
  inStock: number;
  costPerUnit: number;
  adjustmentValue: number;
}

interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  adjustmentDate: string;
  reason: string;
  additionalInfo: string;
  status: "draft" | "completed";
  items: AdjustmentItem[];
  totalValue: number;
  createdAt: string;
}

const StockAdjustmentsTab = () => {
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "completed">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<StockAdjustment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adjustmentToDelete, setAdjustmentToDelete] = useState<StockAdjustment | null>(null);

  // Form state
  const [adjustmentNumber, setAdjustmentNumber] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [reason, setReason] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentItem[]>([]);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  // Load inventory items
  useEffect(() => {
  const fetchInventory = async () => {
    try {
      const { data } = await axios.get("/api/inventory-stock");

      if (Array.isArray(data.items)) {
        const sortedData = data.items.sort((a: any, b: any) =>
          (a.itemCode || "").localeCompare(b.itemCode || "")
        );

        setInventoryItems(sortedData);
      } else {
        setInventoryItems([]);
      }

    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load inventory",
        variant: "destructive",
      });
    }
  };

  fetchInventory();
}, []);

useEffect(() => {
  const fetchData = async () => {
    try {
      console.log("📡 Fetching stock adjustments...");

      const res = await axios.get("/api/stock-adjustments");
      const inv = await axios.get("/api/inventory-stock");

      const inventoryList = Array.isArray(inv.data?.items)
        ? inv.data.items
        : [];

      const data = res.data;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : [];

      const mapped: StockAdjustment[] = list.map((adj: any) => {
        return {
          id: adj.id,
          adjustmentNumber: adj.adjustment_number || "-",
          adjustmentDate: adj.adjustment_date,
          reason: adj.reason || "",
          additionalInfo: adj.additional_info || "",
          status: adj.status || "draft",
          totalValue: Number(adj.total_value || 0),
          createdAt: adj.created_at,

          items: Array.isArray(adj.items)
            ? adj.items.map((item: any) => {
                const inventoryItem = inventoryList.find(
                  (inv: any) => inv.itemCode === item.item_code
                );

                return {
                  id: item.id,

                  // ✅ KEEP EXACT VALUE FROM DB (NO ABS, NO CHANGE)
                  itemCode: item.item_code,
                  itemName: inventoryItem?.itemName || item.item_code,
                  barcode: inventoryItem?.barcode || "-",
                 inStock: Number(item.in_stock ?? inventoryItem?.quantityOnHand ?? 0),

                  // 🔥 IMPORTANT FIX HERE
                  adjustmentQty: Number(item.adjustment_qty),

                  costPerUnit: Number(item.cost_per_unit),

                  adjustmentValue:
                    Number(item.adjustment_qty) *
                    Number(item.cost_per_unit),
                };
              })
            : [],
        };
      });

      console.log("✅ Mapped adjustments:", mapped);

      setAdjustments(mapped);
      setInventoryItems(inventoryList);
    } catch (err) {
      console.error("❌ Fetch error:", err);
    }
  };

  fetchData();
}, []);
 
  const saveAdjustments = (newAdjustments: StockAdjustment[]) => {
    localStorage.setItem("stock_adjustments", JSON.stringify(newAdjustments));
    setAdjustments(newAdjustments);
  };

  const generateAdjustmentNumber = () => {
    const count = adjustments.length + 1;
    return `SA-${count.toString().padStart(4, "0")}`;
  };

  const resetForm = () => {
    setAdjustmentNumber(generateAdjustmentNumber());
    setAdjustmentDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setReason("");
    setAdditionalInfo("");
    setAdjustmentItems([]);
    setItemSearchTerm("");
    setEditingAdjustment(null);
    setIsViewMode(false);
  };

  const openCreateForm = () => {
    resetForm();
    setAdjustmentNumber(generateAdjustmentNumber());
    setIsFormOpen(true);
  };

 const openViewForm = (adjustment: StockAdjustment) => {
  if (!adjustment) return;

  setEditingAdjustment(adjustment);

  setAdjustmentNumber(adjustment.adjustmentNumber ?? "");

  setAdjustmentDate(
    adjustment.adjustmentDate
      ? adjustment.adjustmentDate.slice(0, 16)
      : ""
  );

  setReason(adjustment.reason ?? "");
  setAdditionalInfo(adjustment.additionalInfo ?? "");

  // ✅ SAFE ITEMS HANDLING
  const safeItems = Array.isArray(adjustment.items)
    ? adjustment.items.map((item) => ({
        id: item.id ?? "",
        itemCode: item.itemCode ?? "",
        itemName: item.itemName ?? "",
        barcode: item.barcode ?? "-",
        inStock: Number(item.inStock ?? 0),
        adjustmentQty: Number(item.adjustmentQty ?? 0),
        costPerUnit: Number(item.costPerUnit ?? 0),
        adjustmentValue: Number(item.adjustmentValue ?? 0),
      }))
    : [];

  setAdjustmentItems(safeItems);

  setIsViewMode(true);
  setIsFormOpen(true);
};
  const openEditForm = (adjustment: StockAdjustment) => {
    setEditingAdjustment(adjustment);
    setAdjustmentNumber(adjustment.adjustmentNumber);
    setAdjustmentDate(adjustment.adjustmentDate);
    setReason(adjustment.reason);
    setAdditionalInfo(adjustment.additionalInfo);
    setAdjustmentItems(adjustment.items);
    setIsViewMode(false);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  // Filter inventory items for suggestions
  const filteredInventoryItems = itemSearchTerm.trim()
    ? inventoryItems.filter((inv) => {
      const code = inv.itemCode?.toLowerCase() || "";
      const name = inv.itemName?.toLowerCase() || "";
      const search = itemSearchTerm.toLowerCase();

      return (
        (code.includes(search) || name.includes(search)) &&
        !adjustmentItems.some((ai) => ai.itemCode === inv.itemCode)
      );
    })
    : [];

  const addItemToAdjustment = (inventoryItem: any) => {
    const newItem: AdjustmentItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

      // ✅ FIXED fields
      itemCode: inventoryItem.itemCode,
      itemName: inventoryItem.itemName,

      barcode: inventoryItem.barcode || "",
      adjustmentQty: 0,

      // ✅ FIXED fields
      inStock: inventoryItem.quantityOnHand || 0,

      costPerUnit: inventoryItem.unit_cost || 0,
      adjustmentValue: 0,
    };

    setAdjustmentItems((prev) => [...prev, newItem]);
    setItemSearchTerm("");
    setShowItemSuggestions(false);
  };


  const updateItemQty = (itemId: string, qty: number) => {
    setAdjustmentItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
            ...item,
            adjustmentQty: qty,
            adjustmentValue: qty * item.costPerUnit,
          }
          : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setAdjustmentItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const calculateTotal = () => {
    return adjustmentItems.reduce((sum, item) => sum + item.adjustmentValue, 0);
  };


 const handleSaveAdjustment = async (status: "draft" | "completed") => {
  if (adjustmentItems.length === 0) {
    toast({
      title: "No Items",
      description: "Please add at least one item to the adjustment",
      variant: "destructive",
    });
    return;
  }

  try {
    const payload = {
      id: editingAdjustment?.id || `adj-${Date.now()}`,
      adjustment_number: adjustmentNumber,
      adjustment_date: adjustmentDate,
      reason,
      additional_info: additionalInfo,
      status,
      total_value: calculateTotal(),
      items: adjustmentItems,
    };

    // ✅ SINGLE API CALL (IMPORTANT)
    await axios.post("/api/stock-adjustments", payload);

    toast({
      title: status === "completed" ? "Adjustment Completed" : "Saved as Draft",
      description: `${adjustmentNumber} processed successfully`,
    });

    // refresh adjustments list
    const res = await axios.get("/api/stock-adjustments");
    setAdjustments(res.data || []);

    // refresh inventory if completed
    if (status === "completed") {
      const inv = await axios.get("/api/inventory-stock");
      setInventoryItems(inv.data?.items || []);
    }

    handleCloseForm();

  } catch (error: any) {
    toast({
      title: "Error",
      description: error?.response?.data?.message || error.message,
      variant: "destructive",
    });
  }
};

 const handleDeleteAdjustment = async () => {
  if (!adjustmentToDelete) return;

  try {
    // ✅ 1. Call correct backend API
    await axios.delete(
      `/api/stock-adjustments/${adjustmentToDelete.id}`
    );

    // ✅ 2. Remove from state (NO localStorage)
    setAdjustments((prev) =>
      Array.isArray(prev)
        ? prev.filter((a) => a.id !== adjustmentToDelete.id)
        : []
    );

    toast({
      title: "Deleted",
      description: `${adjustmentToDelete.adjustmentNumber} deleted successfully`,
    });

    // ✅ 3. Reset UI state
    setDeleteDialogOpen(false);
    setAdjustmentToDelete(null);

  } catch (error: any) {
    console.error("Delete failed:", error);

    toast({
      title: "Error",
      description:
        error?.response?.data?.message || "Failed to delete adjustment",
      variant: "destructive",
    });
  }
};

const filteredAdjustments = (Array.isArray(adjustments) ? adjustments : []).filter((adj) => {
  const search = searchTerm.toLowerCase();

  const number = (adj?.adjustmentNumber ?? "").toString().toLowerCase();
  const reason = (adj?.reason ?? "").toString().toLowerCase();

  if (!(number.includes(search) || reason.includes(search))) return false;
  if (statusFilter !== "all" && adj?.status !== statusFilter) return false;

  if (dateFrom || dateTo) {
    const d = adj?.adjustmentDate ? new Date(adj.adjustmentDate) : null;
    if (!d || isNaN(d.getTime())) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (d < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
  }

  return true;
});

  const hasActiveFilters = !!searchTerm || statusFilter !== "all" || !!dateFrom || !!dateTo;

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const exportRows = () =>
    filteredAdjustments.map((adj) => ({
      "Adjustment #": adj.adjustmentNumber,
      Date: adj.adjustmentDate ? format(new Date(adj.adjustmentDate), "dd MMM yyyy HH:mm") : "-",
      Reason: adj.reason ?? "",
      Items: Array.isArray(adj.items) ? adj.items.length : 0,
      "Total Value": Number(adj.totalValue ?? 0),
      Status: adj.status === "completed" ? "Completed" : "Draft",
    }));

  const exportXLSX = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export for this filter.", variant: "destructive" });
      return;
    }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Adjustments");
    XLSX.writeFile(workbook, `stock_adjustments_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported", description: "Stock adjustments exported to XLSX." });
  };

  const exportPDF = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export for this filter.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Stock Adjustments", 14, 15);
    const head = [Object.keys(rows[0])];
    const body = rows.map((r) => Object.values(r).map((v) => String(v ?? "")));
    autoTable(doc, { head, body, startY: 22, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [37, 99, 235] } });
    doc.save(`stock_adjustments_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: "Exported", description: "Stock adjustments exported to PDF." });
  };

  const safeAdjustments = Array.isArray(adjustments) ? adjustments : [];

const stats = {
  total: safeAdjustments.length,
  draft: safeAdjustments.filter((a) => a.status === "draft").length,
  completed: safeAdjustments.filter((a) => a.status === "completed").length,
};

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Adjustments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
            <div className="text-sm text-muted-foreground">Drafts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Stock Adjustments</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" title="Export XLSX" onClick={exportXLSX}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Export PDF" onClick={exportPDF}>
              <FileText className="h-4 w-4" />
            </Button>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Adjustment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search adjustments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>All</Button>
              <Button size="sm" variant={statusFilter === "draft" ? "default" : "outline"} onClick={() => setStatusFilter("draft")}>Draft</Button>
              <Button size="sm" variant={statusFilter === "completed" ? "default" : "outline"} onClick={() => setStatusFilter("completed")}>Completed</Button>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">From</Label>
                <Input type="date" className="h-8 w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">To</Label>
                <Input type="date" className="h-8 w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Adjustment #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
  {filteredAdjustments.length === 0 ? (
    <TableRow>
      <TableCell
        colSpan={7}
        className="text-center py-8 text-muted-foreground"
      >
        {hasActiveFilters
          ? "No adjustments match the selected filters."
          : 'No adjustments found. Click "New Adjustment" to create one.'}
      </TableCell>
    </TableRow>
  ) : (
    filteredAdjustments.map((adj) => {
      const safeDate =
        adj?.adjustmentDate &&
        !isNaN(new Date(adj.adjustmentDate).getTime())
          ? format(new Date(adj.adjustmentDate), "dd MMM yyyy HH:mm")
          : "-";

      const itemCount = Array.isArray(adj?.items)
        ? adj.items.length
        : 0;

      const totalValue = Number(adj?.totalValue ?? 0);

      return (
        <TableRow key={adj?.id ?? Math.random()}>
          <TableCell className="font-medium">
            {adj?.adjustmentNumber ?? "-"}
          </TableCell>

          <TableCell>{safeDate}</TableCell>

          <TableCell className="max-w-[200px] truncate">
            {adj?.reason ?? "-"}
          </TableCell>

          <TableCell>{itemCount}</TableCell>

          <TableCell className="text-right">
            {totalValue.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
            })}
          </TableCell>

          <TableCell>
            <Badge
              variant={
                adj?.status === "completed" ? "default" : "secondary"
              }
            >
              {adj?.status === "completed" ? "Completed" : "Draft"}
            </Badge>
          </TableCell>

          <TableCell>
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openViewForm(adj)}
              >
                <Eye className="h-4 w-4" />
              </Button>

              {adj?.status === "draft" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditForm(adj)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setAdjustmentToDelete(adj);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    })
  )}
</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit/View Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isViewMode ? "View" : editingAdjustment ? "Edit" : "New"} Stock Adjustment
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "Viewing adjustment details"
                : editingAdjustment
                  ? "Update the adjustment details"
                  : "Create a new stock adjustment"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adjustment #</Label>
                  <Input value={adjustmentNumber} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Adjustment Date</Label>
                  <Input
                    type="datetime-local"
                    value={adjustmentDate}
                    onChange={(e) => setAdjustmentDate(e.target.value)}
                    disabled={isViewMode}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Enter reason for adjustment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  disabled={isViewMode}
                />
              </div>

              {/* Add Item Section */}
              {!isViewMode && (
                <div className="space-y-2">
                  <Label>Add Item</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search item by code or name..."
                      value={itemSearchTerm}
                      onChange={(e) => {
                        setItemSearchTerm(e.target.value);
                        setShowItemSuggestions(true);
                      }}
                      onFocus={() => setShowItemSuggestions(true)}
                      className="pl-9"
                    />
                    {showItemSuggestions && filteredInventoryItems.length > 0 && (
                      <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-auto">
                        <CardContent className="p-2">
                          {filteredInventoryItems.slice(0, 8).map((inv) => (
                            <Button
                              key={inv.id}
                              variant="ghost"
                              className="w-full justify-start text-sm"
                              onClick={() => addItemToAdjustment(inv)}
                            >
                              <Plus className="h-3 w-3 mr-2" />
                              {inv.itemCode} - {inv.itemName}
                              <span className="ml-auto text-muted-foreground">
                                Stock: {inv.quantityOnHand || 0}
                              </span>
                            </Button>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead className="text-right">In Stock</TableHead>
                      <TableHead className="text-right">Adjustment +/-</TableHead>
                      <TableHead className="text-right">Cost/Unit</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      {!isViewMode && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustmentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isViewMode ? 7 : 8} className="text-center py-8 text-muted-foreground">
                          {isViewMode ? "No items in this adjustment" : "Search and add items above"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      adjustmentItems.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{item.itemCode}</div>
                            <div className="text-sm text-muted-foreground">{item.itemName}</div>
                          </TableCell>
                          <TableCell>{item.barcode || "-"}</TableCell>
                          <TableCell className="text-right"> {item.inStock ?? 0}</TableCell>
                          <TableCell className="text-right">
                            {isViewMode ? (
                              <span className={item.adjustmentQty >= 0 ? "text-green-600" : "text-red-600"}>
                                {item.adjustmentQty > 0 ? "+" : ""}
                                {item.adjustmentQty}
                              </span>
                            ) : (
                              <Input
                                type="number"
                                value={item.adjustmentQty}
                                onChange={(e) => updateItemQty(item.id, parseFloat(e.target.value) || 0)}
                                className="w-24 text-right ml-auto"
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.costPerUnit.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={item.adjustmentValue >= 0 ? "text-green-600" : "text-red-600"}>
                              {item.adjustmentValue.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                            </span>
                          </TableCell>
                          {!isViewMode && (
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Total */}
              <div className="flex justify-end items-center border-t pt-4">
                <span className="text-sm text-muted-foreground mr-4">Total:</span>
                <span className="text-xl font-bold">
                  {calculateTotal().toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                </span>
              </div>

              {/* Additional Info */}
              <div className="space-y-2">
                <Label>Additional Info</Label>
                <Textarea
                  placeholder="Add any additional notes..."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  rows={3}
                  disabled={isViewMode}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            {isViewMode ? (
              <Button variant="outline" onClick={handleCloseForm}>
                Close
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button variant="secondary" onClick={() => handleSaveAdjustment("draft")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button onClick={() => handleSaveAdjustment("completed")}>
                  Complete Adjustment
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {adjustmentToDelete?.adjustmentNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAdjustment} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockAdjustmentsTab;
