import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Mail, Phone, Pencil, Trash2, RotateCcw, Eye, DollarSign, Clock, CreditCard } from "lucide-react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import CustomerDetailDialog from "@/components/customers/CustomerDetailDialog";

interface Customer {
  id: string;
  customer_name: string;
  customer_code: string;
  contact_person: string | null;
  email: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  country: string | null;
  currency: string | null;
  gst_number?: string | null;
  status: string;
  customer_type?: string | null;
  primary_contact?: string | null;
  mobile?: string | null;
  company_name?: string | null;
  pan_number?: string | null;
  cin?: string | null;
  industry_type?: string | null;
  website?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string;
  state?: string;
  postal_code?: string;
  sameAsBilling?: boolean;
  separateShipping?: boolean;
}

interface CustomerDetailDialogProps {
  customer: Customer | null; // ✅ allow null
  open: boolean;
  onOpenChange: (open: boolean) => void;
}



const Customers = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refundsByCustomer, setRefundsByCustomer] = useState<Record<string, { count: number; total: number }>>({});
   const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
 const [newCustomer, setNewCustomer] = useState<Partial<Customer> & {
  sameAsBilling: boolean;
  separateShipping: boolean;
  city?: string;
  state?: string;
  postal_code?: string;
}>({
  customer_name: "",
  customer_type: undefined,
  contact_person: "",
  primary_contact: "",
  mobile: "",
  email: "",
  billing_address: "",
  shipping_address: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  currency: "",
  gst_number: "",
  status: "Active",
  company_name: "",
  pan_number: "",
  cin: "",
  industry_type: "",
  website: "",
  sameAsBilling: false,
  separateShipping: false,
});


  // Fetch customers and refund data

  const [financialData, setFinancialData] = useState({ totalSales: 0, pendingPayments: 0, creditBalance: 0 });

  useEffect(() => {
    fetchCustomers();
    loadRefundData();
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
  try {
    // Fetch invoices and credit notes in parallel
    const [invoicesRes, creditNotesRes] = await Promise.all([
      fetch("/api/invoices"),
      fetch("/api/credit-notes"),
    ]);

    // Check if responses are OK
    if (!invoicesRes.ok) throw new Error("Failed to fetch invoices");
    if (!creditNotesRes.ok) throw new Error("Failed to fetch credit notes");

    // Parse JSON
    const invoicesData = await invoicesRes.json();
    const creditNotesData = await creditNotesRes.json();

    // Ensure arrays
    const invoices = Array.isArray(invoicesData) ? invoicesData : [];
    const creditNotes = Array.isArray(creditNotesData) ? creditNotesData : [];

    // Calculate totals safely
    const totalSales = invoices.reduce(
      (sum, i) => sum + Number(i.total_amount || 0),
      0
    );
    const totalPaid = invoices.reduce(
      (sum, i) => sum + Number(i.amount_paid || 0),
      0
    );
    const creditBalance = creditNotes
      .filter((cn) => cn.status.toLowerCase() !== "cancelled")
      .reduce(
        (sum, cn) =>
          sum + (Number(cn.total_amount || 0) - Number(cn.applied_amount || 0)),
        0
      );

    // Update state
    setFinancialData({
      totalSales,
      pendingPayments: totalSales - totalPaid,
      creditBalance,
    });

    console.log("Financial Data:", {
      totalSales,
      pendingPayments: totalSales - totalPaid,
      creditBalance,
    });
  } catch (error: any) {
    console.error("Failed to load financial data:", error);
    setFinancialData({
      totalSales: 0,
      pendingPayments: 0,
      creditBalance: 0,
    });
  }
};

  // Load refund data from localStorage
  const loadRefundData = () => {
    try {
      const saved = localStorage.getItem("orderRefunds");
      if (saved) {
        const refunds = JSON.parse(saved);
        const refundMap: Record<string, { count: number; total: number }> = {};
        
        refunds.forEach((refund: any) => {
          if (refund.status === "processed") {
            const customerName = refund.customerName;
            if (!refundMap[customerName]) {
              refundMap[customerName] = { count: 0, total: 0 };
            }
            refundMap[customerName].count += 1;
            refundMap[customerName].total += refund.refundAmount || 0;
          }
        });
        
        setRefundsByCustomer(refundMap);
      }
    } catch (e) {
      console.error("Failed to load refund data:", e);
    }
  };

  const fetchCustomers = async () => {
  setLoading(true);

  try {
    const { data } = await axios.get("/api/customers");

    // Handle both possible API formats:
    // 1. Direct array []
    // 2. { data: [] }
    const customersList = Array.isArray(data) ? data : data?.data ?? [];

    setCustomers(customersList);
  } catch (error: any) {
    toast({
      title: "Error",
      description:
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch customers",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

 const generateCustomerCode = () => {
  if (!customers.length) return "CUST-001";

  const maxNumber = Math.max(
    ...customers.map((cust) => {
      const match = cust.customer_code?.match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    })
  );

  const nextNumber = maxNumber + 1;

  return `CUST-${String(nextNumber).padStart(3, "0")}`;
};

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "Active" ? "default" : "outline"}>
        {status}
      </Badge>
    );
  };

 const handleAddCustomer = async () => {
  const missingFields: string[] = [];

  if (!(newCustomer.customer_name ?? "").trim()) missingFields.push("Name");
  if (!(newCustomer.email ?? "").trim()) missingFields.push("Email");
  if (!(newCustomer.mobile ?? "").trim()) missingFields.push("Mobile");

  // Required address fields
  if (!(newCustomer.address_line1 ?? "").trim()) missingFields.push("Address Line 1");
  if (!(newCustomer.city ?? "").trim()) missingFields.push("City");
  if (!(newCustomer.state ?? "").trim()) missingFields.push("State");
  if (!(newCustomer.country ?? "").trim()) missingFields.push("Country");
  if (!(newCustomer.postal_code ?? "").trim()) missingFields.push("Postal Code");


  const phoneRegex = /^\d{10}$/;
if (newCustomer.mobile && !phoneRegex.test(newCustomer.mobile)) {
  toast({
    title: "Invalid Phone Number",
    description: "Phone number must be exactly 10 digits",
    variant: "destructive",
  });
  return;
}

// Only validate GST if the field is non-empty
if (newCustomer.gst_number && newCustomer.gst_number.trim() !== "") {
  const gstNumber = newCustomer.gst_number.trim().toUpperCase();
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  if (!gstRegex.test(gstNumber)) {
    toast({
      title: "Invalid GST Number",
      description: "GST number must be 15 characters in correct format (e.g., 27ABCDE1234F1Z5)",
      variant: "destructive",
    });
    return;
  }
}


 const postalCodeRegex = /^\d{5,6}$/;
  if (newCustomer.postal_code && !postalCodeRegex.test(newCustomer.postal_code)) {
    toast({
      title: "Invalid Postal Code",
      description: "Postal code must be 5 or 6 digits",
      variant: "destructive",
    });
    return;
  }
  
  // Email format validation
if (newCustomer.email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newCustomer.email)) {
    toast({
      title: "Invalid Email",
      description: "Please enter correct Email",
      variant: "destructive",
    });
    return;
} }

  if (missingFields.length > 0) {
    toast({
      title: "Missing Required Fields",
      description: `Please fill in: ${missingFields.join(", ")}`,
      variant: "destructive",
    });
    return;
  }

  // 🔎 Duplicate Validation

// Email duplicate check
const emailExists = customers.some(
  (cust) =>
    cust.email &&
    newCustomer.email &&
    cust.email.toLowerCase() === newCustomer.email.toLowerCase()
);

if (emailExists) {
  toast({
    title: "Duplicate Email",
    description: "This email is already registered.",
    variant: "destructive",
  });
  return;
}

// Mobile duplicate check
const mobileExists = customers.some(
  (cust) =>
    cust.mobile &&
    newCustomer.mobile &&
    cust.mobile === newCustomer.mobile
);

if (mobileExists) {
  toast({
    title: "Duplicate Mobile Number",
    description: "This mobile number is already registered.",
    variant: "destructive",
  });
  return;
}

// Company name duplicate check (optional field)
if (newCustomer.company_name?.trim()) {
  const companyExists = customers.some(
    (cust) =>
      cust.company_name &&
      cust.company_name.toLowerCase() ===
        newCustomer.company_name?.toLowerCase()
  );

  if (companyExists) {
    toast({
      title: "Duplicate Company Name",
      description: "This company name already exists.",
      variant: "destructive",
    });
    return;
  }
}


  try {
    await axios.post("/customers", {
      ...newCustomer,
      customer_code: generateCustomerCode(),
    });

    toast({
      title: "Success",
      description: "Customer added successfully",
    });

    // Reset form
  setNewCustomer({
  customer_name: "",
  customer_type: "",
  contact_person: "",
  mobile: "",
  email: "",
  billing_address: "",
  shipping_address: "",
  address_line1: "",
  address_line2: "",
  country: "",
  currency: "",
  gst_number: "",
  status: "Active",
  company_name: "",
  pan_number: "",
  cin: "",
  industry_type: "",
  website: "",
  sameAsBilling: false,
  separateShipping: false,
});


    setIsAddDialogOpen(false);
    fetchCustomers();
  } catch (error: any) {
    toast({
      title: "Error",
      description:
        error.response?.data?.message ||
        error.message ||
        "Failed to add customer",
      variant: "destructive",
    });
  }
};

 const handleEditCustomer = async () => {

 if (!selectedCustomer) return;

  const missingFields: string[] = [];

  if (!(selectedCustomer.customer_name ?? "").trim()) missingFields.push("Name");
  if (!(selectedCustomer.email ?? "").trim()) missingFields.push("Email");
  if (!(selectedCustomer.mobile ?? "").trim()) missingFields.push("Mobile");

  // Required address fields
  if (!(selectedCustomer.address_line1 ?? "").trim()) missingFields.push("Address Line 1");
  if (!(selectedCustomer.city ?? "").trim()) missingFields.push("City");
  if (!(selectedCustomer.state ?? "").trim()) missingFields.push("State");
  if (!(selectedCustomer.country ?? "").trim()) missingFields.push("Country");
  if (!(selectedCustomer.postal_code ?? "").trim()) missingFields.push("Postal Code");

  // Phone validation
  const phoneRegex = /^\d{10}$/;
  if (selectedCustomer.mobile && !phoneRegex.test(selectedCustomer.mobile)) {
    toast({
      title: "Invalid Phone Number",
      description: "Phone number must be exactly 10 digits",
      variant: "destructive",
    });
    return;
  }

  // GST validation (only if provided)
  if (selectedCustomer.gst_number?.trim()) {
    const gstNumber = selectedCustomer.gst_number.trim().toUpperCase();
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

    if (!gstRegex.test(gstNumber)) {
      toast({
        title: "Invalid GST Number",
        description:
          "GST number must be 15 characters in correct format (e.g., 27ABCDE1234F1Z5)",
        variant: "destructive",
      });
      return;
    }
  }

  // Postal Code validation
  const postalCodeRegex = /^\d{5,6}$/;
  if (selectedCustomer.postal_code && !postalCodeRegex.test(selectedCustomer.postal_code)) {
    toast({
      title: "Invalid Postal Code",
      description: "Postal code must be 5 or 6 digits",
      variant: "destructive",
    });
    return;
  }

  // Email validation
  if (selectedCustomer.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(selectedCustomer.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter correct Email",
        variant: "destructive",
      });
      return;
    }
  }

  // Missing required fields
  if (missingFields.length > 0) {
    toast({
      title: "Missing Required Fields",
      description: `Please fill in: ${missingFields.join(", ")}`,
      variant: "destructive",
    });
    return;
  }

   const emailExists = customers.some(
    (cust) =>
      cust.id !== selectedCustomer.id &&
      cust.email?.trim().toLowerCase() === selectedCustomer.email?.trim().toLowerCase()
  );

  if (emailExists) {
    toast({
      title: "Duplicate Email",
      description: "This email is already registered.",
      variant: "destructive",
    });
    return;
  }

  const mobileExists = customers.some(
    (cust) =>
      cust.id !== selectedCustomer.id &&
      cust.mobile?.trim() === selectedCustomer.mobile?.trim()
  );

  if (mobileExists) {
    toast({
      title: "Duplicate Mobile Number",
      description: "This mobile number is already registered.",
      variant: "destructive",
    });
    return;
  }

  if (selectedCustomer.company_name?.trim()) {
    const companyExists = customers.some(
      (cust) =>
        cust.id !== selectedCustomer.id &&
        cust.company_name?.trim().toLowerCase() === selectedCustomer.company_name?.trim().toLowerCase()
    );

    if (companyExists) {
      toast({
        title: "Duplicate Company Name",
        description: "This company name already exists.",
        variant: "destructive",
      });
      return;
    }
  }


  try {
    await axios.put(`/api/customers/${selectedCustomer.id}`, {
      customer_name: selectedCustomer.customer_name,
      customer_type: selectedCustomer.customer_type || "",
      contact_person: selectedCustomer.contact_person || "",
      email: selectedCustomer.email || "",
      mobile: selectedCustomer.mobile || "",
      billing_address: selectedCustomer.billing_address || "",
      shipping_address: selectedCustomer.sameAsBilling
        ? selectedCustomer.billing_address || ""
        : selectedCustomer.shipping_address || "",
      address_line1: selectedCustomer.address_line1 || "",
      address_line2: selectedCustomer.address_line2 || "",
      city: selectedCustomer.city || "",
      state: selectedCustomer.state || "",
      country: selectedCustomer.country || "",
      postal_code: selectedCustomer.postal_code || "",
      currency: selectedCustomer.currency || "",
      status: selectedCustomer.status || "Active",
      company_name: selectedCustomer.company_name || "",
      gst_number: selectedCustomer.gst_number || "",
      pan_number: selectedCustomer.pan_number || "",
      cin: selectedCustomer.cin || "",
      industry_type: selectedCustomer.industry_type || "",
      website: selectedCustomer.website || "",
    });

    toast({
      title: "Success",
      description: "Customer updated successfully",
    });

    setIsEditDialogOpen(false);
    setSelectedCustomer(null);
    fetchCustomers();
  } catch (error: any) {
    toast({
      title: "Error",
      description:
        error.response?.data?.message ||
        error.message ||
        "Failed to update customer",
      variant: "destructive",
    });
  }
};


 const handleDeleteCustomer = async (id: string) => {
  if (!confirm("Are you sure you want to delete this customer?")) return;

  try {
    await axios.delete(`/customers/${id}`);

    toast({
      title: "Success",
      description: "Customer deleted successfully",
    });

    fetchCustomers();
  } catch (error: any) {
    toast({
      title: "Error",
      description:
        error.response?.data?.message ||
        error.message ||
        "Failed to delete customer",
      variant: "destructive",
    });
  }
};


  const filteredCustomers = customers.filter((customer) =>
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Customers</h1>
            <p className="text-muted-foreground mt-2">
              Manage your customer relationships
            </p>
          </div>
         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
  <DialogTrigger asChild>
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Customer
    </Button>
  </DialogTrigger>

  <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Add New Customer</DialogTitle>
    </DialogHeader>

    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="general">General Info</TabsTrigger>
        <TabsTrigger value="address">Address Details</TabsTrigger>
        <TabsTrigger value="business">Business Details</TabsTrigger>
      </TabsList>

      {/* ================= GENERAL INFO ================= */}
      <TabsContent value="general" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">

          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer Name *</Label>
            <Input
              id="customer_name"
              value={newCustomer.customer_name}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, customer_name: e.target.value })
              }
              placeholder="Enter customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_type">Customer Type</Label>
           <Select
                value={newCustomer.customer_type || undefined}
                onValueChange={(value) =>
                  setNewCustomer({ ...newCustomer, customer_type: value })
                }
              >
                <SelectTrigger id="customer_type">
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Business/Company">Business/Company</SelectItem>
                </SelectContent>
              </Select>
          </div>


          <div className="space-y-2">
            <Label htmlFor="primary_contact">Primary Contact Person</Label>
            <Input
              id="primary_contact"
              value={newCustomer.contact_person || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, contact_person: e.target.value })
              }
              placeholder="Enter primary contact person"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number *</Label>
            <Input
              id="mobile"
              value={newCustomer.mobile || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, mobile: e.target.value })
              }
              placeholder="Enter mobile number"
            />
          </div>

            <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Input
              id="currency"
              value={newCustomer.currency || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, currency: e.target.value })
              }
              placeholder="Enter currency (e.g., INR, USD)"
              list="currencies-list"
            />
            <datalist id="currencies-list">
              <option value="INR" />
              <option value="USD" />
              <option value="GBP" />
              <option value="EUR" />
              <option value="AUD" />
              <option value="CAD" />
              <option value="JPY" />
              <option value="CNY" />
              <option value="SGD" />
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={newCustomer.email || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, email: e.target.value })
              }
              placeholder="Enter email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={newCustomer.status}
              onValueChange={(value) =>
                setNewCustomer({ ...newCustomer, status: value })
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="address" className="space-y-6 mt-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    {/* Address Lines */}
    <div className="space-y-2">
      <Label htmlFor="address_line1">Address Line 1 *</Label>
      <Input
        id="address_line1"
        value={newCustomer.address_line1 || ""}
        onChange={(e) =>
          setNewCustomer({ ...newCustomer, address_line1: e.target.value })
        }
        placeholder="Enter address line 1"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
      <Input
        id="address_line2"
        value={newCustomer.address_line2 || ""}
        onChange={(e) =>
          setNewCustomer({ ...newCustomer, address_line2: e.target.value })
        }
        placeholder="Enter address line 2"
      />
    </div>

    {/* Billing Address */}
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="billing_address">Billing Address</Label>
      <Textarea
        id="billing_address"
        value={newCustomer.billing_address || ""}
        onChange={(e) =>
          setNewCustomer({ ...newCustomer, billing_address: e.target.value })
        }
        placeholder="Enter billing address"
        rows={3}
      />
    </div>

    {/* Shipping Address with checkboxes */}
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="shipping_address">Shipping Address</Label>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <label className="inline-flex items-center space-x-2">
           <input
      type="checkbox"
      checked={newCustomer.sameAsBilling || false}
      onChange={(e) => {
        const isChecked = e.target.checked;
        setNewCustomer({
          ...newCustomer,
          sameAsBilling: isChecked,
          separateShipping: !isChecked, // hide separate shipping if same as billing
          shipping_address: isChecked ? newCustomer.billing_address || "" : "",
        });
      }}
    />
          <span>Same as Billing</span>
        </label>

        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            checked={newCustomer.separateShipping}
            onChange={(e) => {
              const isChecked = e.target.checked;
              setNewCustomer({
                ...newCustomer,
                separateShipping: isChecked,
                sameAsBilling: !isChecked,
                shipping_address: isChecked ? "" : newCustomer.billing_address,
              });
            }}
          />
          <span>Separate Shipping Address (Optional)</span>
        </label>
      </div>

      {(newCustomer.sameAsBilling || newCustomer.separateShipping) && (
  <div className="space-y-2">
   
    <Textarea
      id="shipping_address"
      value={
        newCustomer.sameAsBilling
          ? newCustomer.billing_address || ""
          : newCustomer.shipping_address || ""
      }
      onChange={(e) =>
        setNewCustomer({
          ...newCustomer,
          shipping_address: e.target.value,
        })
      }
      placeholder="Enter shipping address"
      rows={3}
      disabled={newCustomer.sameAsBilling} // 👈 important
    />

    {newCustomer.sameAsBilling && (
      <p className="text-xs text-muted-foreground">
        Shipping address is same as billing (auto-updated)
      </p>
    )}
  </div>
)}
    </div>

    {/* City, State, Country, Postal Code */}
    <div className="space-y-2">
      <Label htmlFor="city">City *</Label>
      <Input
        id="city"
        value={newCustomer.city}
        onChange={(e) =>
          setNewCustomer({ ...newCustomer, city: e.target.value })
        }
        placeholder="Enter city"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="state">State *</Label>
      <Input
        id="state"
        value={newCustomer.state}
        onChange={(e) =>
          setNewCustomer({ ...newCustomer, state: e.target.value })
        }
        placeholder="Enter state"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="country">Country *</Label>
      <Input
        id="country"
        value={newCustomer.country || ""}
        onChange={(e) =>
          setNewCustomer({ ...newCustomer, country: e.target.value })
        }
        placeholder="Enter country"
        list="countries-list"
      />
      <datalist id="countries-list">
        <option value="India" />
        <option value="United States" />
        <option value="United Kingdom" />
        <option value="Canada" />
        <option value="Australia" />
        <option value="Germany" />
        <option value="France" />
        <option value="China" />
        <option value="Japan" />
        <option value="Singapore" />
      </datalist>
    </div>

    <div className="space-y-2">
      <Label htmlFor="postal_code">Postal Code *</Label>
      <Input
        id="postal_code"
        value={newCustomer.postal_code}
        onChange={(e) =>
          setNewCustomer({ ...newCustomer, postal_code: e.target.value })
        }
        placeholder="Enter postal code"
      />
    </div>
  </div>
</TabsContent>


      {/* ================= BUSINESS DETAILS ================= */}
      <TabsContent value="business" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">

          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={newCustomer.company_name || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, company_name: e.target.value })
              }
              placeholder="Enter company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gst">GST Number</Label>
            <Input
              id="gst"
              value={newCustomer.gst_number || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, gst_number: e.target.value })
              }
              placeholder="Enter GST number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pan">PAN Number</Label>
            <Input
              id="pan"
              value={newCustomer.pan_number || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, pan_number: e.target.value })
              }
              placeholder="Enter PAN number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cin">CIN (Optional)</Label>
            <Input
              id="cin"
              value={newCustomer.cin || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, cin: e.target.value })
              }
              placeholder="Enter CIN"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry Type</Label>
            <Input
              id="industry"
              value={newCustomer.industry_type || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, industry_type: e.target.value })
              }
              placeholder="Enter industry type"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              value={newCustomer.website || ""}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, website: e.target.value })
              }
              placeholder="Enter website URL"
            />
          </div>

        </div>
      </TabsContent>
    </Tabs>

    <div className="flex justify-end gap-2 mt-4">
      <Button
        variant="outline"
        onClick={() => setIsAddDialogOpen(false)}
      >
        Cancel
      </Button>
      <Button onClick={handleAddCustomer}>
        Add Customer
      </Button>
    </div>
  </DialogContent>
