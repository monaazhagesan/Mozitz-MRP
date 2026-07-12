import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { Play, FileText, ShoppingCart, AlertTriangle, CheckCircle, Zap, Loader2, TrendingUp, Clock, Layers, Calendar, Hammer, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import ForecastingTab from "@/components/mrp/ForecastingTab";

interface MRPItem {
  id: string;
  item_code: string;
  item_name: string;
  item_type: string | null;
  on_hand: number;
  allocated: number;
  available: number; // can be negative
  bom_req: number;
  open_po: number;
  safety_stock: number | null;
  reorder_point: number | null;
  lead_time_days: number | null;
  net_requirement: number;
  shortage_qty: number;
  suggestion: "Sufficient" | "Below Reorder" | "Deficit";
  order_suggestion: { quantity: number; expected_arrival: Date | null } | null;
  flags: string[];
  default_supplier: string | null;
}

interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  item_type: string | null;
  quantity_on_hand: number | null;
  allocated_quantity: number | null;
  committed_quantity: number | null;
  available_quantity: number | null;
  reorder_point: number | null;
  safety_stock?: number | null;
  lead_time_days?: number | null;
  default_supplier: string | null;
}

interface Job {
  id: string;
  job_number: string;
  item_code: string;
  quantity: number;
  status: string;
  bom?: BOMComponent[];
}

interface BOMComponent {
  component: string;
  quantity: number;
  description: string;
}


