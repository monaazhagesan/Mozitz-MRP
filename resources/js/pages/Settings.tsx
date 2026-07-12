import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, Mail, ChevronRight, Trash2, Plus, ArrowUp, GripVertical, Info, Check, MapPin, User, Lock, ChevronDown, Cog, QrCode, Barcode } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import axios from 'axios';
import { toast } from 'sonner';

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Role is required")
});

const navigationItems = [
  { id: "profile", label: "Profile" },
  { id: "general", label: "General" },
  { id: "units", label: "Units of measure" },
  { id: "tax-rates", label: "Tax rates" },
  { id: "categories", label: "Categories" },
  { id: "custom-fields", label: "Custom fields" },
  { id: "costing", label: "Costing" },
  { id: "barcodes", label: "Barcodes" },
  { id: "operations", label: "Operations" },
  { id: "resources", label: "Resources" },
  { id: "locations", label: "Locations" },
  { id: "print-templates", label: "Print templates" },
  { id: "warehouse-app", label: "Warehouse app" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "team", label: "Team Management" },
];

// Component for individual location bin section
const LocationBinSection = ({
  location,
  storageBins,
  handleAddStorageBin,
  handleDeleteStorageBin
}: {
  location: any;
  storageBins: any[];
  handleAddStorageBin: (locationId: string, binName: string) => void;
  handleDeleteStorageBin: (id: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newBinName, setNewBinName] = useState("");
  const locationBins = storageBins.filter(bin => bin.location_id === location.id);



  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
              <span className="font-medium">{location.location_name}</span>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4">
            <div className="space-y-2">
              {locationBins.map((bin) => (
                <div key={bin.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{bin.bin_name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteStorageBin(bin.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  placeholder="Bin name"
                  value={newBinName}
                  onChange={(e) => setNewBinName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBinName.trim()) {
                      handleAddStorageBin(location.id, newBinName);
                      setNewBinName("");
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    if (newBinName.trim()) {
                      handleAddStorageBin(location.id, newBinName);
                      setNewBinName("");
                    }
                  }}
                  disabled={!newBinName.trim()}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const Settings = () => {

  const { toast } = useToast();
  const [companyDetails, setCompanyDetails] = useState({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    country: "",
    currency: "",

    phone: "",
    gstin: "",
    pan: "",
    address: "",

    bank_account_name: "",
    bank_account_number: "",
    ifsc: "",
    account_type: "",
    bank_name: "",
    branch: "",

    current_password: "",
    password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        const { data } = await axios.get("/api/profile");

        if (data) {
          setCompanyDetails({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            company: data.company || "",

            country: data.country || "",
            currency: data.currency || "",

            gstin: data.gstin || "",
            pan: data.pan || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",

            bank_account_name: data.bank_account_name || "",
            bank_account_number: data.bank_account_number || "",
            ifsc: data.ifsc || "",
            account_type: data.account_type || "",
            bank_name: data.bank_name || "",
            branch: data.branch || "",

            // password fields (never load real password)
            current_password: "",
            password: "",
            confirm_password: "",
          });
        }
      } catch (error: any) {
        toast({
          title: "Error loading profile",
          description: error.response?.data?.message || error.message,
          variant: "destructive",
        });
      }
    };

    fetchCompanyDetails();
  }, []);

  const handleSaveCompany = async () => {

   if (!/^\d{10}$/.test(companyDetails.phone.trim())) {
  toast({
    title: "Invalid phone number",
    description: "Phone number must be exactly 10 digits",
    variant: "destructive",
  });
  return;
}

    try {
      const payload = {
        first_name: companyDetails.first_name,
        last_name: companyDetails.last_name,
        company: companyDetails.company,
        country: companyDetails.country,
        currency: companyDetails.currency,

        phone: companyDetails.phone,
        gstin: companyDetails.gstin,
        pan: companyDetails.pan,
        address: companyDetails.address,

        bank_account_name: companyDetails.bank_account_name,
        bank_account_number: companyDetails.bank_account_number,
        ifsc: companyDetails.ifsc,
        account_type: companyDetails.account_type,
        bank_name: companyDetails.bank_name,
        branch: companyDetails.branch,

        // password only if user enters it
        current_password: companyDetails.current_password,
        password: companyDetails.password,
        confirm_password: companyDetails.confirm_password,
      };

      const { data } = await axios.post('/api/update-profile', payload);

      toast({
        title: "Profile info saved",
        description: "Profile details updated successfully",

      });

      setCompanyDetails({
        first_name: data.user.first_name || "",
        last_name: data.user.last_name || "",
        company: data.user.company || "",
        country: data.user.country || "",
        currency: data.user.currency || "",

        email: data.user.email || "",
        phone: data.user.phone || "",
        gstin: data.user.gstin || "",
        pan: data.user.pan || "",
        address: data.user.address || "",

        bank_account_name: data.user.bank_account_name || "",
        bank_account_number: data.user.bank_account_number || "",
        ifsc: data.user.ifsc || "",
        account_type: data.user.account_type || "",
        bank_name: data.user.bank_name || "",
        branch: data.user.branch || "",

        current_password: "",
        password: "",
        confirm_password: "",
      });
    } catch (error: any) {
      toast({
        title: "Error saving Profile info",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };


  const [users, setUsers] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userPassword, setUserPassword] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activeSection, setActiveSection] = useState<string>("profile");


  // Location states
  const [locations, setLocations] = useState<any[]>([]);
  const [storageBins, setStorageBins] = useState<any[]>([]);
  const [defaultLocations, setDefaultLocations] = useState<any>(null);
  const [locationTab, setLocationTab] = useState<string>("warehouse");
  const [newLocationName, setNewLocationName] = useState("");
  const [newLegalName, setNewLegalName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newSellEnabled, setNewSellEnabled] = useState(true);
  const [newMakeEnabled, setNewMakeEnabled] = useState(true);
  const [newBuyEnabled, setNewBuyEnabled] = useState(true);

  useEffect(() => {
    fetchUsersWithRoles();
    loadLocations();
    loadStorageBins();
    loadDefaultLocations();
  }, []);

  const fetchUsersWithRoles = async () => {
    try {
      const { data } = await axios.get('/api/user-roles', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setUsers(data);

    } catch (error: any) {
      toast({
        title: "Error Loading Users",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateUserWithRole = async () => {
    try {
      userSchema.parse({
        email: userEmail,
        password: userPassword,
        role: selectedRole
      });
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description:
          error.errors?.[0]?.message || "Please check your inputs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        '/api/user-roles',
        {
          email: userEmail,
          password: userPassword,
          role: selectedRole,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      toast({
        title: "User Created",
        description: `User ${userEmail} created with ${selectedRole} role`,
      });

      setDialogOpen(false);
      setUserEmail("");
      setUserPassword("");
      setSelectedRole("");

      await fetchUsersWithRoles();

    } catch (error: any) {
      toast({
        title: "Error Creating User",
        description:
          error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    setLoading(true);

    try {
      await axios.delete(`/api/user-roles/${userId}/role`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        data: { role },
      });

      toast({
        title: "Role Removed",
        description: "Role has been successfully removed",
      });

      await fetchUsersWithRoles();

    } catch (error: any) {
      toast({
        title: "Error Removing Role",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [units, setUnits] = useState<string[]>([
    "BOX", "cm", "g", "kg", "l", "m", "ml", "mm", "pcs"
  ]);
  const [newUnit, setNewUnit] = useState("");

  const handleAddUnit = () => {
    if (newUnit.trim()) {
      setUnits([...units, newUnit.trim()]);
      setNewUnit("");
      toast({
        title: "Unit Added",
        description: `${newUnit} has been added to units of measure`,
      });
    }
  };

  const handleDeleteUnit = (unit: string) => {
    setUnits(units.filter(u => u !== unit));
    toast({
      title: "Unit Removed",
      description: `${unit} has been removed`,
    });
  };

  interface Category {
    id: string;
    name: string;
  }

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');

      if (!response.ok) throw new Error('Failed to load categories');

      const data = await response.json();
      setCategories(data);

    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategory.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to add category');

      const data = await response.json();

      setCategories([...categories, data]);
      setNewCategory("");

      toast({
        title: "Category Added",
        description: `${data.name} has been added to categories`,
      });

    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete category');

      setCategories(categories.filter(c => c.id !== id));

      toast({
        title: "Category Removed",
        description: `${category?.name} has been removed`,
      });

    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };


  // Location management functions
  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations');

      if (!response.ok) throw new Error('Failed to load locations');

      const data = await response.json();

      setLocations(Array.isArray(data) ? data : data.data);

    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const loadStorageBins = async () => {
    try {
      const response = await fetch("/api/storage-bins", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load storage bins: ${response.status}`);
      }

      const data = await response.json();

      // safety check (optional but recommended)
      if (!Array.isArray(data)) {
        throw new Error("Invalid storage bins response format");
      }

      setStorageBins(data);
    } catch (error) {
      console.error("Error loading storage bins:", error);
      setStorageBins([]); // fallback to empty state
    }
  };

  const loadDefaultLocations = async () => {
    try {
      const response = await fetch('/api/default-location');

      if (response.status === 404) {
        setDefaultLocations(null);
        return;
      }

      if (!response.ok) throw new Error('Failed to load default location');

      const data = await response.json();
      setDefaultLocations(data);

    } catch (error) {
      console.error("Error loading default locations:", error);
    }
  };

  const handleAddLocation = async () => {
    const name = newLocationName.trim();

    if (!name) return;

    try {
      const res = await axios.post("/api/locations", {
        location_name: name,
        legal_name: newLegalName.trim(),
        address: newAddress.trim(),
        sell_enabled: true,
        make_enabled: true,
        buy_enabled: true,
      });

      const data = res.data;

      setLocations(prev => [...prev, data]);

      setNewLocationName("");
      setNewLegalName("");
      setNewAddress("");

      toast({
        title: "Location Added",
        description: `${data.location_name} has been added`,
      });

    } catch (error: any) {
      console.error("Error adding location:", error);

      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to add location",
        variant: "destructive",
      });
    }
  };


  const handleUpdateLocation = async (
    id: string,
    field: string,
    value: any
  ) => {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update location');
      }

      // ✅ safer state update (avoids stale state bug)
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === id ? { ...loc, [field]: value } : loc
        )
      );

    } catch (error: any) {
      console.error("Error updating location:", error);

      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete location');

      setLocations(locations.filter(loc => loc.id !== id));

      toast({
        title: "Location Removed",
        description: "Location has been removed",
      });

    } catch (error) {
      console.error("Error deleting location:", error);
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    }
  };

  const handleAddStorageBin = async (locationId: string, binName: string) => {
    if (!binName.trim()) return;

    try {
      const response = await fetch('/api/storage-bins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          bin_name: binName.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to add bin');

      const data = await response.json();

      setStorageBins([...storageBins, data]);

      toast({
        title: "Bin Added",
        description: `${data.bin_name} has been added`,
      });

    } catch (error) {
      console.error("Error adding bin:", error);
      toast({
        title: "Error",
        description: "Failed to add bin",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStorageBin = async (id: string) => {
    try {
      const response = await fetch(`/api/storage-bins/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete bin');

      setStorageBins(storageBins.filter(bin => bin.id !== id));

      toast({
        title: "Bin Removed",
        description: "Storage bin has been removed",
      });

    } catch (error) {
      console.error("Error deleting bin:", error);
      toast({
        title: "Error",
        description: "Failed to delete bin",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDefaultLocation = async (field: string, value: string) => {
    try {
      const response = await fetch('/api/default-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error('Failed to update default location');

      const data = await response.json();

      setDefaultLocations(data);

      toast({
        title: "Default Location Updated",
        description: "Default location has been set",
      });

    } catch (error) {
      console.error("Error updating default location:", error);
      toast({
        title: "Error",
        description: "Failed to update default location",
        variant: "destructive",
      });
    }
  };

  interface TaxRate {
    id: string;
    rate: string;
    name: string;
  }

  const [taxes, setTaxes] = useState<TaxRate[]>([
    { id: "1", rate: "20", name: "Sales Tax" }
  ]);
  const [newTaxRate, setNewTaxRate] = useState("");
  const [newTaxName, setNewTaxName] = useState("");
  const [defaultSalesTax, setDefaultSalesTax] = useState("1");
  const [defaultPurchaseTax, setDefaultPurchaseTax] = useState("1");

  // Operations state (backed by /api/operations)
  interface Operation {
    id: string;
    department: string;
    operation_name: string;
    machine: string;
    per_hr_cost: string;
    sequence?: number;
  }

  const [operations, setOperations] = useState<Operation[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [newOperation, setNewOperation] = useState<Omit<Operation, 'id'>>({
    department: "",
    operation_name: "",
    machine: "",
    per_hr_cost: ""
  });
  const [operationErrors, setOperationErrors] = useState<Record<string, string>>({});
  const [savingOperation, setSavingOperation] = useState(false);

  const loadOperations = async () => {
    setOperationsLoading(true);
    try {
      const res = await axios.get("/api/operations");
      setOperations(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load operations:", error);
      toast({
        title: "Error",
        description: "Failed to load operations",
        variant: "destructive",
      });
    } finally {
      setOperationsLoading(false);
    }
  };

  const handleAddOperation = async () => {
    setOperationErrors({});
    if (!newOperation.department.trim() || !newOperation.operation_name.trim()) {
      setOperationErrors({
        department: !newOperation.department.trim() ? "Department is required" : "",
        operation_name: !newOperation.operation_name.trim() ? "Operation name is required" : "",
      });
      return;
    }

    setSavingOperation(true);
    try {
      const res = await axios.post("/api/operations", {
        department: newOperation.department.trim(),
        operation_name: newOperation.operation_name.trim(),
        machine: newOperation.machine.trim() || null,
        per_hr_cost: newOperation.per_hr_cost || 0,
      });
      setOperations([...operations, res.data]);
      setNewOperation({ department: "", operation_name: "", machine: "", per_hr_cost: "" });
      toast({
        title: "Operation Added",
        description: `${res.data.operation_name} has been added`,
      });
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors || {};
        setOperationErrors({
          department: errors.department?.[0] || "",
          operation_name: errors.operation_name?.[0] || "",
          machine: errors.machine?.[0] || "",
          per_hr_cost: errors.per_hr_cost?.[0] || "",
        });
        toast({
          title: "Validation Failed",
          description: Object.values(errors).flat().join(" ") as string,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to add operation",
          variant: "destructive",
        });
      }
    } finally {
      setSavingOperation(false);
    }
  };

  const handleDeleteOperation = async (id: string) => {
    const operation = operations.find(o => o.id === id);
    try {
      await axios.delete(`/api/operations/${id}`);
      setOperations(operations.filter(o => o.id !== id));
      toast({
        title: "Operation Removed",
        description: `${operation?.operation_name} has been removed`,
      });
    } catch (error: any) {
      toast({
        title: error.response?.status === 409 ? "Cannot Delete Operation" : "Error",
        description: error.response?.data?.message || "Failed to delete operation",
        variant: "destructive",
      });
    }
  };

  // Resources (Machines) state (backed by /api/resources)
  interface Resource {
    id: string;
    machine_name: string;
    machine_code: string;
    machine_type: string;
    description: string;
    is_active: boolean;
    parent_machine: string;
  }

  const machineTypes = [
    "CNC Machine",
    "Lathe Machine",
    "Milling Machine",
    "Printing Machine",
    "Laser Cutting Machine",
    "Welding Machine",
    "Assembly Station",
    "Packaging Machine",
    "Other"
  ];

  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [newResource, setNewResource] = useState<Omit<Resource, 'id'>>({
    machine_name: "",
    machine_code: "",
    machine_type: "",
    description: "",
    is_active: true,
    parent_machine: ""
  });
  const [resourceErrors, setResourceErrors] = useState<Record<string, string>>({});
  const [savingResource, setSavingResource] = useState(false);

  const [autoGenerateCode, setAutoGenerateCode] = useState(true);

  const loadResources = async () => {
    setResourcesLoading(true);
    try {
      const res = await axios.get("/api/resources");
      setResources(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load resources:", error);
      toast({
        title: "Error",
        description: "Failed to load resources",
        variant: "destructive",
      });
    } finally {
      setResourcesLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
    loadResources();
  }, []);

  // Get unique machines from operations (drives the Resources "Parent Machine" dropdown,
  // and must match the server-side rule in ResourceController::validateData)
  const availableMachines = [...new Set(operations.map(op => op.machine).filter(Boolean))];

  const handleAddResource = async () => {
    setResourceErrors({});
    if (!newResource.machine_name.trim()) {
      setResourceErrors({ machine_name: "Machine name is required" });
      return;
    }

    setSavingResource(true);
    try {
      const res = await axios.post("/api/resources", {
        machine_name: newResource.machine_name.trim(),
        machine_code: autoGenerateCode ? null : newResource.machine_code.trim() || null,
        machine_type: newResource.machine_type || null,
        parent_machine: newResource.parent_machine || null,
        description: newResource.description.trim() || null,
        is_active: true,
      });
      setResources([...resources, res.data]);
      setNewResource({
        machine_name: "",
        machine_code: "",
        machine_type: "",
        description: "",
        is_active: true,
        parent_machine: ""
      });
      toast({
        title: "Resource Added",
        description: `${res.data.machine_name} has been added`,
      });
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors || {};
        setResourceErrors({
          machine_name: errors.machine_name?.[0] || "",
          machine_code: errors.machine_code?.[0] || "",
          machine_type: errors.machine_type?.[0] || "",
          parent_machine: errors.parent_machine?.[0] || "",
        });
        toast({
          title: "Validation Failed",
          description: Object.values(errors).flat().join(" ") as string,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to add resource",
          variant: "destructive",
        });
      }
    } finally {
      setSavingResource(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    const resource = resources.find(r => r.id === id);
    try {
      await axios.delete(`/api/resources/${id}`);
      setResources(resources.filter(r => r.id !== id));
      toast({
        title: "Resource Removed",
        description: `${resource?.machine_name} has been removed`,
      });
    } catch (error: any) {
      toast({
        title: error.response?.status === 409 ? "Cannot Delete Resource" : "Error",
        description: error.response?.data?.message || "Failed to delete resource",
        variant: "destructive",
      });
    }
  };

  const handleToggleResourceActive = async (id: string) => {
    const resource = resources.find(r => r.id === id);
    if (!resource) return;
    const nextActive = !resource.is_active;
    setResources(resources.map(r => (r.id === id ? { ...r, is_active: nextActive } : r)));
    try {
      await axios.put(`/api/resources/${id}`, {
        machine_name: resource.machine_name,
        machine_type: resource.machine_type || null,
        parent_machine: resource.parent_machine || null,
        description: resource.description || null,
        is_active: nextActive,
      });
    } catch (error: any) {
      setResources(resources.map(r => (r.id === id ? { ...r, is_active: !nextActive } : r)));
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update resource status",
        variant: "destructive",
      });
    }
  };

  const handleAddTax = () => {
    if (newTaxRate.trim() && newTaxName.trim()) {
      const newTax: TaxRate = {
        id: Date.now().toString(),
        rate: newTaxRate.trim(),
        name: newTaxName.trim()
      };
      setTaxes([...taxes, newTax]);
      setNewTaxRate("");
      setNewTaxName("");
      toast({
        title: "Tax Added",
        description: `${newTaxRate}% - ${newTaxName} has been added`,
      });
    }
  };

  const handleDeleteTax = (id: string) => {
    const tax = taxes.find(t => t.id === id);
    setTaxes(taxes.filter(t => t.id !== id));
    toast({
      title: "Tax Removed",
      description: `${tax?.rate}% - ${tax?.name} has been removed`,
    });
  };

  const renderContent = () => {
    switch (activeSection) {
      case "units":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Units of measure</h2>
              <p className="text-sm text-muted-foreground">
                Define which measurement units can be used for items in Katana.{" "}
                <a href="#" className="text-primary hover:underline">Learn more</a>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This ensures that item quantities, dimensions, and weights are consistently and accurately recorded.
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="border-b">
                  <div className="flex items-center px-4 py-3 bg-muted/50">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      Name <ArrowUp className="h-3 w-3" />
                    </span>
                  </div>
                </div>

                <div className="divide-y">
                  {units.map((unit, index) => (
                    <div key={index} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                      <span className="text-sm">{unit}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUnit(unit)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter unit name"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddUnit();
                        }
                      }}
                      className="max-w-xs"
                    />
                    <Button
                      variant="link"
                      onClick={handleAddUnit}
                      className="text-primary"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add row
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "tax-rates":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Tax rates</h2>
              ...
            </div>
          </div>
        );

      case "categories":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Categories</h2>
              <p className="text-sm text-muted-foreground">
                Use categories to organize items, enhancing inventory management efficiency.{" "}
                <a href="#" className="text-primary hover:underline">Learn more</a>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                By grouping similar items, categories facilitate more straightforward navigation and filtering.
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="border-b">
                  <div className="flex items-center px-4 py-3 bg-muted/50">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      Name <ArrowUp className="h-3 w-3" />
                    </span>
                  </div>
                </div>

                <div className="divide-y">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                      <span className="text-sm">{category.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCategory();
                        }
                      }}
                      className="max-w-xs"
                    />
                    <Button
                      onClick={handleAddCategory}
                      className="text-primary"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Category
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "general":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">General Settings</h2>
              <p className="text-muted-foreground">
                Configure basic warehouse system settings
              </p>
            </div>
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="warehouse-name">Warehouse Name</Label>
                  <Input id="warehouse-name" defaultValue="Main Distribution Center" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse-code">Warehouse Code</Label>
                  <Input id="warehouse-code" defaultValue="WH-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" defaultValue="UTC-5 (Eastern Time)" />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="low-stock">Low Stock Threshold (%)</Label>
                  <Input id="low-stock" type="number" defaultValue="20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="critical-stock">Critical Stock Threshold (%)</Label>
                  <Input id="critical-stock" type="number" defaultValue="10" />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when inventory is running low
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about order status changes
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Reports</p>
                    <p className="text-sm text-muted-foreground">
                      Receive daily summary of warehouse operations
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "team":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Your Team</h2>
                <p className="text-muted-foreground">
                  Manage team members and their access levels
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add a team member
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add a User to the team</DialogTitle>
                    <DialogDescription>
                      Enter email address and select access level for the new team member
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label className="text-destructive">Enter email address</Label>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        A link will be sent to this email address where the new team member can complete User creation.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Password (Temporary)</Label>
                      <Input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Access level</p>
                          <p className="text-sm text-muted-foreground mt-1">Default permissions</p>
                        </div>
                      </div>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Owner</span>
                              <span className="text-xs text-muted-foreground">Full access - Manage subscription & billing, team</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="user">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">User</span>
                              <span className="text-xs text-muted-foreground">Core features - Can manage users if permitted</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="operator_shop_floor">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Operator (Shop Floor)</span>
                              <span className="text-xs text-muted-foreground">Limited - Complete assigned production tasks only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="operator_warehouse">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">Operator (Warehouse)</span>
                              <span className="text-xs text-muted-foreground">Limited - Complete warehouse picking/packing tasks</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUserWithRole} disabled={loading}>
                        {loading ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="operators">Operators</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-4 mt-6">
                    {users.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No team members found
                      </div>
                    ) : (
                      users.map((user) => (
                        <div key={user.user_id} className="flex items-center justify-between py-4 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {user.email.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.email.split('@')[0]}</p>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{user.email}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-2">
                              {user.roles.map((role: string) => (
                                <Badge key={role} variant="secondary">
                                  {role === 'operator_shop_floor' ? 'Operator (Shop Floor)' :
                                    role === 'operator_warehouse' ? 'Operator (Warehouse)' :
                                      role.charAt(0).toUpperCase() + role.slice(1)}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              {user.roles.map((role: string) => (
                                <Button
                                  key={role}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveRole(user.user_id, role)}
                                  disabled={loading}
                                >
                                  Remove
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="users" className="space-y-4 mt-6">
                    {users.filter(u => u.roles.some((r: string) => ['owner', 'user'].includes(r))).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No users found
                      </div>
                    ) : (
                      users
                        .filter(u => u.roles.some((r: string) => ['owner', 'user'].includes(r)))
                        .map((user) => (
                          <div key={user.user_id} className="flex items-center justify-between py-4 border-b last:border-0">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {user.email.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.email.split('@')[0]}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-2">
                                {user.roles.map((role: string) => (
                                  <Badge key={role} variant="secondary">
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </TabsContent>

                  <TabsContent value="operators" className="space-y-4 mt-6">
                    {users.filter(u => u.roles.some((r: string) => r.startsWith('operator'))).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No operators found
                      </div>
                    ) : (
                      users
                        .filter(u => u.roles.some((r: string) => r.startsWith('operator')))
                        .map((user) => (
                          <div key={user.user_id} className="flex items-center justify-between py-4 border-b last:border-0">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {user.email.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.email.split('@')[0]}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-2">
                                {user.roles.map((role: string) => (
                                  <Badge key={role} variant="secondary">
                                    {role === 'operator_shop_floor' ? 'Operator (Shop Floor)' :
                                      role === 'operator_warehouse' ? 'Operator (Warehouse)' :
                                        role}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        );

      case "locations":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Locations</h2>
            </div>

            <Tabs value={locationTab} onValueChange={setLocationTab} className="w-full">
              <TabsList>
                <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
                <TabsTrigger value="storage-bins">Storage bins</TabsTrigger>
                <TabsTrigger value="default-locations">Default locations</TabsTrigger>
              </TabsList>

              <TabsContent value="warehouse" className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Track and manage inventory across multiple locations, such as warehouses or stores. The location names set here will be used in location selection menus.{" "}
                  <a href="#" className="text-primary hover:underline">Read more</a>
                </p>

                <Card>
                  <CardContent className="p-0">

                    {/* ================= HEADER ================= */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b bg-muted/50 text-xs font-medium text-muted-foreground">

                      <div className="col-span-1 flex items-center justify-left">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      <div className="col-span-2">Location</div>
                      <div className="col-span-2">Legal</div>
                      <div className="col-span-3">Address</div>
                      <div className="col-span-3">Functions</div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* ================= ROWS ================= */}
                    <div className="divide-y">
                      {locations.map((location) => (
                        <div
                          key={location.id}
                          className="grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-muted/30"
                        >

                          {/* GRIP */}
                          <div className="col-span-1 flex justify-left">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          </div>

                          {/* LOCATION NAME */}
                          <div className="col-span-2">
                            <Input
                              value={location.location_name}
                              onChange={(e) =>
                                handleUpdateLocation(location.id, "location_name", e.target.value)
                              }
                              className="h-8"
                            />
                          </div>

                          {/* LEGAL NAME */}
                          <div className="col-span-2">
                            <Input
                              value={location.legal_name || ""}
                              onChange={(e) =>
                                handleUpdateLocation(location.id, "legal_name", e.target.value)
                              }
                              className="h-8"
                            />
                          </div>

                          {/* ADDRESS */}
                          <div className="col-span-3">
                            <Input
                              value={location.address || ""}
                              onChange={(e) =>
                                handleUpdateLocation(location.id, "address", e.target.value)
                              }
                              className="h-8"
                              placeholder="Address"
                            />
                          </div>

                          {/* FUNCTIONS */}
                          <div className="col-span-3 flex gap-3 text-sm">
                            <label className="flex items-center gap-1">
                              <Checkbox
                                checked={location.sell_enabled}
                                onCheckedChange={(v) =>
                                  handleUpdateLocation(location.id, "sell_enabled", v)
                                }
                              />
                              Sell
                            </label>

                            <label className="flex items-center gap-1">
                              <Checkbox
                                checked={location.make_enabled}
                                onCheckedChange={(v) =>
                                  handleUpdateLocation(location.id, "make_enabled", v)
                                }
                              />
                              Make
                            </label>

                            <label className="flex items-center gap-1">
                              <Checkbox
                                checked={location.buy_enabled}
                                onCheckedChange={(v) =>
                                  handleUpdateLocation(location.id, "buy_enabled", v)
                                }
                              />
                              Buy
                            </label>
                          </div>

                          {/* ACTION */}
                          <div className="col-span-1 flex justify-end">
                            <Button variant="ghost" size="sm">
                              <Lock className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ================= ADD NEW LOCATION ================= */}
                    <div className="px-4 py-4 border-t bg-muted/30">

                      <div className="grid grid-cols-12 gap-2 items-center">

                        {/* GRIP EMPTY */}
                        <div className="col-span-1 flex justify-left">
                          <GripVertical className="h-4 w-4 text-muted-foreground opacity-40" />
                        </div>

                        <div className="col-span-2">
                          <Input
                            placeholder="Location name"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                          />
                        </div>

                        <div className="col-span-2">
                          <Input
                            placeholder="Legal name"
                            value={newLegalName}
                            onChange={(e) => setNewLegalName(e.target.value)}
                          />
                        </div>

                        <div className="col-span-3">
                          <Input
                            placeholder="Address"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                          />
                        </div>

                        <div className="col-span-3 flex gap-4 text-sm items-center">

                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={newSellEnabled}
                              onCheckedChange={(val) => setNewSellEnabled(!!val)}
                            />
                            Sell
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={newMakeEnabled}
                              onCheckedChange={(val) => setNewMakeEnabled(!!val)}
                            />
                            Make
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={newBuyEnabled}
                              onCheckedChange={(val) => setNewBuyEnabled(!!val)}
                            />
                            Buy
                          </label>

                        </div>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>

                        <div className="col-span-1 flex justify-end">
                          <Button onClick={handleAddLocation}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>

                      </div>
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="storage-bins" className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Define the designated areas (storage bins) within a warehouse used to organize and track inventory more effectively. Bins can be added by location.{" "}
                  <a href="#" className="text-primary hover:underline">Learn more</a>.
                </p>

                <div className="space-y-2">
                  {locations.map((location) => (
                    <LocationBinSection
                      key={location.id}
                      location={location}
                      storageBins={storageBins}
                      handleAddStorageBin={handleAddStorageBin}
                      handleDeleteStorageBin={handleDeleteStorageBin}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="default-locations" className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose the main locations for sales, manufacturing, and purchasing.
                </p>

                <div className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Default sales location</Label>
                    <Select
                      value={defaultLocations?.default_sales_location || ''}
                      onValueChange={(value) => handleUpdateDefaultLocation('default_sales_location', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Main location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.location_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Default manufacturing location</Label>
                    <Select
                      value={defaultLocations?.default_manufacturing_location || ''}
                      onValueChange={(value) => handleUpdateDefaultLocation('default_manufacturing_location', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Main location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.location_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Default purchases location</Label>
                    <Select
                      value={defaultLocations?.default_purchases_location || ''}
                      onValueChange={(value) => handleUpdateDefaultLocation('default_purchases_location', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Main location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.location_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        );

      case "operations":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Operations</h2>
              <p className="text-sm text-muted-foreground">
                Define all of the steps and actions needed to produce products in your manufacturing or outsourced manufacturing process.{" "}
                <a href="#" className="text-primary hover:underline">Learn more</a>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                The order listed here represents the order in which they will appear in the dropdown menu when choosing operations.
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                {/* Table Header */}
                <div className="border-b">
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50">
                    <div className="col-span-1"></div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        Department <ArrowUp className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm font-medium text-muted-foreground">Operation Name</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm font-medium text-muted-foreground">Machine</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Per Hr Cost</span>
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y">
                  {operationsLoading && (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">Loading operations...</div>
                  )}
                  {!operationsLoading && operations.length === 0 && (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">No operations defined yet. Add one below.</div>
                  )}
                  {!operationsLoading && operations.map((operation) => (
                    <div key={operation.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="col-span-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm">{operation.department}</span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-sm">{operation.operation_name}</span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-sm text-muted-foreground">{operation.machine || "-"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm">{operation.per_hr_cost ? `$${operation.per_hr_cost}` : "-"}</span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOperation(operation.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Operation Form */}
                <div className="border-t px-4 py-4">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-1"></div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Department *</Label>
                      <Input
                        placeholder="e.g. Production"
                        value={newOperation.department}
                        onChange={(e) => setNewOperation({ ...newOperation, department: e.target.value })}
                        className={cn("h-9", operationErrors.department && "border-destructive")}
                      />
                      {operationErrors.department && (
                        <p className="text-xs text-destructive mt-1">{operationErrors.department}</p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Operation Name *</Label>
                      <Input
                        placeholder="e.g. Cutting"
                        value={newOperation.operation_name}
                        onChange={(e) => setNewOperation({ ...newOperation, operation_name: e.target.value })}
                        className={cn("h-9", operationErrors.operation_name && "border-destructive")}
                      />
                      {operationErrors.operation_name && (
                        <p className="text-xs text-destructive mt-1">{operationErrors.operation_name}</p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Machine</Label>
                      <Input
                        placeholder="e.g. Laser Cutter"
                        value={newOperation.machine}
                        onChange={(e) => setNewOperation({ ...newOperation, machine: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Per Hr Cost ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newOperation.per_hr_cost}
                        onChange={(e) => setNewOperation({ ...newOperation, per_hr_cost: e.target.value })}
                        className={cn("h-9", operationErrors.per_hr_cost && "border-destructive")}
                      />
                      {operationErrors.per_hr_cost && (
                        <p className="text-xs text-destructive mt-1">{operationErrors.per_hr_cost}</p>
                      )}
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="link"
                      onClick={handleAddOperation}
                      className="text-primary p-0 h-auto"
                      disabled={!newOperation.operation_name.trim() || !newOperation.department.trim() || savingOperation}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {savingOperation ? "Adding..." : "Add row"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "resources":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Resources</h2>
              <p className="text-sm text-muted-foreground">
                Manage production resources such as machines and equipment.{" "}
                <a href="#" className="text-primary hover:underline">Learn more</a>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Define machine variants and link them to parent machines from Operations settings.
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                {/* Table Header */}
                <div className="border-b">
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50">
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        Machine Name <ArrowUp className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Machine Code</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Machine Type</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Parent Machine</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Description</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm font-medium text-muted-foreground">Status</span>
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y">
                  {resourcesLoading && (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">Loading resources...</div>
                  )}
                  {!resourcesLoading && resources.length === 0 && (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">No resources defined yet. Add one below.</div>
                  )}
                  {!resourcesLoading && resources.map((resource) => (
                    <div key={resource.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Cog className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{resource.machine_name}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Badge variant="outline">{resource.machine_code}</Badge>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm">{resource.machine_type || "-"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-muted-foreground">{resource.parent_machine || "-"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-muted-foreground truncate">{resource.description || "-"}</span>
                      </div>
                      <div className="col-span-1">
                        <Switch
                          checked={resource.is_active}
                          onCheckedChange={() => handleToggleResourceActive(resource.id)}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteResource(resource.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Resource Form */}
                <div className="border-t px-4 py-4 space-y-4">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Machine Name *</Label>
                      <Input
                        placeholder="e.g. CNC Router B2"
                        value={newResource.machine_name}
                        onChange={(e) => setNewResource({ ...newResource, machine_name: e.target.value })}
                        className={cn("h-9", resourceErrors.machine_name && "border-destructive")}
                      />
                      {resourceErrors.machine_name && (
                        <p className="text-xs text-destructive mt-1">{resourceErrors.machine_name}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs text-muted-foreground">Machine Code</Label>
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id="auto-code"
                            checked={autoGenerateCode}
                            onCheckedChange={(checked) => setAutoGenerateCode(!!checked)}
                          />
                          <label htmlFor="auto-code" className="text-xs text-muted-foreground cursor-pointer">Auto</label>
                        </div>
                      </div>
                      <Input
                        placeholder={autoGenerateCode ? "Auto-generated" : "MCH-XXX"}
                        value={autoGenerateCode ? "" : newResource.machine_code}
                        onChange={(e) => setNewResource({ ...newResource, machine_code: e.target.value })}
                        className={cn("h-9", resourceErrors.machine_code && "border-destructive")}
                        disabled={autoGenerateCode}
                      />
                      {resourceErrors.machine_code && (
                        <p className="text-xs text-destructive mt-1">{resourceErrors.machine_code}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Machine Type</Label>
                      <Select
                        value={newResource.machine_type}
                        onValueChange={(value) => setNewResource({ ...newResource, machine_type: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {machineTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Parent Machine</Label>
                      <Select
                        value={newResource.parent_machine}
                        onValueChange={(value) => setNewResource({ ...newResource, parent_machine: value })}
                      >
                        <SelectTrigger className={cn("h-9", resourceErrors.parent_machine && "border-destructive")}>
                          <SelectValue placeholder="Select parent" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMachines.length > 0 ? (
                            availableMachines.map((machine) => (
                              <SelectItem key={machine} value={machine}>{machine}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No machines in Operations</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {resourceErrors.parent_machine && (
                        <p className="text-xs text-destructive mt-1">{resourceErrors.parent_machine}</p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                      <Input
                        placeholder="Brief description"
                        value={newResource.description}
                        onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                  <div>
                    <Button
                      variant="link"
                      onClick={handleAddResource}
                      className="text-primary p-0 h-auto"
                      disabled={!newResource.machine_name.trim() || savingResource}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {savingResource ? "Adding..." : "Add resource"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {availableMachines.length === 0 && (
              <div className="bg-muted/50 border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <Info className="h-4 w-4 inline mr-2" />
                  No machines found in Operations. Add machines in the{" "}
                  <button
                    onClick={() => setActiveSection("operations")}
                    className="text-primary hover:underline"
                  >
                    Operations settings
                  </button>
                  {" "}to link parent machines to resources.
                </p>
              </div>
            )}
          </div>
        );

      case "barcodes":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Barcode Settings</h2>
              <p className="text-muted-foreground">
                Configure barcode generation and scanning preferences for inventory management
              </p>
            </div>

            {/* Barcode Format Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Barcode className="h-5 w-5" />
                  Barcode Format
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="barcode-type">Barcode Type</Label>
                    <Select defaultValue="code128">
                      <SelectTrigger id="barcode-type">
                        <SelectValue placeholder="Select barcode type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="code128">Code 128</SelectItem>
                        <SelectItem value="code39">Code 39</SelectItem>
                        <SelectItem value="ean13">EAN-13</SelectItem>
                        <SelectItem value="ean8">EAN-8</SelectItem>
                        <SelectItem value="upc">UPC-A</SelectItem>
                        <SelectItem value="qrcode">QR Code</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Code 128 is recommended for alphanumeric inventory codes
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode-width">Barcode Width (mm)</Label>
                    <Input id="barcode-width" type="number" defaultValue="50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode-height">Barcode Height (mm)</Label>
                    <Input id="barcode-height" type="number" defaultValue="25" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label-size">Label Size</Label>
                    <Select defaultValue="standard">
                      <SelectTrigger id="label-size">
                        <SelectValue placeholder="Select label size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (25mm x 15mm)</SelectItem>
                        <SelectItem value="standard">Standard (50mm x 25mm)</SelectItem>
                        <SelectItem value="large">Large (100mm x 50mm)</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Display Options</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Show Item Code</p>
                      <p className="text-xs text-muted-foreground">Display the item code below the barcode</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Show Item Name</p>
                      <p className="text-xs text-muted-foreground">Display the item name on the label</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Show Location</p>
                      <p className="text-xs text-muted-foreground">Include storage location on the label</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Button>Save Format Settings</Button>
              </CardContent>
            </Card>

            {/* Barcode Numbering */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Barcode Numbering
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="barcode-prefix">Barcode Prefix</Label>
                    <Input id="barcode-prefix" defaultValue="INV" placeholder="e.g., INV, SKU, PRD" />
                    <p className="text-xs text-muted-foreground">
                      Prefix added to all generated barcodes
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode-suffix">Barcode Suffix</Label>
                    <Input id="barcode-suffix" placeholder="Optional suffix" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="starting-number">Starting Number</Label>
                    <Input id="starting-number" type="number" defaultValue="1001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number-length">Number Length (digits)</Label>
                    <Input id="number-length" type="number" defaultValue="6" min={4} max={12} />
                    <p className="text-xs text-muted-foreground">
                      Numbers will be zero-padded to this length
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base font-mono">INV-001001</Badge>
                    <span className="text-xs text-muted-foreground">(Next barcode)</span>
                  </div>
                </div>

                <Button>Save Numbering Settings</Button>
              </CardContent>
            </Card>

            {/* Print Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Print Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="printer-type">Printer Type</Label>
                    <Select defaultValue="thermal">
                      <SelectTrigger id="printer-type">
                        <SelectValue placeholder="Select printer type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thermal">Thermal Label Printer</SelectItem>
                        <SelectItem value="inkjet">Inkjet Printer</SelectItem>
                        <SelectItem value="laser">Laser Printer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="labels-per-row">Labels Per Row</Label>
                    <Input id="labels-per-row" type="number" defaultValue="3" min={1} max={5} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="page-size">Page Size</Label>
                    <Select defaultValue="a4">
                      <SelectTrigger id="page-size">
                        <SelectValue placeholder="Select page size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4</SelectItem>
                        <SelectItem value="letter">Letter</SelectItem>
                        <SelectItem value="roll">Label Roll</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="margin">Margin (mm)</Label>
                    <Input id="margin" type="number" defaultValue="5" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto-print on Item Creation</p>
                    <p className="text-xs text-muted-foreground">Automatically print barcode label when new item is added</p>
                  </div>
                  <Switch />
                </div>

                <Button>Save Print Settings</Button>
              </CardContent>
            </Card>

            {/* Scanning Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Scanning Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Enable Camera Scanning</p>
                    <p className="text-xs text-muted-foreground">Allow scanning barcodes using device camera</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Beep on Successful Scan</p>
                    <p className="text-xs text-muted-foreground">Play a sound when barcode is scanned successfully</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Vibrate on Scan</p>
                    <p className="text-xs text-muted-foreground">Vibrate device on successful scan (mobile only)</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto-redirect after Scan</p>
                    <p className="text-xs text-muted-foreground">Automatically navigate to item details after scanning</p>
                  </div>
                  <Switch />
                </div>

                <Button>Save Scanning Settings</Button>
              </CardContent>
            </Card>
          </div>
        );

      case "profile":
        return (
          <div className="space-y-6">

            {/* HEADER */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Profile Details
              </h2>
              <p className="text-muted-foreground">
                Manage your personal information and account settings
              </p>
            </div>

            {/* ================= PERSONAL INFO (ADDED MISSING FIELDS) ================= */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">

                <div className="grid grid-cols-2 gap-6">

                  {/* First Name */}
                  <div className="space-y-1">
                    <Label>First Name </Label>
                    <Input
                      placeholder="Enter first name"
                      value={companyDetails.first_name}
                      onChange={(e) =>
                        setCompanyDetails({
                          ...companyDetails,
                          first_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1">
                    <Label>Last Name </Label>
                    <Input
                      placeholder="Enter last name"
                      value={companyDetails.last_name}
                      onChange={(e) =>
                        setCompanyDetails({
                          ...companyDetails,
                          last_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Country */}
                  <div className="space-y-1">
                    <Label>Country </Label>
                    <Input
                      placeholder="Enter country"
                      value={companyDetails.country}
                      onChange={(e) =>
                        setCompanyDetails({
                          ...companyDetails,
                          country: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Currency */}
                  <div className="space-y-1">
                    <Label>Currency </Label>
                    <Input
                      placeholder="Enter currency"
                      value={companyDetails.currency}
                      onChange={(e) =>
                        setCompanyDetails({
                          ...companyDetails,
                          currency: e.target.value,
                        })
                      }
                    />
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security (Change Password)</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">

                <div className="grid grid-cols-2 gap-6">

                  {/* Current Password */}
                  <div className="space-y-1">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      value={companyDetails.current_password}
                      onChange={(e) =>
                        setCompanyDetails({
                          ...companyDetails,
                          current_password: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-1">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={companyDetails.password}
                      onChange={(e) =>
                        setCompanyDetails({
                          ...companyDetails,
                          password: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={companyDetails.confirm_password}
                      onChange={(e) =>
                        setCompanyDetails({
                          ...companyDetails,
                          confirm_password: e.target.value,
                        })
                      }
                    />
                  </div>

                </div>

              </CardContent>
            </Card>


            {/* ================= COMPANY INFORMATION ================= */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">

                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      placeholder="Enter company name"
                      value={companyDetails.company}
                      onChange={(e) =>
                        setCompanyDetails({ ...companyDetails, company: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>GSTIN</Label>
                    <Input
                      placeholder="Enter GSTIN"
                      value={companyDetails.gstin}
                      onChange={(e) =>
                        setCompanyDetails({ ...companyDetails, gstin: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>PAN</Label>
                    <Input
                      placeholder="Enter PAN"
                      value={companyDetails.pan}
                      onChange={(e) =>
                        setCompanyDetails({ ...companyDetails, pan: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="Enter phone number"
                      value={companyDetails.phone}
                      onChange={(e) =>
                        setCompanyDetails({ ...companyDetails, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Email</Label>
                    <Input
                      placeholder="Enter email address"
                      value={companyDetails.email}
                      onChange={(e) =>
                        setCompanyDetails({ ...companyDetails, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Address *</Label>
                    <Input
                      placeholder="Enter company address"
                      value={companyDetails.address}
                      onChange={(e) =>
                        setCompanyDetails({ ...companyDetails, address: e.target.value })
                      }
                    />
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* ================= BANK DETAILS ================= */}
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">

                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      placeholder="Enter account name"
                      value={companyDetails.bank_account_name}
                      onChange={(e) =>
                        setCompanyDetails({
                          ...companyDetails,
                          bank_account_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      placeholder="Enter account number"
                      value={companyDetails.bank_account_number}
                      onChange={(e) =>
                        setCompanyDetails({
                          ...companyDetails,
                          bank_account_number: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>IFSC</Label>
                    <Input
                      placeholder="Enter IFSC code"
                      value={companyDetails.ifsc}
                      onChange={(e) =>
                        setCompanyDetails({ ...companyDetails, ifsc: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select
                      value={companyDetails.account_type}
                      onValueChange={(value) =>
                        setCompanyDetails({ ...companyDetails, account_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      placeholder="Enter bank name"
                      value={companyDetails.bank_name}
                      onChange={(e) =>
                        setCompanyDetails({ ...companyDetails, bank_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Input
                      placeholder="Enter branch"
                      value={companyDetails.branch}
                      onChange={(e) =>
                        setCompanyDetails({ ...companyDetails, branch: e.target.value })
                      }
                    />
                  </div>

                </div>

                <Button onClick={handleSaveCompany}>
                  Save Details
                </Button>
              </CardContent>
            </Card>

          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">{navigationItems.find(item => item.id === activeSection)?.label}</h2>
              <p className="text-muted-foreground">
                Configure {navigationItems.find(item => item.id === activeSection)?.label.toLowerCase()} settings
              </p>
            </div>
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  Settings for this section coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r bg-muted/30 p-4 space-y-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                activeSection === item.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <span>{item.label}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
