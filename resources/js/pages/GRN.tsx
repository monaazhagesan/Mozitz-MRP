import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Download, Eye, CheckCircle, XCircle, Printer, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import GRNPrintReceipt from "@/components/grn/GRNPrintReceipt";
import { FindGRNDialog, GRNFilters } from "@/components/grn/FindGRNDialog";

interface POLineItem {
  id: string;
  itemCode: string;
  description: string;
  poQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  unitPrice: number;
  uom: string;
  destinationType: string;
  rev: string;
  selected: boolean;
  receiveQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason: string;
}

interface PODetails {
  poNumber: string;
  vendor: string;
  supplierSite: string;
  orderType: string;
  dueDate: string;
}

const GRN = () => {
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<any>(null);
  const [existingGRNs, setExistingGRNs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Find Expected Receipts state
  const [searchPONumber, setSearchPONumber] = useState("");
  const [supplierDetails, setSupplierDetails] = useState<PODetails | null>(null);
  const [poLines, setPOLines] = useState<POLineItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Receipt details
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  
  // Receipt number state
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [showReceiptMode, setShowReceiptMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Tabs state
  const [activeTab, setActiveTab] = useState("lines");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterGrnFrom, setFilterGrnFrom] = useState("");
  const [filterGrnTo, setFilterGrnTo] = useState("");
  const [filterPoNumber, setFilterPoNumber] = useState("");
  const [findGRNOpen, setFindGRNOpen] = useState(false);


  const safeExistingGRNs = Array.isArray(existingGRNs) ? existingGRNs : [];


  // Get unique vendors for filter dropdown
  const uniqueVendors = useMemo(() => {
  const vendors = safeExistingGRNs.map(grn => grn.vendor).filter(Boolean); // remove undefined/null
  return [...new Set(vendors)].sort();
}, [safeExistingGRNs]);

 // Filter GRNs based on search and filters
const filteredGRNs = useMemo(() => {
  return safeExistingGRNs.filter(grn => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        grn.grn_number?.toLowerCase().includes(query) ||
        grn.po_number?.toLowerCase().includes(query) ||
        grn.vendor?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // GRN range filter
    if (filterGrnFrom || filterGrnTo) {
      const grnNum = grn.grn_number?.toLowerCase() || "";
      if (filterGrnFrom && grnNum < filterGrnFrom.toLowerCase()) return false;
      if (filterGrnTo && grnNum > filterGrnTo.toLowerCase()) return false;
    }

    // PO Number filter
    if (filterPoNumber) {
      const poNum = grn.po_number?.toLowerCase() || "";
      if (!poNum.includes(filterPoNumber.toLowerCase())) return false;
    }

    // Vendor filter
    if (filterVendor && filterVendor !== "all" && grn.vendor !== filterVendor) {
      return false;
    }

    // Date range filter
    const receiptDate = new Date(grn.receipt_date);
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (receiptDate < fromDate) return false;
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (receiptDate > toDate) return false;
    }

    return true;
  });
}, [
  safeExistingGRNs,
  searchQuery,
  filterVendor,
  filterDateFrom,
  filterDateTo,
  filterGrnFrom,
  filterGrnTo,
  filterPoNumber,
]);

  const hasActiveFilters = filterVendor !== "all" || filterDateFrom || filterDateTo || filterGrnFrom || filterGrnTo || filterPoNumber;

  // Handle Find GRN dialog
  const handleFindGRN = (filters: GRNFilters) => {
    setFilterGrnFrom(filters.grnFrom);
    setFilterGrnTo(filters.grnTo);
    setFilterDateFrom(filters.dateFrom);
    setFilterDateTo(filters.dateTo);
    setFilterVendor(filters.supplier || "all");
    setFilterPoNumber(filters.poNumber);
    setCurrentPage(1);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterVendor, filterDateFrom, filterDateTo]);

  // Paginated GRNs
  const paginatedGRNs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredGRNs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGRNs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredGRNs.length / itemsPerPage);

  const clearFilters = () => {
    setFilterVendor("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterGrnFrom("");
    setFilterGrnTo("");
    setFilterPoNumber("");
  };

  // Fetch existing GRNs from database
  useEffect(() => {
    fetchGRNs();
  }, []);

 const fetchGRNs = async () => {
  try {
    setLoading(true);

    const response = await axios.get("/api/grn");

    const data = response.data;

    console.log("Fetched GRNs:", data); // <-- log the response

    setExistingGRNs(data || []);
  } catch (error: any) {
    console.error("Error fetching GRNs:", error); // <-- log the error
    toast({
      title: "Error Fetching GRNs",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

const handleFind = async () => {
  if (!searchPONumber.trim()) {
    toast({
      title: "Validation Error",
      description: "Please enter a PO Number to search",
      variant: "destructive",
    });
    return;
  }

  setIsSearching(true);
  setHasSearched(true);

  try {
    // You can filter by multiple statuses or remove the filter
    const statusFilter = ["Approved", "Sent", "Partial", "Awaiting Approval"]; 

    console.log("Searching PO Number:", searchPONumber);
    console.log("Using status filter:", statusFilter);

    const response = await axios.get("/api/purchase-orders", {
      params: {
        po_number: searchPONumber.trim(),
        status: statusFilter, // Send as array if API supports it
      },
    });

    console.log("Raw API response:", response.data);

    const poData = response.data.find(
      (po: any) => po.po_number === searchPONumber.trim()
    );

    if (!poData) {
      setSupplierDetails(null);
      setPOLines([]);
      toast({
        title: "No PO Found",
        description: `No purchase order found with number: ${searchPONumber}`,
        variant: "destructive",
      });
      return;
    }

    // Supplier details
    setSupplierDetails({
      poNumber: poData.po_number,
      vendor: poData.vendor,
      supplierSite: poData.shipping_address || poData.site || "Main Site",
      orderType: poData.type || "Standard",
      dueDate: poData.delivery_date
        ? new Date(poData.delivery_date).toLocaleDateString()
        : "N/A",
    });

    // Use the correct property for PO items
    const poItems = poData.purchase_order_items || poData.lines || [];

    const lines: POLineItem[] = poItems
      .filter((item: any) => Number(item.quantity) - Number(item.received_quantity || 0) > 0)
      .map((item: any) => ({
        id: item.id,
        itemCode: item.item_code || item.itemCode,
        description: item.description || "",
        poQuantity: Number(item.quantity),
        receivedQuantity: Number(item.received_quantity || 0),
        pendingQuantity: Number(item.quantity) - Number(item.received_quantity || 0),
        unitPrice: Number(item.unit_price || 0),
        uom: "Each",
        destinationType: "Inventory",
        rev: "A",
        selected: false,
        receiveQty: 0,
        acceptedQty: 0,
        rejectedQty: 0,
        rejectionReason: "",
      }));

    console.log("Pending PO lines:", lines);

    setPOLines(lines);

    if (lines.length === 0) {
      toast({
        title: "No Pending Lines",
        description: "All items in this PO have been fully received",
      });
    }
  } catch (error: any) {
    console.error("Error fetching PO:", error);
    toast({
      title: "Search Error",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  } finally {
    setIsSearching(false);
  }
};

const handleClear = () => {
  setSearchPONumber("");
  setSupplierDetails(null);
  setPOLines([]);
  setHasSearched(false);
  setNotes("");
  setReceiptNumber(null);
  setShowReceiptMode(false);
  setIsSubmitting(false);
};


  const handleReceipt = () => {
    // Generate receipt number automatically
    const generatedNumber = `GRN-${Date.now().toString().slice(-8)}`;
    setReceiptNumber(generatedNumber);
    setShowReceiptMode(true);
  };

  const toggleLineSelection = (id: string) => {
    setPOLines(lines => lines.map(line => 
      line.id === id ? { ...line, selected: !line.selected } : line
    ));
  };

  const updateLineField = (id: string, field: keyof POLineItem, value: number | string) => {
    setPOLines(lines => lines.map(line => {
      if (line.id !== id) return line;
      
      const updated = { ...line, [field]: value };
      
      if (field === 'receiveQty') {
        const qty = Number(value);
        if (qty > line.pendingQuantity) {
          toast({
            title: "Validation Error",
            description: `Cannot exceed pending quantity (${line.pendingQuantity})`,
            variant: "destructive",
          });
          return line;
        }
        updated.acceptedQty = qty;
        updated.rejectedQty = 0;
        updated.selected = qty > 0;
      }
      
      if (field === 'acceptedQty' || field === 'rejectedQty') {
        const accepted = field === 'acceptedQty' ? Number(value) : updated.acceptedQty;
        const rejected = field === 'rejectedQty' ? Number(value) : updated.rejectedQty;
        
        if (accepted + rejected > updated.receiveQty) {
          toast({
            title: "Validation Error",
            description: "Accepted + Rejected cannot exceed Received quantity",
            variant: "destructive",
          });
          return line;
        }
      }
      
      return updated;
    }));
  };

  const calculateQCStatus = (lines: POLineItem[]) => {
    const receivedLines = lines.filter(l => l.receiveQty > 0);
    
    if (receivedLines.length === 0) return "Pending";
    
    const hasRejected = receivedLines.some(l => l.rejectedQty > 0);
    const totalReceived = receivedLines.reduce((sum, l) => sum + l.receiveQty, 0);
    const totalAccepted = receivedLines.reduce((sum, l) => sum + l.acceptedQty, 0);
    const totalRejected = receivedLines.reduce((sum, l) => sum + l.rejectedQty, 0);
    
    // QC status based on acceptance/rejection, not on partial receipt
    if (totalRejected > 0 && totalAccepted > 0) return "Partially Accepted";
    if (totalRejected > 0 && totalAccepted === 0) return "Rejected";
    if (totalAccepted === totalReceived) return "Accepted";
    return "Pending";
  };


const handleCreateReceipt = async () => {
  if (isSubmitting) return; // prevent double submission

  // 1️⃣ Filter lines with received qty > 0
  const selectedLines = poLines.filter(l => l.receiveQty > 0);

  if (selectedLines.length === 0) {
    toast({
      title: "Validation Error",
      description: "Please enter received quantity for at least one line",
      variant: "destructive",
    });
    return;
  }

  if (!supplierDetails) return;

  setIsSubmitting(true);

  try {
    const qcStatus = calculateQCStatus(selectedLines);

    const grnNumberToUse = receiptNumber || `GRN-${Date.now().toString().slice(-8)}`;

    // 2️⃣ Create GRN on backend
    const grnRes = await axios.post("/api/grn", {
      grn_number: grnNumberToUse,
      po_number: supplierDetails.poNumber,
      vendor: supplierDetails.vendor,
      receipt_date: receiptDate,
      qc_status: qcStatus,
      notes: notes,
    });

    const grnData = grnRes.data;
    console.log("Created GRN:", grnData);

    // 3️⃣ Insert GRN items individually
   for (const item of selectedLines) {
  const payload = {
    grn_id: grnData.id,                       // must exist
    item_code: item.itemCode,                 // match backend
    description: item.description || null,
    po_quantity: Number(item.pendingQuantity),
    received_quantity: Number(item.receiveQty),
    accepted_quantity: Number(item.acceptedQty),
    rejected_quantity: Number(item.rejectedQty),
    balance_quantity: Number(item.pendingQuantity - item.receiveQty),
    unit_price: Number(item.unitPrice),
    total_amount: Number(item.acceptedQty * item.unitPrice),
    rejection_reason: item.rejectionReason || null,
  };

  console.log("Posting GRN item:", payload); // <-- check payload before sending

  try {
    await axios.post("/api/grn-items", payload, {
      headers: { "Content-Type": "application/json" }, // ensure JSON
    });
  } catch (err: any) {
    console.error("Failed GRN item:", payload.item_code, err.response?.data || err.message);
  }
}

   // 4️⃣ Update inventory and stock transactions
    for (const item of selectedLines.filter(l => l.acceptedQty > 0)) {
      try {
        const stockRes = await axios.get("/api/inventory-stock", {
          params: { item_code: item.itemCode },
        });

        const existingStock = stockRes.data.items?.find(
          (i: any) => i.itemCode === item.itemCode
        );

       if (existingStock) {
  await axios.put(`/api/inventory-stock/${existingStock.id}`, {
    item_code: existingStock.itemCode,
    item_name: existingStock.itemName, // REQUIRED
    item_type: existingStock.itemType ,
    location: existingStock.location,   // REQUIRED
    quantity_on_hand: Number(existingStock.quantityOnHand) + item.acceptedQty,
    unit_cost: item.unitPrice,
    last_transaction_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
        } else {
          await axios.post("/api/inventory-stock", {
    item_code: item.itemCode,
    item_name: item.description,
    description: item.description,
    location: "Default Location", // REQUIRED
    quantity_on_hand: item.acceptedQty,
    unit_cost: item.unitPrice,
    item_type: item.itemType,
    last_transaction_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
        }

        // Stock transaction log
        await axios.post("/api/stock-transactions", {
          item_code: item.itemCode,
          transaction_type: "GRN_IN",
          reference_type: "GRN",
          reference_number: grnNumberToUse,
          quantity: item.acceptedQty,
          unit_cost: item.unitPrice,
          notes: `Received via GRN from PO ${supplierDetails.poNumber}`,
        });
      } catch (err: any) {
        console.error("Failed inventory update for item:", item.itemCode, err.response?.data || err.message);
      }
    }

    // 5️⃣ Create supplier payable
    const totalPayable = selectedLines
      .filter(l => l.acceptedQty > 0)
      .reduce((sum, item) => sum + item.acceptedQty * item.unitPrice, 0);

    if (totalPayable > 0) {
      try {
        await axios.post("/api/supplier-payables", {
          vendor: supplierDetails.vendor,
          reference_type: "GRN",
          reference_number: grnNumberToUse,
          grn_number: grnNumberToUse,
          po_number: supplierDetails.poNumber,
          transaction_date: receiptDate,
          total_amount: totalPayable,
          paid_amount: 0,
          credit: totalPayable,
          debit: 0,
          balance: totalPayable,
          status: "Pending",
          payment_status: "Unpaid",
          notes: `GRN for PO ${supplierDetails.poNumber}`,
        });
      } catch (err: any) {
        console.error("Failed to create supplier payable:", err.response?.data || err.message);
      }
    } 

    // 6️⃣ Update PO status
  const updatePOStatus = async (poNumber: string) => {
  try {
    const poRes = await axios.get(
      `/api/purchase-orders/by-number/${encodeURIComponent(poNumber)}`
    );
    const poData = poRes.data;

    if (!poData?.id) {
      console.error("PO data missing ID", poData);
      return;
    }

    const allFullyReceived = (poData.lines || []).every(
      (line: any) => Number(line.received_quantity || 0) >= Number(line.quantity)
    );
    const newStatus = allFullyReceived ? "Completed" : "Partial";

    if (poData.status !== newStatus) {
      // ✅ Call the dedicated status endpoint
      await axios.patch(`/api/purchase-orders/${poData.id}/status`, {
        status: newStatus,
      });
    }
  } catch (err: any) {
    console.error("Failed to update PO status:", err.response?.data || err.message);
  }
};
    await updatePOStatus(supplierDetails.poNumber);

    // 7️⃣ Success toast
    toast({
      title: "Receipt Created Successfully",
      description: `${grnNumberToUse} created. Inventory updated, payables recorded.`,
    });

    // 8️⃣ Reset frontend state & hide form
    handleClear();
    setOpen(false);
    setReceiptNumber("");
    setShowReceiptMode(false);
    fetchGRNs();

  } catch (error: any) {
    toast({
      title: "Error Creating Receipt",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  } finally {
    setIsSubmitting(false);
  }
};

  const handleViewGRN = (grn: any) => {
    setSelectedGRN(grn);
    setViewOpen(true);
  };

  const handlePrintGRN = (grn: any) => {
    setSelectedGRN(grn);
    setPrintOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      "Pending": "secondary",
      "Accepted": "default",
      "Awaiting": "secondary",
      "Partially Accepted": "outline",
      "Rejected": "destructive",
    };
    
    const icons: Record<string, React.ReactNode> = {
      "Accepted": <CheckCircle className="h-3 w-3 mr-1" />,
      "Rejected": <XCircle className="h-3 w-3 mr-1" />,
    };
    
    return (
      <Badge variant={variants[status]} className="flex items-center w-fit">
        {icons[status]}
        {status}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Goods Receipt Note (GRN)</h1>
            <p className="text-muted-foreground mt-2">
              Receive materials against purchase orders and manage quality checks
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Receipt
            </Button>
          </div>
        </div>

        {/* Find Expected Receipts Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0">
            {/* Receipt Number Display - Above Header */}
            {showReceiptMode && receiptNumber && (
              <div className="bg-[#ffffcc] border-b border-[#ccc] px-4 py-2 flex items-center gap-4">
                <Label className="text-sm font-medium">Receipt Number:</Label>
                <span className="text-sm font-bold text-primary">{receiptNumber}</span>
              </div>
            )}
            
            {/* ERP-style Header */}
            <div className="bg-[#4a6da7] text-white px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium">Find Expected Receipts (M1)</span>
              {hasSearched && poLines.length > 0 && !showReceiptMode && (
                <Button 
                  onClick={handleReceipt} 
                  size="sm" 
                  variant="secondary"
                  className="bg-white text-[#4a6da7] hover:bg-gray-100"
                >
                  Receipt
                </Button>
              )}
            </div>
            
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Search Criteria Section */}
              <div className="p-4 border-b bg-[#d4dce8]">
                <Tabs defaultValue="supplier" className="w-full">
                  <TabsList className="bg-transparent border-0 p-0 h-auto">
                    <TabsTrigger 
                      value="supplier" 
                      className="bg-[#f0f4f8] data-[state=active]:bg-white border border-b-0 rounded-t-md px-4 py-1 text-sm"
                    >
                      Supplier and Internal
                    </TabsTrigger>
                    <TabsTrigger 
                      value="customer" 
                      className="bg-[#d4dce8] data-[state=active]:bg-white border border-b-0 rounded-t-md px-4 py-1 text-sm ml-1"
                    >
                      Customer
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="supplier" className="mt-0 bg-[#e8eef4] p-6 border border-t-0 border-gray-300">
                    <div className="space-y-4">
                      {/* Operating Unit */}
                      <div className="flex items-center">
                        <Label className="w-32 text-right text-sm font-medium pr-3">Operating Unit</Label>
                        <Input 
                          value="Vision Operations" 
                          readOnly 
                          className="h-8 w-56 bg-[#ffffcc] border-gray-400 text-sm"
                        />
                      </div>
                      
                      {/* Source Type */}
                      <div className="flex items-center">
                        <Label className="w-32 text-right text-sm font-medium pr-3">Source Type</Label>
                        <Input 
                          value="All" 
                          readOnly 
                          className="h-8 w-56 bg-[#ffffcc] border-gray-400 text-sm"
                        />
                      </div>
                      
                      {/* Purchase Order */}
                      <div className="flex items-center">
                        <Label className="w-32 text-right text-sm font-medium pr-3">Purchase Order</Label>
                        <Input 
                          value={searchPONumber}
                          onChange={(e) => setSearchPONumber(e.target.value)}
                          placeholder="Enter PO Number"
                          className="h-8 w-56 border-gray-400 text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                        />
                      </div>
                      
                      {/* Supplier (auto-populated) */}
                      <div className="flex items-center">
                        <Label className="w-32 text-right text-sm font-medium pr-3">Supplier</Label>
                        <Input 
                          value={supplierDetails?.vendor || ""} 
                          readOnly 
                          className="h-8 w-56 bg-gray-100 border-gray-400 text-sm"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="customer" className="mt-0 bg-[#d4dce8] p-4 border-t-0">
                    <p className="text-sm text-muted-foreground">Customer receipt options...</p>
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-3 p-3 bg-[#d4dce8] border-b">
                <Button variant="outline" className="min-w-[100px]">
                  Unordered
                </Button>
                <Button variant="outline" onClick={handleClear} className="min-w-[100px]">
                  Clear
                </Button>
                <Button onClick={handleFind} disabled={isSearching} className="min-w-[100px]">
                  {isSearching ? "Finding..." : "Find"}
                </Button>
              </div>
              
              {/* Results Section - Receipts Table */}
              {hasSearched && poLines.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Receipts Header */}
                  <div className="bg-[#4a6da7] text-white px-4 py-2">
                    <span className="text-sm font-medium">Receipts (M1)</span>
                  </div>
                  
                  {/* Receipts Tabs */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="bg-[#d4dce8] border-b p-0 h-auto rounded-none justify-start">
                      <TabsTrigger 
                        value="lines" 
                        className="bg-[#e8ecf0] data-[state=active]:bg-white border border-b-0 rounded-t-md px-4 py-1 text-sm"
                      >
                        Lines
                      </TabsTrigger>
                      <TabsTrigger 
                        value="details" 
                        className="bg-[#e8ecf0] data-[state=active]:bg-white border border-b-0 rounded-t-md px-4 py-1 text-sm ml-0.5"
                      >
                        Details
                      </TabsTrigger>
                      <TabsTrigger 
                        value="currency" 
                        className="bg-[#e8ecf0] data-[state=active]:bg-white border border-b-0 rounded-t-md px-4 py-1 text-sm ml-0.5"
                      >
                        Currency
                      </TabsTrigger>
                      <TabsTrigger 
                        value="orderInfo" 
                        className="bg-[#e8ecf0] data-[state=active]:bg-white border border-b-0 rounded-t-md px-4 py-1 text-sm ml-0.5"
                      >
                        Order Information
                      </TabsTrigger>
                      <TabsTrigger 
                        value="shipmentInfo" 
                        className="bg-[#e8ecf0] data-[state=active]:bg-white border border-b-0 rounded-t-md px-4 py-1 text-sm ml-0.5"
                      >
                        Shipment Information
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="lines" className="flex-1 flex flex-col m-0 overflow-hidden">
                      {/* Lines Table */}
                      <div className="flex-1 overflow-auto border-x">
                        <Table>
                          <TableHeader className="sticky top-0 bg-[#e8ecf0]">
                            <TableRow>
                              <TableHead className="w-10 border-r"></TableHead>
                              <TableHead className="border-r text-xs">Receive Qty</TableHead>
                              <TableHead className="border-r text-xs">UOM</TableHead>
                              <TableHead className="border-r text-xs">Pending Qty</TableHead>
                              <TableHead className="border-r text-xs">Destination Type</TableHead>
                              <TableHead className="border-r text-xs">Item</TableHead>
                              <TableHead className="border-r text-xs">Rev</TableHead>
                              <TableHead className="border-r text-xs">Description</TableHead>
                              <TableHead className="border-r text-xs">Accepted</TableHead>
                              <TableHead className="border-r text-xs">Rejected</TableHead>
                              <TableHead className="text-xs">Rejection Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {poLines.map((line) => (
                              <TableRow key={line.id} className={line.selected ? "bg-accent/50" : ""}>
                                <TableCell className="border-r">
                                  <Checkbox 
                                    checked={line.selected}
                                    onCheckedChange={() => toggleLineSelection(line.id)}
                                  />
                                </TableCell>
                                <TableCell className="border-r">
                                  <Input
                                    type="number"
                                    value={line.receiveQty || ''}
                                    onChange={(e) => updateLineField(line.id, 'receiveQty', Number(e.target.value))}
                                    className="h-7 w-20"
                                    min={0}
                                    max={line.pendingQuantity}
                                  />
                                </TableCell>
                                <TableCell className="border-r text-sm">{line.uom}</TableCell>
                                <TableCell className="border-r text-sm">{line.pendingQuantity}</TableCell>
                                <TableCell className="border-r text-sm font-medium">{line.destinationType}</TableCell>
                                <TableCell className="border-r text-sm font-medium text-primary">{line.itemCode}</TableCell>
                                <TableCell className="border-r text-sm">{line.rev}</TableCell>
                                <TableCell className="border-r text-sm max-w-[200px] truncate">{line.description}</TableCell>
                                <TableCell className="border-r">
                                  <Input
                                    type="number"
                                    value={line.acceptedQty || ''}
                                    onChange={(e) => updateLineField(line.id, 'acceptedQty', Number(e.target.value))}
                                    className="h-7 w-16"
                                    min={0}
                                    max={line.receiveQty}
                                    disabled={line.receiveQty === 0}
                                  />
                                </TableCell>
                                <TableCell className="border-r">
                                  <Input
                                    type="number"
                                    value={line.rejectedQty || ''}
                                    onChange={(e) => updateLineField(line.id, 'rejectedQty', Number(e.target.value))}
                                    className="h-7 w-16"
                                    min={0}
                                    max={line.receiveQty}
                                    disabled={line.receiveQty === 0}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={line.rejectionReason}
                                    onChange={(e) => updateLineField(line.id, 'rejectionReason', e.target.value)}
                                    className="h-7 min-w-[120px]"
                                    placeholder="Reason"
                                    disabled={line.rejectedQty === 0}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Bottom Details Section */}
                      <div className="bg-[#d4dce8] p-3 border-t">
                        <div className="grid grid-cols-4 gap-x-6 gap-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="w-24 text-right text-xs">Operating Unit</Label>
                            <span className="text-xs">Vision Operations</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="w-20 text-right text-xs">Order Type</Label>
                            <span className="text-xs">{supplierDetails?.orderType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="w-20 text-right text-xs">Receipt Date</Label>
                            <Input 
                              type="date" 
                              value={receiptDate}
                              onChange={(e) => setReceiptDate(e.target.value)}
                              className="h-6 text-xs flex-1"
                            />
                          </div>
                          <div />
                          
                          <div className="flex items-center gap-2">
                            <Label className="w-24 text-right text-xs">Supplier</Label>
                            <span className="text-xs">{supplierDetails?.vendor}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="w-20 text-right text-xs">Order</Label>
                            <span className="text-xs">{supplierDetails?.poNumber}</span>
                          </div>
                          <div className="col-span-2" />
                          
                          <div className="flex items-center gap-2">
                            <Label className="w-24 text-right text-xs">Destination</Label>
                            <span className="text-xs">--RIP--</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="w-20 text-right text-xs">Due Date</Label>
                            <span className="text-xs">{supplierDetails?.dueDate}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons at Bottom */}
                      <div className="flex justify-between p-3 bg-[#d4dce8] border-t">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Lot - Serial</Button>
                          <Button variant="outline" size="sm">Cascade</Button>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Express</Button>
                          <Button 
                            onClick={handleCreateReceipt} 
                            size="sm"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Creating..." : "Create Receipt"}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="details" className="flex-1 p-4 m-0">
                      <p className="text-muted-foreground">Detailed item information...</p>
                    </TabsContent>
                    
                    <TabsContent value="currency" className="flex-1 p-4 m-0">
                      <p className="text-muted-foreground">Currency information...</p>
                    </TabsContent>
                    
                    <TabsContent value="orderInfo" className="flex-1 p-4 m-0">
                      <p className="text-muted-foreground">Order information details...</p>
                    </TabsContent>
                    
                    <TabsContent value="shipmentInfo" className="flex-1 p-4 m-0">
                      <p className="text-muted-foreground">Shipment information...</p>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              
              {/* No Results Message */}
              {hasSearched && poLines.length === 0 && !isSearching && (
                <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
                  No pending PO lines found for the specified criteria.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setFindGRNOpen(true)}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              <Search className="h-4 w-4 mr-2" />
              Find GRN
            </Button>
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-background border shadow-lg z-50" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-1 text-xs">
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  {/* Vendor Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Vendor</Label>
                    <Select value={filterVendor} onValueChange={setFilterVendor}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="All Vendors" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="all">All Vendors</SelectItem>
                        {uniqueVendors.map((vendor) => (
                          <SelectItem key={vendor} value={vendor}>
                            {vendor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Receipt Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <Input
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">To</Label>
                        <Input
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => setFilterOpen(false)}
                  >
                    Apply Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filterVendor && filterVendor !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Vendor: {filterVendor}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilterVendor("all")} 
                  />
                </Badge>
              )}
              {filterDateFrom && (
                <Badge variant="secondary" className="gap-1">
                  From: {filterDateFrom}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilterDateFrom("")} 
                  />
                </Badge>
              )}
              {filterDateTo && (
                <Badge variant="secondary" className="gap-1">
                  To: {filterDateTo}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilterDateTo("")} 
                  />
                </Badge>
              )}
              {filterGrnFrom && (
                <Badge variant="secondary" className="gap-1">
                  GRN From: {filterGrnFrom}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilterGrnFrom("")} 
                  />
                </Badge>
              )}
              {filterGrnTo && (
                <Badge variant="secondary" className="gap-1">
                  GRN To: {filterGrnTo}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilterGrnTo("")} 
                  />
                </Badge>
              )}
              {filterPoNumber && (
                <Badge variant="secondary" className="gap-1">
                  PO: {filterPoNumber}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setFilterPoNumber("")} 
                  />
                </Badge>
              )}
            </div>
          )}
        </Card>

        {/* Find GRN Dialog */}
        <FindGRNDialog
          open={findGRNOpen}
          onOpenChange={setFindGRNOpen}
          vendors={uniqueVendors}
          onViewGRN={(grn) => {
            setSelectedGRN(grn);
            setViewOpen(true);
          }}
          onPrintGRN={(grn) => {
            setSelectedGRN(grn);
            setPrintOpen(true);
          }}
        />

        {/* View GRN Dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>GRN Details - {selectedGRN?.grn_number}</DialogTitle>
            </DialogHeader>
            {selectedGRN && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">PO Number</p>
                    <p className="font-medium">{selectedGRN.po_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-medium">{selectedGRN.vendor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receipt Date</p>
                    <p className="font-medium">{new Date(selectedGRN.receipt_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">QC Status</p>
                    <div className="mt-1">{getStatusBadge(selectedGRN.qc_status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="font-medium">{new Date(selectedGRN.created_at).toLocaleString()}</p>
                  </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-medium">
                      ${(
                        selectedGRN?.items?.reduce(
                          (sum: number, item: any) => sum + Number(item?.total_amount || 0),
                          0
                        ) || 0
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="font-semibold mb-3">Items</h3>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">PO Qty</TableHead>
                          <TableHead className="text-right">Received</TableHead>
                          <TableHead className="text-right">Accepted</TableHead>
                          <TableHead className="text-right">Rejected</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Rejection Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                     <TableBody>
  {selectedGRN?.items?.map((item: any) => (
    <TableRow key={item.id}>
      <TableCell className="font-medium">{item.item_code}</TableCell>
      <TableCell>{item.description || '-'}</TableCell>
      <TableCell className="text-right">{Number(item.po_quantity).toFixed(0)}</TableCell>
      <TableCell className="text-right">{Number(item.received_quantity).toFixed(0)}</TableCell>
      <TableCell className="text-right">{Number(item.accepted_quantity).toFixed(0)}</TableCell>
      <TableCell className="text-right">{Number(item.rejected_quantity).toFixed(0)}</TableCell>
      <TableCell className="text-right">{Number(item.balance_quantity || 0).toFixed(0)}</TableCell>
      <TableCell className="text-right">${Number(item.unit_price).toFixed(2)}</TableCell>
      <TableCell className="text-right">${Number(item.total_amount || 0).toFixed(2)}</TableCell>
      <TableCell>{item.rejection_reason || '-'}</TableCell>
    </TableRow>
  ))}
</TableBody>
                    </Table>
                  </div>
                </div>

                {/* Notes */}
                {selectedGRN.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                      {selectedGRN.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Print Receipt Dialog */}
        <GRNPrintReceipt
          open={printOpen}
          onOpenChange={setPrintOpen}
          grn={selectedGRN}
        />

        {/* GRN List */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Receipt Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading GRNs...
                  </TableCell>
                </TableRow>
              ) : filteredGRNs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {existingGRNs.length === 0 
                      ? "No GRNs found. Create your first GRN to get started."
                      : "No GRNs match the current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGRNs.map((grn) => {
                  const totalAmount = grn.items?.reduce(
  (sum: number, item: any) => sum + Number(item.total_amount || 0),
  0
) || 0;
                  
                  return (
                    <TableRow key={grn.id}>
                      <TableCell className="font-medium">{grn.grn_number}</TableCell>
                      <TableCell>{grn.po_number}</TableCell>
                      <TableCell>{grn.vendor}</TableCell>
                      <TableCell>{new Date(grn.receipt_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">${totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewGRN(grn)} title="View GRN">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handlePrintGRN(grn)} title="Print Receipt">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {filteredGRNs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing</span>
                <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-16 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>of {filteredGRNs.length} entries</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 px-2"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-8 px-2"
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default GRN;
