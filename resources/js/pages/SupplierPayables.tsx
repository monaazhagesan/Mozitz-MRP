import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Eye, DollarSign, TrendingUp, Clock, Plus, CheckCircle, Printer, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import StatCard from "@/components/StatCard";
import { Loader2 } from "lucide-react";
import axios from 'axios';


interface GRNLineItem {
  id: string;
  item_code: string;
  description: string;
  accepted_quantity: number;
  unit_price: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
}

interface PendingGRNDetail {
  id: string;
  grn_number: string;
  po_number: string;
  receipt_date: string;
  total_accepted_qty: number;
  subtotal: number;
  tax: number;
  total: number;
  isPaid: boolean;
  items: GRNLineItem[];
}


const SupplierPayables: React.FC = () => {
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [grnItems, setGrnItems] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorGRNs, setVendorGRNs] = useState<any[]>([]);
  const [pendingGRNDetails, setPendingGRNDetails] = useState<PendingGRNDetail[]>([]);
  const [loadingPendingGRNs, setLoadingPendingGRNs] = useState(false);
  const [lineItems, setLineItems] = useState<GRNLineItem[]>([]);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [fetchingGRN, setFetchingGRN] = useState(false);
  const [selectedGRNs, setSelectedGRNs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Form state for creating new payable
  const [formData, setFormData] = useState({
    supplier: "",
    grnNumber: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: "Bank",
    referenceNumber: "",
    remarks: "",
    status: "Pending"
  });

  // Calculated totals
  const [totals, setTotals] = useState({
    subtotal: 0,
    tax: 0,
    total: 0
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: '',
    reference_number: '',
    paid_amount: '',
    remarks: ''
  });

  useEffect(() => {
    fetchPayables();
    fetchVendors();
  }, []);

  // Debounced auto-fetch GRN details when user types
  useEffect(() => {
    if (!formData.grnNumber || formData.grnNumber.length < 3) {
      setLineItems([]);
      setTotals({ subtotal: 0, tax: 0, total: 0 });
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchGRNDetails(formData.grnNumber);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.grnNumber]);

  const fetchVendors = async () => {
  try {
    const response = await axios.get('/api/vendors', {
      params: { status: 'Active' }
    });

    const data = response.data;

    setVendors(
      Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : []
    );

  } catch (error) {
    console.error('Error fetching vendors:', error);
    setVendors([]);
  }
};

  const fetchPayables = async () => {
  try {
    setLoading(true);

    console.log("📡 Calling API: /api/supplier-payables");

    const response = await axios.get('/api/supplier-payables');

    console.log("✅ API Response:", response);
    console.log("📦 Data:", response.data);

    setPayables(response.data?.data || response.data || []);
  } catch (error: any) {
    console.error("❌ API Error Full:", error);
    console.error("❌ Response:", error.response);
    console.error("❌ Message:", error.message);

    toast({
      title: "Error Fetching Payables",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};


  const fetchVendorGRNs = async (vendorName: string) => {
    setLoadingPendingGRNs(true);

    try {
      // 1. Fetch GRNs
      const grnRes = await axios.get('/api/grn', {
        params: {
          vendor: vendorName,
          qc_status: ['Accepted', 'Partially Accepted'],
          sort_by: 'receipt_date',
          order: 'desc'
        }
      });

      const grns = grnRes.data || [];
      setVendorGRNs(grns);

      // 2. Fetch existing payables
      const payableRes = await axios.get('/api/supplier-payables', {
        params: { vendor: vendorName }
      });

      const existingPayables = payableRes.data || [];

      const paidGRNs = new Set(
        existingPayables
         .filter((p: any) => p.payment_status === 'Paid')
         .map((p: any) => p.grn_number)
      );

      // 3. Fetch details for each GRN
      const grnDetailsPromises = grns.map(async (grn: any) => {
        // GRN Items
        const itemsRes = await axios.get('/api/grn-items', {
          params: { grn_id: grn.id }
        });

        const itemsData = itemsRes.data || [];

        // PO Details
        const poRes = await axios.get(`/api/purchase-orders/by-number/${grn.po_number}`);
        const poData = poRes.data;

        let totalAcceptedQty = 0;
        let subtotal = 0;
        let tax = 0;
        const items: any[] = [];

        (Array.isArray(itemsData) ? itemsData : []).forEach((item: any) => {
          const poItem = poData?.purchase_order_items?.find(
            (poi: any) => poi.item_code === item.item_code
          );

          const unitPrice = poItem?.unit_price || item.unit_price || 0;
          const acceptedQty = item.accepted_quantity || 0;

          const itemSubtotal = unitPrice * acceptedQty;
          const taxPercent = 18;
          const itemTax = itemSubtotal * (taxPercent / 100);

          totalAcceptedQty += acceptedQty;
          subtotal += itemSubtotal;
          tax += itemTax;

          items.push({
            id: item.id,
            item_code: item.item_code,
            description: item.description,
            accepted_quantity: acceptedQty,
            unit_price: unitPrice,
            tax_percent: taxPercent,
            tax_amount: itemTax,
            total_amount: itemSubtotal + itemTax
          });
        });

        return {
          id: grn.id,
          grn_number: grn.grn_number,
          po_number: grn.po_number,
          receipt_date: grn.receipt_date,
          total_accepted_qty: totalAcceptedQty,
          subtotal,
          tax,
          total: subtotal + tax,
          isPaid: paidGRNs.has(grn.grn_number),
          items
        };
      });

      const details = await Promise.all(grnDetailsPromises);
      setPendingGRNDetails(details);

    } catch (error) {
      console.error('Error fetching vendor GRNs:', error);
    } finally {
      setLoadingPendingGRNs(false);
    }
  };


  const fetchGRNDetails = async (grnNumber: string) => {
  setFetchingGRN(true);

  try {
    console.log("GRN Number:", grnNumber);

    // 1. Fetch GRN header
    const grnRes = await axios.get('/api/grn/by-number', {
      params: { grn_number: grnNumber }
    });

    console.log("GRN Response:", grnRes);

    const grnData = grnRes.data;
    console.log("GRN Data:", grnData);

    if (!grnData) {
      console.log("No GRN data found");
      setLineItems([]);
      setTotals({ subtotal: 0, tax: 0, total: 0 });
      return;
    }

    // Auto-set supplier
    if (grnData.vendor && !formData.supplier) {
      console.log("Setting supplier:", grnData.vendor);
      setFormData(prev => ({ ...prev, supplier: grnData.vendor }));
    }

    // 2. Fetch GRN items
    const itemsRes = await axios.get('/api/grn-items', {
      params: { grn_id: grnData.id }
    });

    console.log("GRN Items Response:", itemsRes);

    const itemsData = itemsRes.data || [];
    console.log("GRN Items Data:", itemsData);

    // 3. Fetch PO with items
    const poRes = await axios.get(
      `/api/purchase-orders/by-number/${grnData.po_number}`
    );

    console.log("PO Response:", poRes);

    const poData = poRes.data;
    console.log("PO Data:", poData);

    // 4. Map items
    const mappedItems = itemsData.map((item: any) => {
      const poItem = poData?.purchase_order_items?.find(
        (poi: any) => poi.item_code === item.item_code
      );

      console.log("Matching PO Item:", poItem);

      const unitPrice = poItem?.unit_price || item.unit_price || 0;
      const acceptedQty = item.accepted_quantity || 0;

      const subtotal = unitPrice * acceptedQty;
      const taxPercent = 18;
      const taxAmount = subtotal * (taxPercent / 100);
      const totalAmount = subtotal + taxAmount;

      return {
        id: item.id,
        item_code: item.item_code,
        description: item.description,
        accepted_quantity: acceptedQty,
        unit_price: unitPrice,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        total_amount: totalAmount
      };
    });

    console.log("Mapped Items:", mappedItems);

    setLineItems(mappedItems);

    // 5. Totals
    const subtotal = mappedItems.reduce(
      (sum: any, item: any) => sum + item.unit_price * item.accepted_quantity,
      0
    );

    const tax = mappedItems.reduce(
      (sum: any, item: any) => sum + item.tax_amount,
      0
    );

    console.log("Subtotal:", subtotal);
    console.log("Tax:", tax);

    setTotals({
      subtotal,
      tax,
      total: subtotal + tax
    });

    console.log("Final Totals:", {
      subtotal,
      tax,
      total: subtotal + tax
    });

  } catch (error: any) {
    console.error("Error fetching GRN details:", error);

    toast({
      title: "Error",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  } finally {
    setFetchingGRN(false);
    console.log("Fetching GRN finished");
  }
};

  const fetchPaymentHistory = async (payableId: string) => {
    try {
      const response = await axios.get('/api/payment-history', {
        params: {
          payable_id: payableId
        }
      });

      setPaymentHistory(response.data || []);
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
    }
  };

  const fetchGRNItems = async (grnNumber: string) => {
    try {
      // 1. Get GRN ID
      const grnRes = await axios.get('/api/grn/by-number', {
        params: { grn_number: grnNumber }
      });

      const grnData = grnRes.data;

      if (!grnData) {
        setGrnItems([]);
        return;
      }

      // 2. Get GRN items
      const itemsRes = await axios.get('/api/grn-items', {
        params: { grn_id: grnData.id }
      });

      setGrnItems(itemsRes.data || []);
    } catch (error: any) {
      console.error('Error fetching GRN items:', error);
    }
  };

  const handleSupplierChange = async (supplier: string) => {
    setFormData(prev => ({ ...prev, supplier, grnNumber: "" }));
    setLineItems([]);
    setTotals({ subtotal: 0, tax: 0, total: 0 });
    setPendingGRNDetails([]);
    setSelectedGRNs(new Set());
    await fetchVendorGRNs(supplier);
  };

  // Toggle selection for a single GRN
  const handleToggleGRN = (grn: PendingGRNDetail) => {
    if (grn.isPaid) return;

    const newSelected = new Set(selectedGRNs);
    if (newSelected.has(grn.grn_number)) {
      newSelected.delete(grn.grn_number);
    } else {
      newSelected.add(grn.grn_number);
    }
    setSelectedGRNs(newSelected);
    updateLineItemsFromSelection(newSelected);
  };

  // Select all unpaid GRNs
  const handleSelectAllGRNs = () => {
    const unpaidGRNs = pendingGRNDetails.filter(g => !g.isPaid);
    const allSelected = unpaidGRNs.every(g => selectedGRNs.has(g.grn_number));

    if (allSelected) {
      setSelectedGRNs(new Set());
      setLineItems([]);
      setTotals({ subtotal: 0, tax: 0, total: 0 });
    } else {
      const newSelected = new Set(unpaidGRNs.map(g => g.grn_number));
      setSelectedGRNs(newSelected);
      updateLineItemsFromSelection(newSelected);
    }
  };

  // Update line items and totals based on selected GRNs
  const updateLineItemsFromSelection = (selected: Set<string>) => {
    const selectedDetails = pendingGRNDetails.filter(g => selected.has(g.grn_number));
    const allItems = selectedDetails.flatMap(g => g.items);

    setLineItems(allItems);

    const subtotal = allItems.reduce((sum, item) => sum + (item.unit_price * item.accepted_quantity), 0);
    const tax = allItems.reduce((sum, item) => sum + item.tax_amount, 0);
    setTotals({ subtotal, tax, total: subtotal + tax });

    // Update form with first selected GRN (for reference)
    if (selected.size > 0) {
      const firstGRN = Array.from(selected)[0];
      setFormData(prev => ({ ...prev, grnNumber: firstGRN }));
    } else {
      setFormData(prev => ({ ...prev, grnNumber: "" }));
    }
  };

  const handleSelectPendingGRN = (grnNumber: string) => {
    const grn = pendingGRNDetails.find(g => g.grn_number === grnNumber);
    if (grn) {
      handleToggleGRN(grn);
    }
  };

  const handleGRNChange = async (grnNumber: string) => {
    setFormData(prev => ({ ...prev, grnNumber }));
    await fetchGRNDetails(grnNumber);
  };

  const handleViewDetails = async (payable: any) => {
    setSelectedPayable(payable);
    if (payable.grn_number) {
      await fetchGRNItems(payable.grn_number);
    }
    await fetchPaymentHistory(payable.id);
    setShowDetailsDialog(true);
  };

  const handleRecordPayment = (payable: any) => {
    setSelectedPayable(payable);
    setPaymentForm({
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: '',
      reference_number: '',
      paid_amount: payable.balance?.toString() || '',
      remarks: ''
    });
    setShowPaymentDialog(true);
  };

  const openCreateDialog = () => {
    setFormData({
      supplier: "",
      grnNumber: "",
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: "Bank",
      referenceNumber: "",
      remarks: "",
      status: "Pending"
    });
    setLineItems([]);
    setTotals({ subtotal: 0, tax: 0, total: 0 });
    setVendorGRNs([]);
    setSelectedGRNs(new Set());
    setShowCreateDialog(true);
  };


  const handlePay = async () => {
    if (!formData.supplier || selectedGRNs.size === 0 || lineItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select supplier and at least one GRN with items",
        variant: "destructive",
      });
      return;
    }

    if (!formData.paymentMode) {
      toast({
        title: "Validation Error",
        description: "Please select a payment mode",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedGRNDetails = pendingGRNDetails.filter((g) =>
        selectedGRNs.has(g.grn_number)
      );

      // 1. Create payable + payment history in backend (IMPORTANT)
      for (const grn of selectedGRNDetails) {

        const response = await axios.post("/api/supplier-payables/pay", {
          vendor: formData.supplier,
          reference_type: "GRN",
          reference_number: grn.grn_number,
          grn_number: grn.grn_number,
          po_number: grn.po_number,
          transaction_date: new Date().toISOString(),
          total_amount: grn.total,
          tax_amount: grn.tax,
          paid_amount: grn.total,
          balance: 0,
          status: "Paid",
          payment_status: "Paid",
          notes: formData.remarks,

          payment: {
            payment_date: formData.paymentDate,
            payment_mode: formData.paymentMode,
            reference_number: formData.referenceNumber,
            paid_amount: grn.total,
            remarks: formData.remarks
          }
        });

        if (!response.data) {
          throw new Error("Failed to process payment");
        }
      }

      // 2. Receipt generation (frontend only)
      const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;

      setReceiptData({
        receiptNumber,
        date: formData.paymentDate,
        supplier: formData.supplier,
        grnNumber: Array.from(selectedGRNs).join(", "),
        poNumber: selectedGRNDetails.map((g) => g.po_number).join(", "),
        paymentMode: formData.paymentMode,
        referenceNumber: formData.referenceNumber,
        items: lineItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
      });

      toast({
        title: "Payment Completed",
        description: `Payment of $${totals.total.toFixed(
          2
        )} for ${selectedGRNs.size} GRN(s) recorded successfully`,
      });

      setShowCreateDialog(false);
      setShowReceiptDialog(true);

      fetchPayables();

    } catch (error: any) {
      toast({
        title: "Error Processing Payment",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && receiptData) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Receipt - ${receiptData.receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #1a365d; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            .info-item { display: flex; }
            .info-label { font-weight: bold; width: 120px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1a365d; color: white; }
            .totals { text-align: right; margin-top: 20px; }
            .totals-row { display: flex; justify-content: flex-end; margin: 5px 0; }
            .totals-label { width: 150px; font-weight: bold; }
            .totals-value { width: 100px; text-align: right; }
            .grand-total { font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PAYMENT RECEIPT</h1>
            <p>Receipt No: ${receiptData.receiptNumber}</p>
          </div>
          
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Date:</span> ${new Date(receiptData.date).toLocaleDateString()}</div>
            <div class="info-item"><span class="info-label">Payment Mode:</span> ${receiptData.paymentMode}</div>
            <div class="info-item"><span class="info-label">Supplier:</span> ${receiptData.supplier}</div>
            <div class="info-item"><span class="info-label">Reference No:</span> ${receiptData.referenceNumber || 'N/A'}</div>
            <div class="info-item"><span class="info-label">GRN Number:</span> ${receiptData.grnNumber}</div>
            <div class="info-item"><span class="info-label">PO Number:</span> ${receiptData.poNumber}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item Code</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Tax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${receiptData.items.map((item: GRNLineItem, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.item_code}</td>
                  <td>${item.description}</td>
                  <td>${item.accepted_quantity}</td>
                  <td>$${item.unit_price.toFixed(2)}</td>
                  <td>$${item.tax_amount.toFixed(2)}</td>
                  <td>$${item.total_amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <span class="totals-label">Subtotal:</span>
              <span class="totals-value">$${receiptData.subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span class="totals-label">Tax:</span>
              <span class="totals-value">$${receiptData.tax.toFixed(2)}</span>
            </div>
            <div class="totals-row grand-total">
              <span class="totals-label">Total Paid:</span>
              <span class="totals-value">$${receiptData.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const submitPayment = async () => {
    if (!selectedPayable || !paymentForm.payment_mode || !paymentForm.paid_amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const handleRecordPayment = async (payable: any) => {
      const paidAmount = Number(paymentForm.paid_amount);

      if (paidAmount <= 0 || paidAmount > Number(selectedPayable.balance)) {
        toast({
          title: "Invalid Amount",
          description: "Payment amount must be between 0 and balance amount",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await axios.post("/api/supplier-payables/payment", {
          payable_id: selectedPayable.id,
          payment_date: paymentForm.payment_date,
          payment_mode: paymentForm.payment_mode,
          reference_number: paymentForm.reference_number,
          paid_amount: paidAmount,
          remarks: paymentForm.remarks,
        });

        if (!response.data) {
          throw new Error("Payment failed");
        }

        toast({
          title: "Payment Recorded",
          description: `Payment of $${paidAmount.toFixed(2)} recorded successfully`,
        });

        setShowPaymentDialog(false);
        fetchPayables();

      } catch (error: any) {
        toast({
          title: "Error Recording Payment",
          description: error.response?.data?.message || error.message,
          variant: "destructive",
        });
      }
    };
  }

    const approvePayable = async (payableId: string) => {
      try {
        const response = await axios.patch(
          `/api/supplier-payables/${payableId}/approve`,
          {
            approved_at: new Date().toISOString(),
          }
        );

        if (!response.data) {
          throw new Error("Failed to approve payable");
        }

        toast({
          title: "Payable Approved",
          description: "Supplier payable has been approved",
        });

        fetchPayables();

        if (showDetailsDialog) {
          setShowDetailsDialog(false);
        }
      } catch (error: any) {
        toast({
          title: "Error Approving Payable",
          description: error.response?.data?.message || error.message,
          variant: "destructive",
        });
      }
    };

    const getStatusBadge = (status: string) => {
      const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
        "Pending": "secondary",
        "Approved": "default",
        "Paid": "default",
      };
      return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
    };

    const getPaymentStatusBadge = (status: string) => {
      const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
        "Unpaid": "destructive",
        "Partially Paid": "outline",
        "Paid": "default",
      };
      return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
    };

    // Calculate summary statistics
    const totalPayables = payables
      .filter(p => p.payment_status !== 'Paid')
      .reduce((sum, p) => sum + Number(p.balance || 0), 0);

    const overduePayables = payables
      .filter(p => p.due_date && new Date(p.due_date) < new Date() && p.payment_status !== 'Paid')
      .reduce((sum, p) => sum + Number(p.balance || 0), 0);

    const paidThisMonth = payables
      .filter(p => {
        const date = new Date(p.transaction_date);
        const now = new Date();
        return date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear() &&
          p.payment_status === 'Paid';
      })
      .reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);

    // Filter payables based on search
    const filteredPayables = payables.filter(p =>
      p.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.grn_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.po_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <Layout>
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Supplier Payables</h1>
              <p className="text-muted-foreground mt-2">
                Track vendor liabilities and payment obligations
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New Payment
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <StatCard
              title="Total Payables"
              value={`$${totalPayables.toFixed(2)}`}
              icon={DollarSign}
              trend={{ value: "0%", isPositive: false }}
            />
            <StatCard
              title="Overdue Payables"
              value={`$${overduePayables.toFixed(2)}`}
              icon={Clock}
              trend={{ value: "0%", isPositive: false }}
            />
            <StatCard
              title="Paid This Month"
              value={`$${paidThisMonth.toFixed(2)}`}
              icon={TrendingUp}
              trend={{ value: "0%", isPositive: true }}
            />
          </div>

          {/* Search & Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by vendor, reference, GRN, or PO number..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payables Ledger */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Payables</CardTitle>
              <CardDescription>Auto-generated from accepted GRNs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>GRN Number</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Loading payables...
                      </TableCell>
                    </TableRow>
                  ) : filteredPayables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No payables found. Accept a GRN to create supplier payables.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayables.map((payable) => (
                      <TableRow key={payable.id}>
                        <TableCell>{new Date(payable.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{payable.vendor}</TableCell>
                        <TableCell>{payable.po_number || '-'}</TableCell>
                        <TableCell>{payable.grn_number || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(payable.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(payable.paid_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          ${Number(payable.balance || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(payable.payment_status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(payable)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {payable.payment_status !== 'Paid' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRecordPayment(payable)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Create Payment Dialog - Oracle ERP Style */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
              {/* Dark Header */}
              <div className="bg-[#1a365d] text-white px-4 py-2 flex items-center justify-between">
                <DialogTitle className="text-sm font-medium text-white">
                  Supplier Payables - [New]
                </DialogTitle>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(95vh-120px)]">
                {/* Header Fields - Oracle ERP Grid Style */}
                <div className="grid grid-cols-12 gap-x-4 gap-y-3 text-sm">
                  {/* Row 1 - Supplier Selection */}
                  <div className="col-span-4 flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-20">Supplier *</Label>
                    <Select
                      value={formData.supplier}
                      onValueChange={handleSupplierChange}
                    >
                      <SelectTrigger className="h-8 text-sm bg-[#ffffc8] border-gray-400">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                     <SelectContent>
  {Array.isArray(vendors) &&
    vendors.map((vendor) => (
      <SelectItem key={vendor.id} value={vendor.vendor_name}>
        {vendor.vendor_name}
      </SelectItem>
    ))}
</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-28">GRN Number *</Label>
                    <div className="relative flex-1">
                      <Input
                        value={formData.grnNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, grnNumber: e.target.value }))}
                        className="h-8 text-sm bg-[#ffffc8] border-gray-400 pr-8"
                        placeholder="Enter GRN number"
                      />
                      {fetchingGRN && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-24">Payment Date</Label>
                    <Input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                      className="h-8 text-sm border-gray-400"
                    />
                  </div>

                  {/* Row 2 - Payment Details */}
                  <div className="col-span-4 flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-28">Payment Mode *</Label>
                    <Select
                      value={formData.paymentMode}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, paymentMode: v }))}
                    >
                      <SelectTrigger className="h-8 text-sm bg-[#ffffc8] border-gray-400">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-24">Reference No</Label>
                    <Input
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                      className="h-8 text-sm border-gray-400"
                      placeholder="Transaction reference"
                    />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-16">Status</Label>
                    <Input
                      value={formData.status}
                      readOnly
                      className="h-8 text-sm bg-gray-100 border-gray-400"
                    />
                  </div>

                  {/* Row 3 - Remarks */}
                  <div className="col-span-12 flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap w-20">Remarks</Label>
                    <Input
                      value={formData.remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                      className="h-8 text-sm border-gray-400 flex-1"
                      placeholder="Enter any remarks"
                    />
                  </div>
                </div>

                {/* Tabs Section */}
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="h-9 bg-gradient-to-b from-[#e8e8e8] to-[#d0d0d0] border border-gray-400 rounded-none p-0 w-auto">
                    <TabsTrigger
                      value="pending"
                      className="h-8 text-sm px-5 rounded-none data-[state=active]:bg-[#6699cc] data-[state=active]:text-white"
                    >
                      Pending Receipts
                    </TabsTrigger>
                    <TabsTrigger
                      value="lines"
                      className="h-8 text-sm px-5 rounded-none data-[state=active]:bg-[#6699cc] data-[state=active]:text-white"
                    >
                      Receipt Items
                    </TabsTrigger>
                    <TabsTrigger
                      value="summary"
                      className="h-8 text-sm px-5 rounded-none data-[state=active]:bg-[#6699cc] data-[state=active]:text-white"
                    >
                      Payment Summary
                    </TabsTrigger>
                  </TabsList>

                  {/* Pending Receipts Tab */}
                  <TabsContent value="pending" className="mt-0 border border-gray-400 border-t-0">
                    <div className="overflow-auto min-h-[200px] max-h-[300px]">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-gradient-to-b from-[#e8e8e8] to-[#d0d0d0] border-b border-gray-400">
                            <TableHead className="h-9 text-sm font-medium text-foreground w-12 border-r border-gray-300 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-400"
                                checked={pendingGRNDetails.filter(g => !g.isPaid).length > 0 &&
                                  pendingGRNDetails.filter(g => !g.isPaid).every(g => selectedGRNs.has(g.grn_number))}
                                onChange={handleSelectAllGRNs}
                                disabled={pendingGRNDetails.filter(g => !g.isPaid).length === 0}
                              />
                            </TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-36 border-r border-gray-300">GRN Number</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-32 border-r border-gray-300">PO Number</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-28 border-r border-gray-300">Receipt Date</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-28 border-r border-gray-300 text-right">Accepted Qty</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-28 border-r border-gray-300 text-right">Subtotal</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300 text-right">Tax</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-28 border-r border-gray-300 text-right">Total</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-20 text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingPendingGRNs ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : !formData.supplier ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                Select a supplier to view pending receipts
                              </TableCell>
                            </TableRow>
                          ) : pendingGRNDetails.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                No accepted receipts found for this supplier
                              </TableCell>
                            </TableRow>
                          ) : (
                            pendingGRNDetails.map((grn) => (
                              <TableRow
                                key={grn.id}
                                className={`border-b border-gray-300 hover:bg-blue-50 cursor-pointer ${grn.isPaid ? 'opacity-50 cursor-not-allowed' : ''} ${selectedGRNs.has(grn.grn_number) ? 'bg-blue-100' : ''}`}
                                onClick={() => !grn.isPaid && handleToggleGRN(grn)}
                              >
                                <TableCell className="p-2 border-r border-gray-300 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-400"
                                    checked={selectedGRNs.has(grn.grn_number)}
                                    onChange={() => handleToggleGRN(grn)}
                                    disabled={grn.isPaid}
                                  />
                                </TableCell>
                                <TableCell className="p-2 border-r border-gray-300 font-medium">{grn.grn_number}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300">{grn.po_number}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300">{new Date(grn.receipt_date).toLocaleDateString()}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300 text-right">{grn.total_accepted_qty}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300 text-right">${grn.subtotal.toFixed(2)}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300 text-right">${grn.tax.toFixed(2)}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300 text-right font-medium">${grn.total.toFixed(2)}</TableCell>
                                <TableCell className="p-2 text-center">
                                  {grn.isPaid ? (
                                    <Badge className="bg-green-500 text-white text-xs">Paid</Badge>
                                  ) : (
                                    <Badge className="bg-orange-500 text-white text-xs">Pending</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {selectedGRNs.size > 0 && (
                      <div className="p-2 bg-blue-50 border-t border-gray-300 text-sm">
                        <span className="font-medium">{selectedGRNs.size} GRN(s) selected</span>
                        <span className="ml-4">Total: <span className="font-bold">${totals.total.toFixed(2)}</span></span>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="lines" className="mt-0 border border-gray-400 border-t-0">
                    <div className="overflow-auto min-h-[200px] max-h-[300px]">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-gradient-to-b from-[#e8e8e8] to-[#d0d0d0] border-b border-gray-400">
                            <TableHead className="h-9 text-sm font-medium text-foreground w-14 border-r border-gray-300">#</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-32 border-r border-gray-300">Item Code</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground border-r border-gray-300">Description</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300 text-right">Accepted Qty</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300 text-right">Unit Price</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-20 border-r border-gray-300 text-right">Tax %</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-24 border-r border-gray-300 text-right">Tax Amount</TableHead>
                            <TableHead className="h-9 text-sm font-medium text-foreground w-28 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItems.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                {formData.grnNumber ? "No items found in this GRN" : "Select a supplier and GRN to view items"}
                              </TableCell>
                            </TableRow>
                          ) : (
                            lineItems.map((item, index) => (
                              <TableRow key={item.id} className="border-b border-gray-300 hover:bg-blue-50">
                                <TableCell className="p-2 border-r border-gray-300">{index + 1}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300 font-medium">{item.item_code}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300">{item.description}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300 text-right">{item.accepted_quantity}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300 text-right">${item.unit_price.toFixed(2)}</TableCell>
                                <TableCell className="p-2 border-r border-gray-300 text-right">{item.tax_percent}%</TableCell>
                                <TableCell className="p-2 border-r border-gray-300 text-right">${item.tax_amount.toFixed(2)}</TableCell>
                                <TableCell className="p-2 text-right font-medium">${item.total_amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="summary" className="mt-0 border border-gray-400 border-t-0 p-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Payment Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Supplier:</span>
                              <span className="font-medium">{formData.supplier || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">GRN Number:</span>
                              <span className="font-medium">{formData.grnNumber || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Payment Mode:</span>
                              <span className="font-medium">{formData.paymentMode || '-'}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Amount Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tax:</span>
                              <span className="font-medium">${totals.tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="font-semibold">Total Payable:</span>
                              <span className="font-bold text-lg">${totals.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Totals Footer */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {selectedGRNs.size} GRN(s) selected with {lineItems.length} item(s)
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Subtotal</div>
                      <div className="font-medium">${totals.subtotal.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Tax</div>
                      <div className="font-medium">${totals.tax.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="text-xl font-bold text-primary">${totals.total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 p-4 border-t bg-muted/30">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePay}
                  disabled={!formData.supplier || selectedGRNs.size === 0 || lineItems.length === 0 || !formData.paymentMode}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pay ${totals.total.toFixed(2)}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Receipt Dialog */}
          <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Payment Receipt
                </DialogTitle>
                <DialogDescription>
                  Payment has been recorded successfully
                </DialogDescription>
              </DialogHeader>

              {receiptData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Receipt Number</p>
                      <p className="font-bold">{receiptData.receiptNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(receiptData.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Supplier</p>
                      <p className="font-medium">{receiptData.supplier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Mode</p>
                      <p className="font-medium">{receiptData.paymentMode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">GRN Number</p>
                      <p className="font-medium">{receiptData.grnNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">PO Number</p>
                      <p className="font-medium">{receiptData.poNumber}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receiptData.items.map((item: GRNLineItem) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.item_code}</TableCell>
                            <TableCell className="text-right">{item.accepted_quantity}</TableCell>
                            <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${item.total_amount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${receiptData.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>${receiptData.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total Paid:</span>
                        <span className="text-green-600">${receiptData.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
                  Close
                </Button>
                <Button onClick={printReceipt}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Payment Dialog */}
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Record payment for {selectedPayable?.vendor}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold">${Number(selectedPayable?.total_amount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance Due</p>
                    <p className="text-lg font-bold text-destructive">${Number(selectedPayable?.balance || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="payment_date">Payment Date *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="payment_mode">Payment Mode *</Label>
                  <Select
                    value={paymentForm.payment_mode}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paid_amount">Amount Paid *</Label>
                  <Input
                    id="paid_amount"
                    type="number"
                    step="0.01"
                    value={paymentForm.paid_amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                    placeholder="Transaction reference"
                  />
                </div>

                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={paymentForm.remarks}
                    onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={submitPayment}>
                  Record Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Details Dialog */}
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Payable Details</DialogTitle>
                <DialogDescription>
                  View complete payable information
                </DialogDescription>
              </DialogHeader>

              {selectedPayable && (
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor</p>
                      <p className="font-medium">{selectedPayable.vendor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">GRN Number</p>
                      <p className="font-medium">{selectedPayable.grn_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">PO Number</p>
                      <p className="font-medium">{selectedPayable.po_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transaction Date</p>
                      <p className="font-medium">{new Date(selectedPayable.transaction_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      {getStatusBadge(selectedPayable.status)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      {getPaymentStatusBadge(selectedPayable.payment_status)}
                    </div>
                  </div>

                  {/* Amount Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Amount Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-lg font-bold">${Number(selectedPayable.total_amount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tax Amount</p>
                          <p className="text-lg font-medium">${Number(selectedPayable.tax_amount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Paid Amount</p>
                          <p className="text-lg font-medium text-green-600">${Number(selectedPayable.paid_amount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Balance</p>
                          <p className="text-lg font-bold text-destructive">${Number(selectedPayable.balance || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* GRN Items */}
                  {grnItems.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">GRN Items</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Accepted Qty</TableHead>
                              <TableHead className="text-right">Unit Price</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                           {Array.isArray(grnItems) && grnItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.item_code}</TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell className="text-right">{item.accepted_quantity}</TableCell>
                                <TableCell className="text-right">${Number(item.unit_price).toFixed(2)}</TableCell>
                                <TableCell className="text-right">${Number(item.total_amount || 0).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payment History */}
                  {paymentHistory.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Payment History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Mode</TableHead>
                              <TableHead>Reference</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Remarks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Array.isArray(paymentHistory) && paymentHistory.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                <TableCell>{payment.payment_mode}</TableCell>
                                <TableCell>{payment.reference_number || '-'}</TableCell>
                                <TableCell className="text-right font-medium">${Number(payment.paid_amount).toFixed(2)}</TableCell>
                                <TableCell>{payment.remarks || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <DialogFooter>
                {selectedPayable?.status === 'Pending' && (
                  <Button variant="outline" onClick={() => approvePayable(selectedPayable.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {selectedPayable?.payment_status !== 'Paid' && (
                  <Button onClick={() => {
                    setShowDetailsDialog(false);
                    handleRecordPayment(selectedPayable);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    );

  };


  export default SupplierPayables;
