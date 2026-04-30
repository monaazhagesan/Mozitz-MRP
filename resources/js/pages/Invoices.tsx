import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Eye, Edit, Trash2, FileText, DollarSign, Download, X, ChevronDown, ChevronRight, IndianRupee, AlertCircle, CheckCircle2, Receipt, Settings, RefreshCw, Bell, Calendar, Clock } from "lucide-react";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import axios, { AxiosResponse } from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "jspdf-autotable";
import html2pdf from "html2pdf.js";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import { createPortal } from "react-dom";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvoiceReports from "@/components/invoices/InvoiceReports";



interface InvoiceItem {
  id: string;
  description: string;
  hsn: string;
  material: string;
  quantity: number;
  rate: number;
  amount: number;
  sgst: number;
  cgst: number;
  tds?: number;
  discount?: number;

  sgst_percent: number;
  sgst_amount: number;
  cgst_percent: number;
  cgst_amount: number;
  igst_percent: number;
  igst_amount: number;
  vat_percent: number;
  vat_amount: number;
  sales_tax_percent: number;
  sales_tax_amount: number;
  tds_amount?: number;
  total?: number;

}

interface InvoiceTaxConfig {
  taxType: "VAT" | "Sales Tax" | "GST (India)";

  // For VAT & Sales Tax
  taxPercent?: number;

  // For GST
  gstType?: "IGST" | "CGST_SGST";
  gstPercent?: number;

  // Optional existing fields
  placeOfSupply?: string;
  addCess?: boolean;
  cessPercent?: number;
}



interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  invoice_number?: string;
  dueDate: string;
  referenceNo: string;
  customerName: string;
  customerGSTIN: string;
  customerAddress: string;
  customerPhone: string;
  businessName: string;
  businessGSTIN: string;
  businessPAN: string;
  businessAddress: string;
  businessPhone: string;
  contactPhone: string;
  contactEmail: string;

  bankAccountName: string;
  bankAccountNumber: string;
  bankIFSC: string;
  bankName: string;
  bankBranch: string;
  bankAccountType: "Current" | "Savings";

  terms: string;
  signatory: string;
  items: InvoiceItem[];
  subtotal: number;
  sgstTotal: number;
  cgstTotal: number;
  tdsTotal: number;
  total: number;
  amountPaid: number;
  payments: Payment[];
  status: "Draft" | "Sent" | "Paid" | "Pending" | "Overdue";
   isProforma?: boolean;
  currency?: string;
  exchangeRate?: number;

  taxType?: string;
  placeOfSupply?: string;
  gstType?: string;
  cessPercentage?: number;

  // Recurring / Frequency
  frequency?: string;
  startDate?: string;
  endAfter?: number;
  endDate?: string;

  // Reminder Fields
  beforeDueDays?: number;
  overdueReminderDays?: number;
}

const CURRENCY_OPTIONS: { code: string; sym: string; name: string; rate: number }[] = [
  { code: "INR", sym: "₹", name: "Indian Rupee", rate: 1 },
  { code: "USD", sym: "$", name: "US Dollar", rate: 83.5 },
  { code: "EUR", sym: "€", name: "Euro", rate: 90.2 },
  { code: "GBP", sym: "£", name: "British Pound", rate: 105.8 },
  { code: "AED", sym: "د.إ", name: "UAE Dirham", rate: 22.7 },
  { code: "SGD", sym: "S$", name: "Singapore Dollar", rate: 62.3 },
  { code: "JPY", sym: "¥", name: "Japanese Yen", rate: 0.55 },
];

interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  branch: string;
  accountType: "Current" | "Savings" | "";
}

interface RecurringInvoice {
  id: string;
  customer_name: string;
  customer_email: string | null;
  frequency: string;
  total_amount: number;
  next_invoice_date: string;
  status: string;
  completed_occurrences: number;
  occurrences: number;
  end_type: string;
  end_date: string | null;
  start_date: string;
  created_at: string;
}

const Invoices = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("invoices");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessGSTIN, setBusinessGSTIN] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessPAN, setBusinessPAN] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerGSTIN, setCustomerGSTIN] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [terms, setTerms] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [signatory, setSignatory] = useState("");
  const [useDigitalSignature, setUseDigitalSignature] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [reminder, setReminder] = useState(false);

  // Bank Details States
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIFSC, setBankIFSC] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccountType, setBankAccountType] = useState<"Current" | "Savings" | "">("");

  const [tdsAmount, setTdsAmount] = useState(0);

  // For example, fetched from API or stored in state
const [inventoryItems, setInventoryItems] = useState<{id: number; itemName: string}[]>([]);
const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);

  const [customers, setCustomers] = useState<{
    id: string;
    customer_name: string;
    gst_number?: string;
    customer_gstin?: string;
    customer_phone?: string;
    customer_address?: string;
    billing_address?: string;
    mobile?: string;
    customer_code?: string;
    gstin?: string;
    address?: string;
    phone?: string;
  }[]>([]);

  const [customerId, setCustomerId] = useState("");

  const [formIsProforma, setFormIsProforma] = useState(false);
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formExchangeRate, setFormExchangeRate] = useState<number>(1);
  const [formOrderRef, setFormOrderRef] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formCustomerEmail, setFormCustomerEmail] = useState("");
  const [formShipAddress, setFormShipAddress] = useState("");
  const [formDeliveryDate, setFormDeliveryDate] = useState("");
  const [formDispatchVia, setFormDispatchVia] = useState("");
  const [formTaxScheme, setFormTaxScheme] = useState<"gst" | "igst" | "vat" | "none" | "custom">("gst");
  const [formTaxRate, setFormTaxRate] = useState<string>("18");
  const [formCustomTaxRate, setFormCustomTaxRate] = useState<number>(0);
  const [formFreight, setFormFreight] = useState<number>(0);
  const [formOtherCharges, setFormOtherCharges] = useState<number>(0);
  const [formPaymentTerms, setFormPaymentTerms] = useState("30 Days Net");
  const [formBankInfo, setFormBankInfo] = useState("");
  const [formInternalRemarks, setFormInternalRemarks] = useState("");
    const [formInvoiceNo, setFormInvoiceNo] = useState("");
    const [formInvoiceDate, setFormInvoiceDate] = useState("");

  const [formDueDate, setFormDueDate] = useState("");
  const [formReferenceNo, setFormReferenceNo] = useState("");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerGSTIN, setFormCustomerGSTIN] = useState("");
  const [formCustomerAddress, setFormCustomerAddress] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formBusinessName, setFormBusinessName] = useState("");
  const [formBusinessGSTIN, setFormBusinessGSTIN] = useState("");
  const [formBusinessAddress, setFormBusinessAddress] = useState("");
  const [formBusinessPhone, setFormBusinessPhone] = useState("");
  const [formTerms, setFormTerms] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formSignatory, setFormSignatory] = useState("");
  const [formDigitalSignature, setFormDigitalSignature] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [currency, setCurrency] = useState("INR");
const [exchangeRate, setExchangeRate] = useState(1);

const [customerEmail, setCustomerEmail] = useState("");
const [contactPerson, setContactPerson] = useState("");

const [billingAddress, setBillingAddress] = useState("");
const [deliveryAddress, setDeliveryAddress] = useState("");

const [deliveryDate, setDeliveryDate] = useState("");
const [dispatchType, setDispatchType] = useState("");

const [remarks, setRemarks] = useState("");

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      description: "",
      hsn: "",
      material: "",
      quantity: 1,
      rate: 0,
      amount: 0,
      sgst: 0,
      cgst: 0,
      tds: 0,

      sgst_percent: 9,
      sgst_amount: 0,
      cgst_percent: 9,
      cgst_amount: 0,
      igst_percent: 0,
      igst_amount: 0,
      vat_percent: 0,
      vat_amount: 0,
      sales_tax_percent: 0,
      sales_tax_amount: 0,

    },
  ]);

  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountName: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
    branch: "",
    accountType: "",
  });

  const [filterStatus, setFilterStatus] = useState("All");
  const [filterClient, setFilterClient] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isGraphOpen, setIsGraphOpen] = useState(false);

  const [taxConfigOpen, setTaxConfigOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState("monthly");
  const [recurringStartDate, setRecurringStartDate] = useState("");
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringOccurrences, setRecurringOccurrences] = useState("12");
  const [recurringEndType, setRecurringEndType] = useState("occurrences");
  const [sendReminders, setSendReminders] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState("3");
  const [reminderOnDueDate, setReminderOnDueDate] = useState(true);
  const [reminderDaysAfter, setReminderDaysAfter] = useState("7");
  const [reminderAfterEnabled, setReminderAfterEnabled] = useState(true);

  const [editDropdownOpen, setEditDropdownOpen] = useState(false);
  const [taxType, setTaxType] = useState(""); // e.g., GST, VAT
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [gstType, setGstType] = useState(""); // CGST+SGST, IGST
  const [cessPercentage, setCessPercentage] = useState(0);

  const [frequency, setFrequency] = useState(""); // Monthly, Quarterly
  const [startDate, setStartDate] = useState("");
  const [endAfter, setEndAfter] = useState<number | null>(null); // number of occurrences
  const [endDate, setEndDate] = useState("");

  const [beforeDueDays, setBeforeDueDays] = useState<number | null>(null); // reminder before due
  const [overdueReminderDays, setOverdueReminderDays] = useState<number | null>(null); // reminder after overdue

  const [invoiceTaxConfig, setInvoiceTaxConfig] = useState<InvoiceTaxConfig>({
    taxType: "GST (India)",
    placeOfSupply: "",
    gstType: "CGST_SGST",
    addCess: false,
    gstPercent: 18,
    cessPercent: 0,
  });

  const [paymentDate, setPaymentDate] = useState("");

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const tdsTotal = invoiceItems.reduce((sum, i) => sum + (i.tds || 0), 0);

  const [searchTerm, setSearchTerm] = useState("");

  // Helper function to auto-generate invoice number
 const generateInvoiceNumber = (invoices: Invoice[]): string => {
    const year = new Date().getFullYear();

    // Filter invoices for the current year
    const currentYearInvoices = invoices.filter(inv =>
      inv.invoiceNo?.startsWith(`INV/${year}/`)
    );

    // Find the last sequence number
    let lastSeq = 0;
    currentYearInvoices.forEach(inv => {
      if (!inv.invoiceNo) return;
      const parts = inv.invoiceNo.split("/"); // ["INV", "2026", "001"]
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > lastSeq) lastSeq = seq;
    });

    const nextSeq = (lastSeq + 1).toString().padStart(3, "0"); // "001", "002", etc.
    return `INV/${year}/${nextSeq}`;
  };

  /*const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: "INV-001",
      invoiceNo: "INV/2025/001",
      invoiceDate: "2025-10-01",
      dueDate: "2025-10-15",
      referenceNo: "REF-001",
      customerName: "Acme Corp",
      customerGSTIN: "29AABCU9603R1ZN",
      customerAddress: "123 Business St, Mumbai",
      customerPhone: "+91 98765-43210",
      items: [],
      subtotal: 35000,
      sgstTotal: 3150,
      cgstTotal: 3150,
      tdsTotal: 0,
      total: 41300,
      amountPaid: 41300,
      payments: [
        { id: "P1", date: "2025-10-05", amount: 41300, method: "Bank Transfer", reference: "TXN001" }
      ],
      status: "Paid",
    },
    {
      id: "INV-002",
      invoiceNo: "INV/2025/002",
      invoiceDate: "2025-10-05",
      dueDate: "2025-10-20",
      referenceNo: "REF-002",
      customerName: "TechStart Inc",
      customerGSTIN: "27AABCT1332L1ZP",
      customerAddress: "456 Tech Park, Bangalore",
      customerPhone: "+91 98765-43211",
      items: [],
      subtotal: 28000,
      sgstTotal: 2520,
      cgstTotal: 2520,
      tdsTotal: 0,
      total: 33040,
      amountPaid: 15000,
      payments: [
        { id: "P2", date: "2025-10-10", amount: 15000, method: "Cash", reference: "CASH001" }
      ],
      status: "Pending",
    },
    {
      id: "INV-003",
      invoiceNo: "INV/2025/003",
      invoiceDate: "2025-09-25",
      dueDate: "2025-10-10",
      referenceNo: "REF-003",
      customerName: "Global Retail",
      customerGSTIN: "24AABCG5836L1Z4",
      customerAddress: "789 Retail Ave, Delhi",
      customerPhone: "+91 98765-43212",
      items: [],
      subtotal: 52000,
      sgstTotal: 4680,
      cgstTotal: 4680,
      tdsTotal: 0,
      total: 61360,
      amountPaid: 0,
      payments: [],
      status: "Overdue",
    },
  ]); */

   const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);

  // Fetch recurring invoices from database
const fetchRecurringInvoices = async () => {
  setRecurringLoading(true);

  try {
    const response = await axios.get("/api/recurring-invoices");

    setRecurringInvoices(response.data);
  } catch (error: any) {
    toast({
      title: "Error",
      description:
        error?.response?.data?.message ||
        "Failed to fetch recurring invoices.",
      variant: "destructive",
    });
  } finally {
    setRecurringLoading(false);
  }
};

  // Save recurring invoice to database