export default function MRPRun() {
  const [mrpItems, setMrpItems] = useState<MRPItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    runMRP();
  }, []);


  const runMRP = async () => {
    setRunning(true);
    try {
      // 1. Fetch all inventory items with new fields
      const invRes = await axios.get("/api/inventory-stock");
      const inventory: InventoryItem[] = (invRes.data?.items || [])
        .map((r: any) => ({
          id: r.id,
          item_code: r.itemCode ?? r.item_code ?? "",
          item_name: r.itemName ?? r.item_name ?? "",
          item_type: r.item_type ?? null,
          quantity_on_hand: Number(r.quantityOnHand ?? r.quantity_on_hand ?? 0),
          allocated_quantity: Number(r.allocatedQuantity ?? r.allocated_quantity ?? 0),
          committed_quantity: Number(r.committedQuantity ?? r.committed_quantity ?? 0),
          available_quantity: Number(r.availableQuantity ?? r.available_quantity ?? 0),
          reorder_point: r.reorderPoint ?? r.reorder_point ?? null,
          safety_stock: r.safety_stock ?? r.safetyStock ?? null,
          lead_time_days: r.lead_time_days ?? r.leadTimeDays ?? null,
          default_supplier: r.defaultSupplier ?? r.default_supplier ?? null,
        }))
        .sort((a: InventoryItem, b: InventoryItem) => a.item_code.localeCompare(b.item_code));

      if (!inventory || inventory.length === 0) {
        setMrpItems([]);
        setLastRunTime(new Date());
        setRunning(false);
        setLoading(false);
        return;
      }

      // 2. Get open/planned jobs from localStorage (where jobs are stored)
      const savedJobs = localStorage.getItem("jobs");
      const jobs: Job[] = savedJobs ? JSON.parse(savedJobs) : [];
      
      // Filter for open/in-progress jobs (not completed)
      const openJobs = jobs.filter((job: Job) => 
        job.status && !["Completed", "Cancelled", "Complete"].includes(job.status)
      );

      // 3. Get BOM components for all products in open jobs
      const jobItemCodes = [...new Set(openJobs.map((job: Job) => job.item_code))];
      
      let bomComponentsMap = new Map<string, { component: string; quantity: number }[]>();

      for (const code of jobItemCodes) {
        try {
          const headerRes = await axios.get("/api/bom-headers/by-item-code", {
            params: { item_code: code },
            validateStatus: () => true,
          });
          const headers = headerRes.data?.data || [];
          if (headers.length === 0) continue;

          const activeHeader =
            headers.find((h: any) => (h.status || "").toLowerCase() === "active") || headers[0];

          const compRes = await axios.get("/api/bom-components", {
            params: { bom_id: activeHeader.id },
            validateStatus: () => true,
          });
          const comps = compRes.data || [];

          bomComponentsMap.set(
            code,
            comps.map((c: any) => ({ component: c.component, quantity: Number(c.quantity ?? 0) }))
          );
        } catch {
          // Skip items with no resolvable BOM
        }
      }

      // 4. Calculate BOM explosion - aggregate component requirements from open jobs
      // BOM Req = shortage (Required Qty - On Hand), only if there's a shortage
      const componentRequirements = new Map<string, number>();
      
      // First, get inventory stock levels for calculating shortage
      const inventoryStockMap = new Map<string, number>();
      inventory.forEach((item: InventoryItem) => {
        inventoryStockMap.set(item.item_code, item.quantity_on_hand || 0);
      });
      
      openJobs.forEach((job: Job) => {
        const jobQty = job.quantity || 1;
        const parentOnHand = inventoryStockMap.get(job.item_code) || 0;
        
        // Calculate shortage for the parent item (Required - On Hand)
        // Only calculate BOM requirements if there's a shortage
        const shortage = Math.max(0, jobQty - parentOnHand);
        
        if (shortage > 0) {
          const bomComponents = bomComponentsMap.get(job.item_code) || [];
          
          bomComponents.forEach((comp) => {
            // BOM requirement is based on shortage, not full job qty
            const requiredQty = comp.quantity * shortage;
            const current = componentRequirements.get(comp.component) || 0;
            componentRequirements.set(comp.component, current + requiredQty);
          });
        }
      });

      // 4.5 Calculate allocated quantities from real job allocations
      const activeJobNumbers = [
        ...new Set(openJobs.map((job: any) => job.id || job.jobNumber).filter(Boolean)),
      ];

      let confirmedOrderAllocations = new Map<string, number>();

      if (activeJobNumbers.length > 0) {
        try {
          const allocRes = await axios.post("/api/job-allocations/active", {
            job_numbers: activeJobNumbers,
          });
          const rows = allocRes.data?.data || [];
          rows.forEach((r: any) => {
            const qty = Number(r.allocated_quantity || 0);
            confirmedOrderAllocations.set(
              r.item_code,
              (confirmedOrderAllocations.get(r.item_code) || 0) + qty
            );
          });
        } catch (e) {
          console.error("Failed to load job allocations:", e);
        }
      }

      // 5. Fetch open Purchase Orders (not received/completed) with lines already eager-loaded
      let openPoMap = new Map<string, number>();
      try {
        const poRes = await axios.get("/api/purchase-orders");
        const allPOs = Array.isArray(poRes.data) ? poRes.data : poRes.data?.data || [];
        const openStatuses = new Set(["Approved", "Partial"]);

        allPOs
          .filter((po: any) => openStatuses.has(po.status))
          .forEach((po: any) => {
            (po.lines || []).forEach((line: any) => {
              const qty = Number(line.quantity || 0);
              if (qty > 0 && line.item_code) {
                openPoMap.set(line.item_code, (openPoMap.get(line.item_code) || 0) + qty);
              }
            });
          });
      } catch (e) {
        console.error("Failed to load purchase orders:", e);
      }

      // 6. Process each inventory item per MRP spec
      const today = new Date();
      const processedItems: MRPItem[] = inventory.map((item: InventoryItem) => {
        const onHand = Math.round(item.quantity_on_hand || 0);
        const allocated = Math.round(confirmedOrderAllocations.get(item.item_code) || 0);
        const reorderPoint = item.reorder_point != null ? Math.round(item.reorder_point) : null;
        const safetyStockRaw = (item as any).safety_stock;
        const safetyStock = safetyStockRaw != null ? Math.round(safetyStockRaw) : null;
        const leadTimeRaw = (item as any).lead_time_days;
        const leadTimeDays = leadTimeRaw != null && leadTimeRaw > 0 ? Math.round(leadTimeRaw) : null;
        const bomReq = Math.round(componentRequirements.get(item.item_code) || 0);
        const openPo = Math.round(openPoMap.get(item.item_code) || 0);

        // 1. AVAILABLE (can be negative)
        const available = onHand - allocated;

        // 2. NET_REQUIREMENT
        const safetyForCalc = safetyStock ?? 0;
        const netRequirement = Math.max(0, (bomReq + safetyForCalc) - (available + openPo));

        // 3. SHORTAGE_QTY
        const shortageQty = available;

        // 4. SUGGESTION (priority: Deficit > Below Reorder > Sufficient)
        let suggestion: "Sufficient" | "Below Reorder" | "Deficit" = "Sufficient";
        if (available < 0) {
          suggestion = "Deficit";
        } else if (reorderPoint != null && onHand < reorderPoint) {
          suggestion = "Below Reorder";
        }

        // 5. ORDER_SUGGESTION
        let orderSuggestion: { quantity: number; expected_arrival: Date | null } | null = null;
        if (netRequirement > 0) {
          orderSuggestion = {
            quantity: netRequirement,
            expected_arrival: leadTimeDays ? addDays(today, leadTimeDays) : null,
          };
        }

        // VALIDATION FLAGS
        const flags: string[] = [];
        if (!item.item_code || !item.item_name) flags.push("Incomplete Record");
        if (allocated > onHand) flags.push("Deficit");
        if (openPo > 0 && leadTimeDays == null) flags.push("Lead time missing, cannot estimate arrival");

        return {
          id: item.id,
          item_code: item.item_code,
          item_name: item.item_name,
          item_type: item.item_type,
          on_hand: onHand,
          allocated: allocated,
          available: available,
          bom_req: bomReq,
          open_po: openPo,
          safety_stock: safetyStock,
          reorder_point: reorderPoint,
          lead_time_days: leadTimeDays,
          net_requirement: netRequirement,
          shortage_qty: shortageQty,
          suggestion,
          order_suggestion: orderSuggestion,
          flags,
          default_supplier: item.default_supplier,
        };
      });

      // Sort: Deficit > Below Reorder > Sufficient; then item_code
      const suggestionRank: Record<string, number> = { Deficit: 0, "Below Reorder": 1, Sufficient: 2 };
      processedItems.sort((a, b) => {
        const r = suggestionRank[a.suggestion] - suggestionRank[b.suggestion];
        if (r !== 0) return r;
        return a.item_code.localeCompare(b.item_code);
      });

      setMrpItems(processedItems);
      setLastRunTime(new Date());
    } catch (error: any) {
      toast({
        title: "MRP Run Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
      setLoading(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllShortage = () => {
    const shortageIds = mrpItems
      .filter((item) => item.suggestion !== "Sufficient")
      .map((item) => item.id);
    setSelectedItems(shortageIds);
  };

  const createRFQFromSelected = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to create RFQ",
        variant: "destructive",
      });
      return;
    }
    
    const selectedMrpItems = mrpItems.filter((item) => selectedItems.includes(item.id));
    const itemParams = selectedMrpItems.map(item => `${item.item_code}:${item.net_requirement || item.reorder_point}`).join(",");
    
    navigate(`/purchase/rfq-management?items=${itemParams}`);
  };

  const processSelected = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select shortage items to process",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const selectedMrpItems = mrpItems.filter((item) => selectedItems.includes(item.id));
      
      // Group items by default supplier
      const vendorItemsMap = new Map<string, MRPItem[]>();
      const noVendorItems: MRPItem[] = [];

      selectedMrpItems.forEach((item) => {
        if (item.default_supplier) {
          const existing = vendorItemsMap.get(item.default_supplier) || [];
          existing.push(item);
          vendorItemsMap.set(item.default_supplier, existing);
        } else {
          noVendorItems.push(item);
        }
      });

      // Fetch vendor details
      const vendorNames = Array.from(vendorItemsMap.keys());
      let vendorDetailsMap = new Map<string, { email: string | null; contact: string | null }>();

      const vendorsRes = await axios.get("/api/vendors");
      (vendorsRes.data || []).forEach((v: any) => {
        if (vendorNames.includes(v.vendor_name)) {
          vendorDetailsMap.set(v.vendor_name, { email: v.email, contact: v.contact_person });
        }
      });

      let createdRfqCount = 0;

      // Create RFQs grouped by vendor
      for (const [vendorName, items] of vendorItemsMap.entries()) {
        const rfqNumber = `RFQ-MRP-${Date.now()}-${createdRfqCount + 1}`;
        const vendorDetails = vendorDetailsMap.get(vendorName) || { email: null, contact: null };

        await axios.post("/api/rfqs", {
          rfq_number: rfqNumber,
          title: `MRP Auto-Generated RFQ for ${vendorName}`,
          status: "sent",
          payment_terms: "Net 30",
          notes: `[AUTO-GENERATED] Created from MRP Run for ${items.length} item(s). Lead time considered.`,
          items: items.map((item) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.bom_req > 0 ? `BOM requirement: ${item.bom_req}` : "",
            quantity: item.net_requirement > 0 ? item.net_requirement : (item.reorder_point ?? 1),
            required_date: addDays(new Date(), item.lead_time_days ?? 7).toISOString().split("T")[0],
          })),
          vendors: [
            {
              vendor_name: vendorName,
              vendor_email: vendorDetails.email,
              vendor_contact: vendorDetails.contact,
              status: "sent",
            },
          ],
        });

        createdRfqCount++;
      }

      // Handle items without a matched vendor
      if (noVendorItems.length > 0) {
        const rfqNumber = `RFQ-MRP-${Date.now()}-PENDING`;

        await axios.post("/api/rfqs", {
          rfq_number: rfqNumber,
          title: `MRP Auto-Generated RFQ (Vendor Required)`,
          status: "draft",
          payment_terms: "Net 30",
          notes: `[AUTO-GENERATED] Created from MRP Run. Items require vendor assignment.`,
          items: noVendorItems.map((item) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.bom_req > 0 ? `BOM requirement: ${item.bom_req}` : "",
            quantity: item.net_requirement > 0 ? item.net_requirement : (item.reorder_point ?? 1),
            required_date: addDays(new Date(), item.lead_time_days ?? 7).toISOString().split("T")[0],
          })),
          vendors: [],
        });

        createdRfqCount++;
      }

      toast({
        title: "RFQs Created Successfully",
        description: `Created ${createdRfqCount} RFQ(s) for ${selectedItems.length} item(s).`,
      });

      setSelectedItems([]);
      runMRP();
    } catch (error: any) {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getSuggestionBadge = (item: MRPItem) => {
    if (item.suggestion === "Sufficient") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sufficient
        </Badge>
      );
    }
    if (item.suggestion === "Below Reorder") {
      return (
        <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
          <Clock className="h-3 w-3 mr-1" />
          Below Reorder
        </Badge>
      );
    }
    // Deficit
    return (
      <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Deficit
      </Badge>
    );
  };

  const totalItems = mrpItems.length;
  const sufficientCount = mrpItems.filter((i) => i.suggestion === "Sufficient").length;
  const deficitCount = mrpItems.filter((i) => i.suggestion === "Deficit").length;
  const reorderCount = mrpItems.filter((i) => i.suggestion === "Below Reorder").length;
  const flaggedCount = mrpItems.filter((i) => i.flags.length > 0).length;
  const totalNetRequirement = mrpItems.reduce((sum, i) => sum + i.net_requirement, 0);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Material Requirements Planning</h1>
            <p className="text-muted-foreground mt-1">
              BOM explosion, inventory analysis, lead time planning, and procurement suggestions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRunTime && (
              <span className="text-sm text-muted-foreground">
                Last run: {format(lastRunTime, "PPp")}
              </span>
            )}
            <Button onClick={runMRP} disabled={running} size="lg">
              <Play className="mr-2 h-4 w-4" />
              {running ? "Running MRP..." : "Run MRP"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="planning" className="space-y-6">
          <TabsList>
            <TabsTrigger value="planning" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Planning
            </TabsTrigger>
            <TabsTrigger value="forecasting" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Forecasting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalItems}</div>
                  <p className="text-xs text-muted-foreground">In inventory</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Sufficient
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{sufficientCount}</div>
                  <p className="text-xs text-muted-foreground">No action needed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Deficit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{deficitCount}</div>
                  <p className="text-xs text-muted-foreground">Over-allocated</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Flagged
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{flaggedCount}</div>
                  <p className="text-xs text-muted-foreground">With validation flags</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Below Reorder
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{reorderCount}</div>
                  <p className="text-xs text-muted-foreground">Need replenishment</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Net Requirement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{totalNetRequirement}</div>
                  <p className="text-xs text-muted-foreground">Units to procure</p>
                </CardContent>
              </Card>
            </div>

            {/* Actions Bar */}
            {mrpItems.length > 0 && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={selectAllShortage}>
                    Select All Shortage Items
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>
                    Clear Selection
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.length} items selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createRFQFromSelected}
                    disabled={selectedItems.length === 0}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Create RFQ (Manual)
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={processSelected}
                    disabled={selectedItems.length === 0 || processing}
                  >
                    {processing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    {processing ? "Processing..." : "Process Selected"}
                  </Button>
                </div>
              </div>
            )}

            {/* MRP Results Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted">
                          Available
                        </TooltipTrigger>
                        <TooltipContent>On Hand − Allocated (can be negative)</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-right">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted">
                          BOM Req
                        </TooltipTrigger>
                        <TooltipContent>Required by BOM explosion of open jobs</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-right">Open PO</TableHead>
                    <TableHead className="text-right">Safety</TableHead>
                    <TableHead className="text-right">Reorder Pt</TableHead>
                    <TableHead className="text-right">Lead Time</TableHead>
                    <TableHead className="text-right">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted">
                          Net Req
                        </TooltipTrigger>
                        <TooltipContent>MAX(0, (BOM + Safety) − (Available + Open PO))</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead>Order Suggestion</TableHead>
                    <TableHead>Suggestion</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Running MRP analysis...
                      </TableCell>
                    </TableRow>
                  ) : mrpItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                        No inventory items found. Add items to inventory first.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mrpItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className={
                          item.suggestion === "Deficit"
                            ? "bg-red-50/50"
                            : item.suggestion === "Below Reorder"
                              ? "bg-orange-50/50"
                              : ""
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                            disabled={item.suggestion === "Sufficient"}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.item_code}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.item_type || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.on_hand}</TableCell>
                        <TableCell className="text-right">
                          {item.allocated > 0 ? (
                            <span className="text-amber-600 font-medium">{item.allocated}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={item.available < 0 ? "text-red-600" : ""}>{item.available}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.bom_req > 0 ? (
                            <span className="text-purple-600 font-medium">{item.bom_req}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.open_po > 0 ? (
                            <span className="text-blue-600">{item.open_po}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.safety_stock != null ? item.safety_stock : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.reorder_point != null ? item.reorder_point : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.lead_time_days != null ? (
                            <span className="flex items-center justify-end gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {item.lead_time_days}d
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.net_requirement > 0 ? (
                            <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {item.net_requirement}
                            </span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.order_suggestion ? (
                            <div className="text-xs">
                              <div className="font-medium">Order {item.order_suggestion.quantity}</div>
                              {item.order_suggestion.expected_arrival ? (
                                <div className="text-muted-foreground">
                                  Arrives {format(item.order_suggestion.expected_arrival, "MMM d")}
                                </div>
                              ) : (
                                <div className="text-muted-foreground italic">No lead time</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getSuggestionBadge(item)}</TableCell>
                        <TableCell>
                          {item.flags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.flags.map((f, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="forecasting">
            <ForecastingTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
