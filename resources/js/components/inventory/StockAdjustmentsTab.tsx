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
import { Plus, Search, Eye, Edit, Trash2, FileText, ChevronDown, X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import axios from "axios";

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

        // ✅ FIX: use data.items (NOT data)
        if (Array.isArray(data.items)) {
          const sortedData = data.items.sort((a: any, b: any) =>
            (a.itemCode || "").localeCompare(b.itemCode || "")
          );

          setInventoryItems(sortedData);
        }

        await loadAdjustments();
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

  const loadAdjustments = () => {
    // Load from localStorage for now (can be migrated to Supabase later)
    const saved = localStorage.getItem("stock_adjustments");
    if (saved) {
      setAdjustments(JSON.parse(saved));
    }
  };

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
    setEditingAdjustment(adjustment);
    setAdjustmentNumber(adjustment.adjustmentNumber);
    setAdjustmentDate(adjustment.adjustmentDate);
    setReason(adjustment.reason);
    setAdditionalInfo(adjustment.additionalInfo);
    setAdjustmentItems(adjustment.items);
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

    const adjustment: StockAdjustment = {
      id: editingAdjustment?.id || `adj-${Date.now()}`,
      adjustmentNumber,
      adjustmentDate,
      reason,
      additionalInfo,
      status,
      items: adjustmentItems,
      totalValue: calculateTotal(),
      createdAt: editingAdjustment?.createdAt || new Date().toISOString(),
    };

    try {
      // ✅ ONLY run API updates when completing
      if (status === "completed") {
        await Promise.all(
          adjustmentItems.map(async (item) => {
            const inventoryItem = inventoryItems.find(
              (inv) => inv.itemCode === item.itemCode
            );

            if (!inventoryItem) return;

            const newQty =
              (inventoryItem.quantityOnHand || 0) + item.adjustmentQty;

            // ✅ Update inventory
            await axios.put(`/api/inventory-stock/${inventoryItem.id}`, {
              quantity_on_hand: Number(newQty),
               last_transaction_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
            });

            // ✅ Create stock transaction
            await axios.post(`/api/stock-transactions`, {
              item_code: item.itemCode,
              transaction_type:
                item.adjustmentQty > 0 ? "Adjustment In" : "Adjustment Out",
              quantity: Math.abs(item.adjustmentQty),
              unit_cost: item.costPerUnit || 0,
              reference_type: "Stock Adjustment",
              reference_number: adjustmentNumber,
              notes: reason,
              additional_info: additionalInfo,
            });
          })
        );
      }

      // ✅ Save locally
      const newAdjustments = editingAdjustment
        ? adjustments.map((a) =>
          a.id === editingAdjustment.id ? adjustment : a
        )
        : [...adjustments, adjustment];

      saveAdjustments(newAdjustments);
      handleCloseForm();

      toast({
        title:
          status === "completed"
            ? "Adjustment Completed"
            : "Adjustment Saved",
        description:
          status === "completed"
            ? `${adjustmentNumber} has been completed and inventory updated`
            : `${adjustmentNumber} saved as draft`,
      });

      // ✅ Refresh inventory after completion
      if (status === "completed") {
        const response = await axios.get("/api/inventory-stock");
        if (response.data?.items) {
          setInventoryItems(response.data.items);
        }
      }
    } catch (error: any) {
      console.error("Error saving adjustment:", error);

      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error.message ||
          "Failed to save adjustment",
        variant: "destructive",
      });
    }
  };

 const handleDeleteAdjustment = async () => {
  if (!adjustmentToDelete) return;

  try {
    // ✅ 1. Call backend API
    await axios.delete(
      `/api/stock-transactions/${adjustmentToDelete.id}`
    );

    // ✅ 2. Update frontend state after success
    const newAdjustments = adjustments.filter(
      (a) => a.id !== adjustmentToDelete.id
    );

    saveAdjustments(newAdjustments);

    toast({
      title: "Deleted",
      description: `${adjustmentToDelete.adjustmentNumber} has been deleted`,
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

  const filteredAdjustments = adjustments.filter(
    (adj) =>
      adj.adjustmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: adjustments.length,
    draft: adjustments.filter((a) => a.status === "draft").length,
    completed: adjustments.filter((a) => a.status === "completed").length,
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
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-2" />
            New Adjustment
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search adjustments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No adjustments found. Click "New Adjustment" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdjustments.map((adj) => (
                    <TableRow key={adj.id}>
                      <TableCell className="font-medium">{adj.adjustmentNumber}</TableCell>
                      <TableCell>{format(new Date(adj.adjustmentDate), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{adj.reason || "-"}</TableCell>
                      <TableCell>{adj.items.length}</TableCell>
                      <TableCell className="text-right">
                        {adj.totalValue.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={adj.status === "completed" ? "default" : "secondary"}>
                          {adj.status === "completed" ? "Completed" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openViewForm(adj)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {adj.status === "draft" && (
                            <Button variant="ghost" size="icon" onClick={() => openEditForm(adj)}>
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
                  ))
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
                          <TableCell className="text-right">{item.inStock}</TableCell>
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