const saveRecurringInvoice = async (invoice: any) => {
  if (!recurringStartDate) {
    toast({
      title: "Error",
      description: "Please set a start date for recurring invoice.",
      variant: "destructive",
    });
    return;
  }

  try {
    console.log("🔍 Full invoice object received:", invoice);

    // ✅ FIX: Use UUID directly (NO Number(), NO integer check)
    const invoiceId = invoice?.id;

    if (!invoiceId) {
      throw new Error("Invalid invoice ID");
    }

    console.log("✅ Using invoice_id =", invoiceId);

    const payload = {
      invoice_id: invoiceId, // ✅ UUID STRING

      customer_name: formCustomerName?.trim() || "Customer",
      customer_email: formCustomerEmail || null,
      customer_gstin: formCustomerGSTIN || null,
      customer_address: formCustomerAddress || null,

      items: invoiceItems.map((item) => ({
        description: item.description || "",
        hsn: item.hsn || "",
        material: item.material || "",
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
        sgst: Number(item.sgst) || 0,
        cgst: Number(item.cgst) || 0,
        tds: Number(item.tds) || 0,
      })),

      tax_type: invoiceTaxConfig.taxType || "GST (India)",
      tax_config: invoiceTaxConfig || {},

      subtotal: formSubtotal,

      tax_amount: formTaxAmount,

      total_amount: formGrandTotal,

      frequency: recurringFrequency,
      start_date: recurringStartDate,
      end_type: recurringEndType || "never",

      occurrences:
        recurringEndType === "occurrences"
          ? parseInt(recurringOccurrences || "0", 10)
          : null,

      end_date: recurringEndType === "date" ? recurringEndDate : null,

      next_invoice_date: recurringStartDate,
      status: "active",

      notes: formNotes || null,

      send_reminders: Boolean(sendReminders),
      reminder_days_before: parseInt(reminderDaysBefore || "0", 10),
      reminder_on_due_date: Boolean(reminderOnDueDate),
      reminder_days_after: parseInt(reminderDaysAfter || "0", 10),
    };

    console.log("📦 Final Payload:", JSON.stringify(payload, null, 2));

    await axios.post("/api/recurring-invoices", payload);

    toast({
      title: "Recurring Invoice Created",
      description: `Recurring ${recurringFrequency} invoice set up successfully.`,
    });

    fetchRecurringInvoices();
  } catch (error: any) {
    console.error("❌ saveRecurringInvoice ERROR:", error);

    toast({
      title: "Recurring Save Failed",
      description:
        error?.response?.data?.message ||
        error.message ||
        "Failed to create recurring invoice.",
      variant: "destructive",
    });
  }
};

  // Pause/Resume recurring invoice
 const toggleRecurringStatus = async (id: string, currentStatus: string) => {
  try {
    const newStatus = currentStatus === "active" ? "paused" : "active";

    await axios.patch(`/api/recurring-invoices/${id}/status`, {
      status: newStatus,
    });

    toast({
      title: "Updated",
      description: `Recurring invoice ${newStatus}.`,
    });

    fetchRecurringInvoices();
  } catch (error: any) {
    toast({
      title: "Error",
      description:
        error?.response?.data?.message ||
        "Failed to update recurring status.",
      variant: "destructive",
    });
  }
};

  // Cancel recurring invoice
 const cancelRecurring = async (id: string) => {
  try {
    await axios.patch(`/api/recurring-invoices/${id}/cancel`);

    toast({
      title: "Cancelled",
      description: "Recurring invoice cancelled.",
    });

    fetchRecurringInvoices();
  } catch (error: any) {
    toast({
      title: "Error",
      description:
        error?.response?.data?.message ||
        "Failed to cancel recurring invoice.",
      variant: "destructive",
    });
  }
};

  // Trigger manual processing of recurring invoices
 const processRecurringNow = async () => {
  try {
    await axios.post("/api/recurring-invoices/process");

    toast({
      title: "Processed",
      description: "Recurring invoices processed successfully.",
    });

    fetchRecurringInvoices();
  } catch (err: any) {
    toast({
      title: "Error",
      description:
        err?.response?.data?.message || "Failed to process.",
      variant: "destructive",
    });
  }
};

  useEffect(() => {
    fetchRecurringInvoices();
  }, []);

  const calculateInvoiceStatus = (invoice: Invoice): Invoice["status"] => {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const amountDue = invoice.total - invoice.amountPaid;

    if (amountDue <= 0) {
      return "Paid";
    } else if (today > dueDate) {
      return "Overdue";
    } else if (invoice.amountPaid > 0) {
      return "Pending";
    }
    return invoice.status;
  };

  // Filtered invoices based on active filters
  const filteredInvoices = invoices.filter((inv) => {
    if (inv.isProforma) return false;
    const currentStatus = calculateInvoiceStatus(inv);
    if (filterStatus !== "All" && currentStatus !== filterStatus) return false;
    if (filterClient && !inv.customerName.toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (filterStartDate && new Date(inv.invoiceDate) < new Date(filterStartDate)) return false;
    if (filterEndDate && new Date(inv.invoiceDate) > new Date(filterEndDate)) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Draft: "bg-gray-100 text-gray-800 border-gray-200",
      Sent: "bg-blue-100 text-blue-800 border-blue-200",
      Paid: "bg-green-100 text-green-800 border-green-200",
      Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Overdue: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      <Badge variant="outline" className={colors[status]}>
        {status}
      </Badge>
    );
  };

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/customers");
        if (!res.ok) throw new Error("Failed to fetch customers");
        const data = await res.json();
        // assuming API returns [{ id: "acme", name: "Acme Corp" }, ...]
        setCustomers(data);
      } catch (err) {
        console.error(err);
      }
    };
  

    fetchCustomers();
  }, []);
  

  useEffect(() => {
  // Only when creating NEW invoice (not editing)
  if (isCreateDialogOpen && !selectedInvoice) {
    const nextInvoiceNo = generateInvoiceNumber(invoices);
    setInvoiceNumber(nextInvoiceNo);
    
  }
}, [isCreateDialogOpen, selectedInvoice, invoices]);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        const { data } = await axios.get("/api/company");

        if (data) {
          setBusinessName(data.name || "");
          setBusinessGSTIN(data.gstin || "");
          setBusinessPAN(data.pan || "");
          setBusinessAddress(data.address || "");
          setBusinessPhone(data.phone || "");
          setContactEmail(data.email || "");

          setBankAccountName(data.bank_account_name || "");
          setBankAccountNumber(data.bank_account_number || "");
          setBankIFSC(data.ifsc || "");
          setBankAccountType(
            data.account_type
              ? (data.account_type.charAt(0).toUpperCase() + data.account_type.slice(1) as "Current" | "Savings")
              : ""
          );
          setBankName(data.bank_name || "");
          setBankBranch(data.branch || "");
        }
      } catch (error: any) {
        console.error("Failed to load company details:", error);
      }
    };

    fetchCompanyDetails();
  }, []);

   useEffect(() => {
      const fetchInventoryItems = async () => {
        try {
          const response = await fetch("/api/inventory-stock"); // Your API endpoint
          if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to fetch inventory items:", errorData.message);
            return;
          }
  
          const data = await response.json();
          console.log("Raw API data:", data);
          console.log("Keys:", Object.keys(data));
          setInventoryItems(Array.isArray(data.items) ? data.items : []);
        } catch (error) {
          console.error("Error fetching inventory items:", error);
        }
      };
  
      fetchInventoryItems();
    }, []);
  

  useEffect(() => {
    if (!customerId) {
      setCustomerName("");
      setCustomerGSTIN("");
      setCustomerAddress("");
      setCustomerPhone("");
      setContactEmail("");
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setCustomerName(customer.customer_name);
      setCustomerGSTIN(customer.gst_number || "");
      setCustomerAddress(customer.billing_address || "");
      setCustomerPhone(customer.mobile || "");
    }
  }, [customerId, customers]);

  useEffect(() => {
    console.log("Customers:", customers);
  }, [customers]);

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount || !paymentMethod) return;

    const amount = parseFloat(paymentAmount);

    const paymentData: Payment = {
      id: `PAY-${Date.now()}`, // ✅ ADD THIS
      amount,
      method: paymentMethod,
      reference: paymentReference || `REF-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
    };

    try {
      await axios.post(
        `/api/invoices/${selectedInvoice.id}/payments`,
        paymentData
      );

      setInvoices((currentInvoices) =>
        currentInvoices.map((inv) => {
          if (inv.id !== selectedInvoice.id) return inv;

          const updatedInvoice: Invoice = {
            ...inv,
            amountPaid: inv.amountPaid + amount,
            payments: [...inv.payments, paymentData],
          };

          return {
            ...updatedInvoice,
            status: calculateInvoiceStatus(updatedInvoice),
          };
        })
      );

      toast({
        title: "Payment Recorded",
        description: `₹${amount.toLocaleString()} recorded for ${selectedInvoice.invoiceNo}`,
      });

      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setPaymentMethod("");
      setPaymentReference("");
      setSelectedInvoice(null);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to record payment.",
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
  console.log("viewInvoice changed:", viewInvoice);
}, [viewInvoice]);

  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setViewInvoice(invoice);
  };

  const canEditInvoice = (invoice: any) => {
  return invoice.status === "Draft" || invoice.amountPaid === 0;
};

/*  const handleEditInvoice = async (invoice: any) => {
    if (!invoice) {
      toast({
        title: "Error",
        description: "No invoice selected to edit.",
        variant: "destructive",
      });
      return;
    }

    setSelectedInvoice(invoice); // Set the invoice to state for editing

    try {
      // Prepare updated payload
      const updatedInvoice: any = {
        invoice_number: invoice.invoiceNo,
        invoice_date: invoiceDate,
        due_date: dueDate,
        reference_number: referenceNumber,
        customer_name: customerName,
        customer_gstin: customerGSTIN,
        customer_address: customerAddress,
        customer_phone: customerPhone,
        company_name: businessName,
        company_gstin: businessGSTIN,
        company_address: businessAddress,
        company_phone: businessPhone,
        company_pan: businessPAN,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        tax_type: invoiceTaxConfig.taxType || "None",
        gst_type: invoiceTaxConfig.gstType || "",
        place_of_supply: invoiceTaxConfig.placeOfSupply || "",
        cess_percentage: invoiceTaxConfig.cessPercent || 0,
        terms,
        signatory,
        items: invoiceItems,
         isProforma: formIsProforma,
              currency: formCurrency,
              exchangeRate: formExchangeRate,
        subtotal,
        tax_amount,
        total_amount,
        amount_paid: invoice.amountPaid || 0,
        sgst_total,
        cgst_total,
        igst_total,
        vat_total,
        sales_tax_total,
        tds_total,
        status,
      };

      const response = await axios.put(`/api/invoices/${invoice.id}`, updatedInvoice);

      // Update local state
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === invoice.id ? { ...inv, ...response.data } : inv
        )
      );

      toast({
        title: "Invoice Updated",
        description: `Invoice ${response.data.invoice_number} updated successfully.`,
      });

      setIsCreateDialogOpen(false);
      setInvoiceItems([]);
      setSelectedInvoice(null);

    } catch (error: any) {
      console.error("Invoice update failed:", error.response?.data || error.message);
      toast({
        title: "Error",
        description: `Failed to update invoice. ${error.response?.data?.message || ""}`,
        variant: "destructive",
      });
    }
  };
*/


  const handleDownloadInvoice = (invoice: Invoice) => {
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const amountDue = invoice.total - invoice.amountPaid;

    const numberToWords = (num: number): string => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      if (num === 0) return 'Zero';
      const convert = (n: number): string => {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
      };
      const rupees = Math.floor(num);
      const paise = Math.round((num - rupees) * 100);
      let result = convert(rupees) + ' Rupees';
      if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
      return result + ' Only';
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoice.invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; padding: 0; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .tax-invoice-label { background: #2563eb; color: white; padding: 6px 20px; font-size: 13px; font-weight: 600; letter-spacing: 1px; display: inline-block; margin-bottom: 20px; }
    .company-name { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .company-details p { font-size: 11px; color: #64748b; line-height: 1.6; }
    .billing-section { display: flex; gap: 40px; margin-bottom: 24px; background: #f8fafc; padding: 16px 20px; border-radius: 8px; }
    .billing-box { flex: 1; }
    .billing-box h3 { font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .billing-box p { font-size: 11px; line-height: 1.7; color: #475569; }
    .billing-box .name { font-weight: 600; font-size: 13px; color: #1e293b; }
    .invoice-meta { display: flex; gap: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .invoice-meta .meta-item { flex: 1; padding: 10px 16px; border-right: 1px solid #e2e8f0; }
    .invoice-meta .meta-item:last-child { border-right: none; }
    .invoice-meta .meta-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .invoice-meta .meta-value { font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 2px; }
    .items-section h3 { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #2563eb; color: white; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; text-align: right; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    td:last-child { text-align: right; }
    tr:nth-child(even) { background: #f8fafc; }
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-table { width: 280px; }
    .totals-table .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
    .totals-table .row.total { border-top: 2px solid #2563eb; padding-top: 10px; margin-top: 4px; font-weight: 700; font-size: 14px; color: #2563eb; }
    .amount-words { background: #f0f9ff; padding: 10px 16px; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #2563eb; }
    .amount-words .label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .amount-words .value { font-size: 12px; font-weight: 600; color: #1e293b; }
    .bank-section { background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; }
    .bank-section h3 { font-size: 12px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .bank-grid .item { display: flex; gap: 8px; font-size: 11px; }
    .bank-grid .item .label { color: #64748b; min-width: 110px; }
    .bank-grid .item .value { font-weight: 600; color: #1e293b; }
    .terms-section { margin-bottom: 24px; }
    .terms-section h3 { font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
    .terms-section p { font-size: 11px; color: #64748b; line-height: 1.6; }
    .signature-section { display: flex; justify-content: flex-end; margin-top: 40px; }
    .signature-box { text-align: center; }
    .signature-box .line { width: 200px; border-top: 1px solid #cbd5e1; margin-bottom: 4px; }
    .signature-box p { font-size: 11px; color: #64748b; }
    .signature-box .name { font-weight: 600; color: #1e293b; }
    .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
    @media print {
      body { padding: 0; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="tax-invoice-label">TAX INVOICE</div>
    
    <div class="billing-section">
      <div class="billing-box">
        <h3>Billed By</h3>
        <p class="name">${invoice.businessName}</p>
        <p>${invoice.businessAddress || 'N/A'}</p>
        <p>GSTIN: ${invoice.businessGSTIN || 'N/A'}</p>
        <p>PAN: ${invoice.businessPAN || 'N/A'}</p>
        <p>Email:${invoice.contactEmail || 'N/A'}</p>
         <p>Phone: ${invoice.businessPhone || 'N/A'}</p>
      </div>
      <div class="billing-box">
        <h3>Billed To</h3>
        <p class="name">${invoice.customerName}</p>
        <p>${invoice.customerAddress || 'N/A'}</p>
        <p>GSTIN: ${invoice.customerGSTIN || 'N/A'}</p>
        <p>Phone: ${invoice.customerPhone || 'N/A'}</p>
      </div>
    </div>

    <div class="invoice-meta">
      <div class="meta-item">
        <div class="meta-label">Invoice No #</div>
        <div class="meta-value">${invoice.invoiceNo}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Invoice Date</div>
        <div class="meta-value">${formatDate(invoice.invoiceDate)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Due Date</div>
        <div class="meta-value">${formatDate(invoice.dueDate)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Reference</div>
        <div class="meta-value">${invoice.referenceNo || 'N/A'}</div>
      </div>
    </div>

   <div class="items-section">
  <h3>Items</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>

        <!-- Conditional Tax Headers -->
        ${invoice.taxType === "GST (India)" && invoice.gstType === "CGST_SGST" ? `<th>SGST</th><th>CGST</th>` : ""}
        ${invoice.taxType === "GST (India)" && invoice.gstType === "IGST" ? `<th>IGST</th>` : ""}
        ${invoice.taxType === "VAT" ? `<th>VAT</th>` : ""}
        ${invoice.taxType === "Sales Tax" ? `<th>Sales Tax</th>` : ""}
        <th>TDS</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.length > 0 ? invoice.items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>₹${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td>₹${(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

          <!-- Conditional Tax Cells -->
          ${invoice.taxType === "GST (India)" && invoice.gstType === "CGST_SGST" ? `<td>₹${(item.sgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td>₹${(item.cgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "GST (India)" && invoice.gstType === "IGST" ? `<td>₹${(item.igst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "VAT" ? `<td>₹${(item.vat_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "Sales Tax" ? `<td>₹${(item.sales_tax_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}

         <td>₹${(item.tds_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td>₹${(item.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('') : `
        <tr>
  <td>1</td>
  <td>Invoice Items</td>
  <td>-</td>
  <td>1</td>
  <td>₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
  <td>₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

${invoice.taxType === "GST (India)" && invoice.gstType === "CGST_SGST" ? `<td>₹${(item.sgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td>₹${(item.cgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "GST (India)" && invoice.gstType === "IGST" ? `<td>₹${(item.igst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "VAT" ? `<td>₹${(item.vat_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "Sales Tax" ? `<td>₹${(item.sales_tax_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          <td>₹${(invoice.tds_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
  <td>₹${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
</tr>
      `}
    </tbody>
  </table>
</div>

<div class="totals-section">
  <div class="totals-table">
    ${invoice.items.length > 0 ? invoice.items.map((item, i) => `
      <div class="row"><span>Subtotal:</span><span>₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ${invoice.taxType === "GST (India)" && invoice.gstType === "CGST_SGST" ? `
        <div class="row"><span>SGST:</span><span>₹${(item.sgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        <div class="row"><span>CGST:</span><span>₹${(item.cgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ` : ""}
      ${invoice.taxType === "GST (India)" && invoice.gstType === "IGST" ? `
        <div class="row"><span>IGST:</span><span>₹${(item.igst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ` : ""}
      ${invoice.taxType === "VAT" ? `
        <div class="row"><span>VAT:</span><span>₹${(item.vat_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ` : ""}
      ${invoice.taxType === "Sales Tax" ? `
        <div class="row"><span>Sales Tax:</span><span>₹${(item.sales_tax_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ` : ""}
      <div class="row"><span>TDS:</span><span>₹${(item.tds_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      <div class="row total"><span>Total (INR):</span><span>₹${(item.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
    `).join('') : ""}
  </div>
</div>

    <div class="amount-words">
      <div class="label">Total In Words</div>
      <div class="value">${numberToWords(invoice.total)}</div>
    </div>

    <div class="bank-section">
      <h3>Bank Details</h3>
      <div class="bank-grid">
       <div class="item"><span class="label">Account Name:</span><span class="value">${bankAccountName || 'N/A'}</span></div>

<div class="item"><span class="label">Account Number:</span><span class="value">${bankAccountNumber || 'N/A'}</span></div>

<div class="item"><span class="label">IFSC:</span><span class="value">${bankIFSC || 'N/A'}</span></div>

<div class="item"><span class="label">Account Type:</span><span class="value">${bankAccountType || 'N/A'}</span></div>

<div class="item"><span class="label">Bank:</span><span class="value">${bankName || 'N/A'}</span></div>

<div class="item"><span class="label">Branch:</span><span class="value">${bankBranch || 'N/A'}</span></div>
      </div>
    </div>

    <div class="terms-section">
  <h3>Terms and Conditions</h3>
  <p>${invoice.terms || "Please quote invoice number when remitting funds."}</p>
</div>

    <div class="signature-section">
      <div class="signature-box">
      <p>${invoice.signatory ? invoice.signatory : "Your Company Name"}</p>
        <div class="line"></div>
        <p class="name">Authorized Signatory</p>
        
      </div>
    </div>

    <div class="footer">
      <span>Invoice ${invoice.invoiceNo} | ${formatDate(invoice.invoiceDate)} | ${invoice.customerName}</span>
      <span>Generated on ${new Date().toLocaleDateString('en-IN')}</span>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    toast({
      title: "Invoice Generated",
      description: `Invoice ${invoice.invoiceNo} opened for download/print.`,
    });
  };



const handleDownloadPDF = async (invoice: Invoice) => {
      const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const amountDue = invoice.total - invoice.amountPaid;

    const numberToWords = (num: number): string => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      if (num === 0) return 'Zero';
      const convert = (n: number): string => {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
      };
      const rupees = Math.floor(num);
      const paise = Math.round((num - rupees) * 100);
      let result = convert(rupees) + ' Rupees';
      if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
      return result + ' Only';
    };
    

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoice.invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; padding: 0; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .tax-invoice-label { background: #2563eb; color: white; padding: 6px 20px; font-size: 13px; font-weight: 600; letter-spacing: 1px; display: inline-block; margin-bottom: 20px; }
    .company-name { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .company-details p { font-size: 11px; color: #64748b; line-height: 1.6; }
    .billing-section { display: flex; gap: 40px; margin-bottom: 24px; background: #f8fafc; padding: 16px 20px; border-radius: 8px; }
    .billing-box { flex: 1; }
    .billing-box h3 { font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .billing-box p { font-size: 11px; line-height: 1.7; color: #475569; }
    .billing-box .name { font-weight: 600; font-size: 13px; color: #1e293b; }
    .invoice-meta { display: flex; gap: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .invoice-meta .meta-item { flex: 1; padding: 10px 16px; border-right: 1px solid #e2e8f0; }
    .invoice-meta .meta-item:last-child { border-right: none; }
    .invoice-meta .meta-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .invoice-meta .meta-value { font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 2px; }
    .items-section h3 { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #2563eb; color: white; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; text-align: right; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    td:last-child { text-align: right; }
    tr:nth-child(even) { background: #f8fafc; }
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-table { width: 280px; }
    .totals-table .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
    .totals-table .row.total { border-top: 2px solid #2563eb; padding-top: 10px; margin-top: 4px; font-weight: 700; font-size: 14px; color: #2563eb; }
    .amount-words { background: #f0f9ff; padding: 10px 16px; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #2563eb; }
    .amount-words .label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .amount-words .value { font-size: 12px; font-weight: 600; color: #1e293b; }
    .bank-section { background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; }
    .bank-section h3 { font-size: 12px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .bank-grid .item { display: flex; gap: 8px; font-size: 11px; }
    .bank-grid .item .label { color: #64748b; min-width: 110px; }
    .bank-grid .item .value { font-weight: 600; color: #1e293b; }
    .terms-section { margin-bottom: 24px; }
    .terms-section h3 { font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
    .terms-section p { font-size: 11px; color: #64748b; line-height: 1.6; }
    .signature-section { display: flex; justify-content: flex-end; margin-top: 40px; }
    .signature-box { text-align: center; }
    .signature-box .line { width: 200px; border-top: 1px solid #cbd5e1; margin-bottom: 4px; }
    .signature-box p { font-size: 11px; color: #64748b; }
    .signature-box .name { font-weight: 600; color: #1e293b; }
    .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
    @media print {
      body { padding: 0; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="tax-invoice-label">TAX INVOICE</div>
    
    <div class="billing-section">
      <div class="billing-box">
        <h3>Billed By</h3>
        <p class="name">${invoice.businessName}</p>
        <p>${invoice.businessAddress || 'N/A'}</p>
        <p>GSTIN: ${invoice.businessGSTIN || 'N/A'}</p>
        <p>PAN: ${invoice.businessPAN || 'N/A'}</p>
        <p>Email:${invoice.contactEmail || 'N/A'}</p>
         <p>Phone: ${invoice.businessPhone || 'N/A'}</p>
      </div>
      <div class="billing-box">
        <h3>Billed To</h3>
        <p class="name">${invoice.customerName}</p>
        <p>${invoice.customerAddress || 'N/A'}</p>
        <p>GSTIN: ${invoice.customerGSTIN || 'N/A'}</p>
        <p>Phone: ${invoice.customerPhone || 'N/A'}</p>
      </div>
    </div>

    <div class="invoice-meta">
      <div class="meta-item">
        <div class="meta-label">Invoice No #</div>
        <div class="meta-value">${invoice.invoiceNo}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Invoice Date</div>
        <div class="meta-value">${formatDate(invoice.invoiceDate)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Due Date</div>
        <div class="meta-value">${formatDate(invoice.dueDate)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Reference</div>
        <div class="meta-value">${invoice.referenceNo || 'N/A'}</div>
      </div>
    </div>

   <div class="items-section">
  <h3>Items</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>HSN Code</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>

        <!-- Conditional Tax Headers -->
        ${invoice.taxType === "GST (India)" && invoice.gstType === "CGST_SGST" ? `<th>SGST</th><th>CGST</th>` : ""}
        ${invoice.taxType === "GST (India)" && invoice.gstType === "IGST" ? `<th>IGST</th>` : ""}
        ${invoice.taxType === "VAT" ? `<th>VAT</th>` : ""}
        ${invoice.taxType === "Sales Tax" ? `<th>Sales Tax</th>` : ""}
        <th>TDS</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.length > 0 ? invoice.items.map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description}</td>
          <td>${item.hsn || '-'}</td>
          <td>${item.quantity}</td>
          <td>₹${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td>₹${(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

          <!-- Conditional Tax Cells -->
          ${invoice.taxType === "GST (India)" && invoice.gstType === "CGST_SGST" ? `<td>₹${(item.sgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td>₹${(item.cgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "GST (India)" && invoice.gstType === "IGST" ? `<td>₹${(item.igst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "VAT" ? `<td>₹${(item.vat_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "Sales Tax" ? `<td>₹${(item.sales_tax_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}

         <td>₹${(item.tds_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td>₹${(item.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('') : `
        <tr>
  <td>1</td>
  <td>Invoice Items</td>
  <td>-</td>
  <td>1</td>
  <td>₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
  <td>₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>

${invoice.taxType === "GST (India)" && invoice.gstType === "CGST_SGST" ? `<td>₹${(item.sgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td>₹${(item.cgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "GST (India)" && invoice.gstType === "IGST" ? `<td>₹${(item.igst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "VAT" ? `<td>₹${(item.vat_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          ${invoice.taxType === "Sales Tax" ? `<td>₹${(item.sales_tax_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` : ""}
          <td>₹${(invoice.tds_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
  <td>₹${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
</tr>
      `}
    </tbody>
  </table>
</div>

<div class="totals-section">
  <div class="totals-table">
    ${invoice.items.length > 0 ? invoice.items.map((item, i) => `
      <div class="row"><span>Subtotal:</span><span>₹${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ${invoice.taxType === "GST (India)" && invoice.gstType === "CGST_SGST" ? `
        <div class="row"><span>SGST:</span><span>₹${(item.sgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        <div class="row"><span>CGST:</span><span>₹${(item.cgst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ` : ""}
      ${invoice.taxType === "GST (India)" && invoice.gstType === "IGST" ? `
        <div class="row"><span>IGST:</span><span>₹${(item.igst_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ` : ""}
      ${invoice.taxType === "VAT" ? `
        <div class="row"><span>VAT:</span><span>₹${(item.vat_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ` : ""}
      ${invoice.taxType === "Sales Tax" ? `
        <div class="row"><span>Sales Tax:</span><span>₹${(item.sales_tax_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      ` : ""}
      <div class="row"><span>TDS:</span><span>₹${(item.tds_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      <div class="row total"><span>Total (INR):</span><span>₹${(item.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
    `).join('') : ""}
  </div>
</div>

    <div class="amount-words">
      <div class="label">Total In Words</div>
      <div class="value">${numberToWords(invoice.total)}</div>
    </div>

    <div class="bank-section">
      <h3>Bank Details</h3>
      <div class="bank-grid">
        <div class="item"><span class="label">Account Name:</span><span class="value">${invoice.bankAccountName || 'N/A'}</span></div>
        <div class="item"><span class="label">Account Number:</span><span class="value">${invoice.bankAccountNumber || 'N/A'}</span></div>
        <div class="item"><span class="label">IFSC:</span><span class="value">${invoice.bankIFSC || 'N/A'}</span></div>
        <div class="item"><span class="label">Account Type:</span><span class="value">${invoice.bankAccountType || 'N/A'}</span></div>
        <div class="item"><span class="label">Bank:</span><span class="value">${invoice.bankName || 'N/A'}</span></div>
        <div class="item"><span class="label">Branch:</span><span class="value">${invoice.bankBranch || 'N/A'}</span></div>
      </div>
    </div>

    <div class="terms-section">
  <h3>Terms and Conditions</h3>
  <p>${invoice.terms || "Please quote invoice number when remitting funds."}</p>
</div>

    <div class="signature-section">
      <div class="signature-box">
      <p>${invoice.signatory ? invoice.signatory : "Your Company Name"}</p>
        <div class="line"></div>
        <p class="name">Authorized Signatory</p>
        
      </div>
    </div>

    <div class="footer">
      <span>Invoice ${invoice.invoiceNo} | ${formatDate(invoice.invoiceDate)} | ${invoice.customerName}</span>
      <span>Generated on ${new Date().toLocaleDateString('en-IN')}</span>
    </div>
  </div>
</body>
</html>`;

// Create a temporary container for your invoice HTML
const container = document.createElement("div");
container.style.position = "fixed";
container.style.left = "-9999px";
container.innerHTML = html;
document.body.appendChild(container);

const element = container.querySelector(".page") as HTMLElement;
if (!element) return;

// html2pdf options
const options = {
  margin:       10,
  filename:     `Invoice-${invoice.invoiceNo}.pdf`,
  image:        { type: 'png', quality: 1 },
  html2canvas:  { scale: 2, useCORS: true, allowTaint: true },
  jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak:    { mode: ['css', 'legacy'] } // automatically split pages
};

// Generate PDF
html2pdf().set(options).from(element).save().finally(() => {
  document.body.removeChild(container);

  toast({
    title: "Invoice Downloaded",
    description: `Invoice ${invoice.invoiceNo} downloaded as PDF.`,
  });
});
};

  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
         id: String(Date.now()),
        description: "",
        hsn: "",
        material: "",
        quantity: 1,
        rate: 0,
        amount: 0,
        sgst: 0,
        cgst: 0,
        tds: 0,
         discount: 0,

        sgst_percent: 9,
        sgst_amount: 0,
        cgst_percent: 9,
        cgst_amount: 0,
        igst_percent: 0,
        igst_amount: 0,
        vat_percent: 0,
        vat_amount: 0,
        sales_tax_percent: 0,
        sales_tax_amount: 0,
      },
    ]);
  };

  const removeInvoiceItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter((item) => item.id !== id));
  };

  const updateInvoiceItem = (id: string, patch: Partial<InvoiceItem>) => {
    setInvoiceItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  };

  // Computed totals for the Create Invoice form (live summary)
  const calcLineAmount = (it: InvoiceItem) => {
    const gross = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
    const disc = (Number(it.discount) || 0) / 100;
    return gross * (1 - disc);
  };
  const formSubtotal = invoiceItems.reduce((s, it) => s + calcLineAmount(it), 0);
  const effectiveTaxRate =
    formTaxScheme === "none"
      ? 0
      : formTaxRate === "custom"
        ? Number(formCustomTaxRate) || 0
        : Number(formTaxRate) || 0;
  const formTaxableBase = formSubtotal + (Number(formFreight) || 0) + (Number(formOtherCharges) || 0);
  const formTaxAmount = (formTaxableBase * effectiveTaxRate) / 100;
  const formGrandTotal = formTaxableBase + formTaxAmount;
  const currencySym = CURRENCY_OPTIONS.find((c) => c.code === formCurrency)?.sym || "₹";
  const fmt = (n: number) =>
    `${currencySym}${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


  const calculateItemTotal = (quantity: number, rate: number) => {
    const amount = quantity * rate;
    let sgst = 0, cgst = 0, igst = 0;

    if (invoiceTaxConfig.taxType === "GST (India)") {
      const gstRate = 0.18; // 18% GST default
      const gstAmount = amount * gstRate;
      if (invoiceTaxConfig.gstType === "CGST_SGST") {
        sgst = gstAmount / 2;
        cgst = gstAmount / 2;
      } else {
        igst = gstAmount;
      }
    } else if (invoiceTaxConfig.taxType === "VAT") {
      sgst = amount * 0.09;
      cgst = amount * 0.09;
    }

    const total = amount + sgst + cgst + igst;
    return { amount, sgst, cgst, igst, total };
  };

 /* useEffect(() => {
    if (selectedInvoice) {
      // Customer Info
      setCustomerName(selectedInvoice.customerName || "");
      setCustomerPhone(selectedInvoice.customerPhone || "");
      setCustomerAddress(selectedInvoice.customerAddress || "");
      setCustomerGSTIN(selectedInvoice.customerGSTIN || "");

      // Company Info
      setBusinessName(selectedInvoice.businessName || "");
      setBusinessPhone(selectedInvoice.businessPhone || "");
      setBusinessAddress(selectedInvoice.businessAddress || "");
      setBusinessGSTIN(selectedInvoice.businessGSTIN || "");
      setBusinessPAN(selectedInvoice.businessPAN || "");

      // Invoice Dates & Reference
      setInvoiceDate(selectedInvoice.invoiceDate || "");
      setDueDate(selectedInvoice.dueDate || "");
      setReferenceNumber(selectedInvoice.referenceNumber || "");

      // Contact Info
      setContactPhone(selectedInvoice.contactPhone || "");
      setContactEmail(selectedInvoice.contactEmail || "");

      // Bank Info
      setBankAccountName(selectedInvoice.bankAccountName || "");
      setBankAccountNumber(selectedInvoice.bankAccountNumber || "");
      setBankIFSC(selectedInvoice.bankIFSC || "");
      setBankName(selectedInvoice.bankName || "");
      setBankBranch(selectedInvoice.bankBranch || "");
      setBankAccountType(selectedInvoice.bankAccountType || "");

      // Invoice items
      setInvoiceItems(selectedInvoice.items || []);

      // Terms & Signatory
      setTerms(selectedInvoice.terms || "");
      setSignatory(selectedInvoice.signatory || "");

      // Tax Info
      setInvoiceTaxConfig({
        taxType: selectedInvoice.taxType || "None",
        gstType: selectedInvoice.gstType || "",
        placeOfSupply: selectedInvoice.placeOfSupply || "",
        cessPercent: selectedInvoice.cessPercentage || 0,
      });

      // Recurring Info
      setIsRecurring(selectedInvoice.recurring || false);
      setRecurringFrequency(selectedInvoice.frequency || "");
      setRecurringStartDate(selectedInvoice.startDate || "");
      setRecurringEndType(selectedInvoice.endAfter ? "occurrences" : selectedInvoice.endDate ? "date" : "");
      setRecurringOccurrences(selectedInvoice.endAfter || 0);
      setRecurringEndDate(selectedInvoice.endDate || "");

      // Reminders
      setSendReminders(selectedInvoice.reminder || false);
      setReminderDaysBefore(selectedInvoice.reminderDaysBefore || 0);
      setReminderOnDueDate(selectedInvoice.reminderOnDueDate || false);
      setReminderAfterEnabled(selectedInvoice.reminderDaysAfter ? true : false);
      setReminderDaysAfter(selectedInvoice.reminderDaysAfter || 0);
    } else {
      // Clear fields for new invoice
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerGSTIN("");

      setBusinessName("");
      setBusinessPhone("");
      setBusinessAddress("");
      setBusinessGSTIN("");
      setBusinessPAN("");

      setInvoiceDate("");
      setDueDate("");
      setReferenceNumber("");

      setContactPhone("");
      setContactEmail("");

      setBankAccountName("");
      setBankAccountNumber("");
      setBankIFSC("");
      setBankName("");
      setBankBranch("");
      setBankAccountType("");

      setInvoiceItems([]);

      setTerms("");
      setSignatory("");

      setTaxType("");
      setPlaceOfSupply("");
      setGstType("");
      setCessPercentage(0);

      setIsRecurring(false);
      setRecurringFrequency("");
      setRecurringStartDate("");
      setRecurringEndType("");
      setRecurringOccurrences(0);
      setRecurringEndDate("");

      setSendReminders(false);
      setFormIsProforma(false);
    setFormCurrency("INR");
    setFormExchangeRate(1);
     setFormOrderRef("");
    setFormContactPerson("");
    setFormCustomerEmail("");
    setFormShipAddress("");
    setFormDeliveryDate("");
    setFormDispatchVia("");
    setFormTaxScheme("gst");
    setFormTaxRate("18");
    setFormCustomTaxRate(0);
    setFormFreight(0);
    setFormOtherCharges(0);
    setFormPaymentTerms("30 Days Net");
    setFormBankInfo("");
    setFormInternalRemarks("");
      setReminderDaysBefore(0);
      setReminderOnDueDate(false);
      setReminderAfterEnabled(false);
      setReminderDaysAfter(0);
    }
  }, [selectedInvoice]);
*/


  const openEditInvoice = (invoice: any) => {

    console.log("Full Invoice Object:", invoice);
   console.log("Invoice object passed to edit:", invoice);
  console.log("invoice.order_reference:", invoice.recurringEndDate);
    setSelectedInvoice(invoice); 

     setCustomerId(invoice.customerId  || "");

    // Prefill all form states
  setFormCustomerName(invoice.customerName || "");
    setCustomerPhone(invoice.customerPhone || "");
    setFormCustomerAddress(invoice.customerAddress || "");
    setFormCustomerGSTIN(invoice.customerGSTIN || "");
    setFormShipAddress(invoice.formShipAddress || "");

    setBusinessName(invoice.businessName || "");
    setBusinessPhone(invoice.businessPhone || "");
    setBusinessAddress(invoice.businessAddress || "");
    setBusinessGSTIN(invoice.businessGSTIN || "");
    setBusinessPAN(invoice.businessPAN || "");

     setInvoiceNumber(invoice.invoiceNo || "");
    setInvoiceDate(invoice.invoiceDate.split("T")[0]); // simplest
    setDueDate(invoice.dueDate.split("T")[0]);
    setReferenceNumber(invoice.referenceNumber || "");

    setContactPhone(invoice.ontactPhone || "");
    setContactEmail(invoice.ontactEmail || "");


      setFormOrderRef(invoice.formOrderRef ?? "");


    setBankAccountName(invoice.bankAccountName || "");
    setBankAccountNumber(invoice.bankAccountNumber || "");
    setBankIFSC(invoice.bankIFSC || ""); 
    setBankName(invoice.bankName || "");
    setBankBranch(invoice.bankBranch || "");
    setBankAccountType(invoice.bankAccountType || "");

    setInvoiceItems(invoice.items || []);

    setTerms(invoice.terms || "");
    setSignatory(invoice.signatory || "");

    setInvoiceTaxConfig({
      taxType: invoice.taxType || "None",
      gstType: invoice.gstType || "",
      placeOfSupply: invoice.placeOfSupply || "",
      cessPercent: invoice.cessPercentage || 0,
    });


    setFormDeliveryDate(invoice.formDeliveryDate.split("T")[0] || "");
  setFormDispatchVia(invoice.formDispatchVia || "");

    setFormContactPerson(invoice.formContactPerson || "");
      setFormCustomerEmail(invoice.formCustomerEmail || "");

        setFormFreight(invoice.formFreight || 0);
  setFormOtherCharges(invoice.formOtherCharges || 0);
  setFormNotes(invoice.formNotes || "");
  setFormInternalRemarks(invoice.formInternalRemarks || "");


    setIsRecurring(invoice.recurring || true);
    setRecurringFrequency(invoice.recurringFrequency || "");
    setRecurringStartDate(invoice.recurringStartDate.split("T")[0] || "");
    setRecurringEndType(invoice.recurringEndType ? "occurrences" : invoice.endDate ? "date" : "");
    setRecurringOccurrences(invoice.recurringOccurrences || 0);
setRecurringEndDate(invoice.recurringEndDate?.split("T")[0] || "");

    setSendReminders(invoice.reminder || true);
    setReminderDaysBefore(invoice.reminderDaysBefore || 0);
    setReminderOnDueDate(invoice.reminderOnDueDate || false);
    setReminderAfterEnabled(invoice.reminderDaysAfter ? true : false);
    setReminderDaysAfter(invoice.reminderDaysAfter || 0);

setFormIsProforma(
  invoice.type === "proforma" ||
  invoice.formIsProforma === "proforma"
);
    setFormCurrency(invoice.formCurrency || "INR");
    setFormExchangeRate(invoice.formExchangeRate ?? 1);
    setIsCreateDialogOpen(true); // finally open modal
  };

 /* const handleCreateInvoice = async (status: "Draft" | "Pending" = "Pending") => {
    // Validate that at least one item exists
    if (invoiceItems.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one invoice item.",
        variant: "destructive",
      });
      return;
    }

    const missingFields: string[] = [];

    if (!String(customerName ?? "").trim()) missingFields.push("Customer Name");
    if (!(customerPhone ?? "").trim()) missingFields.push("Cusomer Mobile");

    if (!(customerAddress ?? "").trim()) missingFields.push("Cusomer Address");
    if (!invoiceDate) missingFields.push("Invoice Date");
    if (!dueDate) missingFields.push("Due Date");
    if (!String(businessName ?? "").trim()) missingFields.push("Company Name");

    if (!(businessAddress ?? "").trim()) missingFields.push("Company Address");
    if (!(businessPhone ?? "").trim()) missingFields.push("Company Mobile");
    if (!(contactEmail ?? "").trim()) missingFields.push("Company Email");
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Phone validation (10 digits)
    const phone = String(customerPhone ?? "").replace(/\D/g, ""); // remove non-digits
    if (!/^\d{10}$/.test(phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Customer Phone number must be exactly 10 digits",
        variant: "destructive",
      });
      return;
    }


    const mobile = String(businessPhone ?? "").replace(/\D/g, ""); // remove non-digits
    if (!/^\d{10}$/.test(mobile)) {
      toast({
        title: "Invalid Phone Number",
        description: "Company Phone number must be exactly 10 digits",
        variant: "destructive",
      });
      return;
    }

    const mobile2 = String(contactPhone ?? "").replace(/\D/g, "");

    // Only validate if user typed something
    if (mobile2.length > 0 && !/^\d{10}$/.test(mobile2)) {
      toast({
        title: "Invalid Phone Number",
        description: "Contact Phone number must be exactly 10 digits",
        variant: "destructive",
      });
      return;
    }



    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (contactEmail && !emailRegex.test(contactEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Invoice & Due Date validation
    const invoiceDt = new Date(invoiceDate);
    const dueDt = new Date(dueDate);
    if (isNaN(invoiceDt.getTime()) || isNaN(dueDt.getTime())) {
      toast({
        title: "Invalid Date",
        description: "Invoice date or due date is invalid",
        variant: "destructive",
      });
      return;
    }
    if (dueDt < invoiceDt) {
      toast({
        title: "Invalid Due Date",
        description: "Due date cannot be before invoice date",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare items, only including what the user entered
      const itemsWithTotals = invoiceItems.map(item => {
        const quantity = Number(item.quantity) || 0;
        const unit_price = Number(item.rate) || 0;

        const amount = quantity * unit_price;
        // Initialize all tax fields
        let cgst_percent = 0, cgst_amount = 0;
        let sgst_percent = 0, sgst_amount = 0;
        let igst_percent = 0, igst_amount = 0;
        let vat_percent = 0, vat_amount = 0;
        let sales_tax_percent = 0, sales_tax_amount = 0;

        // Conditional logic based on invoiceTaxConfig
        if (invoiceTaxConfig.taxType === "GST (India)") {
          if (invoiceTaxConfig.gstType === "CGST_SGST") {
            cgst_percent = 9;
            sgst_percent = 9;
            cgst_amount = parseFloat((amount * cgst_percent / 100).toFixed(2));
            sgst_amount = parseFloat((amount * sgst_percent / 100).toFixed(2));
          } else if (invoiceTaxConfig.gstType === "IGST") {
            igst_percent = 18;
            igst_amount = parseFloat((amount * igst_percent / 100).toFixed(2));
          }
        } else if (invoiceTaxConfig.taxType === "VAT") {
          vat_percent = 12;
          vat_amount = parseFloat((amount * vat_percent / 100).toFixed(2));
        } else if (invoiceTaxConfig.taxType === "Sales Tax") {
          sales_tax_percent = 10;
          sales_tax_amount = parseFloat((amount * sales_tax_percent / 100).toFixed(2));
        }
        const tax_amount = sgst_amount + cgst_amount + igst_amount + vat_amount + sales_tax_amount;

        const tds_amount = Number(item.tds) || 0;
        const total = parseFloat((amount + tax_amount - tds_amount).toFixed(2));


        return {

          item_code: item.material || undefined,                // optional code, using material if available
          item: item.description || item.material || undefined, // frontend "item_name" -> backend "item"
          description: item.description || undefined,          // keeps description
          hsn: item.hsn || undefined,                           // HSN/SAC code
          material: item.material || undefined,                // material field
          quantity: Number(item.quantity) || 0,                // numeric quantity
          rate: Number(item.rate) || 0,                  // numeric rate/unit price
          sgst_percent: 9,                                     // default SGST %
          sgst_amount,            // SGST amount
          cgst_percent: 9,                                     // default CGST %
          cgst_amount,            // CGST amount
          total,                      // total after taxes
          tax_amount,             // total tax amount (SGST + CGST)
          tds_amount,


          igst_percent,
          igst_amount,
          vat_percent,
          vat_amount,
          sales_tax_percent,
          sales_tax_amount,
        };
      });

      // Compute totals

      const subtotal = itemsWithTotals.reduce((sum, i) => sum + i.rate, 0);
      const sgstTotal = itemsWithTotals.reduce((sum, i) => sum + i.sgst_amount, 0);
      const cgstTotal = itemsWithTotals.reduce((sum, i) => sum + i.cgst_amount, 0);
      const igstTotal = itemsWithTotals.reduce((sum, i) => sum + i.igst_amount, 0);
      const vatTotal = itemsWithTotals.reduce((sum, i) => sum + i.vat_amount, 0);
      const salesTaxTotal = itemsWithTotals.reduce((sum, i) => sum + i.sales_tax_amount, 0);

      const totalAmount = subtotal + sgstTotal + cgstTotal + igstTotal + vatTotal + salesTaxTotal;
      const taxAmount = itemsWithTotals.reduce((sum, i) => sum + i.sgst_amount + i.cgst_amount, 0);
      const tdsTotal = itemsWithTotals.reduce((sum, i) => sum + i.tds_amount, 0);


      // Prepare payload with only user-provided values
      const newInvoice: any = {};

      newInvoice.invoice_number = generateInvoiceNumber(invoices);

      if (invoiceDate) newInvoice.invoice_date = invoiceDate;
      if (dueDate) newInvoice.due_date = dueDate;
      if (referenceNumber) newInvoice.reference_number = referenceNumber;
      if (customerName) newInvoice.customer_name = customerName;
      if (customerGSTIN) newInvoice.customer_gstin = customerGSTIN;
      if (customerAddress) newInvoice.customer_address = customerAddress;
      if (customerPhone) newInvoice.customer_phone = customerPhone;

      if (businessName) newInvoice.company_name = businessName;
      if (businessGSTIN) newInvoice.company_gstin = businessGSTIN;
      if (businessAddress) newInvoice.company_address = businessAddress;
      if (businessPhone) newInvoice.company_phone = businessPhone;
      if (businessPAN) newInvoice.company_pan = businessPAN;

      if (bankAccountName) newInvoice.account_name = bankAccountName;
      if (bankAccountNumber) newInvoice.account_number = bankAccountNumber;
      if (bankIFSC) newInvoice.ifsc_code = bankIFSC;
      if (bankName) newInvoice.bank_name = bankName;
      if (bankBranch) newInvoice.branch_name = bankBranch;
      if (bankAccountType) newInvoice.account_type = bankAccountType;

      if (contactPhone) newInvoice.contact_phone = contactPhone;
      if (contactEmail) newInvoice.contact_email = contactEmail;

      if (taxType) newInvoice.tax_type = taxType;
      if (placeOfSupply) newInvoice.place_of_supply = placeOfSupply;
      if (gstType) newInvoice.gst_type = gstType;
      if (cessPercentage) newInvoice.cess_percentage = cessPercentage;

      if (isRecurring) {
        newInvoice.recurring = true;
        newInvoice.frequency = recurringFrequency;
        newInvoice.start_date = recurringStartDate;

        if (recurringEndType === "occurrences") newInvoice.end_after = recurringOccurrences;
        if (recurringEndType === "date") newInvoice.end_date = recurringEndDate;
      }

      if (sendReminders) {
        newInvoice.reminder = true;
        newInvoice.before_due_days = Number(reminderDaysBefore) || 0;
        newInvoice.on_due_date = reminderOnDueDate;
        if (reminderAfterEnabled) newInvoice.overdue_reminder_days = Number(reminderDaysAfter) || 0;
      }
      newInvoice.tax_type = invoiceTaxConfig.taxType || "None";
      newInvoice.place_of_supply = invoiceTaxConfig.placeOfSupply || "";
      newInvoice.gst_type = invoiceTaxConfig.gstType || "";
      newInvoice.cess_percentage = invoiceTaxConfig.cessPercent || 0;

      newInvoice.terms = terms;
      newInvoice.signatory = signatory;
      newInvoice.items = itemsWithTotals;
      newInvoice.subtotal = subtotal;
      newInvoice.tax_amount = taxAmount;
      newInvoice.total_amount = totalAmount;
      newInvoice.amount_paid = 0;
      newInvoice.payments = [];
      newInvoice.status = status;


      newInvoice.sgst_total = sgstTotal;
      newInvoice.cgst_total = cgstTotal;
      newInvoice.igst_total = igstTotal;
      newInvoice.vat_total = vatTotal;           // ✅ ADD THIS
      newInvoice.sales_tax_total = salesTaxTotal; // ✅ ADD THIS
      newInvoice.tds_total = tdsTotal;

      console.log("Payload being sent:", JSON.stringify(newInvoice, null, 2));

      const response = await axios.post("/api/invoices", newInvoice);

      // Update local state
      setInvoices(prev => [
        ...prev,
        {
          ...response.data,
          invoiceNo: response.data.invoice_number,
          invoiceDate: response.data.invoice_date,
          dueDate: response.data.due_date,
          referenceNo: response.data.reference_number,
          customerName: response.data.customer_name,
          customerGSTIN: response.data.customer_gstin,
          customerAddress: response.data.customer_address,
          customerPhone: response.data.customer_phone,
          businessName: response.data.company_name,
          businessGSTIN: response.data.company_gstin,
          businessAddress: response.data.company_address,
          businessPhone: response.data.company_phone,
          businessPAN: response.data.company_pan,
          contactPhone: response.data.contact_phone,
          contactEmail: response.data.contact_email,
          terms: response.data.terms,
          signatory: response.data.signatory,
          sgstTotal: response.data.tax_amount / 2,
          cgstTotal: response.data.tax_amount / 2,
          igstTotal: parseFloat(response.data.igst_total || 0),
          vatTotal: parseFloat(response.data.vat_total || 0),
          salesTaxTotal: parseFloat(response.data.sales_tax_total || 0),
          total: response.data.total_amount,
          amountPaid: response.data.amount_paid,
          bankAccountName: response.data.account_name,
          bankAccountNumber: response.data.account_number,
          bankIFSC: response.data.ifsc_code,
          bankName: response.data.bank_name,
          bankBranch: response.data.branch_name,
          bankAccountType: response.data.account_type,
          items: response.data.items || [],
          payments: response.data.payments || [],
          taxType: response.data.tax_type,
          placeOfSupply: response.data.place_of_supply,
          gstType: response.data.gst_type,
          cessPercentage: response.data.cess_percentage,
          frequency: response.data.frequency,
          startDate: response.data.start_date,
          endAfter: response.data.end_after,
          endDate: response.data.end_date,
          beforeDueDays: response.data.before_due_days,
          overdueReminderDays: response.data.overdue_reminder_days,
          reminderOnDueDate: response.data.on_due_date,
          tdsTotal: parseFloat(response.data.tds_total || 0),
        },
      ]);

      toast({
        title: "Invoice Created",
        description: `Invoice ${response.data.invoice_number} created successfully.`,
      });

      // Reset form
      setIsCreateDialogOpen(false);
      setInvoiceItems([]);
    } catch (error: any) {
      console.error("Invoice creation failed:", error.response?.data || error.message);
      toast({
        title: "Error",
        description: `Failed to create invoice. ${error.response?.data?.message || ""}`,
        variant: "destructive",
      });
    }
  };  */

const handleSaveInvoice = async (
  status: "Draft" | "Pending" = "Pending"
) => {
  const getErrorMessage = (error: any): string => {
    if (error.response) {
      const data = error.response.data;

      if (data?.message) return data.message;

      if (data?.errors) {
        return Object.entries(data.errors)
          .map(([field, msg]: [string, any]) =>
            `${field}: ${Array.isArray(msg) ? msg.join(", ") : msg}`
          )
          .join("; ");
      }

      return JSON.stringify(data);
    }

    return error.message || "An unknown error occurred.";
  };

  try {
    // ========================
    // 1️⃣ VALIDATION
    // ========================
    if (!invoiceItems || invoiceItems.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one invoice item.",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceDate || !dueDate) {
      toast({
        title: "Missing Date",
        description: "Invoice date and due date are required.",
        variant: "destructive",
      });
      return;
    }

    const invoiceDt = new Date(invoiceDate);
    const dueDt = new Date(dueDate);

    if (Number.isNaN(invoiceDt.getTime()) || Number.isNaN(dueDt.getTime())) {
      toast({
        title: "Invalid Date",
        description: "Please select valid dates.",
        variant: "destructive",
      });
      return;
    }

    if (dueDt < invoiceDt) {
      toast({
        title: "Invalid Due Date",
        description: "Due date cannot be before invoice date.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formCustomerEmail && !emailRegex.test(formCustomerEmail)) {
      toast({
        title: "Invalid Email",
        description: "Enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // ========================
    // 2️⃣ ITEM CALCULATION
    // ========================

    const itemsWithTotals = invoiceItems.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const shipping = Number(item.shipping) || 0;

      const amount = quantity * rate;

      let cgst_amount = 0,
        sgst_amount = 0,
        igst_amount = 0,
        vat_amount = 0,
        sales_tax_amount = 0;

      if (invoiceTaxConfig.taxType === "GST (India)") {
        if (invoiceTaxConfig.gstType === "CGST_SGST") {
          cgst_amount = amount * 0.09;
          sgst_amount = amount * 0.09;
        } else {
          igst_amount = amount * 0.18;
        }
      } else if (invoiceTaxConfig.taxType === "VAT") {
        vat_amount = amount * 0.12;
      } else if (invoiceTaxConfig.taxType === "Sales Tax") {
        sales_tax_amount = amount * 0.1;
      }

      const tax_amount =
        cgst_amount +
        sgst_amount +
        igst_amount +
        vat_amount +
        sales_tax_amount;

      const tds_amount = Number(item.tds) || 0;

      const total = amount + tax_amount - tds_amount + shipping;

      return {
        ...item,
        quantity,
        rate,
        amount,
        shipping,
        cgst_amount,
        sgst_amount,
        igst_amount,
        vat_amount,
        sales_tax_amount,
        tax_amount,
        tds_amount,
        total: +total.toFixed(2),
      };
    });

    // ========================
    // 3️⃣ TOTALS
    // ========================

    const subtotal = itemsWithTotals.reduce((s, i) => s + i.amount, 0);

    const sgstTotal = itemsWithTotals.reduce((s, i) => s + i.sgst_amount, 0);
    const cgstTotal = itemsWithTotals.reduce((s, i) => s + i.cgst_amount, 0);
    const igstTotal = itemsWithTotals.reduce((s, i) => s + i.igst_amount, 0);
    const vatTotal = itemsWithTotals.reduce((s, i) => s + i.vat_amount, 0);
    const salesTaxTotal = itemsWithTotals.reduce(
      (s, i) => s + i.sales_tax_amount,
      0
    );

    const tdsTotal = itemsWithTotals.reduce((s, i) => s + i.tds_amount, 0);
    const shippingTotal = itemsWithTotals.reduce((s, i) => s + i.shipping, 0);

    const taxAmount =
      sgstTotal + cgstTotal + igstTotal + vatTotal + salesTaxTotal;

    const freight = Number(formFreight) || 0;
    const otherCharges = Number(formOtherCharges) || 0;

    const baseTotal =
      subtotal +
      taxAmount -
      tdsTotal +
      shippingTotal +
      freight +
      otherCharges;

    const exchange = Number(exchangeRate) || 1;

    const totalAmount =
      currency === "INR" ? baseTotal : baseTotal * exchange;

    // ========================
    // 4️⃣ INVOICE NUMBER
    // ========================

    const invoiceNumber =
      selectedInvoice?.invoice_number ||
      generateInvoiceNumber(invoices);

    // ========================
    // 5️⃣ PAYLOAD
    // ========================

    const payload: any = {
      invoice_date: invoiceDate,
      due_date: dueDate,
      delivery_date: formDeliveryDate || null,
      dispatch_type: formDispatchVia || null,

      customer_id: customerId ? Number(customerId) : null,
      customer_name: formCustomerName,
      customer_phone: formCustomerPhone,
      customer_email: formCustomerEmail || null,
      contact_person: formContactPerson || null,

      customer_address: formCustomerAddress,
      billing_address: formCustomerAddress || null,
      delivery_address: formShipAddress || null,
      customer_gstin: formCustomerGSTIN,

      company_name: businessName,
      company_phone: businessPhone,
      company_address: businessAddress,
      company_gstin: businessGSTIN,
      company_pan: businessPAN,

      contact_phone: contactPhone,
      contact_email: contactEmail,

      bank_name: bankName,
      notes: formNotes,

      currency: formCurrency || "INR",
      exchange_rate: formExchangeRate,
      order_reference: (formOrderRef ?? "").trim() || null,

      tax_type: invoiceTaxConfig.taxType,
      gst_type: invoiceTaxConfig.gstType,

      items: itemsWithTotals,

      invoice_number: invoiceNumber,

      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,

      sgst_total: sgstTotal,
      cgst_total: cgstTotal,
      igst_total: igstTotal,
      vat_total: vatTotal,
      sales_tax_total: salesTaxTotal,
      tds_total: tdsTotal,

      shipping_charge: formFreight || 0,
      freight,
      other_charges: otherCharges,

      amount_paid: 0,
      payments: [],

      terms,
      signatory,
      remarks: formInternalRemarks || null,
      status: status,

      // Recurring fields - Safer handling to avoid 422
      frequency: isRecurring ? recurringFrequency : null,
      start_date: isRecurring && recurringStartDate ? recurringStartDate : null,
      end_after: isRecurring && recurringEndType === "occurrences" && recurringOccurrences 
                 ? Number(recurringOccurrences) 
                 : null,
      end_date: isRecurring && recurringEndType === "date" && recurringEndDate 
                ? recurringEndDate 
                : null,

      reminder: Boolean(sendReminders),
      before_due_days: sendReminders && reminderDaysBefore ? Number(reminderDaysBefore) : null,
      reminder_on_due_date: Boolean(sendReminders && reminderOnDueDate),
      overdue_reminder_days: reminderAfterEnabled && reminderDaysAfter 
                             ? Number(reminderDaysAfter) 
                             : null,

      type: formIsProforma ? "proforma" : "invoice",
    };

    console.log("🚀 FINAL PAYLOAD:", payload);

    // ========================
    // 6️⃣ API CALL
    // ========================

    let response: AxiosResponse<Invoice>;

    if (selectedInvoice?.id) {
      response = await axios.put(`/api/invoices/${selectedInvoice.id}`, payload);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === selectedInvoice.id ? response.data : inv))
      );
    } else {
      response = await axios.post("/api/invoices", payload);
      setInvoices((prev) => [...prev, response.data]);
    }

    // Save Recurring if enabled
    if (isRecurring) {
      try {
        await saveRecurringInvoice(response.data);
      } catch (recErr) {
        console.warn("Recurring save warning:", recErr);
      }
    }

    // Refresh both lists
    await fetchInvoices();
    await fetchRecurringInvoices();

    // Success Message
   

    // ========================
    // 7️⃣ RESET
    // ========================
    setIsCreateDialogOpen(false);
    setInvoiceItems([]);
    setSelectedInvoice(null);
    setIsRecurring(false);

  } catch (error: any) {
    console.error("❌ INVOICE SAVE ERROR:", error);
    toast({
      title: "Failed to save invoice",
      description: getErrorMessage(error),
      variant: "destructive",
    });
  }
};

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCustomerChange = (id) => {
    console.log("👉 Selected Customer ID:", id);
  console.log("👉 ID type:", typeof id);

  setCustomerId(id);

const customer = customers.find(
  c => String(c.id) === String(id)
);

  if (customer) {

    setFormCustomerName(customer.customer_name || "");

    setFormCustomerGSTIN(
      customer.gst_number ||
      customer.customer_gstin ||
      customer.gstin ||
      ""
    );

    setFormCustomerAddress(
      customer.billing_address ||
      customer.address ||
      ""
    );

    setFormCustomerPhone(
      customer.mobile ||
      customer.phone ||
      ""
    );

    setFormCustomerEmail(customer.email || "");
    setFormContactPerson(customer.contact_person || "");
  }
};

  const fetchInvoices = async () => {
    try {
      const response = await axios("/api/invoices");
      console.log("Invoice response:", response.data);
      const formatted = response.data.map((inv: any) => ({
        id: inv.id,
        customerId: inv.customer_id,
        invoiceNo: inv.invoice_number,
        referenceNumber: inv.reference_number,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        referenceNo: inv.reference_number,
        customerName: inv.customer_name,
        customerGSTIN: inv.customer_gstin,
        customerAddress: inv.customer_address,
        customerPhone: inv.customer_phone,
        businessName: inv.company_name,
        businessGSTIN: inv.company_gstin,
        businessAddress: inv.company_address,
        businessPhone: inv.company_phone,
        businessPAN: inv.company_pan,
        bankAccountName: inv.account_name || "",
        bankAccountNumber: inv.account_number || "",
        bankIFSC: inv.ifsc_code || "",
        bankName: inv.bank_name || "",
        bankBranch: inv.branch_name || "",
        bankAccountType: inv.account_type || "",
        items: inv.items || [],
        terms: inv.terms || "",
        signatory: inv.signatory || "",
        subtotal: parseFloat(inv.subtotal),
        tds_amount: parseFloat(inv.tds_total || 0),
        sgstTotal: parseFloat(inv.tax_amount) / 2,
        cgstTotal: parseFloat(inv.tax_amount) / 2,
        igstTotal: parseFloat(inv.igst_total || 0), 
        vatTotal: parseFloat(inv.vat_total || 0),
        salesTaxTotal: parseFloat(inv.sales_tax_total || 0),
        total: parseFloat(inv.total_amount),
        amountPaid: parseFloat(inv.amount_paid),
        taxType: inv.tax_type,
        gstType: inv.gst_type,
        placeOfSupply: inv.place_of_supply,
        contactEmail: inv.contact_email,     // <-- ADD THIS
        formCustomerEmail: inv.customer_email,
        contactPhone: inv.contact_phone,  
        formFreight: parseFloat(inv.shipping_charge || 0),
        formOtherCharges: parseFloat(inv.other_charges || 0),
        formNotes: inv.notes || "",
        formInternalRemarks: inv.remarks || "",
        recurringFrequency: inv.frequency || "",
        recurringOccurrences:  inv.end_after || 0,
        recurringStartDate: inv.start_date || "",
        reminderDaysBefore: inv.before_due_days || 0,
        reminderOnDueDate: inv.reminder_on_due_date || false,
        reminderDaysAfter: inv.overdue_reminder_days || 0,
         reminderAfterEnabled: inv.overdue_reminder_days ? true : false,
         recurringEndType: inv.end_after ? "occurrences" : inv.end_date ? "date" : "",
         recuringEndDate: inv.end_date || "",
         reccuringEndAfter: inv.end_after || 0,
         
        cessPercentage: inv.cess_percentage || 0,
        tdsTotal: parseFloat(inv.tds_total || 0), 
        formOrderRef: inv.order_reference || "",
        formContactPerson: inv.contact_person || "",
        formShipAddress: inv.delivery_address || "",
        formDeliveryDate: inv.delivery_date || "",
        formCurrency: inv.currency || "INR",
        formExchangeRate: inv.exchange_rate || 1,
        formDispatchVia: inv.dispatch_type || "",
        type: inv.type || null,
  isProforma: inv.type === "proforma" || inv.is_proforma === true,
  formIsProforma: inv.type === "proforma",
        payments: (inv.payments || []).map((p: any) => ({
          id: p.id,
          amount: parseFloat(p.amount),
          method: p.method,
          reference: p.reference,
          date: p.date || p.payment_date || p.created_at, // handle all cases
        })),
        status: inv.status,
      }));
      setInvoices(formatted);
    } catch (error) {
      console.error(error);
    }
  };


  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground mt-2">
              Manage and track all invoices
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] xl:max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">Create New Invoice</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 sm:space-y-6">
                {/* Two-column layout: form (left) + sticky live summary (right) */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
                  {/* LEFT: form sections */}
                  <div className="space-y-4">
                    {/* Invoice Details */}
                    <Card>
                      <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <span className="text-amber-500">✦</span>
                          Invoice Details
                          {formIsProforma && (
                            <Badge variant="secondary" className="ml-1">Pro-forma</Badge>
                          )}
                           </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formIsProforma ? "Pro-forma Invoice" : "Standard Invoice"}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormIsProforma((p) => !p);
                              const nextProforma = !formIsProforma;
                              if (!formInvoiceNo || formInvoiceNo.startsWith("PF-") || formInvoiceNo.startsWith("INV-")) {
                                const seq = String(invoices.length + 1).padStart(4, "0");
                                setFormInvoiceNo(nextProforma ? `PF-${seq}` : `INV-${seq}`);
                              }
                            }}
                          >
                            {formIsProforma ? "Set Standard" : "Set Pro-forma"}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6 pt-0 sm:pt-0">
                         <div className="space-y-2">
                      <Label>Invoice No*</Label>
                      <Input
                        placeholder="INV/2025/001"
                        value={invoiceNumber}
                        readOnly
                      />
                    </div>
                        <div className="space-y-2">
                          <Label>Invoice Date</Label>
<Input
  type="date"
  value={invoiceDate}
  onChange={(e) => setInvoiceDate(e.target.value)}
/>                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
<Input
  type="date"
  value={dueDate}
  onChange={(e) => setDueDate(e.target.value)}
/>                        </div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <Select
                            value={formCurrency}
                            onValueChange={(v) => {
                              setFormCurrency(v);
                              const cur = CURRENCY_OPTIONS.find((c) => c.code === v);
                              if (cur) setFormExchangeRate(cur.rate);
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CURRENCY_OPTIONS.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.sym} {c.code} — {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Exchange Rate (to INR)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formExchangeRate}
                            onChange={(e) => setFormExchangeRate(parseFloat(e.target.value) || 0)}
                            disabled={formCurrency === "INR"}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Order Reference</Label>
                          <Input
                            placeholder="SO-0001 / manual"
                            value={formOrderRef}
                            onChange={(e) => setFormOrderRef(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bill To & Ship To */}
                    <Card>
                      <CardContent className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Bill To
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <div className="space-y-2">
  <Label>Customer Name *</Label>

  {/* ✅ Select Customer */}
<Select value={customerId} onValueChange={handleCustomerChange}>
    <SelectTrigger>
      <SelectValue placeholder="Select Customer" />
    </SelectTrigger>

    <SelectContent>
      {customers.map((cust) => (
        <SelectItem key={cust.id} value={cust.id}>
          {cust.customer_name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

 
</div>
                            <div className="space-y-2">
                              <Label>GSTIN / VAT No.</Label>
                              <Input
                                placeholder="Tax ID"
                                value={formCustomerGSTIN}
                                onChange={(e) => setFormCustomerGSTIN(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label>Billing Address</Label>
                              <Textarea
                                rows={2}
                                placeholder="Street, City, State, PIN"
                                value={formCustomerAddress}
                                onChange={(e) => setFormCustomerAddress(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Contact Person</Label>
                              <Input
                                placeholder="Name"
                                value={formContactPerson}
                                onChange={(e) => setFormContactPerson(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input
                                type="email"
                                placeholder="email@company.com"
                                value={formCustomerEmail}
                                onChange={(e) => setFormCustomerEmail(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Ship To (if different)
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Delivery Address</Label>
                              <Textarea
                                rows={2}
                                placeholder="Leave blank if same as billing"
                                value={formShipAddress}
                                onChange={(e) => setFormShipAddress(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Delivery Date</Label>
                              <Input
                                type="date"
                                value={formDeliveryDate}
                                onChange={(e) => setFormDeliveryDate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Dispatch Via</Label>
                              <Input
                                placeholder="Transport / courier"
                                value={formDispatchVia}
                                onChange={(e) => setFormDispatchVia(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Items */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <span className="text-emerald-500">◈</span>
                          Items
                          <span className="text-xs font-normal text-muted-foreground">
                            ({invoiceItems.length})
                          </span>
                        </CardTitle>
                        <Button size="sm" onClick={addInvoiceItem}>
                          <Plus className="h-4 w-4 mr-1" /> Add Item
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-2">
                        {invoiceItems.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            Click <b className="text-foreground">+ Add Item</b> to begin
                          </div>
                        ) : (
                          <>
                            <div className="hidden md:grid grid-cols-[2fr_0.8fr_1fr_0.8fr_1fr_40px] gap-2 px-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              <span>Description</span>
                              <span>Qty</span>
                              <span>Unit Price</span>
                              <span>Disc %</span>
                              <span className="text-right">Amount</span>
                              <span></span>
                            </div>
                            {invoiceItems.map((item) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-1 md:grid-cols-[2fr_0.8fr_1fr_0.8fr_1fr_40px] gap-2 items-center border rounded-md p-2 md:border-0 md:p-0"
                              >
                                <Input
                                  placeholder="Item description"
                                  value={item.description}
                                  onChange={(e) => updateInvoiceItem(item.id, { description: e.target.value })}
                                />
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.quantity}
                                  onChange={(e) => updateInvoiceItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                                />
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.rate}
                                  onChange={(e) => updateInvoiceItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                                />
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={item.discount ?? 0}
                                  onChange={(e) => updateInvoiceItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                                />
                                <div className="text-right font-mono text-sm font-semibold">
                                  {fmt(calcLineAmount(item))}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeInvoiceItem(item.id)}
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Tax & Charges */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <span className="text-purple-500">%</span>
                          Tax & Charges
                        </CardTitle>
                        <span className="text-xs text-muted-foreground uppercase">
                          {formTaxScheme === "gst" && "GST Mode"}
                          {formTaxScheme === "igst" && "IGST Mode"}
                          {formTaxScheme === "vat" && "VAT Mode"}
                          {formTaxScheme === "none" && "Tax Exempt"}
                          {formTaxScheme === "custom" && "Custom Tax"}
                        </span>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Tax Scheme</Label>
                            <Select
                              value={formTaxScheme}
                              onValueChange={(v) => setFormTaxScheme(v as typeof formTaxScheme)}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gst">GST (India)</SelectItem>
                                <SelectItem value="igst">IGST (Inter-state India)</SelectItem>
                                <SelectItem value="vat">VAT (International)</SelectItem>
                                <SelectItem value="none">No Tax / Tax Exempt</SelectItem>
                                <SelectItem value="custom">Custom Tax</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Tax Rate (%)</Label>
                            <Select
                              value={formTaxRate}
                              onValueChange={setFormTaxRate}
                              disabled={formTaxScheme === "none"}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0% (Exempt)</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="12">12%</SelectItem>
                                <SelectItem value="18">18%</SelectItem>
                                <SelectItem value="28">28%</SelectItem>
                                <SelectItem value="custom">Custom %</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {formTaxRate === "custom" && formTaxScheme !== "none" && (
                            <div className="space-y-2">
                              <Label>Custom Tax Rate %</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={formCustomTaxRate}
                                onChange={(e) => setFormCustomTaxRate(parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          )}
                        </div>

                {/* Tax breakdown */}
                        <div className="bg-muted/50 border rounded-md p-3 text-sm space-y-1">
                          {formTaxScheme === "gst" ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">CGST ({(effectiveTaxRate / 2).toFixed(2)}%)</span>
                                <span className="font-mono">{fmt(formTaxAmount / 2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">SGST ({(effectiveTaxRate / 2).toFixed(2)}%)</span>
                                <span className="font-mono">{fmt(formTaxAmount / 2)}</span>
                              </div>
                            </>
                          ) : formTaxScheme === "none" ? (
                            <div className="text-muted-foreground">No tax applied.</div>
                          ) : (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {formTaxScheme === "igst" ? "IGST" : formTaxScheme === "vat" ? "VAT" : "Tax"} ({effectiveTaxRate}%)
                              </span>
                              <span className="font-mono">{fmt(formTaxAmount)}</span>
                            </div>
                          )}
                        </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Shipping / Freight</Label>
                            <Input
                              type="number"
                              min={0}
                              value={formFreight}
                              onChange={(e) => setFormFreight(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Other Charges</Label>
                            <Input
                              type="number"
                              min={0}
                              value={formOtherCharges}
                              onChange={(e) => setFormOtherCharges(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Notes & Terms */}
                    <Card>
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">📝 Notes & Terms</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Payment Terms</Label>
                          <Select value={formPaymentTerms} onValueChange={setFormPaymentTerms}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30 Days Net">30 Days Net</SelectItem>
                              <SelectItem value="45 Days Net">45 Days Net</SelectItem>
                              <SelectItem value="60 Days Net">60 Days Net</SelectItem>
                              <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                              <SelectItem value="COD">COD</SelectItem>
                              <SelectItem value="LC at Sight">LC at Sight</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Bank / Payment Info</Label>
                          <Input
                            placeholder="Bank name, A/C, IFSC"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Notes to Customer</Label>
                          <Textarea
                            rows={2}
                            placeholder="Thank you for your business. Any special instructions..."
                            value={formNotes}
                            onChange={(e) => setFormNotes(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Internal Remarks</Label>
                          <Textarea
                            rows={2}
                            placeholder="Internal notes (not shown on invoice)..."
                            value={formInternalRemarks}
                            onChange={(e) => setFormInternalRemarks(e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* RIGHT: Sticky Live Summary + Currency panels */}
                  <div className="space-y-4 xl:sticky xl:top-4">
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="text-amber-500">◆</span> Live Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-sm">
                        {invoiceItems.length === 0 ? (
                          <div className="text-center text-muted-foreground py-3">
                            Add items to see totals
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="font-mono">{fmt(formSubtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Freight</span>
                              <span className="font-mono">{fmt(Number(formFreight) || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Other</span>
                              <span className="font-mono">{fmt(Number(formOtherCharges) || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Tax ({effectiveTaxRate}%)
                              </span>
                              <span className="font-mono">{fmt(formTaxAmount)}</span>
                            </div>
                            <div className="border-t mt-2 pt-2 flex justify-between text-base font-bold">
                              <span>Total</span>
                              <span className="font-mono">{fmt(formGrandTotal)}</span>
                            </div>
                            {formCurrency !== "INR" && (
                              <div className="text-xs text-muted-foreground text-right">
                                ≈ ₹{(formGrandTotal * (Number(formExchangeRate) || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base">💱 Currency</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-sm space-y-1.5">
                        {formCurrency === "INR" ? (
                          <div className="text-muted-foreground">INR — No conversion</div>
                        ) : (
                          <>
                            <div className="flex justify-between border-b pb-1">
                              <span className="text-muted-foreground">Currency</span>
                              <span className="font-mono font-semibold">
                                {formCurrency} {currencySym}
                              </span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                              <span className="text-muted-foreground">Exchange Rate</span>
                              <span className="font-mono">1 {formCurrency} = ₹{formExchangeRate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total in INR</span>
                              <span className="font-mono font-semibold">
                                ₹{(formGrandTotal * (Number(formExchangeRate) || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>


                {/* Signature */}
                <Card>
                  <CardHeader>
                    <CardTitle>Signature</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Authorized Signatory</Label>
                      <Input
                        placeholder="Name of signatory"
                        value={signatory}
                        onChange={(e) => setSignatory(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="digital-signature"
                        checked={useDigitalSignature}
                        onCheckedChange={(checked) => setUseDigitalSignature(Boolean(checked))}
                      />
                      <label htmlFor="digital-signature" className="text-sm">
                        Use digital signature
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Advanced Options - Recurring & Reminders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Recurring Payment */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3 px-4 sm:px-6">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">Recurring Invoice</CardTitle>
                      </div>
                      <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                    </CardHeader>
                    {isRecurring && (
                      <CardContent className="space-y-4 pt-0 px-4 sm:px-6">
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="halfyearly">Half-Yearly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input type="date" value={recurringStartDate} onChange={(e) => setRecurringStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Ends</Label>
                          <RadioGroup value={recurringEndType} onValueChange={setRecurringEndType} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="never" id="end-never" />
                              <Label htmlFor="end-never" className="font-normal">Never</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="occurrences" id="end-occ" />
                              <Label htmlFor="end-occ" className="font-normal">After</Label>
                              {recurringEndType === "occurrences" && (
                                <Input type="number" className="w-20 h-8" value={recurringOccurrences} onChange={(e) => setRecurringOccurrences(e.target.value)} />
                              )}
                              <span className="text-sm text-muted-foreground">occurrences</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="date" id="end-date" />
                              <Label htmlFor="end-date" className="font-normal">On date</Label>
                              {recurringEndType === "date" && (
                                <Input type="date" className="w-auto h-8" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} />
                              )}
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="bg-muted/50 rounded-md p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Next invoice will be generated on {recurringStartDate || "the selected start date"}, repeating {recurringFrequency}.
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Payment Reminders */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3 px-4 sm:px-6">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">Payment Reminders</CardTitle>
                      </div>
                      <Switch checked={sendReminders} onCheckedChange={setSendReminders} />
                    </CardHeader>
                    {sendReminders && (
                      <CardContent className="space-y-4 pt-0 px-4 sm:px-6">
                        {/* Before Due Date */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Before Due Date
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" className="w-20" value={reminderDaysBefore} onChange={(e) => setReminderDaysBefore(e.target.value)} />
                            <span className="text-sm text-muted-foreground">days before due date</span>
                          </div>
                        </div>

                        {/* On Due Date */}
                        <div className="flex items-center justify-between">
                          <Label className="font-normal">Send reminder on due date</Label>
                          <Switch checked={reminderOnDueDate} onCheckedChange={setReminderOnDueDate} />
                        </div>

                        {/* After Due Date */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="font-normal flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                              Overdue Reminder
                            </Label>
                            <Switch checked={reminderAfterEnabled} onCheckedChange={setReminderAfterEnabled} />
                          </div>
                          {reminderAfterEnabled && (
                            <div className="flex items-center gap-2 pl-5">
                              <span className="text-sm text-muted-foreground">Every</span>
                              <Input type="number" className="w-20" value={reminderDaysAfter} onChange={(e) => setReminderDaysAfter(e.target.value)} />
                              <span className="text-sm text-muted-foreground">days after due date</span>
                            </div>
                          )}
                        </div>

                        <div className="bg-muted/50 rounded-md p-3 space-y-1">
                          <p className="text-xs font-medium text-foreground">Reminder Schedule:</p>
                          <p className="text-xs text-muted-foreground">• {reminderDaysBefore} days before due date</p>
                          {reminderOnDueDate && <p className="text-xs text-muted-foreground">• On due date</p>}
                          {reminderAfterEnabled && <p className="text-xs text-muted-foreground">• Every {reminderDaysAfter} days after due date (overdue)</p>}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="secondary" onClick={() => handleSaveInvoice("Draft")}>Save as Draft</Button>
                  <Button onClick={() => handleSaveInvoice("Pending")}>
                    Save & Continue
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

         <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="invoices">All Invoices</TabsTrigger>
            <TabsTrigger value="proforma">
              Pro-forma
              <Badge variant="secondary" className="ml-2">
                {invoices.filter(i => i.isProforma).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="recurring">
              Recurring Invoices
              {recurringInvoices.filter(r => r.status === "active").length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {recurringInvoices.filter(r => r.status === "active").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4 sm:space-y-6">

        {/* Filters Section */}
        <Card>
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-2">
                  {isFiltersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base">Filters</CardTitle>
                </div>
                {(filterStatus !== "All" || filterClient || filterStartDate || filterEndDate) && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={(e) => {
                    e.stopPropagation();
                    setFilterStatus("All");
                    setFilterClient("");
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}>
                    <X className="h-3 w-3 mr-1" /> Clear All Filters
                  </Button>
                )}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Select Invoice Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Search Client</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="All Clients"
                        className="pl-10"
                        value={filterClient}
                        onChange={(e) => setFilterClient(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Select Date Range</Label>
                    <div className="flex gap-2">
                      <Input type="date" placeholder="Start date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                      <Input type="date" placeholder="End date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                    </div>
                  </div>
                </div>
                {(filterStatus !== "All" || filterClient || filterStartDate || filterEndDate) && (
                  <div className="text-sm text-muted-foreground">
                    Applied Filters: {filterStatus !== "All" && <Badge variant="secondary" className="mr-1">{filterStatus}</Badge>}
                    {filterClient && <Badge variant="secondary" className="mr-1">{filterClient}</Badge>}
                    {(filterStartDate || filterEndDate) && <Badge variant="secondary">{filterStartDate} - {filterEndDate}</Badge>}
                  </div>
                )}
                <Button size="sm" className="bg-primary">Apply Filters</Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Invoice Summary */}
        <Card>
          <Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center gap-2 py-4">
                {isSummaryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-base">Invoice Summary</CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {(() => {
                    const totalAmount = filteredInvoices.reduce((s, i) => s + i.total, 0);
                    const amountDue = filteredInvoices.reduce((s, i) => s + (i.total - i.amountPaid), 0);
                    const paymentReceived = filteredInvoices.reduce((s, i) => s + i.amountPaid, 0);
                    const gstAmount = filteredInvoices.reduce(
                      (s, i) =>
                        s + (i.items?.reduce(
                          (sum, item) => sum +
                            (Number(item.sgst_amount || 0) +
                              Number(item.cgst_amount || 0) +
                              Number(item.igst_amount || 0) +
                              Number(item.vat_amount || 0) +
                              Number(item.sales_tax_amount || 0)),
                          0
                        ) || 0),
                      0
                    );
                    const tdsAmount = filteredInvoices.reduce(
                      (s, i) => s + (i.items?.reduce((sum, item) => sum + Number(item.tds_amount || 0), 0) || 0),
                      0
                    );
                    return (
                      <>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Invoices</p>
                            <p className="text-lg font-bold">{filteredInvoices.length}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <IndianRupee className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Amount</p>
                            <p className="text-lg font-bold">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Amount Due</p>
                            <p className="text-lg font-bold text-orange-600">₹{amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Payment Received</p>
                            <p className="text-lg font-bold text-green-600">₹{paymentReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-yellow-700">GST</span>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">GST Amount</p>
                            <p className="text-lg font-bold">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-amber-700">TDS</span>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">TDS</p>
                            <p className="text-lg font-bold">₹{tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Invoice Graph */}
        <Card>
          <Collapsible open={isGraphOpen} onOpenChange={setIsGraphOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center gap-2 py-4">
                {isGraphOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <CardTitle className="text-base">Invoice Graph</CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredInvoices.map(inv => ({
                      name: inv.invoiceNo,
                      total: inv.total,
                      paid: inv.amountPaid,
                      due: inv.total - inv.amountPaid,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip  formatter={(value?: number) => `₹${(value ?? 0).toLocaleString('en-IN')}`} />
                      <Legend />
                      <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="paid" fill="hsl(142, 76%, 36%)" name="Paid" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="due" fill="hsl(25, 95%, 53%)" name="Due" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>


        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>TDS</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const currentStatus = calculateInvoiceStatus(invoice);
                  const amountDue = invoice.total - invoice.amountPaid;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>{(invoice.invoiceDate ?? "").split("T")[0]}</TableCell>
<TableCell>{(invoice.dueDate ?? "").split("T")[0]}</TableCell>
                      <TableCell className="font-semibold">
                        ₹{(invoice.total ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-amber-600">
                        ₹{(invoice.tdsTotal || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-green-600">
                        ₹{(invoice.amountPaid ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-red-600">
                        ₹{((invoice.total ?? 0) - (invoice.amountPaid ?? 0)).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(currentStatus)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewInvoice(invoice)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                           onClick={() => {
                              const status = (invoice.status || "").toLowerCase();

                              if (status === "partially paid" || status === "paid") {
                                toast({
                                  title: "Cannot Edit Invoice",
                                  description: "This invoice is partially or fully paid and cannot be edited.",
                                  variant: "destructive",
                                });
                                return;
                              }

                              openEditInvoice(invoice);
                            }}
                            title="Edit"
                          >                                                 
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadInvoice(invoice)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
      variant="ghost"
      size="icon"
      onClick={() => handleDownloadPDF(invoice)}
      title="Download PDF"
      className="text-blue-600 hover:text-blue-700"
    >
      <FileText className="h-4 w-4" />
    </Button>
                          {currentStatus !== "Paid" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPaymentDialog(invoice)}
                              title="Record Payment"
                              className="text-green-600 hover:text-green-700"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Record Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Invoice:</span>
                    <span className="font-medium">{selectedInvoice.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-medium">{selectedInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-medium">₹{selectedInvoice.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium text-green-600">₹{selectedInvoice.amountPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Amount Due:</span>
                    <span className="font-bold text-red-600">
                      ₹{(selectedInvoice.total - selectedInvoice.amountPaid).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Amount*</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={selectedInvoice.total - selectedInvoice.amountPaid}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method*</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    placeholder="Transaction reference (optional)"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>

                {selectedInvoice.payments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Payment History</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Method</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvoice.payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="text-xs">{payment.date}</TableCell>
                              <TableCell className="text-xs">₹{payment.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-xs capitalize">{payment.method}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecordPayment}>
                    Record Payment
                  </Button>
                </div>
              </div>
            )}
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
                  1. Select Tax Type<span className="text-destructive">*</span>
                </Label>
                <Select
                  value={invoiceTaxConfig.taxType}
                  onValueChange={(v) => setInvoiceTaxConfig(prev => ({ ...prev, taxType: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select tax type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None / Tax Exempt</SelectItem>
                    <SelectItem value="GST (India)">GST (India)</SelectItem>
                     <SelectItem value="IGST (Inter-state)">IGST (Inter-state India)</SelectItem>
                    <SelectItem value="VAT">VAT (International)</SelectItem>
                    <SelectItem value="Sales Tax">Sales Tax</SelectItem>
                    <SelectItem value="Custom">Custom Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {invoiceTaxConfig.taxType === "GST (India)" && (
                <>
                  {/* 2. Place of Supply */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      2. Place of Supply<span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={invoiceTaxConfig.placeOfSupply}
                      onValueChange={(v) => setInvoiceTaxConfig(prev => ({ ...prev, placeOfSupply: v }))}
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
                      3. GST Type<span className="text-destructive">*</span>
                    </Label>
                    <RadioGroup
                      value={invoiceTaxConfig.gstType}
                      onValueChange={(v: "IGST" | "CGST_SGST") => setInvoiceTaxConfig(prev => ({ ...prev, gstType: v }))}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="IGST" id="inv-igst" />
                        <Label htmlFor="inv-igst" className="text-sm font-normal cursor-pointer">IGST</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CGST_SGST" id="inv-cgst-sgst" />
                        <Label htmlFor="inv-cgst-sgst" className="text-sm font-normal cursor-pointer">CGST & SGST</Label>
                      </div>
                    </RadioGroup>

                    <Button
                      variant="link"
                      className="text-sm text-primary p-0 h-auto"
                      onClick={() => setInvoiceTaxConfig(prev => ({ ...prev, addCess: !prev.addCess }))}
                    >
                      + Add Cess
                    </Button>

                    {invoiceTaxConfig.addCess && (
                      <div className="flex items-center gap-2 mt-2">
                        <Label className="text-sm">Cess %:</Label>
                        <Input
                          type="number"
                          value={invoiceTaxConfig.cessPercent}
                          onChange={(e) => setInvoiceTaxConfig(prev => ({ ...prev, cessPercent: Number(e.target.value) }))}
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
                  // Recalculate all invoice items with new tax config
                  setInvoiceItems(invoiceItems.map(item => {
                    const lineSubtotal = item.quantity * item.rate;
                    const gstRate = 0.18;
                    const gstAmount = lineSubtotal * gstRate;

                    if (invoiceTaxConfig.taxType === "GST (India)" && invoiceTaxConfig.gstType === "CGST_SGST") {
                      return {
                        ...item,
                        amount: lineSubtotal,
                        sgst: gstAmount / 2,
                        cgst: gstAmount / 2,
                        cost: lineSubtotal + gstAmount,
                      };
                    } else if (invoiceTaxConfig.taxType === "GST (India)" && invoiceTaxConfig.gstType === "IGST") {
                      return {
                        ...item,
                        amount: lineSubtotal,
                        sgst: 0,
                        cgst: 0,
                        cost: lineSubtotal + gstAmount,
                      };
                    } else {
                      return {
                        ...item,
                        amount: lineSubtotal,
                        sgst: 0,
                        cgst: 0,
                        cost: lineSubtotal,
                      };
                    }
                  }));
                  setTaxConfigOpen(false);
                  toast({
                    title: "Tax Configuration Saved",
                    description: "Tax settings have been applied to the invoice.",
                  });
                }}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

         </TabsContent>

          <TabsContent value="recurring" className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recurring Invoice Schedules</h2>
              <Button variant="outline" size="sm" onClick={processRecurringNow}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Process Now
              </Button>
            </div>

            {recurringLoading ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : recurringInvoices.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">No Recurring Invoices</h3>
                  <p className="text-muted-foreground mb-4">Create an invoice with recurring enabled to set up automatic invoicing.</p>
                  <Button onClick={() => { setActiveTab("invoices"); setIsCreateDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Recurring Invoice
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Next Invoice</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurringInvoices.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{rec.customer_name}</p>
                              {rec.customer_email && (
                                <p className="text-xs text-muted-foreground">{rec.customer_email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{rec.frequency}</TableCell>
                          <TableCell className="font-semibold">₹{rec.total_amount.toLocaleString("en-IN")}</TableCell>
                          <TableCell>{rec.next_invoice_date.split("T")[0]}</TableCell>
                          <TableCell>
                            {rec.end_type === "occurrences" ? (
                              <span className="text-sm">{rec.occurrences}</span>
                            ) : rec.end_type === "date" ? (
                              <span className="text-sm text-muted-foreground">Until {rec.end_date.split("T")[0]}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Ongoing</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={rec.status === "active" ? "default" : rec.status === "paused" ? "secondary" : "outline"}>
                              {rec.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {(rec.status === "active" || rec.status === "paused") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRecurringStatus(rec.id, rec.status)}
                                  title={rec.status === "active" ? "Pause" : "Resume"}
                                >
                                  {rec.status === "active" ? "Pause" : "Resume"}
                                </Button>
                              )}
                              {rec.status !== "cancelled" && rec.status !== "completed" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => cancelRecurring(rec.id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

         <TabsContent value="proforma" className="space-y-4 sm:space-y-6">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-base sm:text-lg">Pro-forma Invoices</CardTitle>
      <Button 
        size="sm" 
        onClick={() => { 
          setFormIsProforma(true); 
          setIsCreateDialogOpen(true); 
        }}
      >
        <Plus className="h-4 w-4 mr-2" /> New Pro-forma
      </Button>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.filter(i => i.type === "proforma" || i.formIsProforma === true || i.formIsProforma === "proforma").length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                No pro-forma invoices found.<br />
                Toggle "Pro-forma Invoice" when creating a new invoice.
              </TableCell>
            </TableRow>
          ) : (
            invoices
              .filter(i => i.type === "proforma" || i.formIsProforma === true || i.formIsProforma === "proforma")
              .map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNo}</TableCell>
                  <TableCell>{inv.customerName}</TableCell>
                  <TableCell>{inv.invoiceDate?.split("T")[0] || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.formCurrency || "INR"}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    ₹{Number(inv.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{getStatusBadge(calculateInvoiceStatus(inv))}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
  console.log("clicked proforma:", inv);
  setViewInvoice({ ...inv });
}}   // ← Use the existing function
                      title="View Invoice"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => openEditInvoice(inv)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</TabsContent>

          <TabsContent value="reports" className="space-y-4 sm:space-y-6">
            <InvoiceReports invoices={invoices as any} />
          </TabsContent>
        </Tabs>
 {/* View Invoice Dialog */}
        <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            {viewInvoice && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Invoice Number</Label>
                    <p className="font-medium">{viewInvoice.invoiceNo}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(calculateInvoiceStatus(viewInvoice))}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Invoice Date</Label>
                    <p className="font-medium">{viewInvoice.invoiceDate.split("T")[0]}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Due Date</Label>
                    <p className="font-medium">{viewInvoice.dueDate.split("T")[0]}</p>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{viewInvoice.customerName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">GSTIN</Label>
                      <p className="font-medium">{viewInvoice.customerGSTIN}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">{viewInvoice.customerAddress}</p>
                    </div>
                  </CardContent>
                </Card>

              <Card>
  <CardHeader>
    <CardTitle>Amount Details</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    <div className="flex justify-between">
      <span>Subtotal:</span>
      <span className="font-semibold">₹{viewInvoice.subtotal.toLocaleString()}</span>
    </div>

    {/* Show SGST & CGST if GST (CGST/SGST) */}
    {viewInvoice.taxType === "GST (India)" && viewInvoice.gstType === "CGST_SGST" && (
      <>
        <div className="flex justify-between">
          <span>SGST:</span>
          <span className="font-semibold">₹{viewInvoice.sgstTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>CGST:</span>
          <span className="font-semibold">₹{viewInvoice.cgstTotal.toLocaleString()}</span>
        </div>
      </>
    )}

  {/* Show IGST if GST (IGST) */}
{viewInvoice.taxType === "GST (India)" && viewInvoice.gstType === "IGST" && (
  <div className="flex justify-between">
    <span>IGST:</span>
    <span className="font-semibold">
      ₹{viewInvoice.items
        .reduce((total, item) => (item.igst_amount ?? 0), 0)
        .toLocaleString()}
    </span>
  </div>
)}

    {/* Show VAT */}
   {viewInvoice.taxType === "VAT" && (
  <div className="flex justify-between">
    <span>VAT:</span>
    <span className="font-semibold">
      ₹{viewInvoice.items
        .reduce((total, item) => (item.vat_amount ?? 0), 0)
        .toLocaleString()}
    </span>
  </div>
)}

  {/* Show Sales Tax */}
{viewInvoice.taxType === "Sales Tax" && (
  <div className="flex justify-between">
    <span>Sales Tax:</span>
    <span className="font-semibold">
      ₹{viewInvoice.items
        .reduce((total, item) =>  (item.sales_tax_amount ?? 0), 0)
        .toLocaleString()}
    </span>
  </div>
)}

    <div className="flex justify-between text-lg border-t pt-2">
      <span className="font-bold">Total:</span>
      <span className="font-bold">₹{viewInvoice.total.toLocaleString()}</span>
    </div>
    <div className="flex justify-between text-green-600">
      <span>Amount Paid:</span>
      <span className="font-semibold">₹{viewInvoice.amountPaid.toLocaleString()}</span>
    </div>
    <div className="flex justify-between text-red-600 text-lg border-t pt-2">
      <span className="font-bold">Amount Due:</span>
      <span className="font-bold">₹{(viewInvoice.total - viewInvoice.amountPaid).toLocaleString()}</span>
    </div>
  </CardContent>
</Card>

                {viewInvoice.payments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Reference</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewInvoice.payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{payment.date.split("T")[0]}</TableCell>
                              <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                              <TableCell className="capitalize">{payment.method}</TableCell>
                              <TableCell>{payment.reference}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        
      </div>
    </Layout>
  );
};

export default Invoices;

