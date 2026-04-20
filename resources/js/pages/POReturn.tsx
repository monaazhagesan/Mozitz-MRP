import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Download, Eye, X, Undo2, AlertTriangle, Printer } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface DebitLineItem {
  id: string;
  grnItemId: string;
  num: number;
  itemCode: string;
  description: string;
  grnQuantity: number;
  rejectedQuantity: number;
  alreadyDebitedQty: number;
  debitableQty: number;
  debitQuantity: number;
  poRate: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  rejectionReason: string;
}

interface GRNOption {
  grn_number: string;
  po_number: string;
  vendor: string;
  receipt_date: string;
  id: string;
}

const POReturn = () => {
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [poReturns, setPOReturns] = useState<any[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [selectedReturnItems, setSelectedReturnItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lines");
  const [grnOptions, setGrnOptions] = useState<GRNOption[]>([]);
  const [lineItems, setLineItems] = useState<DebitLineItem[]>([]);
  const [grnFullyDebited, setGrnFullyDebited] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    returnNumber: "",
    grnNumber: "",
    poNumber: "",
    vendor: "",
    totalAmount: 0,           // <-- add this
    returnDate: new Date().toISOString().split('T')[0],
    status: "Draft",
    notes: "",
    reason: "",
  });

  useEffect(() => {
    fetchPOReturns();
    fetchGRNOptions();
    generateReturnNumber();
  }, []);

  const generateReturnNumber = () => {
    setFormData(prev => ({
      ...prev,
      returnNumber: `RTN-${Date.now().toString().slice(-6)}`,
    }));
  };

 const fetchPOReturns = async () => {
  try {
    setLoading(true);

    // Fetch actual PO returns from your API
    const response = await axios.get('/api/po-returns'); // replace with real endpoint
    const data = response.data;

    // Ensure it's always an array
    setPOReturns(Array.isArray(data) ? data : []);
  } catch (error: any) {
    toast({
      title: "Error Fetching Debit Notes",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
    setPOReturns([]); // fallback to empty array
  } finally {
    setLoading(false);
  }
};

 const fetchGRNOptions = async () => {
  try {
    console.log('Fetching GRN options...');
    const response = await axios.get('/api/grn'); // replace with actual endpoint
    console.log('Raw response:', response);

    let data = response.data;
    console.log('Data before sorting:', data);

    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.warn('GRN data is not an array:', data);
      data = [];
    }

    // Optional: sort by created_at descending
    data = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log('Data after sorting:', data);

    setGrnOptions(data);
  } catch (error: any) {
    console.error('Error fetching GRN options:', error.response?.data?.message || error.message);
  }
};

  const checkGRNDebitStatus = async (grnNumber: string): Promise<{ debitedItems: Record<string, number> }> => {
  try {
    const response = await axios.get('/api/po_returns', {
      params: {
        grn_number: grnNumber,
        exclude_status: 'Cancelled',
      },
    });

    // Adjust based on actual API response structure
    const existingDebits = response.data?.po_returns || [];

    const debitedItems: Record<string, number> = {};
    existingDebits.forEach((ret: any) => {
      (ret.po_return_items || []).forEach((item: any) => {
        debitedItems[item.grn_item_id] = (debitedItems[item.grn_item_id] || 0) + Number(item.return_quantity);
      });
    });

    return { debitedItems };
  } catch (error: any) {
    console.error('Error checking GRN debit status:', error.response?.data?.message || error.message);
    return { debitedItems: {} };
  }
};


const handleGRNSelect = async (grnNumber: string) => {
  if (!grnNumber) return;
  console.log("Selected GRN Number:", grnNumber);

  try {
    // 1️⃣ Fetch GRN
    const response = await axios.get("/api/grn", { params: { grn_number: grnNumber } });
    const grnArray = response.data;
    console.log("GRN DATA:", grnArray);

    // 2️⃣ Find selected GRN
    const grnData = grnArray.find((g: any) => g.grn_number === grnNumber);
    if (!grnData) {
      toast({
        title: "GRN not found",
        description: "Selected GRN not found in response",
        variant: "destructive",
      });
      return;
    }

    // 3️⃣ Extract values
    const vendor = grnData.vendor || "";
    const poNumber = grnData.po_number || "";

    const grnTotal = (grnData.items || []).reduce(
      (sum: number, item: any) => sum + Number(item.total_amount || 0),
      0
    );

    setFormData((prev) => ({
      ...prev,
      grnNumber,
      poNumber,
      vendor,
      totalAmount: grnTotal,
    }));

    // 4️⃣ Fetch PO data
    const poResponse = await axios.get("/api/po", { params: { po_number: poNumber } });
    const poData = poResponse.data;
    console.log("PO DATA:", poData);

    // 5️⃣ Process GRN items
    const grnItems = grnData.items || [];
    console.log("GRN Items:", grnItems);

    const { debitedItems } = await checkGRNDebitStatus(grnNumber);
    console.log("Already debited items:", debitedItems);

    // 6️⃣ Map GRN items to debit lines
    const debitLines: DebitLineItem[] = grnItems
      .filter((item: any) => Number(item.rejected_quantity) > 0)
      .map((item: any, index: number) => {
        const poItem = poData.purchase_order_items?.find(
          (poi: any) => poi.item_code === item.item_code
        );
        const poRate = Number(poItem?.unit_price || item.unit_price || 0);
        const rejectedQty = Number(item.rejected_quantity) || 0;
        const alreadyDebitedQty = debitedItems[item.id] || 0;
        const debitableQty = Math.max(0, rejectedQty - alreadyDebitedQty);

        const taxPercent = 18;
        const lineAmount = debitableQty * poRate;
        const taxAmount = lineAmount * (taxPercent / 100);
        const lineTotal = lineAmount + taxAmount;

        return {
          id: crypto.randomUUID(),
          grnItemId: item.id,
          num: index + 1,
          itemCode: item.item_code,
          description: item.description,
          grnQuantity: Number(item.received_quantity) || 0,
          rejectedQuantity: rejectedQty,
          alreadyDebitedQty,
          debitableQty,
          debitQuantity: debitableQty,
          poRate,
          taxPercent,
          taxAmount,
          lineTotal,
          rejectionReason: item.rejection_reason || "",
        };
      });

    console.log("Debit Lines to set:", debitLines);

    setLineItems(debitLines);

    if (debitLines.length === 0) {
      toast({
        title: "No Rejected Items",
        description: "This GRN has no rejected items to return",
      });
    }
  } catch (error: any) {
    console.error("Error loading GRN:", error);
    toast({
      title: "Error Loading GRN",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  }
};

  const updateDebitQuantity = (id: string, newQty: number) => {
    setLineItems(items => items.map(item => {
      if (item.id !== id) return item;

      // Validation: Debit qty cannot exceed debitable qty (which is min of rejected qty and remaining)
      const maxAllowed = Math.min(item.rejectedQuantity, item.debitableQty);
      const validQty = Math.min(Math.max(0, newQty), maxAllowed);
      
      if (newQty > item.debitableQty) {
        toast({
          title: "Validation Error",
          description: `Debit quantity cannot exceed remaining debitable quantity (${item.debitableQty})`,
          variant: "destructive",
        });
      }

      if (newQty > item.rejectedQuantity) {
        toast({
          title: "Validation Error",
          description: `Debit quantity cannot exceed rejected quantity (${item.rejectedQuantity})`,
          variant: "destructive",
        });
      }

      // Rate and Tax are read-only from PO, only recalculate amounts
      const lineAmount = validQty * item.poRate;
      const taxAmount = lineAmount * (item.taxPercent / 100);
      const lineTotal = lineAmount + taxAmount;

      return {
        ...item,
        debitQuantity: validQty,
        taxAmount: taxAmount,
        lineTotal: lineTotal,
      };
    }));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.debitQuantity * item.poRate), 0);
    const totalTax = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const grandTotal = subtotal + totalTax;
    return { subtotal, totalTax, grandTotal };
  };


const handleSubmit = async () => {
  // Validation: Check if GRN is fully debited
  if (grnFullyDebited) {
    toast({
      title: "Validation Error",
      description: "Debit note already created for this GRN. All rejected quantities have been fully debited.",
      variant: "destructive",
    });
    return;
  }

  // Validation: Check if any items to debit
  const itemsToDebit = lineItems.filter(item => item.debitQuantity > 0);
  if (itemsToDebit.length === 0) {
    toast({
      title: "Validation Error",
      description: "Please enter debit quantities for at least one item",
      variant: "destructive",
    });
    return;
  }

  if (!formData.grnNumber) {
    toast({
      title: "Validation Error",
      description: "Please select a GRN Receipt Number",
      variant: "destructive",
    });
    return;
  }

  // Validation: Check for items exceeding debitable quantity
  const invalidItems = lineItems.filter(item => item.debitQuantity > item.debitableQty);
  if (invalidItems.length > 0) {
    toast({
      title: "Validation Error",
      description: "Debit quantity cannot exceed remaining debitable quantity",
      variant: "destructive",
    });
    return;
  }

  // Validation: Check for items exceeding rejected quantity
  const exceedsRejected = lineItems.filter(item => item.debitQuantity > item.rejectedQuantity);
  if (exceedsRejected.length > 0) {
    toast({
      title: "Validation Error",
      description: "Debit quantity cannot exceed rejected quantity",
      variant: "destructive",
    });
    return;
  }

  // Validation: Debit Reason is mandatory
  if (!formData.reason.trim()) {
    toast({
      title: "Validation Error",
      description: "Debit Reason is mandatory. Please enter a reason for the debit note.",
      variant: "destructive",
    });
    return;
  }

  const totals = calculateTotals();

  try {
    // Create PO Return record
    const returnResponse = await axios.post('/api/po-returns', {
      return_number: formData.returnNumber,
      grn_number: formData.grnNumber,
      po_number: formData.poNumber,
      vendor: formData.vendor,
      return_date: formData.returnDate,
      status: 'Submitted',
      reason: formData.reason || null,
      notes: formData.notes || null,
      subtotal: totals.subtotal,
      tax: totals.totalTax,
      total: totals.grandTotal,
    });

    const returnData = returnResponse.data;

    // Create debit note line items
    const debitItems = itemsToDebit.map(item => ({
      return_id: returnData.id,
      grn_item_id: item.grnItemId,
      item_code: item.itemCode,
      description: item.description,
      return_quantity: item.debitQuantity,
      max_returnable_quantity: item.debitableQty,
      unit_price: item.poRate,
      tax_percent: item.taxPercent,
      tax_amount: item.taxAmount,
      total_amount: item.lineTotal,
    }));

    await axios.post('/po-return-items', debitItems);

    // Update inventory and log transactions
    for (const item of itemsToDebit) {
  // Fetch existing stock
  const stockRes = await axios.get(`/api/inventory-stock`, { params: { item_code: item.itemCode } });
  const existingStock = stockRes.data.items?.[0]; // make sure to access the items array

  if (existingStock?.id) {
    // Update stock
    await axios.put(`/api/inventory-stock/${existingStock.id}`, {
      quantity_on_hand: Math.max(0, Number(existingStock.quantityOnHand) - item.debitQuantity),
      last_transaction_date: new Date().toISOString(),
      item_name: existingStock.itemName,          // REQUIRED for validation
      location: existingStock.location || '-',    // REQUIRED for validation
    });
  }

      // Log stock transaction
      await axios.post('/api/stock-transactions', {
        item_code: item.itemCode,
        transaction_type: 'DEBIT_NOTE',
        reference_type: 'Debit Note',
        reference_number: formData.returnNumber,
        quantity: -item.debitQuantity,
        unit_cost: item.poRate,
        notes: `Debit Note ${formData.returnNumber} from GRN ${formData.grnNumber}`,
      });
    }

    toast({
      title: "Debit Note Created",
      description: `${formData.returnNumber} has been created. Total: ₹${totals.grandTotal.toFixed(2)}`,
    });

    resetForm();
    setOpen(false);
    fetchPOReturns();
  } catch (error: any) {
    toast({
      title: "Error Creating Debit Note",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  }
};



  const resetForm = () => {
    setFormData({
      returnNumber: `RTN-${Date.now().toString().slice(-6)}`,
      grnNumber: "",
      poNumber: "",
      vendor: "",
       totalAmount: 0, 
      returnDate: new Date().toISOString().split('T')[0],
      status: "Draft",
      notes: "",
      reason: "",
    });
    setLineItems([]);
    setActiveTab("lines");
    setGrnFullyDebited(false);
  };

 const handleViewReturn = async (poReturn: any) => {
  setSelectedReturn(poReturn);

  try {
    // Fetch return items
    const response = await axios.get('/po-return-items', {
      params: { return_id: poReturn.id },
    });

    setSelectedReturnItems(response.data || []);
  } catch (error: any) {
    console.error('Error fetching return items:', error.response?.data?.message || error.message);
    setSelectedReturnItems([]);
  }

  setViewOpen(true);
};

   const handlePrintDebitNote = (debitNote: any, items: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const returnDate = new Date(debitNote.return_date).toLocaleDateString('en-IN');
    const subtotal = Number(debitNote.subtotal || 0);
    const tax = Number(debitNote.tax || 0);
    const total = Number(debitNote.total || 0);

    const itemsRows = items.map((item: any, idx: number) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${idx + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;font-weight:500">${item.item_code}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd">${item.description}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${item.return_quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">₹${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${Number(item.tax_percent || 0)}%</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">₹${Number(item.tax_amount || 0).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;font-weight:600">₹${Number(item.total_amount).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Debit Note - ${debitNote.return_number}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:12px;padding:40px;color:#333}
  .header{display:flex;justify-content:space-between;margin-bottom:30px;border-bottom:3px solid #1a365d;padding-bottom:20px}
  .company h1{color:#1a365d;font-size:22px;margin-bottom:4px}
  .doc-title{text-align:right}
  .doc-title h2{font-size:26px;color:#c53030;margin-bottom:4px}
  .doc-title p{font-size:13px;color:#666}
  .info{display:flex;justify-content:space-between;margin-bottom:25px}
  .info-box{width:48%}
  .info-box h3{background:#1a365d;color:#fff;padding:8px 12px;font-size:12px;margin-bottom:8px}
  .info-box p{padding:3px 12px;line-height:1.6}
  .info-box .lbl{font-weight:700;display:inline-block;width:110px}
  table.items{width:100%;border-collapse:collapse;margin-bottom:25px}
  table.items th{background:#1a365d;color:#fff;padding:9px 8px;text-align:left;font-size:11px}
  table.items td{padding:8px;border-bottom:1px solid #ddd}
  table.items tr:nth-child(even){background:#f7fafc}
  .totals{width:280px;margin-left:auto}
  .totals td{padding:7px 8px}
  .totals .grand{font-weight:700;background:#e2e8f0;font-size:13px}
  .footer{margin-top:40px;padding-top:15px;border-top:1px solid #ddd}
  .reason-box{margin-bottom:20px;padding:12px;background:#fff5f5;border-left:4px solid #c53030}
  .reason-box h4{color:#c53030;margin-bottom:5px}
  @media print{body{padding:20px}}
</style></head>
<body>
  <div class="header">
    <div class="company">
      <h1>Your Company Name</h1>
      <p>123 Business Street</p><p>City, State 12345</p><p>Phone: (555) 123-4567</p>
    </div>
    <div class="doc-title">
      <h2>DEBIT NOTE</h2>
      <p><strong>${debitNote.return_number}</strong></p>
      <p>Date: ${returnDate}</p>
      <p>Status: ${debitNote.status}</p>
    </div>
  </div>

  <div class="info">
    <div class="info-box">
      <h3>VENDOR INFORMATION</h3>
      <p><span class="lbl">Vendor:</span> ${debitNote.vendor}</p>
    </div>
    <div class="info-box">
      <h3>REFERENCE DETAILS</h3>
      <p><span class="lbl">GRN Number:</span> ${debitNote.grn_number}</p>
      <p><span class="lbl">PO Number:</span> ${debitNote.po_number}</p>
      <p><span class="lbl">Debit Date:</span> ${returnDate}</p>
    </div>
  </div>

  ${debitNote.reason ? `<div class="reason-box"><h4>Debit Reason</h4><p>${debitNote.reason}</p></div>` : ''}

  <table class="items">
    <thead><tr>
      <th style="width:5%">#</th>
      <th style="width:14%">Item Code</th>
      <th style="width:28%">Description</th>
      <th style="width:10%;text-align:right">Qty</th>
      <th style="width:13%;text-align:right">Unit Price</th>
      <th style="width:8%;text-align:right">Tax %</th>
      <th style="width:10%;text-align:right">Tax Amt</th>
      <th style="width:12%;text-align:right">Total</th>
    </tr></thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div class="totals"><table>
    <tr><td>Subtotal:</td><td style="text-align:right">₹${subtotal.toFixed(2)}</td></tr>
    <tr><td>Tax:</td><td style="text-align:right">₹${tax.toFixed(2)}</td></tr>
    <tr class="grand"><td>Grand Total:</td><td style="text-align:right">₹${total.toFixed(2)}</td></tr>
  </table></div>

  ${debitNote.notes ? `<div style="margin-top:20px;padding:12px;background:#f7fafc;border-left:4px solid #1a365d"><h4 style="margin-bottom:6px">Notes</h4><p>${debitNote.notes}</p></div>` : ''}

  <div class="footer">
    <p><strong>Authorized Signature:</strong> _______________________</p>
    <p style="margin-top:20px;color:#666;font-size:10px">This is a computer-generated document. Generated on ${new Date().toLocaleString()}</p>
  </div>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

 const handlePrintFromList = async (ret: any) => {
  try {
    const response = await axios.get('/api/po-return-items', {
      params: { return_id: ret.id },
    });

    const raw = response.data;

    const items = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
      ? raw.items
      : [];

    handlePrintDebitNote(ret, items);
  } catch (error: any) {
    console.error(
      'Error fetching return items:',
      error.response?.data?.message || error.message
    );
    handlePrintDebitNote(ret, []);
  }
};

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      "Draft": "secondary",
      "Pending": "outline",
      "Approved": "default",
      "Completed": "default",
      "Rejected": "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Debit Notes</h1>
            <p className="text-muted-foreground mt-2">
              Manage debit notes for rejected items from purchase orders
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Debit Note
            </Button>
          </div>
        </div>

        {/* Create Return Dialog - Oracle ERP Style */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
            {/* Dark Header */}
            <div className="bg-[#1a365d] text-white px-4 py-2 flex items-center justify-between">
              <DialogTitle className="text-sm font-medium text-white">
                Debit Note - [New]
              </DialogTitle>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(95vh-120px)]">
              {/* Header Fields - Oracle ERP Grid Style */}
              <div className="grid grid-cols-12 gap-x-4 gap-y-3 text-sm">
                {/* Row 1 */}
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-28">Return Number</Label>
                  <Input 
                    value={formData.returnNumber} 
                    readOnly 
                    className="h-8 text-sm bg-gray-100 border-gray-400"
                  />
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-20">Return Date</Label>
                  <Input 
                    type="date"
                    value={formData.returnDate} 
                    onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
                    className="h-8 text-sm border-gray-400"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-12">Status</Label>
                  <Input 
                    value={formData.status} 
                    readOnly 
                    className="h-8 text-sm bg-gray-100 border-gray-400"
                  />
                </div>
                <div className="col-span-4" />

                {/* Row 2 - GRN Selection */}
                <div className="col-span-4 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-28">GRN Receipt No.</Label>
                  <Select 
                    value={formData.grnNumber} 
                    onValueChange={handleGRNSelect}
                  >
                    <SelectTrigger className="h-8 text-sm bg-[#ffffc8] border-gray-400">
                      <SelectValue placeholder="Select GRN" />
                    </SelectTrigger>
                    <SelectContent>
                      {grnOptions.map((grn) => (
                        <SelectItem key={grn.id} value={grn.grn_number}>
                          {grn.grn_number} - {grn.vendor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-16">PO Number</Label>
                  <Input 
                    value={formData.poNumber} 
                    readOnly 
                    className="h-8 text-sm bg-gray-100 border-gray-400"
                  />
                </div>
                <div className="col-span-5" />

                {/* Row 3 */}
                <div className="col-span-4 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-28">Vendor</Label>
                  <Input 
                    value={formData.vendor} 
                    readOnly 
                    className="h-8 text-sm bg-gray-100 border-gray-400"
                  />
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-12">Total</Label>
                  <Input 
                   value={`₹ ${Number(formData.totalAmount || 0).toFixed(2)}`}
                    readOnly 
                    className="h-8 text-sm bg-gray-100 border-gray-400 font-semibold"
                  />
                </div>
                <div className="col-span-5" />

                {/* Reason Row */}
                <div className="col-span-12 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-28">
                    Debit Reason <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    value={formData.reason} 
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="h-8 text-sm border-gray-400 flex-1"
                    placeholder="Enter reason for debit note (required)"
                    required
                  />
                </div>
              </div>

              {/* Tabs Section */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-9 bg-gradient-to-b from-[#e8e8e8] to-[#d0d0d0] border border-gray-400 rounded-none p-0 w-auto">
                  <TabsTrigger 
                    value="lines" 
                    className="h-8 text-sm px-5 rounded-none data-[state=active]:bg-[#6699cc] data-[state=active]:text-white"
                  >
                    Lines
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notes" 
                    className="h-8 text-sm px-5 rounded-none data-[state=active]:bg-[#6699cc] data-[state=active]:text-white"
                  >
                    Notes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="lines" className="mt-0 border border-gray-400 border-t-0">
                  {/* Lines Table */}
                  <div className="overflow-auto min-h-[200px] max-h-[300px]">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-gradient-to-b from-[#e8e8e8] to-[#d0d0d0] border-b border-gray-400">
                          <TableHead className="h-9 text-sm font-medium text-foreground w-14 border-r border-gray-300">Num</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-28 border-r border-gray-300">Item Code</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground border-r border-gray-300">Description</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-20 border-r border-gray-300 bg-red-100">Rejected Qty</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-20 border-r border-gray-300 bg-blue-100">Already Debited</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-20 border-r border-gray-300 bg-green-100">Debitable Qty</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300 bg-amber-100">Debit Qty</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300 bg-gray-200" title="Read-only from PO">PO Rate (₹)</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-20 border-r border-gray-300 bg-gray-200" title="Read-only from PO">Tax %</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300">Tax Amount</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-28 border-r border-gray-300">Line Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                              {formData.grnNumber ? "No rejected items in this GRN" : "Select a GRN to load return items"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          lineItems.map((item) => (
                            <TableRow key={item.id} className={`border-b border-gray-300 ${item.debitableQty === 0 ? 'opacity-50 bg-gray-100' : ''}`}>
                              <TableCell className="py-1 border-r border-gray-200">{item.num}</TableCell>
                              <TableCell className="py-1 border-r border-gray-200 font-medium">{item.itemCode}</TableCell>
                              <TableCell className="py-1 border-r border-gray-200">{item.description}</TableCell>
                              <TableCell className="py-1 border-r border-gray-200 text-center bg-red-50 font-medium text-red-700">
                                {item.rejectedQuantity}
                              </TableCell>
                              <TableCell className="py-1 border-r border-gray-200 text-center bg-blue-50 text-blue-700">
                                {item.alreadyDebitedQty}
                              </TableCell>
                              <TableCell className="py-1 border-r border-gray-200 text-center bg-green-50 font-medium text-green-700">
                                {item.debitableQty}
                              </TableCell>
                              <TableCell className="py-1 border-r border-gray-200 bg-amber-50">
                                <Input
                                  type="number"
                                  value={item.debitQuantity}
                                  onChange={(e) => updateDebitQuantity(item.id, Number(e.target.value))}
                                  className="h-7 text-sm w-full border-gray-400 text-center"
                                  min={0}
                                  max={item.debitableQty}
                                  disabled={item.debitableQty === 0}
                                />
                              </TableCell>
                              <TableCell className="py-1 border-r border-gray-200 text-right bg-gray-100 font-medium">
                                ₹{item.poRate.toFixed(2)}
                              </TableCell>
                              <TableCell className="py-1 border-r border-gray-200 text-center bg-gray-100 font-medium" title="Read-only from PO">
                                {item.taxPercent}%
                              </TableCell>
                              <TableCell className="py-1 border-r border-gray-200 text-right">
                                ₹{item.taxAmount.toFixed(2)}
                              </TableCell>
                              <TableCell className="py-1 border-r border-gray-200 text-right font-semibold">
                                ₹{item.lineTotal.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totals Section */}
                  {lineItems.length > 0 && (
                    <div className="p-3 bg-gray-50 border-t border-gray-300">
                      <div className="flex justify-end gap-8 text-sm">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">Total Tax:</span>
                          <span className="font-medium">₹{totals.totalTax.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground font-semibold">Grand Total:</span>
                          <span className="font-bold text-primary">₹{totals.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="mt-0 border border-gray-400 border-t-0 p-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">Notes</Label>
                      <Textarea 
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Enter any additional notes..."
                        className="mt-1"
                        rows={4}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-300 p-3 flex justify-between bg-gray-50">
              <Button variant="outline" onClick={() => setOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Clear
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={lineItems.length === 0}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Create Return
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Return Dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Return Details - {selectedReturn?.return_number}</DialogTitle>
            </DialogHeader>
            {selectedReturn && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Return Number</Label>
                    <p className="font-medium">{selectedReturn.return_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">GRN Number</Label>
                    <p className="font-medium">{selectedReturn.grn_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">PO Number</Label>
                    <p className="font-medium">{selectedReturn.po_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vendor</Label>
                    <p className="font-medium">{selectedReturn.vendor}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Return Date</Label>
                    <p className="font-medium">{new Date(selectedReturn.return_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p>{getStatusBadge(selectedReturn.status)}</p>
                  </div>
                  {selectedReturn.reason && (
                    <div>
                      <Label className="text-muted-foreground">Reason</Label>
                      <p className="font-medium">{selectedReturn.reason}</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-muted-foreground mb-2 block">Return Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Return Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
{Array.isArray(selectedReturnItems) &&
  selectedReturnItems.map((item: any) => (
                            <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_code}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.return_quantity}</TableCell>
                          <TableCell className="text-right">₹{Number(item.unit_price).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{Number(item.tax_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">₹{Number(item.total_amount).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>₹{Number(selectedReturn.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>₹{Number(selectedReturn.tax || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>₹{Number(selectedReturn.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedReturn.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm">{selectedReturn.notes}</p>
                  </div>
                )}
                   <div className="flex justify-end pt-2">
                  <Button onClick={() => handlePrintDebitNote(selectedReturn, selectedReturnItems)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Debit Note
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Debit Notes List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debit Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search debit notes..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Debit Note No.</TableHead>
                    <TableHead>GRN Number</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
  {loading ? (
    <TableRow>
      <TableCell colSpan={8} className="text-center py-8">
        Loading...
      </TableCell>
    </TableRow>
  ) : poReturns.length === 0 ? (
    <TableRow>
      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
        No debit notes found
      </TableCell>
    </TableRow>
  ) : (
    poReturns.map((ret: any) => (
      <TableRow key={ret.id}>
        <TableCell className="font-medium">{ret.return_number || '-'}</TableCell>
        <TableCell>{ret.grn_number || '-'}</TableCell>
        <TableCell>{ret.po_number || '-'}</TableCell>
        <TableCell>{ret.vendor || '-'}</TableCell>
        <TableCell>
          {ret.return_date ? new Date(ret.return_date).toLocaleDateString() : '-'}
        </TableCell>
        <TableCell className="text-right font-medium">
          ₹{Number(ret.total ?? 0).toFixed(2)}
        </TableCell>
        <TableCell>{getStatusBadge(ret.status)}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewReturn(ret)}
              title="View"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePrintFromList(ret)}
              title="Print Debit Note"
            >
              <Printer className="h-4 w-4" />
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
      </div>
    </Layout>
  );
};

export default POReturn;
