import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Mail, Phone, Download, Upload, Edit, Trash2, Eye} from "lucide-react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";


interface Vendor {
  id: string;
  vendor_id: string;
  vendor_name: string;
  company: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency: string | null;
  rating: string | null;
  status: string | null;
  orders_count: number | null;
  total_purchases: number | null;
  pending_payments: number | null;
  business_number: string | null;
  incorporation_details: string | null;
  gst_number: string | null;
  other_tax_details: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch: string | null;

   vendor_type?: string | null;
   attachments: FileList | null;
  gstCertificate: File | null;
  panCopy: File | null;
  agreement: File | null;
  kycDocuments: FileList | null;

  // Optional text fields
  notes: string;
  tags: string;
}

const Vendors = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorsData, setVendorsData] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  
  const initialVendorState = {
    name: "",
    contact: "",
    vendor_name: "",
    email: "",
    phone: "",
    country: "",
    currency: "",
    rating: "Standard",
    status: "Active",
    businessNumber: "",
    incorporationDetails: "",
    gstNumber: "",
    taxDetails: "",
    billingAddress: "",
    shippingAddress: "",
    bankName: "",
    bankAccountNumber: "",
    bankIfscCode: "",
    bankBranch: "",

    vendor_type: "",
   notes: "",
  tags: "",
  attachments: null as FileList | null,
  gstCertificate: null as File | null,
  panCopy: null as File | null,
  agreement: null as File | null,
  kycDocuments: null as FileList | null,
  };
  
  const [newVendor, setNewVendor] = useState(initialVendorState);
  const [editVendor, setEditVendor] = useState(initialVendorState);

  useEffect(() => {
    fetchVendors();
  }, []);

 