</Dialog>
</div>

         {/* Financial Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">₹{financialData.totalSales.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">₹{financialData.pendingPayments.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credit Notes Balance</p>
                <p className="text-2xl font-bold">₹{financialData.creditBalance.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name, code, or email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Code</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-right">Refunds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.customer_code}</TableCell>
                      <TableCell className="font-semibold">{customer.customer_name}</TableCell>
                      <TableCell>{customer.contact_person || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {customer.email || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {customer.mobile || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {refundsByCustomer[customer.customer_name] ? (
                          <div className="flex items-center justify-end gap-2">
                            <RotateCcw className="h-4 w-4 text-orange-500" />
                            <div className="text-right">
                              <p className="font-medium text-orange-600">
                                ₹{refundsByCustomer[customer.customer_name].total.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {refundsByCustomer[customer.customer_name].count} refund(s)
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                           {/* VIEW BUTTON */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(customer);
                               setSelectedCustomer({
                                    ...customer,
                                    sameAsBilling:
                                      customer.shipping_address === customer.billing_address,
                                    separateShipping:
                                      customer.shipping_address !== customer.billing_address,
                                  });
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer.id)}
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
          </CardContent>
        </Card>
        

        {/* ================= EDIT CUSTOMER DIALOG ================= */}
<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
  <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit Customer</DialogTitle>
    </DialogHeader>

    {selectedCustomer && (
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General Info</TabsTrigger>
          <TabsTrigger value="address">Address Details</TabsTrigger>
          <TabsTrigger value="business">Business Details</TabsTrigger>
        </TabsList>

        {/* ================= GENERAL INFO ================= */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_customer_name">Customer Name *</Label>
              <Input
                id="edit_customer_name"
                value={selectedCustomer.customer_name || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, customer_name: e.target.value })
                }
                placeholder="Enter customer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_customer_type">Customer Type</Label>
              <Select
                value={selectedCustomer.customer_type || undefined}
                onValueChange={(value) =>
                  setSelectedCustomer({ ...selectedCustomer, customer_type: value })
                }
              >
                <SelectTrigger id="edit_customer_type">
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Business/Company">Business/Company</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_contact_person">Primary Contact Person</Label>
              <Input
                id="edit_contact_person"
                value={selectedCustomer.contact_person || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, contact_person: e.target.value })
                }
                placeholder="Enter primary contact person"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_mobile">Mobile Number *</Label>
              <Input
                id="edit_mobile"
                value={selectedCustomer.mobile || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, mobile: e.target.value })
                }
                placeholder="Enter mobile number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_currency">Currency *</Label>
              <Input
                id="edit_currency"
                value={selectedCustomer.currency || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, currency: e.target.value })
                }
                placeholder="Enter currency (e.g., INR, USD)"
                list="edit-currencies-list"
              />
              <datalist id="edit-currencies-list">
                <option value="INR" />
                <option value="USD" />
                <option value="GBP" />
                <option value="EUR" />
                <option value="AUD" />
                <option value="CAD" />
                <option value="JPY" />
                <option value="CNY" />
                <option value="SGD" />
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_email">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={selectedCustomer.email || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, email: e.target.value })
                }
                placeholder="Enter email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select
                value={selectedCustomer.status || "Active"}
                onValueChange={(value) =>
                  setSelectedCustomer({ ...selectedCustomer, status: value })
                }
              >
                <SelectTrigger id="edit_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* ================= ADDRESS INFO ================= */}
        <TabsContent value="address" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Address Line 1 *</Label>
              <Input
                value={selectedCustomer.address_line1 || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, address_line1: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2 (Optional)</Label>
              <Input
                value={selectedCustomer.address_line2 || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, address_line2: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Billing Address</Label>
              <Textarea
                value={selectedCustomer.billing_address || ""}
                onChange={(e) =>
                  setSelectedCustomer({
                    ...selectedCustomer,
                    billing_address: e.target.value,
                    shipping_address: selectedCustomer.sameAsBilling
                      ? e.target.value
                      : selectedCustomer.shipping_address || "",
                  })
                }
                rows={3}
                placeholder="Enter billing address"
              />
            </div>

          <div className="space-y-2 md:col-span-2">
  <Label>Shipping Address</Label>

  <div className="flex flex-col md:flex-row md:items-center gap-4">
    
    {/* SAME AS BILLING */}
    <label className="inline-flex items-center space-x-2">
      <input
        type="checkbox"
        checked={selectedCustomer.sameAsBilling || false}
        onChange={(e) => {
          const isChecked = e.target.checked;

          setSelectedCustomer({
            ...selectedCustomer,
            sameAsBilling: isChecked,
            separateShipping: !isChecked,
            shipping_address: isChecked
              ? selectedCustomer.billing_address || ""
              : "",
          });
        }}
      />
      <span>Same as Billing</span>
    </label>

    {/* SEPARATE SHIPPING */}
    <label className="inline-flex items-center space-x-2">
      <input
        type="checkbox"
        checked={selectedCustomer.separateShipping || false}
        onChange={(e) => {
          const isChecked = e.target.checked;

          setSelectedCustomer({
            ...selectedCustomer,
            separateShipping: isChecked,
            sameAsBilling: !isChecked,
            shipping_address: isChecked
              ? selectedCustomer.shipping_address || ""
              : selectedCustomer.billing_address || "",
          });
        }}
      />
      <span>Separate Shipping Address</span>
    </label>
  </div>

  {(selectedCustomer.sameAsBilling || selectedCustomer.separateShipping) && (
    <Textarea
      value={
        selectedCustomer.sameAsBilling
          ? selectedCustomer.billing_address || ""
          : selectedCustomer.shipping_address || ""
      }
      onChange={(e) =>
        setSelectedCustomer({
          ...selectedCustomer,
          shipping_address: e.target.value,
        })
      }
      placeholder="Enter shipping address"
      rows={3}
      disabled={selectedCustomer.sameAsBilling}
    />
  )}
</div>
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={selectedCustomer.city || ""}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, city: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  value={selectedCustomer.state || ""}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, state: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input
                  value={selectedCustomer.country || ""}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, country: e.target.value })
                  }
                  list="edit-countries-list"
                />
                <datalist id="edit-countries-list">
                  <option value="India" />
                  <option value="United States" />
                  <option value="United Kingdom" />
                  <option value="Canada" />
                  <option value="Australia" />
                  <option value="Germany" />
                  <option value="France" />
                  <option value="China" />
                  <option value="Japan" />
                  <option value="Singapore" />
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Postal Code *</Label>
                <Input
                  value={selectedCustomer.postal_code || ""}
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, postal_code: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ================= BUSINESS DETAILS ================= */}
        <TabsContent value="business" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_company_name">Company Name</Label>
              <Input
                id="edit_company_name"
                value={selectedCustomer.company_name || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, company_name: e.target.value })
                }
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_gst">GST Number</Label>
              <Input
                id="edit_gst"
                value={selectedCustomer.gst_number || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, gst_number: e.target.value })
                }
                placeholder="Enter GST number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_pan">PAN Number</Label>
              <Input
                id="edit_pan"
                value={selectedCustomer.pan_number || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, pan_number: e.target.value })
                }
                placeholder="Enter PAN number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_cin">CIN (Optional)</Label>
              <Input
                id="edit_cin"
                value={selectedCustomer.cin || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, cin: e.target.value })
                }
                placeholder="Enter CIN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_industry">Industry Type</Label>
              <Input
                id="edit_industry"
                value={selectedCustomer.industry_type || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, industry_type: e.target.value })
                }
                placeholder="Enter industry type"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_website">Website (Optional)</Label>
              <Input
                id="edit_website"
                value={selectedCustomer.website || ""}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, website: e.target.value })
                }
                placeholder="Enter website URL"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    )}

    {/* Footer Buttons */}
    <div className="flex justify-end gap-2 mt-4">
      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleEditCustomer}>Save Changes</Button>
    </div>
  </DialogContent>
</Dialog>

<CustomerDetailDialog
          customer={selectedCustomer}
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
        />

      </div>
    </Layout>
  );
};

export default Customers;
