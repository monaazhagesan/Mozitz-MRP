import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Download, Edit, Trash2, Eye, X, MoreHorizontal, Printer } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import ItemChooserDialog from "@/components/purchase/ItemChooserDialog";

interface LineItem {
  id: string;
  num: number;
  itemCode: string;
  description: string;
  hsnSac: string;
  hsnCode?: string; // --- IGNORE ---
  gstRate: number;
  quantity: number;
  price: number;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  totalCost: number;
  uom?: string;
  promisedDate?: string;
  needBy?: string;
  originalPromise?: string;
  cess?: number;
   taxType?: string;
  placeOfSupply?: string;
  gstType?: "IGST" | "CGST_SGST";
}

interface TaxConfig {
  taxType: string;
  placeOfSupply: string;
  gstType: "IGST" | "CGST_SGST";
  addCess: boolean;
  cessPercent: number;
}


const PurchaseOrders = () => {
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [taxConfigOpen, setTaxConfigOpen] = useState(false);
  const [shipmentsOpen, setShipmentsOpen] = useState(false);
  const [itemChooserOpen, setItemChooserOpen] = useState(false);
  const [currentLineItemId, setCurrentLineItemId] = useState<string | null>(null);
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lines");
  const [vendors, setVendors] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();
  const [shipmentsData, setShipmentsData] = useState<any[]>([]);
  const [currentPO, setCurrentPO] = useState<any | null>(null);
  // Track which PO is being edited
const [editingPO, setEditingPO] = useState<any>(null);

  // Tax configuration state
  const [taxConfig, setTaxConfig] = useState<TaxConfig>({
    taxType: "None",
    placeOfSupply: "",
    gstType: "IGST",
    addCess: false,
    cessPercent: 0,
  });

  // Global currencies list
  const currencies = [
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
    { code: "SEK", name: "Swedish Krona", symbol: "kr" },
    { code: "KRW", name: "South Korean Won", symbol: "₩" },
    { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
    { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
    { code: "MXN", name: "Mexican Peso", symbol: "$" },
    { code: "ZAR", name: "South African Rand", symbol: "R" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$" },
    { code: "RUB", name: "Russian Ruble", symbol: "₽" },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
    { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
    { code: "THB", name: "Thai Baht", symbol: "฿" },
    { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
    { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
    { code: "PHP", name: "Philippine Peso", symbol: "₱" },
    { code: "PLN", name: "Polish Zloty", symbol: "zł" },
    { code: "TRY", name: "Turkish Lira", symbol: "₺" },
    { code: "DKK", name: "Danish Krone", symbol: "kr" },
    { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
    { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
    { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
    { code: "CLP", name: "Chilean Peso", symbol: "$" },
    { code: "COP", name: "Colombian Peso", symbol: "$" },
    { code: "ARS", name: "Argentine Peso", symbol: "$" },
    { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
    { code: "EGP", name: "Egyptian Pound", symbol: "£" },
    { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
    { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
    { code: "QAR", name: "Qatari Riyal", symbol: "﷼" },
    { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
    { code: "BHD", name: "Bahraini Dinar", symbol: "BD" },
    { code: "OMR", name: "Omani Rial", symbol: "﷼" },
  ];

  // Form state
  const [formData, setFormData] = useState({
    operatingUnit: "Vision Operations",
    poNumber: "",
    revision: "0",
    type: "Standard Purchase Order",
    supplier: "",
    site: "",
    shipTo: "L1 - LeaseQA",
    billTo: "L1 - LeaseQA",
    buyer: "",
      status: "Awaiting Approval",
    description: "",
    contact: "",
    total: "0.00",
    createdDate: new Date().toLocaleString(),
    expectedDate: "",
    paymentTerms: "",
    notes: "",
    discountType: "flat" as "flat" | "percentage",
    discountValue: 0,
    currency: "INR",
  });

  useEffect(() => {
    fetchPurchaseOrders();
    fetchVendors();
    // Generate PO number
    setFormData(prev => ({
      ...prev,
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
    }));
    
    const urlParams = new URLSearchParams(window.location.search);
    const quoteId = urlParams.get('quote');
    if (quoteId) {
      loadQuotationAndCreatePO(quoteId);
    }
  }, []);

 const fetchVendors = async () => {
  try {
    console.log("Fetching vendors...");

    const response = await axios.get("/api/vendors", {
      params: { status: "Active" }
    });

    console.log("Full API Response:", response);
    console.log("Response Data:", response.data);

    const data = response.data;

    // Ensure vendors is always an array
    if (Array.isArray(data)) {
      console.log("Vendors Array:", data);
      setVendors(data);
    } else if (Array.isArray(data?.vendors)) {
      console.log("Vendors from data.vendors:", data.vendors);
      setVendors(data.vendors);
    } else {
      console.warn("Unexpected vendor response format:", data);
      setVendors([]);
    }

  } catch (error: any) {
    console.error(
      "Error fetching vendors:",
      error?.response?.data || error.message
    );
  }
};


const updateShipment = (index: number, field: string, value: any) => {
  const updated = [...shipmentsData];
  updated[index][field] = value;
  setShipmentsData(updated);
};

  const loadQuotationAndCreatePO = async (quoteId: string) => {
  try {
    // Fetch quotation using Axios
    const response = await axios.get("/api/vendor_quotations", {
      params: { id: quoteId },
    });

    const quotation = response.data;

    if (!quotation) {
      throw new Error("Quotation not found");
    }

    // Populate form data
    setFormData(prev => ({
      ...prev,
      supplier: quotation.vendor_name,
      paymentTerms: quotation.terms || "Net 30",
    }));

    // Calculate line totals and taxes
    const lineTotal = quotation.quantity * quotation.quoted_price;
    const lineTax = lineTotal * 0.1; // 10% tax

    const newItem: LineItem = {
      id: Date.now().toString(),
      num: 1,
      itemCode: quotation.item_code,
      description: quotation.item_name,
      hsnSac: quotation.hsn || "",
      hsnCode: quotation.hsn_code || "", // --- IGNORE ---
      gstRate: 18,
      quantity: quotation.quantity,
      price: quotation.quoted_price,
      amount: lineTotal,
      cgst: 0,
      sgst: 0,
      igst: 0,
      tax: lineTax,
      totalCost: lineTotal + lineTax,
    };

    setLineItems([newItem]);
    setOpen(true);

    toast({
      title: "Quotation Loaded",
      description: "Complete PO details to create purchase order.",
    });
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  }
};


 const fetchPurchaseOrders = async () => {
  setLoading(true);
  try {
    const res = await axios.get("/api/purchase-orders");

    const orders = Array.isArray(res.data) ? res.data : res.data?.data || [];

    setPurchaseOrders(orders);
  } catch (err) {
    if (err.response) {
      console.error("Server Error:", err.response.data);
    } else {
      console.error("Failed to fetch POs:", err);
    }
    setPurchaseOrders([]);
  } finally {
    setLoading(false);
  }
};

const viewPurchaseOrder = async (poNumber: string) => {
  try {
    console.log("Fetching PO for number:", poNumber);

    // Fetch the PO by number
    const response = await axios.get("/api/purchase-orders", {
      params: { po_number: poNumber },
    });

    console.log("PO response:", response.data);

    const data = response.data;
    const po = Array.isArray(data) ? data[0] : data;

    if (!po) {
      toast({
        title: "PO Not Found",
        description: `Purchase order ${poNumber} could not be found.`,
        variant: "destructive",
      });
      return;
    }

    console.log("PO found:", po);

    // ✅ Fetch the line items from the separate table
    const linesResponse = await axios.get("/api/purchase-order-lines", {
      params: { po_id: po.id },
    });

    console.log("Line items response:", linesResponse.data);

    // Some APIs wrap the items under "items", check first
    const lineItems = linesResponse.data.items || [];

    console.log("Line items array:", lineItems);

    // Format PO with lines and dates
    const formattedPO = {
      ...po,
      po_date: po.po_date ? new Date(po.po_date).toISOString().split("T")[0] : "-",
      expected_date: po.expected_date
        ? new Date(po.expected_date).toISOString().split("T")[0]
        : "-",
      purchase_order_items: lineItems,
      subtotal: po.subtotal || 0,
      tax: po.tax || 0,
      total: po.total || 0,
    };

    console.log("Formatted PO:", formattedPO);

    setSelectedPO(formattedPO);
    setViewOpen(true);
  } catch (error: any) {
    console.error("Error loading PO:", error);
    toast({
      title: "Error Loading PO",
      description: error.response?.data?.message || error.message || "Unknown error",
      variant: "destructive",
    });
  }
};

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      "Awaiting Approval": "outline",
      "Approved": "default",
      "Cancel": "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

 const printPDF = async (poNumber: string) => {
  try {
    toast({
      title: "Generating PDF",
      description: "Please wait while we generate your PDF...",
    });

    // Call your API endpoint to generate PDF
    const response = await axios.post("/api/generate-po-pdf", { poNumber });
    const data = response.data;

    // Open PDF in a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(data.html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }

    toast({
      title: "PDF Generated",
      description: "Your PDF is ready for printing.",
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    toast({
      title: "Error Generating PDF",
      description: error.response?.data?.message || error.message || "Failed to generate PDF",
      variant: "destructive",
    });
  }
};

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      num: lineItems.length + 1,
      itemCode: "",
      description: "",
      hsnSac: "",
      hsnCode: "",
      gstRate: 18,
      quantity: 1,
      price: 0,
      amount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      tax: 0,
      totalCost: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleSupplierChange = (supplierName: string) => {
    const selectedVendor = vendors.find(v => v.name === supplierName);
    setFormData(prev => ({
      ...prev,
      supplier: supplierName,
      billTo: selectedVendor?.billing_address || prev.billTo,
      shipTo: selectedVendor?.shipping_address || prev.shipTo,
      contact: selectedVendor?.contact_person || prev.contact,
      currency: selectedVendor?.currency || prev.currency,
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate amounts when quantity, price, or gstRate changes
        if (field === 'quantity' || field === 'price' || field === 'gstRate') {
          const lineSubtotal = updatedItem.quantity * updatedItem.price;
          updatedItem.amount = lineSubtotal;
          const gstAmount = lineSubtotal * (updatedItem.gstRate / 100);
          
          if (taxConfig.taxType === "GST (India)" && taxConfig.gstType === "CGST_SGST") {
            updatedItem.cgst = gstAmount / 2;
            updatedItem.sgst = gstAmount / 2;
            updatedItem.igst = 0;
            updatedItem.tax = gstAmount;
          } else if (taxConfig.taxType === "GST (India)" && taxConfig.gstType === "IGST") {
            updatedItem.igst = gstAmount;
            updatedItem.cgst = 0;
            updatedItem.sgst = 0;
            updatedItem.tax = gstAmount;
          } else {
            updatedItem.tax = lineSubtotal * 0.1; // 10% default tax
            updatedItem.cgst = 0;
            updatedItem.sgst = 0;
            updatedItem.igst = 0;
          }
          updatedItem.totalCost = lineSubtotal + updatedItem.tax;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const openItemChooser = (lineItemId: string) => {
    setCurrentLineItemId(lineItemId);
    setItemChooserOpen(true);
  };

  const handleItemSelect = (item: { item_code: string; item_name: string; hsn_code?: string; description: string | null; unit_cost: number | null }) => {
    if (currentLineItemId) {
      setLineItems(lineItems.map(lineItem => {
        if (lineItem.id === currentLineItemId) {
          const price = item.unit_cost || 0;
          const quantity = lineItem.quantity || 1;
          const lineSubtotal = quantity * price;
          const gstAmount = lineSubtotal * (lineItem.gstRate / 100);
          
          return {
            ...lineItem,
            itemCode: item.item_code,
            hsnCode: item.hsn_code ?? "",
            description: item.item_name || item.description || "",
            price: price,
            amount: lineSubtotal,
            tax: gstAmount,
            totalCost: lineSubtotal + gstAmount,
          };
        }
        return lineItem;
      }));
    }
    setCurrentLineItemId(null);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const totalTax = lineItems.reduce((sum, item) => sum + item.tax, 0);
    const totalCgst = lineItems.reduce((sum, item) => sum + item.cgst, 0);
    const totalSgst = lineItems.reduce((sum, item) => sum + item.sgst, 0);
    const totalIgst = lineItems.reduce((sum, item) => sum + item.igst, 0);
    const totalCost = subtotal + totalTax;
    
    // Calculate discount
    let discountAmount = 0;
    if (formData.discountType === 'flat') {
      discountAmount = formData.discountValue;
    } else {
      discountAmount = (totalCost * formData.discountValue) / 100;
    }
    
    const grandTotal = Math.max(0, totalCost - discountAmount);
    return { subtotal, tax: totalTax, totalCgst, totalSgst, totalIgst, totalCost, discountAmount, grandTotal };
  };

const handleSubmit = async () => {
  if (lineItems.length === 0) {
    toast({
      title: "Validation Error",
      description: "Please add at least one line item",
      variant: "destructive",
    });
    return;
  }

  if (!formData.supplier) {
    toast({
      title: "Validation Error",
      description: "Please select a supplier",
      variant: "destructive",
    });
    return;
  }

  if (!formData.contact || !/^\d{10}$/.test(formData.contact)) {
    toast({
      title: "Validation Error",
      description: "Please enter a valid 10-digit contact number",
      variant: "destructive",
    });
    return;
  }

  const totals = calculateTotals();

  try {
    let poData;

    if (editingPO?.id) {
      // ---------------------------
      // ✅ Update existing PO
      // ---------------------------
      const updateResponse = await axios.put(`/api/purchase-orders/${editingPO.id}`, {
        po_number: formData.poNumber,
        operating_unit: formData.operatingUnit,
        po_rev: formData.poRev || 0,
        type: formData.type || "Standard Purchase Order",
        vendor: formData.supplier,
        site: formData.site || null,
        currency: formData.currency || "INR",
        contact: formData.contact || null,
        ship_to: formData.shipTo,
        bill_to: formData.billTo || formData.shipTo,
        expected_date: formData.expectedDate || null,
        status: formData.status || "Awaiting Approval",
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.grandTotal,
        description: formData.description || null,
        payment_terms: formData.paymentTerms || null,
        notes: formData.notes || null,
        line_items_count: lineItems.length,
      });

      poData = updateResponse.data;

      // ---------------------------
      // Update line items
      // Here we can PUT or PATCH each line by ID or delete all old lines & insert new
      // For simplicity, delete old lines and insert new
      await axios.delete(`/api/purchase-order-lines/by-po/${editingPO.id}`); // delete all lines
    } else {
      // ---------------------------
      // ✅ Create new PO
      // ---------------------------
      const createResponse = await axios.post("/api/purchase-orders", {
        po_number: formData.poNumber,
        operating_unit: formData.operatingUnit,
        po_rev: formData.poRev || 0,
        type: formData.type || "Standard Purchase Order",
        vendor: formData.supplier,
        site: formData.site || null,
        currency: formData.currency || "INR",
        contact: formData.contact || null,
        ship_to: formData.shipTo,
        bill_to: formData.billTo || formData.shipTo,
        expected_date: formData.expectedDate || null,
        status: formData.status || "Awaiting Approval",
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.grandTotal,
        description: formData.description || null,
        payment_terms: formData.paymentTerms || null,
        notes: formData.notes || null,
        line_items_count: lineItems.length,
      });

      poData = createResponse.data;
    }

    // ---------------------------
    // Insert line items
    // ---------------------------
    const poId = editingPO ? editingPO.id : poData.id;
    const linesToInsert = lineItems.map((item, index) => ({
     po_id: poId,
      line_num: index + 1,
      item_code: item.itemCode,
      hsn_code: item.hsnCode,
      description: item.description || null,
      quantity: item.quantity,
      unit_price: item.price,
      amount: item.quantity * item.price,
      total: item.quantity * item.price + (item.tax || 0),
      uom: item.uom || "Each",
    }));

    await axios.post("/api/purchase-order-lines", { items: linesToInsert });

    // ---------------------------
    // Insert taxes (same as before)
    // ---------------------------
    const taxesToInsert = lineItems.map((item, index) => {
      const lineSubtotal = item.quantity * item.price;
      let cgst = 0, sgst = 0, igst = 0, cess = 0;

      if (taxConfig.taxType === "GST (India)" && taxConfig.gstType === "CGST_SGST") {
        const gstAmount = lineSubtotal * (taxConfig.gstPercent / 100);
        cgst = gstAmount / 2;
        sgst = gstAmount / 2;
      } else if (taxConfig.taxType === "GST (India)" && taxConfig.gstType === "IGST") {
        igst = lineSubtotal * (taxConfig.gstPercent / 100);
      }

      cess = taxConfig.addCess ? (lineSubtotal * taxConfig.cessPercent) / 100 : 0;

      return {
        po_id: poData.id,
        line_num: index + 1,
        tax_type: taxConfig.taxType || "None",
        place_of_supply: taxConfig.taxType === "GST (India)" ? taxConfig.placeOfSupply : null,
        cgst,
        sgst,
        igst,
        cess,
        tax_total: cgst + sgst + igst + cess,
      };
    });

    await axios.post("/api/purchase-order-taxes", { taxes: taxesToInsert });

    // ---------------------------
    // Insert shipments
    // ---------------------------
    if (shipmentsData?.length > 0) {
      // Optional: delete old shipments if editing
      if (editingPO?.id) {
        await axios.delete(`/api/purchase-order-shipments/${poData.id}`);
      }

      const shipmentsToInsert = shipmentsData.map((s) => ({
        po_id: poData.id,
        line_num: s.lineNum,
        org: s.org || null,
        ship_to: s.shipTo,
        quantity: s.quantity,
        uom: s.uom || "Each",
        promised_date: s.promisedDate || null,
        need_by: s.needBy || null,
        original_promise: s.originalPromise || null,
      }));

      await axios.post("/api/purchase-order-shipments", { shipments: shipmentsToInsert });
    }

    // ---------------------------
    // Success
    // ---------------------------
    toast({
      title: editingPO ? "Purchase Order Updated" : "Purchase Order Created",
      description: `${formData.poNumber} has been successfully ${editingPO ? "updated" : "created"}.`,
    });

    resetForm();
    setOpen(false);
    setEditingPO(null); // reset editing state
    fetchPurchaseOrders();

  } catch (error) {
    let message = "Failed to save PO";

    if (axios.isAxiosError(error)) {
      message = error.response?.data?.message || error.message || message;
    }

    console.error("Error saving PO:", error);

    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  }
};

  const resetForm = () => {
    setFormData({
      operatingUnit: "Vision Operations",
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      revision: "0",
      type: "Standard Purchase Order",
      supplier: "",
      site: "",
      shipTo: "L1 - LeaseQA",
      billTo: "L1 - LeaseQA",
      buyer: "",
      status: "Awaiting Approval",
      description: "",
      contact: "",
      total: "0.00",
      createdDate: new Date().toLocaleString(),
      expectedDate: "",
      paymentTerms: "",
      notes: "",
      discountType: "flat",
      discountValue: 0,
      currency: "INR",
    });
    setTaxConfig({
      taxType: "None",
      placeOfSupply: "",
      gstType: "IGST",
      addCess: false,
      cessPercent: 0,
    });
    // Initialize with two default empty rows
    setLineItems([
      {
        id: Date.now().toString(),
        num: 1,
        itemCode: "",
        description: "",
        hsnSac: "",
        hsnCode: "",
        gstRate: 18,
        quantity: 1,
        price: 0,
        amount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        tax: 0,
        totalCost: 0,
      },
      
    ]);
    setActiveTab("lines");
  };


 const handleEdit = (poNumber: string) => {
  const poDetails = purchaseOrders.find(po => po.po_number === poNumber);

  if (!poDetails) {
    toast({
      title: "Error",
      description: "Purchase order not found.",
      variant: "destructive",
    });
    return;
  }

  // 🔹 Debug: Check if the PO is found
  console.log("PO Details found:", poDetails);

  // Merge existing formData with the PO details
  setFormData(prev => {
    const newFormData = {
      ...prev,
      operatingUnit: poDetails.operating_unit || "",
      poNumber: poDetails.po_number,
      poRev: poDetails.po_rev || 0,
      type: poDetails.type || "Standard Purchase Order",
      supplier: poDetails.vendor || "",
      site: poDetails.site || "",
      currency: poDetails.currency || "INR",
      contact: poDetails.contact || "",
      shipTo: poDetails.ship_to || "",
      billTo: poDetails.bill_to || poDetails.ship_to || "",
      expectedDate: poDetails.expected_date || "",
      status: poDetails.status || "Awaiting Approval",
      subtotal: poDetails.subtotal || 0,
      tax: poDetails.tax || 0,
      total: poDetails.total || 0,
      description: poDetails.description || "",
      paymentTerms: poDetails.payment_terms || "",
      notes: poDetails.notes || "",
      discountType: poDetails.discount_type || "flat",
      discountValue: poDetails.discount_value || 0,
      lineItemsCount: poDetails.line_items_count || 0,
    };
    console.log("Form data set:", newFormData); // 🔹 Debug formData
    return newFormData;
  });

  // Populate line items safely
  const mappedLineItems = (poDetails.lines || []).map((item: any, index: number) => ({
  id: item.id || index,
  itemCode: item.item_code || "",
  hsnCode: item.hsn_code || "",
  description: item.description || "",
  quantity: Number(item.quantity) || 0,
  price: Number(item.unit_price) || 0,
  amount: Number(item.amount) || Number(item.quantity) * Number(item.unit_price) || 0,
  total: Number(item.total) || Number(item.quantity) * Number(item.unit_price) || 0,
  tax: Number(item.tax) || 0,
  uom: item.uom || "Each",
  lineNum: index + 1,
}));

console.log("Mapped Line Items:", mappedLineItems); // 🔹 Debug
setLineItems(mappedLineItems);


const mappedShipments = (poDetails.shipments || []).map((s: any, index: number) => ({
  lineNum: s.line_num || index + 1,
  org: s.org || "",
  shipTo: s.ship_to || "",
  quantity: Number(s.quantity) || 0,
  uom: s.uom || "Each",
  promisedDate: s.promised_date || "",
  needBy: s.need_by || "",
  originalPromise: s.original_promise || "",
}));
console.log("Mapped Shipments:", mappedShipments);
setShipmentsData(mappedShipments);

  // Debug tax config
  const newTaxConfig = {
    taxType: poDetails.tax_type || "None",
    gstType: poDetails.gst_type || "CGST_SGST",
    placeOfSupply: poDetails.place_of_supply || "",
    addCess: poDetails.add_cess || false,
    cessPercent: poDetails.cess_percent || 0,
  };
  console.log("Tax config set:", newTaxConfig); // 🔹 Debug tax
  setTaxConfig(newTaxConfig);

  // Mark editing PO
  setEditingPO(poDetails);
  console.log("Editing PO set:", poDetails); // 🔹 Debug editing PO

  // Open the dialog
  setOpen(true);
};

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Purchase Orders</h1>
            <p className="text-muted-foreground mt-2">
              Manage purchase orders and vendor transactions
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create PO
            </Button>
          </div>
        </div>

        {/* Item Chooser Dialog */}
        <ItemChooserDialog
          open={itemChooserOpen}
          onOpenChange={setItemChooserOpen}
          onSelect={handleItemSelect}
        />

        {/* Create PO Dialog - Oracle ERP Style */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
            {/* Dark Header */}
            <div className="bg-[#1a365d] text-white px-4 py-2 flex items-center justify-between">
              <DialogTitle className="text-sm font-medium text-white">
                Purchase Orders - [New]
              </DialogTitle>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(95vh-120px)]">
              {/* Header Fields - Oracle ERP Grid Style */}
              <div className="grid grid-cols-12 gap-x-4 gap-y-3 text-sm">
                {/* Row 1 */}
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-28">Operating Unit</Label>
                  <Select 
                    value={formData.operatingUnit} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, operatingUnit: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm bg-[#ffffc8] border-gray-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vision Operations">Vision Operations</SelectItem>
                      <SelectItem value="Main Operations">Main Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1" />
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-16">Created</Label>
                  <Input 
                    value={formData.createdDate} 
                    readOnly 
                    className="h-8 text-sm bg-gray-100 border-gray-400"
                  />
                </div>
                <div className="col-span-5" />

                {/* Row 2 */}
                <div className="col-span-2 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-16">PO, Rev</Label>
                  <Input 
                    value={formData.poNumber} 
                    readOnly 
                    className="h-8 text-sm bg-gray-100 border-gray-400"
                  />
                </div>
                <div className="col-span-1 flex items-center">
                  <Input 
                    value={formData.revision} 
                    onChange={(e) => setFormData(prev => ({ ...prev, revision: e.target.value }))}
                    className="h-8 text-sm w-14 border-gray-400"
                  />
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-10">Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm bg-[#ffffc8] border-gray-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard Purchase Order">Standard Purchase Order</SelectItem>
                      <SelectItem value="Blanket Purchase Order">Blanket Purchase Order</SelectItem>
                      <SelectItem value="Contract Purchase Order">Contract Purchase Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-6" />

                {/* Row 3 */}
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-16">Supplier</Label>
                  <Select 
                    value={formData.supplier} 
                    onValueChange={handleSupplierChange}
                  >
                    <SelectTrigger className="h-8 text-sm border-gray-400">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                   <SelectContent>
                      {Array.isArray(vendors) &&
                        vendors.map((vendor: any) => (
                          <SelectItem key={vendor.id} value={String(vendor.vendor_name)}>
                            {vendor.vendor_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-10">Site</Label>
                  <Input 
                    value={formData.site} 
                    onChange={(e) => setFormData(prev => ({ ...prev, site: e.target.value }))}
                    className="h-8 text-sm border-gray-400"
                  />
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-16">Currency</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm border-gray-400">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name} ({currency.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-14">Contact</Label>
                  <Input 
                    value={formData.contact} 
                    onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                    className="h-8 text-sm border-gray-400"
                  />
                </div>
                <div className="col-span-2" />

                {/* Row 4 */}
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-16">Ship-To</Label>
                  <Input 
                    value={formData.shipTo} 
                    onChange={(e) => setFormData(prev => ({ ...prev, shipTo: e.target.value }))}
                    className="h-8 text-sm border-gray-400"
                    placeholder="Shipping address"
                  />
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-12">Bill-To</Label>
                  <Input 
                    value={formData.billTo} 
                    onChange={(e) => setFormData(prev => ({ ...prev, billTo: e.target.value }))}
                    className="h-8 text-sm border-gray-400"
                    placeholder="Billing address"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-20">Expected Date</Label>
                  <Input
  type="date"
  value={formData.expectedDate || ""}
  onChange={(e) =>
    setFormData((prev) => ({
      ...prev,
      expectedDate: e.target.value,
    }))
  }
  onClick={(e: any) => e.currentTarget.showPicker?.()}
  className="h-8 text-sm border-gray-400 cursor-pointer"
/>
                </div> 
                <div className="col-span-4" />

                {/* Row 5 */}
                <div className="col-span-3 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-12">Status</Label>
                  <Input 
                    value={formData.status} 
                    readOnly 
                    className="h-8 text-sm bg-gray-100 border-gray-400"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-12">Total</Label>
                  <Input 
                    value={totals.grandTotal.toFixed(2)} 
                    readOnly 
                    className="h-8 text-sm bg-gray-100 border-gray-400"
                  />
                </div>
                <div className="col-span-4" />

                {/* Description Row */}
                <div className="col-span-12 flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap w-20">Description</Label>
                  <Input 
                    value={formData.description} 
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="h-8 text-sm border-gray-400 flex-1"
                    placeholder="Enter PO description"
                  />
                </div>
              </div>

              {/* Tabs Section - Oracle ERP Style */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-9 bg-gradient-to-b from-[#e8e8e8] to-[#d0d0d0] border border-gray-400 rounded-none p-0 w-auto">
                  <TabsTrigger 
                    value="lines" 
                    className="h-8 text-sm px-5 rounded-none data-[state=active]:bg-[#6699cc] data-[state=active]:text-white"
                  >
                    Lines
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reference-docs" 
                    className="h-8 text-sm px-5 rounded-none data-[state=active]:bg-[#6699cc] data-[state=active]:text-white"
                  >
                    Reference Documents
                  </TabsTrigger>
                  <TabsTrigger 
                    value="more" 
                    className="h-8 text-sm px-5 rounded-none data-[state=active]:bg-[#6699cc] data-[state=active]:text-white"
                  >
                    Terms
                  </TabsTrigger>
                  <TabsTrigger 
                    value="configure-tax" 
                    className="h-8 text-sm px-5 rounded-none data-[state=active]:bg-[#6699cc] data-[state=active]:text-white"
                    onClick={() => setTaxConfigOpen(true)}
                  >
                    Configure Tax
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="lines" className="mt-0 border border-gray-400 border-t-0">
                  {/* Lines Table - Oracle ERP Style */}
                  <div className="overflow-auto min-h-[200px] max-h-[300px]">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-gradient-to-b from-[#e8e8e8] to-[#d0d0d0] border-b border-gray-400">
                          <TableHead className="h-9 text-sm font-medium text-foreground w-14 border-r border-gray-300">Num</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-32 border-r border-gray-300">Item Code</TableHead>
                          {taxConfig.taxType === "GST (India)" && (
                            <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300">HSN/SAC</TableHead>
                          )}
                          <TableHead className="h-9 text-sm font-medium text-foreground border-r border-gray-300">Description</TableHead>
                          {taxConfig.taxType === "GST (India)" && (
                            <TableHead className="h-9 text-sm font-medium text-foreground w-20 border-r border-gray-300 bg-purple-600 text-white">GST Rate</TableHead>
                          )}
                          <TableHead className="h-9 text-sm font-medium text-foreground w-20 border-r border-gray-300">Quantity</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300">Rate</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300">Amount</TableHead>
                          {taxConfig.taxType === "GST (India)" && taxConfig.gstType === "CGST_SGST" && (
                            <>
                              <TableHead className="h-9 text-sm font-medium w-20 border-r border-gray-300 bg-purple-600 text-white">CGST</TableHead>
                              <TableHead className="h-9 text-sm font-medium w-20 border-r border-gray-300 bg-purple-600 text-white">SGST</TableHead>
                            </>
                          )}
                          {taxConfig.taxType === "GST (India)" && taxConfig.gstType === "IGST" && (
                            <TableHead className="h-9 text-sm font-medium text-foreground w-20 border-r border-gray-300">IGST</TableHead>
                          )}
                          {taxConfig.taxType !== "GST (India)" && taxConfig.taxType !== "None" && (
                            <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300">Tax</TableHead>
                          )}
                          <TableHead className="h-9 text-sm font-medium text-foreground w-28 border-r border-gray-300">Total</TableHead>
                          <TableHead className="h-9 text-sm font-medium text-foreground w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item, index) => (
                          <TableRow key={item.id} className="border-b border-gray-300 hover:bg-blue-50">
                            <TableCell className="p-2 border-r border-gray-300">
                              <div className="w-3 h-3 bg-blue-800 mr-1 inline-block" />
                              <span>{index + 1}</span>
                            </TableCell>
                            <TableCell className="p-2 border-r border-gray-300">
                              <div className="flex gap-1">
                                <Input 
                                  value={item.itemCode}
                                  onChange={(e) => updateLineItem(item.id, 'itemCode', e.target.value)}
                                  className="h-8 text-sm border-gray-400 flex-1"
                                  placeholder="Item code"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => openItemChooser(item.id)}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            {taxConfig.taxType === "GST (India)" && (
                              <TableCell className="p-2 border-r border-gray-300">
                                <Input 
                                  value={item.hsnCode || ""}
                                  onChange={(e) => updateLineItem(item.id, 'hsnCode', e.target.value)}
                                  className="h-8 text-sm border-gray-400"
                                  placeholder="HSN/SAC"
                                />
                              </TableCell>
                            )}
                            <TableCell className="p-2 border-r border-gray-300">
                              <Input 
                                value={item.description}
                                onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                className="h-8 text-sm border-gray-400"
                                placeholder="Description"
                              />
                            </TableCell>
                            {taxConfig.taxType === "GST (India)" && (
                              <TableCell className="p-2 border-r border-gray-300">
                                <Select 
                                  value={item.gstRate.toString()} 
                                  onValueChange={(v) => updateLineItem(item.id, 'gstRate', Number(v))}
                                >
                                  <SelectTrigger className="h-8 text-sm border-gray-400">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0%</SelectItem>
                                    <SelectItem value="5">5%</SelectItem>
                                    <SelectItem value="12">12%</SelectItem>
                                    <SelectItem value="18">18%</SelectItem>
                                    <SelectItem value="28">28%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            )}
                            <TableCell className="p-2 border-r border-gray-300">
                              <Input 
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                                className="h-8 text-sm border-gray-400"
                                min={1}
                              />
                            </TableCell>
                            <TableCell className="p-2 border-r border-gray-300">
                              <Input 
                                type="number"
                                value={item.price}
                                onChange={(e) => updateLineItem(item.id, 'price', Number(e.target.value))}
                                className="h-8 text-sm border-gray-400"
                                min={0}
                                step={0.01}
                              />
                            </TableCell>
                            <TableCell className="p-2 border-r border-gray-300">
                              <Input 
                                type="number"
                                value={Number(item.amount || 0).toFixed(2)}
                                readOnly
                                className="h-8 text-sm border-gray-400 bg-gray-100"
                              />
                            </TableCell>
                            {taxConfig.taxType === "GST (India)" && taxConfig.gstType === "CGST_SGST" && (
                              <>
                                <TableCell className="p-2 border-r border-gray-300">
                                  <Input 
                                    type="number"
                                    value={item.cgst.toFixed(2)}
                                    readOnly
                                    className="h-8 text-sm border-gray-400 bg-gray-100"
                                  />
                                </TableCell>
                                <TableCell className="p-2 border-r border-gray-300">
                                  <Input 
                                    type="number"
                                    value={item.sgst.toFixed(2)}
                                    readOnly
                                    className="h-8 text-sm border-gray-400 bg-gray-100"
                                  />
                                </TableCell>
                              </>
                            )}
                            {taxConfig.taxType === "GST (India)" && taxConfig.gstType === "IGST" && (
                              <TableCell className="p-2 border-r border-gray-300">
                                <Input 
                                  type="number"
                                  value={item.igst.toFixed(2)}
                                  readOnly
                                  className="h-8 text-sm border-gray-400 bg-gray-100"
                                />
                              </TableCell>
                            )}
                            {taxConfig.taxType !== "GST (India)" && taxConfig.taxType !== "None" && (
                              <TableCell className="p-2 border-r border-gray-300">
                                <Input 
                                  type="number"
                                  value={item.tax.toFixed(2)}
                                  onChange={(e) => updateLineItem(item.id, 'tax', Number(e.target.value))}
                                  className="h-8 text-sm border-gray-400"
                                  min={0}
                                  step={0.01}
                                />
                              </TableCell>
                            )}
                            <TableCell className="p-2 border-r border-gray-300">
                              <Input 
                                type="number"
                               value={Number(item.totalCost || 0).toFixed(2)}
                                readOnly
                                className="h-8 text-sm border-gray-400 bg-gray-100"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => removeLineItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {lineItems.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No line items. Click "Add Item" below to add items.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Item Field */}
                  <div className="p-3 border-t border-gray-400 flex items-center gap-3">
                    <Label className="text-sm w-12">Item</Label>
                    <Input 
                      className="h-8 text-sm border-gray-400 w-36" 
                      placeholder="Item code"
                    />
                    <Input 
                      className="h-8 text-sm border-gray-400 flex-1" 
                      placeholder="Description"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-sm"
                      onClick={addLineItem}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {/* Summary Section */}
                  <div className="p-4 border-t border-gray-400 bg-[#f5f5f5]">
                    <div className="flex justify-end">
                      <div className="w-80 space-y-3">
                        {/* Amount (Subtotal) */}
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Amount</Label>
                          <span className="text-sm font-medium">₹{totals.subtotal.toFixed(2)}</span>
                        </div>

                        {/* GST Breakdown - CGST & SGST */}
                        {taxConfig.taxType === "GST (India)" && taxConfig.gstType === "CGST_SGST" && (
                          <>
                            <div className="flex items-center justify-between border-l-2 border-green-500 pl-2">
                              <Label className="text-sm">SGST</Label>
                              <span className="text-sm font-medium text-green-600">₹{totals.totalSgst.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between border-l-2 border-green-500 pl-2">
                              <Label className="text-sm">CGST</Label>
                              <span className="text-sm font-medium text-green-600">₹{totals.totalCgst.toFixed(2)}</span>
                            </div>
                          </>
                        )}

                        {/* GST Breakdown - IGST */}
                        {taxConfig.taxType === "GST (India)" && taxConfig.gstType === "IGST" && (
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">IGST</Label>
                            <span className="text-sm font-medium">₹{totals.totalIgst.toFixed(2)}</span>
                          </div>
                        )}

                        {/* Tax for non-GST (hidden when None) */}
                        {taxConfig.taxType !== "GST (India)" && taxConfig.taxType !== "None" && (
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Tax</Label>
                            <span className="text-sm font-medium">₹{totals.tax.toFixed(2)}</span>
                          </div>
                        )}

                        {/* Total Cost */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                          <Label className="text-sm font-medium">Total Cost</Label>
                          <Input 
                            value={totals.totalCost.toFixed(2)}
                            readOnly
                            className="h-8 text-sm w-36 bg-gray-100 border-gray-400 text-right"
                          />
                        </div>

                        {/* Discount */}
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium">Discount</Label>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={formData.discountType} 
                              onValueChange={(v: "flat" | "percentage") => setFormData(prev => ({ ...prev, discountType: v }))}
                            >
                              <SelectTrigger className="h-8 text-sm w-28 border-gray-400">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flat">Flat (₹)</SelectItem>
                                <SelectItem value="percentage">Percent (%)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              type="number"
                              value={formData.discountValue}
                              onChange={(e) => setFormData(prev => ({ ...prev, discountValue: Number(e.target.value) }))}
                              className="h-8 text-sm w-24 border-gray-400 text-right"
                              min={0}
                              step={formData.discountType === 'percentage' ? 1 : 0.01}
                            />
                          </div>
                        </div>

                        {/* Discount Amount Display */}
                        {formData.discountValue > 0 && (
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Discount Amount</span>
                            <span>- ₹{totals.discountAmount.toFixed(2)}</span>
                          </div>
                        )}

                        {/* Grand Total */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                          <Label className="text-sm font-bold">Grand Total</Label>
                          <Input 
                            value={totals.grandTotal.toFixed(2)}
                            readOnly
                            className="h-8 text-sm w-36 bg-[#ffffc8] border-gray-400 text-right font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>


                <TabsContent value="reference-docs" className="mt-0 border border-gray-400 border-t-0 p-4">
                  <p className="text-sm text-muted-foreground">Reference documents will be displayed here.</p>
                </TabsContent>

                <TabsContent value="more" className="mt-0 border border-gray-400 border-t-0 p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Payment Terms</Label>
                        <Select 
                          value={formData.paymentTerms} 
                          onValueChange={(v) => setFormData(prev => ({ ...prev, paymentTerms: v }))}
                        >
                          <SelectTrigger className="h-8 text-sm border-gray-400 mt-1">
                            <SelectValue placeholder="Select terms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                            <SelectItem value="Net 90">Net 90</SelectItem>
                            <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Notes</Label>
                      <Textarea 
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="text-sm mt-1 min-h-[80px]"
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="configure-tax" className="mt-0 border border-gray-400 border-t-0 p-4">
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      {taxConfig.taxType === "None" 
                        ? "No tax configuration applied. Click below to configure."
                        : `Tax Type: ${taxConfig.taxType} | ${taxConfig.gstType === "CGST_SGST" ? "CGST & SGST" : "IGST"} | Place: ${taxConfig.placeOfSupply || "Not set"}`
                      }
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setTaxConfigOpen(true)}
                      className="text-sm bg-[#6699cc] text-white hover:bg-[#5588bb]"
                    >
                      Configure Tax Settings
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Bottom Action Buttons - Oracle ERP Style */}
            <div className="border-t border-gray-300 bg-[#e8e8e8] px-4 py-3 flex items-center justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-sm bg-[#6699cc] text-white hover:bg-[#5588bb]"
                 onClick={() => {

  const shipments = lineItems.map((item, index) => ({
    lineNum: index + 1,
    org: "V1",
    shipTo: formData.shipTo,
    quantity: item.quantity,
    uom: "Each",
    promisedDate: "",
    needBy: formData.expectedDate || "",
    originalPromise: "",
  }));

  setShipmentsData(shipments);

  if (lineItems.length > 0) {
    setSelectedLineItem(lineItems[0]);
  }

  setShipmentsOpen(true);
}}
                >
                  Shipments
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 text-sm bg-[#cc9966] hover:bg-[#bb8855] text-white"
                  onClick={handleSubmit}
                >
                  Approve...
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Configure Tax Dialog */}
        <Dialog open={taxConfigOpen} onOpenChange={setTaxConfigOpen}>
          <DialogContent className="max-w-md p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <DialogTitle className="text-lg font-semibold">Configure Tax</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => setTaxConfigOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* 1. Select Tax Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  1. Select Tax Type<span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={taxConfig.taxType} 
                  onValueChange={(v) => setTaxConfig(prev => ({ ...prev, taxType: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select tax type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="GST (India)">GST (India)</SelectItem>
                    <SelectItem value="VAT">VAT</SelectItem>
                    <SelectItem value="Sales Tax">Sales Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {taxConfig.taxType === "GST (India)" && (
                <>
                  {/* 2. Place of Supply */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      2. Place of Supply<span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={taxConfig.placeOfSupply} 
                      onValueChange={(v) => setTaxConfig(prev => ({ ...prev, placeOfSupply: v }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                        <SelectItem value="Karnataka">Karnataka</SelectItem>
                        <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                        <SelectItem value="Gujarat">Gujarat</SelectItem>
                        <SelectItem value="Delhi">Delhi</SelectItem>
                        <SelectItem value="Kerala">Kerala</SelectItem>
                        <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                        <SelectItem value="Telangana">Telangana</SelectItem>
                        <SelectItem value="West Bengal">West Bengal</SelectItem>
                        <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. GST Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      3. GST Type<span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup 
                      value={taxConfig.gstType} 
                      onValueChange={(v: "IGST" | "CGST_SGST") => setTaxConfig(prev => ({ ...prev, gstType: v }))}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="IGST" id="igst" />
                        <Label htmlFor="igst" className="text-sm font-normal cursor-pointer">IGST</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CGST_SGST" id="cgst-sgst" />
                        <Label htmlFor="cgst-sgst" className="text-sm font-normal cursor-pointer">CGST & SGST</Label>
                      </div>
                    </RadioGroup>
                    
                    <Button 
                      variant="link" 
                      className="text-sm text-purple-600 p-0 h-auto"
                      onClick={() => setTaxConfig(prev => ({ ...prev, addCess: !prev.addCess }))}
                    >
                      + Add Cess
                    </Button>
                    
                    {taxConfig.addCess && (
                      <div className="flex items-center gap-2 mt-2">
                        <Label className="text-sm">Cess %:</Label>
                        <Input 
                          type="number"
                          value={taxConfig.cessPercent}
                          onChange={(e) => setTaxConfig(prev => ({ ...prev, cessPercent: Number(e.target.value) }))}
                          className="w-20 h-8"
                          min={0}
                          step={0.5}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 4. Other Options */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">4. Other Options</Label>
                <p className="text-sm text-muted-foreground">Additional tax options can be configured here.</p>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t">
              <Button 
                variant="ghost" 
                onClick={() => setTaxConfigOpen(false)}
                className="text-sm"
              >
                Cancel
              </Button>
            <Button 
                onClick={() => {
                  // Recalculate all line items with new tax config
                  setLineItems(lineItems.map(item => {
                    const lineSubtotal = item.quantity * item.price;
                    const gstAmount = lineSubtotal * (item.gstRate / 100);
                    
                    if (taxConfig.taxType === "GST (India)" && taxConfig.gstType === "CGST_SGST") {
                      return {
                        ...item,
                        amount: lineSubtotal,
                        cgst: gstAmount / 2,
                        sgst: gstAmount / 2,
                        igst: 0,
                        tax: gstAmount,
                        totalCost: lineSubtotal + gstAmount
                      };
                    } else if (taxConfig.taxType === "GST (India)" && taxConfig.gstType === "IGST") {
                      return {
                        ...item,
                        amount: lineSubtotal,
                        igst: gstAmount,
                        cgst: 0,
                        sgst: 0,
                        tax: gstAmount,
                        totalCost: lineSubtotal + gstAmount
                      };
                    } else {
                      return {
                        ...item,
                        amount: lineSubtotal,
                        tax: lineSubtotal * 0.1,
                        cgst: 0,
                        sgst: 0,
                        igst: 0,
                        totalCost: lineSubtotal + (lineSubtotal * 0.1)
                      };
                    }
                  }));
                  setTaxConfigOpen(false);
                  toast({
                    title: "Tax Configuration Saved",
                    description: "Tax settings have been applied to the purchase order.",
                  });
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Shipments Dialog */}
        <Dialog open={shipmentsOpen} onOpenChange={setShipmentsOpen}>
          <DialogContent className="max-w-4xl p-0">
            <div className="flex items-center justify-between px-4 py-2 bg-[#003366] text-white">
              <DialogTitle className="text-sm font-medium">Shipments - {formData.poNumber}</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 text-white hover:bg-[#004488]"
                onClick={() => setShipmentsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              {/* Shipments Header */}
              <div className="h-8 bg-[#6699cc] text-white flex items-center px-4 text-sm font-medium">
                Shipments
              </div>

              {/* Shipments Table */}
              <div className="border border-gray-400 border-t-0 overflow-auto min-h-[200px] max-h-[300px]">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="bg-gradient-to-b from-[#e8e8e8] to-[#d0d0d0] border-b border-gray-400">
                      <TableHead className="h-9 text-sm font-medium text-foreground w-14 border-r border-gray-300">Num</TableHead>
                      <TableHead className="h-9 text-sm font-medium text-foreground w-20 border-r border-gray-300">Org</TableHead>
                      <TableHead className="h-9 text-sm font-medium text-foreground w-36 border-r border-gray-300">Ship-To</TableHead>
                      <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300">UOM</TableHead>
                      <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300">Quantity</TableHead>
                      <TableHead className="h-9 text-sm font-medium text-foreground w-32 border-r border-gray-300">Promised Date</TableHead>
                      <TableHead className="h-9 text-sm font-medium text-foreground w-40 border-r border-gray-300">Need-By</TableHead>
                      <TableHead className="h-9 text-sm font-medium text-foreground w-32">Original Promise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow 
                        key={item.id} 
                        className={`border-b border-gray-300 cursor-pointer ${selectedLineItem?.id === item.id ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                        onClick={() => setSelectedLineItem(item)}
                      >
                        <TableCell className="p-1 border-r border-gray-300">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-800" />
                            <span>{index + 1}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-1 border-r border-gray-300">
                          <Input 
                            defaultValue="V1"
                            className="h-7 text-sm bg-[#ffffc8] border-gray-400"
                          />
                        </TableCell>
                        <TableCell className="p-1 border-r border-gray-300">
                         <Select
  value={shipmentsData[index]?.shipTo || ""}
  onValueChange={(v) => updateShipment(index, "shipTo", v)}
>
                            <SelectTrigger className="h-7 text-sm bg-[#ffffc8] border-gray-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="L1 - LeaseQA">L1 - LeaseQA</SelectItem>
                              <SelectItem value="L2 - Warehouse">L2 - Warehouse</SelectItem>
                              <SelectItem value="L3 - Factory">L3 - Factory</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1 border-r border-gray-300">
                          <Select
  value={shipmentsData[index]?.uom || "Each"}
  onValueChange={(v) => updateShipment(index, "uom", v)}
>
                            <SelectTrigger className="h-7 text-sm border-gray-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Each">Each</SelectItem>
                              <SelectItem value="Kg">Kg</SelectItem>
                              <SelectItem value="Box">Box</SelectItem>
                              <SelectItem value="Pcs">Pcs</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1 border-r border-gray-300">
                         <Input
  type="number"
  value={shipmentsData[index]?.quantity || ""}
  onChange={(e) =>
    updateShipment(index, "quantity", Number(e.target.value))
  }
/>
                        </TableCell>
                        <TableCell className="p-1 border-r border-gray-300">
                          <Input
  type="date"
  value={shipmentsData[index]?.promisedDate }
  onChange={(e) =>
    updateShipment(index, "promisedDate", e.target.value)
  }
/>
                        </TableCell>
                        <TableCell className="p-1 border-r border-gray-300">
                          <Input
  type="date"
  value={shipmentsData[index]?.needBy || ""}
  onChange={(e) =>
    updateShipment(index, "needBy", e.target.value)
  }
  className="h-7 text-sm border-gray-400"
/>
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
  type="date"
  value={shipmentsData[index]?.originalPromise || ""}
  onChange={(e) =>
    updateShipment(index, "originalPromise", e.target.value)
  }
  className="h-7 text-sm border-gray-400"
/>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Empty rows for Oracle ERP style */}
                    {Array.from({ length: Math.max(0, 5 - lineItems.length) }).map((_, i) => (
                      <TableRow key={`empty-${i}`} className="border-b border-gray-300">
                        <TableCell className="p-1 border-r border-gray-300 h-9"></TableCell>
                        <TableCell className="p-1 border-r border-gray-300"></TableCell>
                        <TableCell className="p-1 border-r border-gray-300"></TableCell>
                        <TableCell className="p-1 border-r border-gray-300"></TableCell>
                        <TableCell className="p-1 border-r border-gray-300"></TableCell>
                        <TableCell className="p-1 border-r border-gray-300"></TableCell>
                        <TableCell className="p-1 border-r border-gray-300"></TableCell>
                        <TableCell className="p-1"></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Line Item Info at bottom */}
              <div className="mt-4 flex items-center gap-4 border-t border-gray-300 pt-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Line Num</Label>
                  <Input 
                    value={selectedLineItem ? lineItems.findIndex(i => i.id === selectedLineItem.id) + 1 : ''}
                    readOnly
                    className="h-8 text-sm w-16 bg-gray-100 border-gray-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Item</Label>
                  <Input 
                    value={selectedLineItem?.itemCode || ''}
                    readOnly
                    className="h-8 text-sm w-32 bg-gray-100 border-gray-400"
                  />
                </div>
                <Input 
                  value={selectedLineItem?.description || ''}
                  readOnly
                  className="h-8 text-sm flex-1 bg-gray-100 border-gray-400"
                />
              </div>

              {/* Bottom Buttons */}
              <div className="mt-4 flex justify-center gap-4">
               <Button
  onClick={() => {
    toast({
      title: "Shipments Saved",
      description: "Shipment details have been stored.",
    });

    setShipmentsOpen(false);
  }}
>
  Save
</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search & Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search POs..." className="pl-10" />
                </div>
              </div>
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Loading purchase orders...
                    </TableCell>
                  </TableRow>
                ) : purchaseOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No purchase orders found. Create your first PO to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseOrders
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((po) => {
                    const totalAmount = po.purchase_order_items?.reduce((sum: number, item: any) => 
                      sum + Number(item.total || 0), 0
                    ) || 0;
                    const itemCount = po.purchase_order_items?.length || 0;

                    return (
                      <TableRow key={po.po_number}>
                        <TableCell className="font-medium">{po.po_number}</TableCell>
                        <TableCell>{po.vendor}</TableCell>
                        <TableCell>
                        {po.expected_date ? new Date(po.expected_date).toISOString().split('T')[0] : 'N/A'}
                      </TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                        <TableCell>{po.line_items_count ?? 0}</TableCell>
                      <TableCell>
                            {po.total != null
                              ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(po.total)
                              : '₹0.00'}
                          </TableCell>                    
                              <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {po.status === "Approved" && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => printPDF(po.po_number)}
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                Print PDF
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => viewPurchaseOrder(po.po_number)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
  variant="ghost" 
  size="sm"
  onClick={() => handleEdit(po.po_number)}
>
  <Edit className="h-4 w-4" />
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
            {purchaseOrders.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, purchaseOrders.length)} of {purchaseOrders.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(purchaseOrders.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(purchaseOrders.length / itemsPerPage);
                        if (totalPages <= 5) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, index, arr) => (
                        <span key={page} className="flex items-center">
                          {index > 0 && arr[index - 1] !== page - 1 && (
                            <span className="px-1 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </span>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(purchaseOrders.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(purchaseOrders.length / itemsPerPage)}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.ceil(purchaseOrders.length / itemsPerPage))}
                    disabled={currentPage === Math.ceil(purchaseOrders.length / itemsPerPage)}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View PO Dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
            </DialogHeader>
            {selectedPO && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">PO Number</p>
                    <p className="font-semibold">{selectedPO.po_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-semibold">{selectedPO.vendor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PO Date</p>
                    <p className="font-semibold">{new Date(selectedPO.po_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Date</p>
                    <p className="font-semibold">
                      {selectedPO.delivery_date ? new Date(selectedPO.delivery_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Terms</p>
                    <p className="font-semibold">{selectedPO.payment_terms || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedPO.status)}</div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Shipping Address</p>
                    <p className="font-semibold">{selectedPO.ship_to || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Line Items</h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                     <TableBody>
  {Array.isArray(selectedPO.purchase_order_items) &&
  selectedPO.purchase_order_items.length > 0 ? (
    selectedPO.purchase_order_items.map((item: any) => (
      <TableRow key={item.id}>
        <TableCell className="font-medium">{item.item_code || "-"}</TableCell>
        <TableCell>{item.description || "-"}</TableCell>
        <TableCell className="text-right">{item.quantity ?? 0}</TableCell>
        <TableCell className="text-right">
          ${item.unit_price != null ? Number(item.unit_price).toFixed(2) : "0.00"}
        </TableCell>
        <TableCell className="text-right font-medium">
          ${item.total != null ? Number(item.total).toFixed(2) : "0.00"}
        </TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow>
      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
        No line items found
      </TableCell>
    </TableRow>
  )}
</TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">${Number(selectedPO.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="font-medium">${Number(selectedPO.tax || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>${Number(selectedPO.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedPO.notes && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p>{selectedPO.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PurchaseOrders;