const fetchVendors = async () => {
  try {
    setLoading(true);

    const res = await axios.get("/api/vendors");

    setVendorsData(res.data || []);
  } catch (error: any) {
    toast({
      title: "Error fetching vendors",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  const getRatingBadge = (rating?: string | null) => {
  const value = rating || "Standard";

    const colors: Record<string, string> = {
      Premium: "bg-purple-100 text-purple-800 border-purple-200",
      Standard: "bg-blue-100 text-blue-800 border-blue-200",
      Basic: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      <Badge variant="outline" className={colors[value]}>
      {value}
    </Badge>
    );
  };

 const getStatusBadge = (status?: string | null) => {
  const value = status || "Active";

  return (
    <Badge variant={value === "Active" ? "default" : "outline"}>
      {value}
    </Badge>
  );
};

const handleAddVendor = async () => {
  // Required fields validation
  // Required fields validation
  const missingFields: string[] = [];

  if (!(newVendor.name ?? "").trim()) missingFields.push("Name");
  if (!(newVendor.email ?? "").trim()) missingFields.push("Email");
  if (!(newVendor.phone ?? "").trim()) missingFields.push("Mobile");
  if (!(newVendor.country ?? "").trim()) missingFields.push("Country");

   const phoneRegex = /^\d{10}$/;
if (newVendor.phone && !phoneRegex.test(newVendor.phone)) {
  toast({
    title: "Invalid Phone Number",
    description: "Phone number must be exactly 10 digits",
    variant: "destructive",
  });
  return;
}

// Only validate GST if the field is non-empty
if (newVendor.gstNumber && newVendor.gstNumber.trim() !== "") {
  const gstNumber = newVendor.gstNumber.trim().toUpperCase();
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

  
  // Email format validation
if (newVendor.email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newVendor.email)) {
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
const emailExists = vendorsData.some(
  (vendor) =>
    vendor.email?.trim().toLowerCase() === newVendor.email?.trim().toLowerCase()
);


// Email duplicate check
if (
  newVendor.email?.trim() &&
  vendorsData.some(
    (vendor) => vendor.email?.toLowerCase() === newVendor.email.toLowerCase()
  )
) {
  toast({
    title: "Duplicate Email",
    description: "This email is already registered for another vendor.",
    variant: "destructive",
  });
  return;
}

// Phone duplicate check
if (
  newVendor.phone?.trim() &&
  vendorsData.some(
    (vendor) => vendor.phone?.trim() === newVendor.phone.trim()
  )
) {
  toast({
    title: "Duplicate Phone Number",
    description: "This phone number is already registered for another vendor.",
    variant: "destructive",
  });
  return;
}

// Company name duplicate check (optional field)
if (newVendor.name?.trim()) {
  const newCompany = newVendor.name.trim().toLowerCase();
  const companyExists = vendorsData.some(vendor => {
    const company = (vendor.company || vendor.vendor_name || "").trim().toLowerCase();
    return company === newCompany;
  });

  if (companyExists) {
    toast({
      title: "Duplicate Company Name",
      description: "This company name already exists for another vendor.",
      variant: "destructive",
    });
    return;
  }
}


  try {
    const vendorCode = `VEN-${Date.now().toString().slice(-6)}`;

    // Use FormData to handle files
    const formData = new FormData();
    formData.append('vendor_id', vendorCode);
    formData.append('company', newVendor.name);
    formData.append('vendor_name', newVendor.vendor_name);
    formData.append('contact_person', newVendor.contact);
    formData.append('email', newVendor.email);
    formData.append('phone', newVendor.phone);
    formData.append('country', newVendor.country);
    formData.append('currency', newVendor.currency);
    formData.append('status', newVendor.status);
    formData.append('rating', newVendor.rating);
    formData.append('business_number', newVendor.businessNumber || '');
    formData.append('incorporation_details', newVendor.incorporationDetails || '');
    formData.append('gst_number', newVendor.gstNumber || '');
    formData.append('other_tax_details', newVendor.taxDetails || '');
    formData.append('billing_address', newVendor.billingAddress || '');
    formData.append('shipping_address', newVendor.shippingAddress || '');
    formData.append('bank_name', newVendor.bankName || '');
    formData.append('account_number', newVendor.bankAccountNumber || '');
    formData.append('ifsc_code', newVendor.bankIfscCode || '');
    formData.append('branch', newVendor.bankBranch || '');
    
    // New fields
    formData.append('vendor_type', newVendor.vendor_type || '');
    formData.append('notes', newVendor.notes || '');
    formData.append('tags', newVendor.tags || '');

    // Single files
    if (newVendor.gstCertificate) formData.append('gst_certificate', newVendor.gstCertificate);
    if (newVendor.panCopy) formData.append('pan_copy', newVendor.panCopy);
    if (newVendor.agreement) formData.append('agreement', newVendor.agreement);

    // Multiple files (attachments & KYC documents)
    if (newVendor.attachments) {
      Array.from(newVendor.attachments).forEach(file => {
        formData.append('attachments[]', file);
      });
    }
    if (newVendor.kycDocuments) {
      Array.from(newVendor.kycDocuments).forEach(file => {
        formData.append('kyc_documents[]', file);
      });
    }

    // Axios request with multipart/form-data
    const response = await axios.post("/api/vendors", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    toast({
      title: "Success",
      description: "Vendor added successfully",
    });

    await fetchVendors();
    setNewVendor(initialVendorState);
    setIsAddDialogOpen(false);

  } catch (error: any) {
    console.log(error.response?.data);

    if (error.response?.status === 422) {
      const errors = error.response.data?.errors as Record<string, string[]>;
      const firstError = Object.values(errors)?.[0]?.[0] || "Validation error";
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error adding vendor",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  }
};



const handleEditVendor = (vendor: Vendor) => {
  setSelectedVendor(vendor);
  setEditVendor({
    name: vendor.company || "",
    vendor_name: vendor.vendor_name || "",
    contact: vendor.contact_person || "",
    email: vendor.email || "",
    phone: vendor.phone || "",
    country: vendor.country || "",
    currency: vendor.currency || "",
    rating: vendor.rating || "Standard",
    status: vendor.status || "Active",
    businessNumber: vendor.business_number || "",
    incorporationDetails: vendor.incorporation_details || "",
    gstNumber: vendor.gst_number || "",
    taxDetails: vendor.other_tax_details || "",
    billingAddress: vendor.billing_address || "",
    shippingAddress: vendor.shipping_address || "",
    bankName: vendor.bank_name || "",
    bankAccountNumber: vendor.account_number || "",
    bankIfscCode: vendor.ifsc_code || "",
    bankBranch: vendor.branch || "",

    vendor_type: vendor.vendor_type || "",
    notes: vendor.notes || "",
    tags: vendor.tags || "",
    attachments: null, // files cannot be pre-filled
    gstCertificate: null,
    panCopy: null,
    agreement: null,
    kycDocuments: null,
  });
  setIsEditDialogOpen(true);
};

const handleUpdateVendor = async () => {
  if (!selectedVendor) return;

  const vendorData = editVendor; // Use the edit form state for validation

  // Required fields validation
  const missingFields: string[] = [];
  if (!(vendorData.name?.trim())) missingFields.push("Name");
  if (!(vendorData.email?.trim())) missingFields.push("Email");
  if (!(vendorData.phone?.trim())) missingFields.push("Mobile");
  if (!(vendorData.country ?? "").trim()) missingFields.push("Country");

  if (missingFields.length > 0) {
    toast({
      title: "Missing Required Fields",
      description: `Please fill in: ${missingFields.join(", ")}`,
      variant: "destructive",
    });
    return;
  }

  // Phone validation
  const phoneRegex = /^\d{10}$/;
  if (vendorData.phone && !phoneRegex.test(vendorData.phone)) {
    toast({
      title: "Invalid Phone Number",
      description: "Phone number must be exactly 10 digits",
      variant: "destructive",
    });
    return;
  }

  // GST validation (optional)
  if (vendorData.gstNumber?.trim()) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    if (!gstRegex.test(vendorData.gstNumber.toUpperCase())) {
      toast({
        title: "Invalid GST Number",
        description: "GST number must be 15 characters in correct format (e.g., 27ABCDE1234F1Z5)",
        variant: "destructive",
      });
      return;
    }
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (vendorData.email && !emailRegex.test(vendorData.email)) {
    toast({
      title: "Invalid Email",
      description: "Please enter a valid Email",
      variant: "destructive",
    });
    return;
  }

  // Duplicate checks (exclude current vendor)
  const emailExists = vendorsData.some(
    (v) => v.id !== selectedVendor.id && v.email?.trim().toLowerCase() === vendorData.email?.trim().toLowerCase()
  );
  if (emailExists) {
    toast({
      title: "Duplicate Email",
      description: "This email is already registered for another vendor.",
      variant: "destructive",
    });
    return;
  }

  const phoneExists = vendorsData.some(
    (v) => v.id !== selectedVendor.id && v.phone?.trim() === vendorData.phone?.trim()
  );
  if (phoneExists) {
    toast({
      title: "Duplicate Phone Number",
      description: "This phone number is already registered for another vendor.",
      variant: "destructive",
    });
    return;
  }

  const companyExists = vendorsData.some(
    (v) => v.id !== selectedVendor.id && v.company?.trim().toLowerCase() === vendorData.name?.trim().toLowerCase()
  );
  if (companyExists) {
    toast({
      title: "Duplicate Company Name",
      description: "This company name already exists for another vendor.",
      variant: "destructive",
    });
    return;
  }

  // ✅ All validations passed, send API request
  try {
    const response = await fetch(`/api/vendors/${selectedVendor.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: vendorData.name,
        vendor_name: vendorData.vendor_name,
        contact_person: vendorData.contact,
        email: vendorData.email,
        phone: vendorData.phone,
        country: vendorData.country || null,
        currency: vendorData.currency || null,
        status: vendorData.status,
        rating: vendorData.rating,
        business_number: vendorData.businessNumber || null,
        incorporation_details: vendorData.incorporationDetails || null,
        gst_number: vendorData.gstNumber || null,
        other_tax_details: vendorData.taxDetails || null,
        billing_address: vendorData.billingAddress || null,
        shipping_address: vendorData.shippingAddress || null,
        bank_name: vendorData.bankName || null,
        account_number: vendorData.bankAccountNumber || null,
        ifsc_code: vendorData.bankIfscCode || null,
        branch: vendorData.bankBranch || null,
        vendor_type: vendorData.vendor_type || null,
        notes: vendorData.notes || null,
        tags: vendorData.tags || null,
        updated_at: new Date().toISOString(),
      }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Failed to update vendor");

    toast({
      title: "Success",
      description: "Vendor updated successfully",
    });

    await fetchVendors();
    setIsEditDialogOpen(false);
    setSelectedVendor(null);
  } catch (error: any) {
    toast({
      title: "Error updating vendor",
      description: error.message || "Something went wrong",
      variant: "destructive",
    });
  }
};


 const handleDeleteVendor = async () => {
  if (!selectedVendor) return;

  try {
    const response = await fetch(`/api/vendors/${selectedVendor.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete vendor");
    }

    toast({
      title: "Success",
      description: "Vendor deleted successfully",
    });

    await fetchVendors();
    setIsDeleteDialogOpen(false);
    setSelectedVendor(null);
  } catch (error: any) {
    toast({
      title: "Error deleting vendor",
      description: error.message,
      variant: "destructive",
    });
  }
};


  const handleExport = () => {
    const csvContent = [
      ["Vendor ID", "Vendor", "Contact Person", "Email", "Phone", "Total Orders", "Rating", "Status", "Vendor name"],
      ...vendorsData.map(v => [v.vendor_id, v.vendor_name, v.contact_person, v.email, v.phone, v.orders_count, v.rating, v.status, v.vendor_name])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendors.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Vendor data exported successfully",
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    await axios.post("/api/vendors/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    toast({
      title: "Success",
      description: "Vendor data imported successfully",
    });

    await fetchVendors();
  } catch (error: any) {
    toast({
      title: "Import Failed",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  }
};


  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Vendors</h1>
            <p className="text-muted-foreground mt-2">
              Manage your vendor relationships
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" asChild>
              <label htmlFor="import-file" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Import
                <input
                  id="import-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Vendor</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">General Info</TabsTrigger>
                    <TabsTrigger value="business">Business Info</TabsTrigger>
                    <TabsTrigger value="additional">Additional Info</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="general" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer">Vendor Name </Label>
                        <Input
                          id="customer"
                          value={newVendor.vendor_name}
                          onChange={(e) => setNewVendor({ ...newVendor, vendor_name: e.target.value })}
                          placeholder="Enter vendor name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customer">Vendor type</Label>
                        <Select
                            value={newVendor.vendor_type || undefined}
                            onValueChange={(value) =>
                              setNewVendor({ ...newVendor, vendor_type: value })
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
                        <Label htmlFor="company">Company Name</Label>
                        <Input
                          id="company"
                          value={newVendor.name}
                          onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact">Contact Person</Label>
                        <Input
                          id="contact"
                          value={newVendor.contact}
                          onChange={(e) => setNewVendor({ ...newVendor, contact: e.target.value })}
                          placeholder="Enter contact person"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newVendor.email}
                          onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                          placeholder="Enter email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={newVendor.phone}
                          onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Input
                          id="country"
                          value={newVendor.country}
                          onChange={(e) => setNewVendor({ ...newVendor, country: e.target.value })}
                          placeholder="Enter country name"
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
                        <Label htmlFor="currency">Currency </Label>
                        <Input
                          id="currency"
                          value={newVendor.currency}
                          onChange={(e) => setNewVendor({ ...newVendor, currency: e.target.value })}
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
                        <Label htmlFor="rating">Rating</Label>
                        <Select
                          value={newVendor.rating}
                          onValueChange={(value) => setNewVendor({ ...newVendor, rating: value })}
                        >
                          <SelectTrigger id="rating">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Basic">Basic</SelectItem>
                            <SelectItem value="Standard">Standard</SelectItem>
                            <SelectItem value="Premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={newVendor.status}
                          onValueChange={(value) => setNewVendor({ ...newVendor, status: value })}
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
                  
                  <TabsContent value="business" className="space-y-6 mt-4">
                    {/* Business Registration */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Business Registration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="businessNumber">Business Number / CIN</Label>
                          <Input
                            id="businessNumber"
                            value={newVendor.businessNumber}
                            onChange={(e) => setNewVendor({ ...newVendor, businessNumber: e.target.value })}
                            placeholder="Enter business registration number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="incorporationDetails">Incorporation Details</Label>
                          <Input
                            id="incorporationDetails"
                            value={newVendor.incorporationDetails}
                            onChange={(e) => setNewVendor({ ...newVendor, incorporationDetails: e.target.value })}
                            placeholder="Enter incorporation details"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tax Details */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tax Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gstNumber">GST Number</Label>
                          <Input
                            id="gstNumber"
                            value={newVendor.gstNumber}
                            onChange={(e) => setNewVendor({ ...newVendor, gstNumber: e.target.value })}
                            placeholder="Enter GST number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taxDetails">Other Tax Details</Label>
                          <Input
                            id="taxDetails"
                            value={newVendor.taxDetails}
                            onChange={(e) => setNewVendor({ ...newVendor, taxDetails: e.target.value })}
                            placeholder="Enter other tax details (PAN, TAN, etc.)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Addresses */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Addresses</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="billingAddress">Billing Address</Label>
                          <Textarea
                            id="billingAddress"
                            value={newVendor.billingAddress}
                            onChange={(e) => setNewVendor({ ...newVendor, billingAddress: e.target.value })}
                            placeholder="Enter complete billing address"
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shippingAddress">Shipping Address</Label>
                          <Textarea
                            id="shippingAddress"
                            value={newVendor.shippingAddress}
                            onChange={(e) => setNewVendor({ ...newVendor, shippingAddress: e.target.value })}
                            placeholder="Enter complete shipping address"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Bank Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank Name</Label>
                          <Input
                            id="bankName"
                            value={newVendor.bankName}
                            onChange={(e) => setNewVendor({ ...newVendor, bankName: e.target.value })}
                            placeholder="Enter bank name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankAccountNumber">Account Number</Label>
                          <Input
                            id="bankAccountNumber"
                            value={newVendor.bankAccountNumber}
                            onChange={(e) => setNewVendor({ ...newVendor, bankAccountNumber: e.target.value })}
                            placeholder="Enter account number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankIfscCode">IFSC Code</Label>
                          <Input
                            id="bankIfscCode"
                            value={newVendor.bankIfscCode}
                            onChange={(e) => setNewVendor({ ...newVendor, bankIfscCode: e.target.value })}
                            placeholder="Enter IFSC code"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankBranch">Branch</Label>
                          <Input
                            id="bankBranch"
                            value={newVendor.bankBranch}
                            onChange={(e) => setNewVendor({ ...newVendor, bankBranch: e.target.value })}
                            placeholder="Enter branch name"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                   {/* Additional Info Tab */}
      <TabsContent value="additional" className="space-y-6 mt-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="notes">Notes / Remarks</Label>
            <Textarea
              id="notes"
              value={newVendor.notes}
              onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
              placeholder="Enter any notes or remarks"
              rows={3}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Tags / Categories</Label>
            <Input
              value={newVendor.tags}
              onChange={(e) => setNewVendor({ ...newVendor, tags: e.target.value })}
              placeholder="Enter tags or categories (comma separated)"
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Attachments</Label>
            <Input
              type="file"
              multiple
              onChange={(e) =>
                setNewVendor({ ...newVendor, attachments: e.target.files })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>GST Certificate</Label>
            <Input
              type="file"
              onChange={(e) =>
               setNewVendor({ ...newVendor, gstCertificate: e.target.files?.[0] ?? null })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>PAN Copy</Label>
            <Input
              type="file"
              onChange={(e) =>
                setNewVendor({ ...newVendor, panCopy: e.target.files?.[0] ?? null })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Agreement</Label>
            <Input
              type="file"
              onChange={(e) =>
                setNewVendor({ ...newVendor, agreement: e.target.files?.[0] ?? null })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>KYC Documents</Label>
            <Input
              type="file"
              multiple
              onChange={(e) =>
                setNewVendor({ ...newVendor, kycDocuments: e.target.files })
              }
            />
          </div>
        </div>
      </TabsContent>
                </Tabs>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddVendor}>
                    Add Vendor
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by vendor name, contact, or email..."
                  className="pl-10"
                />
              </div>
              <Button variant="outline">Filter</Button>
            </div>
          </CardContent>
        </Card>

        {/* Vendors Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor ID</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorsData.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.vendor_id}</TableCell>
                    <TableCell className="font-semibold">{vendor.vendor_name}</TableCell>
                    <TableCell>{vendor.contact_person}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {vendor.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {vendor.phone}
                      </div>
                    </TableCell>
                    <TableCell>{vendor.orders_count || 0}</TableCell>
                    <TableCell>{getRatingBadge(vendor.rating || 'Standard')}</TableCell>  
                    <TableCell>{getStatusBadge(vendor.status || 'Active')}</TableCell>                                  
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle className="text-2xl">
                                {vendor.company} - Vendor Details
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle>Contact Information</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Contact Person</p>
                                    <p className="font-medium">{vendor.contact_person}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{vendor.email}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Phone</p>
                                    <p className="font-medium">{vendor.phone}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Vendor ID</p>
                                    <p className="font-medium">{vendor.vendor_id}</p>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle>Purchase Statistics</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total Orders</p>
                                    <p className="text-2xl font-bold">{vendor.orders_count || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total Purchases</p>
                                    <p className="text-2xl font-bold">₹{(vendor.total_purchases || 0).toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Pending Payments</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                      ₹{(vendor.pending_payments || 0).toLocaleString()}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle>Status & Rating</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">Status</p>
                                    {getStatusBadge(vendor.status)}
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">Rating</p>
                                    {getRatingBadge(vendor.rating)}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm" onClick={() => handleEditVendor(vendor)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Vendor Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Vendor</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General Info</TabsTrigger>
                <TabsTrigger value="business">Business Info</TabsTrigger>
                <TabsTrigger value="additional">Additional Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">

                    <div className="space-y-2">
                  <Label>Vendor Name </Label>
                  <Input
                    value={editVendor.vendor_name}
                    onChange={(e) =>
                      setEditVendor({ ...editVendor, vendor_name: e.target.value })
                    }
                    placeholder="Enter vendor name"
                  />
                </div>

                     <div className="space-y-2">
                    <Label>Vendor Type</Label>
                    <Select
                      value={editVendor.vendor_type || ""}
                      onValueChange={(value) =>
                        setEditVendor({ ...editVendor, vendor_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Individual">Individual</SelectItem>
                        <SelectItem value="Business/Company">Business/Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                   <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={editVendor.name}
                      onChange={(e) => setEditVendor({ ...editVendor, name: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Person *</Label>
                    <Input
                      value={editVendor.contact}
                      onChange={(e) => setEditVendor({ ...editVendor, contact: e.target.value })}
                      placeholder="Enter contact person"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={editVendor.email}
                      onChange={(e) => setEditVendor({ ...editVendor, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input
                      value={editVendor.phone}
                      onChange={(e) => setEditVendor({ ...editVendor, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={editVendor.country}
                      onChange={(e) => setEditVendor({ ...editVendor, country: e.target.value })}
                      placeholder="Enter country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input
                      value={editVendor.currency}
                      onChange={(e) => setEditVendor({ ...editVendor, currency: e.target.value })}
                      placeholder="Enter currency"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <Select
                      value={editVendor.rating}
                      onValueChange={(value) => setEditVendor({ ...editVendor, rating: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Basic">Basic</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editVendor.status}
                      onValueChange={(value) => setEditVendor({ ...editVendor, status: value })}
                    >
                      <SelectTrigger>
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
              
              <TabsContent value="business" className="space-y-6 mt-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Business Registration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Business Number / CIN</Label>
                      <Input
                        value={editVendor.businessNumber}
                        onChange={(e) => setEditVendor({ ...editVendor, businessNumber: e.target.value })}
                        placeholder="Enter business number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Incorporation Details</Label>
                      <Input
                        value={editVendor.incorporationDetails}
                        onChange={(e) => setEditVendor({ ...editVendor, incorporationDetails: e.target.value })}
                        placeholder="Enter incorporation details"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tax Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>GST Number</Label>
                      <Input
                        value={editVendor.gstNumber}
                        onChange={(e) => setEditVendor({ ...editVendor, gstNumber: e.target.value })}
                        placeholder="Enter GST number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Tax Details</Label>
                      <Input
                        value={editVendor.taxDetails}
                        onChange={(e) => setEditVendor({ ...editVendor, taxDetails: e.target.value })}
                        placeholder="Enter other tax details"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Addresses</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Billing Address</Label>
                      <Textarea
                        value={editVendor.billingAddress}
                        onChange={(e) => setEditVendor({ ...editVendor, billingAddress: e.target.value })}
                        placeholder="Enter billing address"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shipping Address</Label>
                      <Textarea
                        value={editVendor.shippingAddress}
                        onChange={(e) => setEditVendor({ ...editVendor, shippingAddress: e.target.value })}
                        placeholder="Enter shipping address"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        value={editVendor.bankName}
                        onChange={(e) => setEditVendor({ ...editVendor, bankName: e.target.value })}
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        value={editVendor.bankAccountNumber}
                        onChange={(e) => setEditVendor({ ...editVendor, bankAccountNumber: e.target.value })}
                        placeholder="Enter account number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <Input
                        value={editVendor.bankIfscCode}
                        onChange={(e) => setEditVendor({ ...editVendor, bankIfscCode: e.target.value })}
                        placeholder="Enter IFSC code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input
                        value={editVendor.bankBranch}
                        onChange={(e) => setEditVendor({ ...editVendor, bankBranch: e.target.value })}
                        placeholder="Enter branch"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              {/* Additional Info Tab */}
              <TabsContent value="additional" className="space-y-6 mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-notes">Notes / Remarks</Label>
                    <Textarea
                      id="edit-notes"
                      value={editVendor.notes}
                      onChange={(e) =>
                        setEditVendor({ ...editVendor, notes: e.target.value })
                      }
                      placeholder="Enter any notes or remarks"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Tags / Categories</Label>
                    <Input
                      value={editVendor.tags}
                      onChange={(e) =>
                        setEditVendor({ ...editVendor, tags: e.target.value })
                      }
                      placeholder="Enter tags or categories (comma separated)"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Attachments</Label>
                    <Input
                      type="file"
                      multiple
                      onChange={(e) =>
                        setEditVendor({
                          ...editVendor,
                          attachments: e.target.files                           
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>GST Certificate</Label>
                    <Input
                      type="file"
                      onChange={(e) =>
                        setEditVendor({
                          ...editVendor,
                          gstCertificate: e.target.files?.[0] ?? null
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>PAN Copy</Label>
                    <Input
                      type="file"
                      onChange={(e) =>
                        setEditVendor({
                          ...editVendor,
                          panCopy: e.target.files?.[0] ?? null
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Agreement</Label>
                    <Input
                      type="file"
                      onChange={(e) =>
                        setEditVendor({
                          ...editVendor,
                          agreement: e.target.files?.[0] ?? null
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>KYC Documents</Label>
                    <Input
                      type="file"
                      multiple
                     onChange={(e) =>
                        setEditVendor({
                          ...editVendor,
                          kycDocuments: e.target.files
                        })
                      }
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateVendor}>
                Update Vendor
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Vendor</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{selectedVendor?.company}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteVendor}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Vendors;
