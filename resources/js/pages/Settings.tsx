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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import axios from 'axios';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const navigationItems = [
  { id: "profile", label: "Profile" },
  { id: "general", label: "General" },
  { id: "tax-rates", label: "Tax rates" },
  { id: "custom-fields", label: "Custom fields" },
  { id: "barcodes", label: "Barcodes" },
  { id: "operations", label: "Operations" },
  { id: "resources", label: "Resources" },
  { id: "operators", label: "Operators" },
  { id: "locations", label: "Locations" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "team", label: "Team Management" },
  { id: "roles", label: "Role Management" },
  { id: "departments", label: "Departments" },
];

// Nav items without an entry here are visible to every authenticated org
// member (matches today's behavior); these three are the only sections this
// pass actually enforces, so they're the only ones hidden from users who
// lack the permission.
const SECTION_PERMISSIONS: Record<string, string> = {
  team: "settings.manage_team",
  roles: "settings.manage_roles",
  departments: "settings.manage_departments",
};

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


  // ---- Teams / Roles / Departments (backed by /api/team, /api/roles, /api/departments) ----
  interface TeamMember {
    id: number;
    first_name: string | null;
    email: string;
    phone: string | null;
    is_active: boolean;
    role: { id: string; name: string; is_system: boolean } | null;
    departments: { id: string; name: string }[];
    permission_overrides?: { id: number; granted: boolean; permission: { id: string; key: string; label: string; module: string } }[];
  }
  interface RoleRow {
    id: string;
    name: string;
    is_system: boolean;
    users_count: number;
    permissions: { id: string; key: string; label: string; module: string; category?: string }[];
  }
  interface DepartmentRow {
    id: string;
    name: string;
    is_active: boolean;
  }
  interface PermissionRow {
    id: string;
    key: string;
    label: string;
    module: string;
    category: "visibility" | "workflow" | "admin";
  }

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DepartmentRow[]>([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionRow[]>([]);

  const [newTeamMember, setNewTeamMember] = useState({
    name: "", email: "", mobile: "", password: "", role_id: "", department_ids: [] as string[],
    granted_permissions: [] as string[], revoked_permissions: [] as string[],
  });
  const [teamMemberErrors, setTeamMemberErrors] = useState<Record<string, string>>({});
  const [savingTeamMember, setSavingTeamMember] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  // "Customize permissions" — per-user exceptions layered on top of a
  // role's defaults. Reused for both the not-yet-created member in the Add
  // dialog (target "new", applied on submit) and an existing member (target
  // = their id, saved immediately via PUT /api/team/{id}/permissions).
  const [permCustomizeOpen, setPermCustomizeOpen] = useState(false);
  const [permCustomizeTarget, setPermCustomizeTarget] = useState<"new" | number | null>(null);
  const [permCustomizeRoleId, setPermCustomizeRoleId] = useState("");
  const [permCustomizeChecked, setPermCustomizeChecked] = useState<Record<string, boolean>>({});
  const [permCustomizeTab, setPermCustomizeTab] = useState<"visibility" | "workflow" | "admin">("visibility");
  const [savingPermCustomize, setSavingPermCustomize] = useState(false);

  const getRoleDefaultKeys = (roleId: string): string[] =>
    roles.find((r) => r.id === roleId)?.permissions.map((p) => p.key) || [];

  const openCustomizePermissionsForNew = () => {
    const defaults = getRoleDefaultKeys(newTeamMember.role_id);
    const checked: Record<string, boolean> = {};
    permissionsCatalog.forEach((p) => { checked[p.key] = defaults.includes(p.key); });
    newTeamMember.granted_permissions.forEach((k) => { checked[k] = true; });
    newTeamMember.revoked_permissions.forEach((k) => { checked[k] = false; });
    setPermCustomizeChecked(checked);
    setPermCustomizeRoleId(newTeamMember.role_id);
    setPermCustomizeTarget("new");
    setPermCustomizeTab("visibility");
    setPermCustomizeOpen(true);
  };

  const openCustomizePermissionsForMember = (member: TeamMember) => {
    const roleId = member.role?.id || "";
    const defaults = getRoleDefaultKeys(roleId);
    const checked: Record<string, boolean> = {};
    permissionsCatalog.forEach((p) => { checked[p.key] = defaults.includes(p.key); });
    (member.permission_overrides || []).forEach((o) => { checked[o.permission.key] = o.granted; });
    setPermCustomizeChecked(checked);
    setPermCustomizeRoleId(roleId);
    setPermCustomizeTarget(member.id);
    setPermCustomizeTab("visibility");
    setPermCustomizeOpen(true);
  };

  const handleApplyPermissionCustomization = async () => {
    const defaults = getRoleDefaultKeys(permCustomizeRoleId);
    const granted: string[] = [];
    const revoked: string[] = [];
    permissionsCatalog.forEach((p) => {
      const isChecked = !!permCustomizeChecked[p.key];
      const isDefault = defaults.includes(p.key);
      if (isChecked && !isDefault) granted.push(p.key);
      if (!isChecked && isDefault) revoked.push(p.key);
    });

    if (permCustomizeTarget === "new") {
      setNewTeamMember({ ...newTeamMember, granted_permissions: granted, revoked_permissions: revoked });
      setPermCustomizeOpen(false);
      return;
    }

    if (typeof permCustomizeTarget === "number") {
      setSavingPermCustomize(true);
      try {
        await axios.put(`/api/team/${permCustomizeTarget}/permissions`, {
          granted_permissions: granted,
          revoked_permissions: revoked,
        });
        await loadTeam();
        toast({ title: "Permissions Updated" });
        setPermCustomizeOpen(false);
      } catch (error: any) {
        toast({ title: "Error", description: error.response?.data?.message || "Failed to update permissions", variant: "destructive" });
      } finally {
        setSavingPermCustomize(false);
      }
    }
  };

  const loadTeam = async () => {
    setTeamLoading(true);
    try {
      const res = await axios.get("/api/team");
      setTeamMembers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      // A non-manager legitimately gets a 403 here — the section itself is
      // already hidden from them, so fail quietly rather than toasting.
    } finally {
      setTeamLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await axios.get("/api/roles");
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setRoles([]);
    }
  };

  const loadDepartmentsList = async () => {
    try {
      const res = await axios.get("/api/departments");
      setDepartmentsList(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setDepartmentsList([]);
    }
  };

  const loadPermissionsCatalog = async () => {
    // No dedicated /api/permissions endpoint — the full catalog rides along
    // on every role (each role response includes its `permissions` list,
    // and Admin/Super Admin are seeded with the entire catalog), so the
    // first role's permission list already IS the full catalog.
    try {
      const res = await axios.get("/api/roles");
      const withAll = (res.data || []).find((r: RoleRow) => r.permissions?.length > 0);
      setPermissionsCatalog(withAll?.permissions || []);
    } catch (error) {
      setPermissionsCatalog([]);
    }
  };

  const handleAddTeamMember = async () => {
    setTeamMemberErrors({});
    if (!newTeamMember.name.trim() || !newTeamMember.email.trim() || !newTeamMember.password.trim()) {
      setTeamMemberErrors({
        name: !newTeamMember.name.trim() ? "Employee name is required" : "",
        email: !newTeamMember.email.trim() ? "Email is required" : "",
        password: !newTeamMember.password.trim() ? "Password is required" : "",
      });
      return;
    }

    setSavingTeamMember(true);
    try {
      const res = await axios.post("/api/team", {
        name: newTeamMember.name.trim(),
        email: newTeamMember.email.trim(),
        mobile: newTeamMember.mobile.trim() || null,
        password: newTeamMember.password,
        role_id: newTeamMember.role_id || null,
        department_ids: newTeamMember.department_ids,
        granted_permissions: newTeamMember.granted_permissions,
        revoked_permissions: newTeamMember.revoked_permissions,
      });
      setTeamMembers([...teamMembers, res.data]);
      setNewTeamMember({ name: "", email: "", mobile: "", password: "", role_id: "", department_ids: [], granted_permissions: [], revoked_permissions: [] });
      setTeamDialogOpen(false);
      toast({ title: "Team Member Added", description: `${res.data.email} has been added` });
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors || {};
        setTeamMemberErrors({
          name: errors.name?.[0] || "",
          email: errors.email?.[0] || "",
          password: errors.password?.[0] || "",
        });
        toast({ title: "Validation Failed", description: Object.values(errors).flat().join(" ") as string, variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.response?.data?.message || "Failed to add team member", variant: "destructive" });
      }
    } finally {
      setSavingTeamMember(false);
    }
  };

  const handleToggleTeamMemberActive = async (member: TeamMember) => {
    const nextActive = !member.is_active;
    setTeamMembers(teamMembers.map(m => m.id === member.id ? { ...m, is_active: nextActive } : m));
    try {
      // Deactivating goes through destroy() (also carries the last-Super-Admin
      // guard); reactivating is a plain field update.
      if (nextActive) {
        await axios.put(`/api/team/${member.id}`, { is_active: true });
      } else {
        await axios.delete(`/api/team/${member.id}`);
      }
    } catch (error: any) {
      setTeamMembers(teamMembers.map(m => m.id === member.id ? { ...m, is_active: !nextActive } : m));
      toast({ title: "Error", description: error.response?.data?.message || "Failed to update team member status", variant: "destructive" });
    }
  };

  // ---- Role Management ----
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [roleForm, setRoleForm] = useState<{ name: string; permissions: string[] }>({ name: "", permissions: [] });
  const [savingRole, setSavingRole] = useState(false);

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", permissions: [] });
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: RoleRow) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, permissions: role.permissions.map(p => p.key) });
    setRoleDialogOpen(true);
  };

  const toggleRolePermission = (key: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key) ? prev.permissions.filter(k => k !== key) : [...prev.permissions, key],
    }));
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      toast({ title: "Validation Error", description: "Role name is required", variant: "destructive" });
      return;
    }
    setSavingRole(true);
    try {
      if (editingRole) {
        const res = await axios.put(`/api/roles/${editingRole.id}`, roleForm);
        setRoles(roles.map(r => r.id === editingRole.id ? res.data : r));
      } else {
        const res = await axios.post("/api/roles", roleForm);
        setRoles([...roles, res.data]);
      }
      setRoleDialogOpen(false);
      toast({ title: editingRole ? "Role Updated" : "Role Created", description: roleForm.name });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to save role", variant: "destructive" });
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: RoleRow) => {
    try {
      await axios.delete(`/api/roles/${role.id}`);
      setRoles(roles.filter(r => r.id !== role.id));
      toast({ title: "Role Deleted", description: role.name });
    } catch (error: any) {
      toast({ title: "Cannot Delete Role", description: error.response?.data?.message || "Failed to delete role", variant: "destructive" });
    }
  };

  // ---- Departments (mirrors the Operators section pattern) ----
  const [newDepartment, setNewDepartment] = useState({ name: "" });
  const [departmentErrors, setDepartmentErrors] = useState<Record<string, string>>({});
  const [savingDepartment, setSavingDepartment] = useState(false);

  const handleAddDepartment = async () => {
    setDepartmentErrors({});
    if (!newDepartment.name.trim()) {
      setDepartmentErrors({ name: "Department name is required" });
      return;
    }
    setSavingDepartment(true);
    try {
      const res = await axios.post("/api/departments", { name: newDepartment.name.trim() });
      setDepartmentsList([...departmentsList, res.data]);
      setNewDepartment({ name: "" });
      toast({ title: "Department Added", description: res.data.name });
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors || {};
        setDepartmentErrors({ name: errors.name?.[0] || "" });
      } else {
        toast({ title: "Error", description: error.response?.data?.message || "Failed to add department", variant: "destructive" });
      }
    } finally {
      setSavingDepartment(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    const department = departmentsList.find(d => d.id === id);
    try {
      await axios.delete(`/api/departments/${id}`);
      setDepartmentsList(departmentsList.filter(d => d.id !== id));
      toast({ title: "Department Removed", description: department?.name });
    } catch (error: any) {
      toast({ title: "Cannot Delete Department", description: error.response?.data?.message || "Failed to delete department", variant: "destructive" });
    }
  };

  const handleToggleDepartmentActive = async (dept: DepartmentRow) => {
    const nextActive = !dept.is_active;
    setDepartmentsList(departmentsList.map(d => d.id === dept.id ? { ...d, is_active: nextActive } : d));
    try {
      await axios.put(`/api/departments/${dept.id}`, { name: dept.name, is_active: nextActive });
    } catch (error: any) {
      setDepartmentsList(departmentsList.map(d => d.id === dept.id ? { ...d, is_active: !nextActive } : d));
      toast({ title: "Error", description: error.response?.data?.message || "Failed to update department status", variant: "destructive" });
    }
  };

  // ---- General Settings (backed by /api/organization-settings) ----
  interface OrgSettings {
    warehouse_name: string;
    warehouse_code: string;
    timezone: string;
    low_stock_threshold: number | string;
    critical_stock_threshold: number | string;
    low_stock_alerts_enabled: boolean;
    order_updates_enabled: boolean;
    daily_reports_enabled: boolean;
    barcode_type: string;
    barcode_width: number | string;
    barcode_height: number | string;
    barcode_label_size: string;
    barcode_show_item_code: boolean;
    barcode_show_item_name: boolean;
    barcode_show_location: boolean;
    barcode_prefix: string;
    barcode_suffix: string;
    barcode_starting_number: number | string;
    barcode_number_length: number | string;
    barcode_printer_type: string;
    barcode_labels_per_row: number | string;
    barcode_page_size: string;
    barcode_margin: number | string;
    barcode_auto_print_on_creation: boolean;
    barcode_camera_scanning_enabled: boolean;
    barcode_beep_on_scan: boolean;
    barcode_vibrate_on_scan: boolean;
    barcode_auto_redirect_on_scan: boolean;
  }

  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    warehouse_name: "", warehouse_code: "", timezone: "",
    low_stock_threshold: "", critical_stock_threshold: "",
    low_stock_alerts_enabled: true, order_updates_enabled: true, daily_reports_enabled: true,
    barcode_type: "code128", barcode_width: 50, barcode_height: 25, barcode_label_size: "standard",
    barcode_show_item_code: true, barcode_show_item_name: true, barcode_show_location: false,
    barcode_prefix: "INV", barcode_suffix: "", barcode_starting_number: 1001, barcode_number_length: 6,
    barcode_printer_type: "thermal", barcode_labels_per_row: 3, barcode_page_size: "a4", barcode_margin: 5,
    barcode_auto_print_on_creation: false, barcode_camera_scanning_enabled: true,
    barcode_beep_on_scan: true, barcode_vibrate_on_scan: true, barcode_auto_redirect_on_scan: false,
  });
  const [orgSettingsLoading, setOrgSettingsLoading] = useState(false);
  const [savingWarehouseSettings, setSavingWarehouseSettings] = useState(false);
  const [savingInventorySettings, setSavingInventorySettings] = useState(false);
  const [savingBarcodeFormat, setSavingBarcodeFormat] = useState(false);
  const [savingBarcodeNumbering, setSavingBarcodeNumbering] = useState(false);
  const [savingPrintSettings, setSavingPrintSettings] = useState(false);
  const [savingScanningSettings, setSavingScanningSettings] = useState(false);

  const loadOrgSettings = async () => {
    setOrgSettingsLoading(true);
    try {
      const res = await axios.get("/api/organization-settings");
      setOrgSettings({
        warehouse_name: res.data.warehouse_name || "",
        warehouse_code: res.data.warehouse_code || "",
        timezone: res.data.timezone || "",
        low_stock_threshold: res.data.low_stock_threshold ?? "",
        critical_stock_threshold: res.data.critical_stock_threshold ?? "",
        low_stock_alerts_enabled: !!res.data.low_stock_alerts_enabled,
        order_updates_enabled: !!res.data.order_updates_enabled,
        daily_reports_enabled: !!res.data.daily_reports_enabled,
        barcode_type: res.data.barcode_type || "code128",
        barcode_width: res.data.barcode_width ?? 50,
        barcode_height: res.data.barcode_height ?? 25,
        barcode_label_size: res.data.barcode_label_size || "standard",
        barcode_show_item_code: !!res.data.barcode_show_item_code,
        barcode_show_item_name: !!res.data.barcode_show_item_name,
        barcode_show_location: !!res.data.barcode_show_location,
        barcode_prefix: res.data.barcode_prefix || "",
        barcode_suffix: res.data.barcode_suffix || "",
        barcode_starting_number: res.data.barcode_starting_number ?? 1001,
        barcode_number_length: res.data.barcode_number_length ?? 6,
        barcode_printer_type: res.data.barcode_printer_type || "thermal",
        barcode_labels_per_row: res.data.barcode_labels_per_row ?? 3,
        barcode_page_size: res.data.barcode_page_size || "a4",
        barcode_margin: res.data.barcode_margin ?? 5,
        barcode_auto_print_on_creation: !!res.data.barcode_auto_print_on_creation,
        barcode_camera_scanning_enabled: !!res.data.barcode_camera_scanning_enabled,
        barcode_beep_on_scan: !!res.data.barcode_beep_on_scan,
        barcode_vibrate_on_scan: !!res.data.barcode_vibrate_on_scan,
        barcode_auto_redirect_on_scan: !!res.data.barcode_auto_redirect_on_scan,
      });
    } catch (error) {
      // Non-managers can still view Settings' other tabs; a 403 here just
      // means General Settings shows its defaults instead of erroring out.
    } finally {
      setOrgSettingsLoading(false);
    }
  };

  const handleSaveWarehouseSettings = async () => {
    setSavingWarehouseSettings(true);
    try {
      const res = await axios.put("/api/organization-settings", {
        warehouse_name: orgSettings.warehouse_name,
        warehouse_code: orgSettings.warehouse_code,
        timezone: orgSettings.timezone,
      });
      setOrgSettings((prev) => ({ ...prev, ...res.data }));
      toast({ title: "Settings Saved", description: "Warehouse settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to save warehouse settings", variant: "destructive" });
    } finally {
      setSavingWarehouseSettings(false);
    }
  };

  const handleSaveInventorySettings = async () => {
    setSavingInventorySettings(true);
    try {
      const res = await axios.put("/api/organization-settings", {
        low_stock_threshold: orgSettings.low_stock_threshold || 0,
        critical_stock_threshold: orgSettings.critical_stock_threshold || 0,
      });
      setOrgSettings((prev) => ({ ...prev, ...res.data }));
      toast({ title: "Settings Saved", description: "Inventory thresholds updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to save inventory settings", variant: "destructive" });
    } finally {
      setSavingInventorySettings(false);
    }
  };

  const handleToggleNotification = async (key: "low_stock_alerts_enabled" | "order_updates_enabled" | "daily_reports_enabled") => {
    const nextValue = !orgSettings[key];
    setOrgSettings((prev) => ({ ...prev, [key]: nextValue }));
    try {
      const res = await axios.put("/api/organization-settings", { [key]: nextValue });
      setOrgSettings((prev) => ({ ...prev, ...res.data }));
    } catch (error: any) {
      setOrgSettings((prev) => ({ ...prev, [key]: !nextValue }));
      toast({ title: "Error", description: error.response?.data?.message || "Failed to update notification setting", variant: "destructive" });
    }
  };

  const handleSaveBarcodeFormat = async () => {
    setSavingBarcodeFormat(true);
    try {
      const res = await axios.put("/api/organization-settings", {
        barcode_type: orgSettings.barcode_type,
        barcode_width: orgSettings.barcode_width || 0,
        barcode_height: orgSettings.barcode_height || 0,
        barcode_label_size: orgSettings.barcode_label_size,
        barcode_show_item_code: orgSettings.barcode_show_item_code,
        barcode_show_item_name: orgSettings.barcode_show_item_name,
        barcode_show_location: orgSettings.barcode_show_location,
      });
      setOrgSettings((prev) => ({ ...prev, ...res.data }));
      toast({ title: "Settings Saved", description: "Barcode format settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to save barcode format settings", variant: "destructive" });
    } finally {
      setSavingBarcodeFormat(false);
    }
  };

  const handleSaveBarcodeNumbering = async () => {
    setSavingBarcodeNumbering(true);
    try {
      const res = await axios.put("/api/organization-settings", {
        barcode_prefix: orgSettings.barcode_prefix,
        barcode_suffix: orgSettings.barcode_suffix,
        barcode_starting_number: orgSettings.barcode_starting_number || 0,
        barcode_number_length: orgSettings.barcode_number_length || 4,
      });
      setOrgSettings((prev) => ({ ...prev, ...res.data }));
      toast({ title: "Settings Saved", description: "Barcode numbering settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to save barcode numbering settings", variant: "destructive" });
    } finally {
      setSavingBarcodeNumbering(false);
    }
  };

  const handleSavePrintSettings = async () => {
    setSavingPrintSettings(true);
    try {
      const res = await axios.put("/api/organization-settings", {
        barcode_printer_type: orgSettings.barcode_printer_type,
        barcode_labels_per_row: orgSettings.barcode_labels_per_row || 1,
        barcode_page_size: orgSettings.barcode_page_size,
        barcode_margin: orgSettings.barcode_margin || 0,
        barcode_auto_print_on_creation: orgSettings.barcode_auto_print_on_creation,
      });
      setOrgSettings((prev) => ({ ...prev, ...res.data }));
      toast({ title: "Settings Saved", description: "Print settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to save print settings", variant: "destructive" });
    } finally {
      setSavingPrintSettings(false);
    }
  };

  const handleSaveScanningSettings = async () => {
    setSavingScanningSettings(true);
    try {
      const res = await axios.put("/api/organization-settings", {
        barcode_camera_scanning_enabled: orgSettings.barcode_camera_scanning_enabled,
        barcode_beep_on_scan: orgSettings.barcode_beep_on_scan,
        barcode_vibrate_on_scan: orgSettings.barcode_vibrate_on_scan,
        barcode_auto_redirect_on_scan: orgSettings.barcode_auto_redirect_on_scan,
      });
      setOrgSettings((prev) => ({ ...prev, ...res.data }));
      toast({ title: "Settings Saved", description: "Scanning settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to save scanning settings", variant: "destructive" });
    } finally {
      setSavingScanningSettings(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<string>(searchParams.get("section") || "profile");


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
    loadOrgSettings();
    loadTeam();
    loadRoles();
    loadDepartmentsList();
    loadPermissionsCatalog();
    loadLocations();
    loadStorageBins();
    loadDefaultLocations();
  }, []);

  // Location management functions
  const loadLocations = async () => {
    try {
      const { data } = await axios.get('/api/locations');

      setLocations(Array.isArray(data) ? data : data.data);

    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const loadStorageBins = async () => {
    try {
      const { data } = await axios.get("/api/storage-bins");

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
      const { data } = await axios.get('/api/default-location');
      setDefaultLocations(data);

    } catch (error: any) {
      if (error.response?.status === 404) {
        setDefaultLocations(null);
        return;
      }
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
        sell_enabled: newSellEnabled,
        make_enabled: newMakeEnabled,
        buy_enabled: newBuyEnabled,
      });

      const data = res.data;

      setLocations(prev => [...prev, data]);

      setNewLocationName("");
      setNewLegalName("");
      setNewAddress("");
      setNewSellEnabled(true);
      setNewMakeEnabled(true);
      setNewBuyEnabled(true);

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


  const updateLocationFieldLocal = (id: string, field: string, value: any) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, [field]: value } : loc))
    );
  };

  const handleUpdateLocation = async (
    id: string,
    field: string,
    value: any
  ) => {
    try {
      await axios.put(`/api/locations/${id}`, { [field]: value });

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
        description: error.response?.data?.message || "Failed to update location",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      await axios.delete(`/api/locations/${id}`);

      setLocations(locations.filter(loc => loc.id !== id));

      toast({
        title: "Location Removed",
        description: "Location has been removed",
      });

    } catch (error: any) {
      console.error("Error deleting location:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete location",
        variant: "destructive",
      });
    }
  };

  const handleAddStorageBin = async (locationId: string, binName: string) => {
    if (!binName.trim()) return;

    try {
      const { data } = await axios.post('/api/storage-bins', {
        location_id: locationId,
        bin_name: binName.trim(),
      });

      setStorageBins([...storageBins, data]);

      toast({
        title: "Bin Added",
        description: `${data.bin_name} has been added`,
      });

    } catch (error: any) {
      console.error("Error adding bin:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add bin",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStorageBin = async (id: string) => {
    try {
      await axios.delete(`/api/storage-bins/${id}`);

      setStorageBins(storageBins.filter(bin => bin.id !== id));

      toast({
        title: "Bin Removed",
        description: "Storage bin has been removed",
      });

    } catch (error: any) {
      console.error("Error deleting bin:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete bin",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDefaultLocation = async (field: string, value: string) => {
    try {
      const { data } = await axios.post('/api/default-location', { [field]: value });

      setDefaultLocations(data);

      toast({
        title: "Default Location Updated",
        description: "Default location has been set",
      });

    } catch (error: any) {
      console.error("Error updating default location:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update default location",
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
    loadOperators();
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

  // Operators state (backed by /api/operators)
  interface OperatorRow {
    id: string;
    name: string;
    employee_code: string;
    department: string;
    is_active: boolean;
  }

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [newOperator, setNewOperator] = useState<Omit<OperatorRow, 'id' | 'is_active'>>({
    name: "",
    employee_code: "",
    department: "",
  });
  const [operatorErrors, setOperatorErrors] = useState<Record<string, string>>({});
  const [savingOperator, setSavingOperator] = useState(false);

  const loadOperators = async () => {
    setOperatorsLoading(true);
    try {
      const res = await axios.get("/api/operators");
      setOperators(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load operators:", error);
      toast({
        title: "Error",
        description: "Failed to load operators",
        variant: "destructive",
      });
    } finally {
      setOperatorsLoading(false);
    }
  };

  const handleAddOperator = async () => {
    setOperatorErrors({});
    if (!newOperator.name.trim()) {
      setOperatorErrors({ name: "Name is required" });
      return;
    }

    setSavingOperator(true);
    try {
      const res = await axios.post("/api/operators", {
        name: newOperator.name.trim(),
        employee_code: newOperator.employee_code.trim() || null,
        department: newOperator.department.trim() || null,
      });
      setOperators([...operators, res.data]);
      setNewOperator({ name: "", employee_code: "", department: "" });
      toast({
        title: "Operator Added",
        description: `${res.data.name} has been added`,
      });
    } catch (error: any) {
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors || {};
        setOperatorErrors({
          name: errors.name?.[0] || "",
          employee_code: errors.employee_code?.[0] || "",
          department: errors.department?.[0] || "",
        });
        toast({
          title: "Validation Failed",
          description: Object.values(errors).flat().join(" ") as string,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to add operator",
          variant: "destructive",
        });
      }
    } finally {
      setSavingOperator(false);
    }
  };

  const handleDeleteOperator = async (id: string) => {
    const operator = operators.find(o => o.id === id);
    try {
      await axios.delete(`/api/operators/${id}`);
      setOperators(operators.filter(o => o.id !== id));
      toast({
        title: "Operator Removed",
        description: `${operator?.name} has been removed`,
      });
    } catch (error: any) {
      toast({
        title: error.response?.status === 409 ? "Cannot Delete Operator" : "Error",
        description: error.response?.data?.message || "Failed to delete operator",
        variant: "destructive",
      });
    }
  };

  const handleToggleOperatorActive = async (id: string) => {
    const operator = operators.find(o => o.id === id);
    if (!operator) return;
    const nextActive = !operator.is_active;
    setOperators(operators.map(o => (o.id === id ? { ...o, is_active: nextActive } : o)));
    try {
      await axios.put(`/api/operators/${id}`, {
        name: operator.name,
        department: operator.department || null,
        is_active: nextActive,
      });
    } catch (error: any) {
      setOperators(operators.map(o => (o.id === id ? { ...o, is_active: !nextActive } : o)));
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update operator status",
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
      case "tax-rates":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Tax rates</h2>
              ...
            </div>
          </div>
        );

      case "general": {
        const canManageGeneral = hasPermission('settings.manage_general');
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
                  <Input
                    id="warehouse-name"
                    value={orgSettings.warehouse_name}
                    onChange={(e) => setOrgSettings({ ...orgSettings, warehouse_name: e.target.value })}
                    disabled={!canManageGeneral || orgSettingsLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse-code">Warehouse Code</Label>
                  <Input
                    id="warehouse-code"
                    value={orgSettings.warehouse_code}
                    onChange={(e) => setOrgSettings({ ...orgSettings, warehouse_code: e.target.value })}
                    disabled={!canManageGeneral || orgSettingsLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={orgSettings.timezone}
                    onChange={(e) => setOrgSettings({ ...orgSettings, timezone: e.target.value })}
                    disabled={!canManageGeneral || orgSettingsLoading}
                  />
                </div>
                {canManageGeneral && (
                  <Button onClick={handleSaveWarehouseSettings} disabled={savingWarehouseSettings || orgSettingsLoading}>
                    {savingWarehouseSettings ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="low-stock">Low Stock Threshold (%)</Label>
                  <Input
                    id="low-stock"
                    type="number"
                    value={orgSettings.low_stock_threshold}
                    onChange={(e) => setOrgSettings({ ...orgSettings, low_stock_threshold: e.target.value })}
                    disabled={!canManageGeneral || orgSettingsLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="critical-stock">Critical Stock Threshold (%)</Label>
                  <Input
                    id="critical-stock"
                    type="number"
                    value={orgSettings.critical_stock_threshold}
                    onChange={(e) => setOrgSettings({ ...orgSettings, critical_stock_threshold: e.target.value })}
                    disabled={!canManageGeneral || orgSettingsLoading}
                  />
                </div>
                {canManageGeneral && (
                  <Button onClick={handleSaveInventorySettings} disabled={savingInventorySettings || orgSettingsLoading}>
                    {savingInventorySettings ? "Saving..." : "Save Changes"}
                  </Button>
                )}
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageGeneral}
                    onClick={() => handleToggleNotification("low_stock_alerts_enabled")}
                  >
                    {orgSettings.low_stock_alerts_enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about order status changes
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageGeneral}
                    onClick={() => handleToggleNotification("order_updates_enabled")}
                  >
                    {orgSettings.order_updates_enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Reports</p>
                    <p className="text-sm text-muted-foreground">
                      Receive daily summary of warehouse operations
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageGeneral}
                    onClick={() => handleToggleNotification("daily_reports_enabled")}
                  >
                    {orgSettings.daily_reports_enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      case "team":
        return !hasPermission('settings.manage_team') ? (
          <div className="text-center py-16 text-muted-foreground">
            You don't have permission to manage the team. Contact your organization admin.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Your Team</h2>
                <p className="text-muted-foreground">
                  Create and manage the users who can access this organization's MRP/MES system.
                </p>
              </div>
              <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add a team member
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add a Team Member</DialogTitle>
                    <DialogDescription>
                      They'll be able to log in immediately with the email and password entered here.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Employee Name *</Label>
                      <Input
                        placeholder="e.g. Ramesh Kumar"
                        value={newTeamMember.name}
                        onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                        className={cn(teamMemberErrors.name && "border-destructive")}
                      />
                      {teamMemberErrors.name && <p className="text-xs text-destructive">{teamMemberErrors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Email (Login ID) *</Label>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={newTeamMember.email}
                        onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
                        className={cn(teamMemberErrors.email && "border-destructive")}
                      />
                      {teamMemberErrors.email && <p className="text-xs text-destructive">{teamMemberErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <Input
                        placeholder="e.g. 9876543210"
                        value={newTeamMember.mobile}
                        onChange={(e) => setNewTeamMember({ ...newTeamMember, mobile: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={newTeamMember.password}
                        onChange={(e) => setNewTeamMember({ ...newTeamMember, password: e.target.value })}
                        className={cn(teamMemberErrors.password && "border-destructive")}
                      />
                      {teamMemberErrors.password && <p className="text-xs text-destructive">{teamMemberErrors.password}</p>}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={newTeamMember.role_id}
                        onValueChange={(v) => setNewTeamMember({ ...newTeamMember, role_id: v, granted_permissions: [], revoked_permissions: [] })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {newTeamMember.role_id && (() => {
                      const roleName = roles.find((r) => r.id === newTeamMember.role_id)?.name || "";
                      const defaults = getRoleDefaultKeys(newTeamMember.role_id);
                      const hasCustomizations = newTeamMember.granted_permissions.length > 0 || newTeamMember.revoked_permissions.length > 0;
                      const effectiveCount = defaults.length + newTeamMember.granted_permissions.length - newTeamMember.revoked_permissions.length;
                      return (
                        <div className="space-y-1 border rounded-md p-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">{hasCustomizations ? "Custom permissions" : "Default permissions"}</p>
                            <button
                              type="button"
                              className="text-sm text-primary hover:underline"
                              onClick={openCustomizePermissionsForNew}
                            >
                              Edit
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {effectiveCount} of {permissionsCatalog.length} permissions enabled
                            {hasCustomizations ? ` — customized from ${roleName}'s defaults` : ` (from ${roleName})`}
                          </p>
                        </div>
                      );
                    })()}

                    <div className="space-y-2">
                      <Label>Departments (Access Scope)</Label>
                      <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-auto">
                        {departmentsList.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No departments defined yet.</p>
                        ) : departmentsList.map((dept) => (
                          <div key={dept.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`new-member-dept-${dept.id}`}
                              checked={newTeamMember.department_ids.includes(dept.id)}
                              onCheckedChange={(checked) => {
                                setNewTeamMember({
                                  ...newTeamMember,
                                  department_ids: checked
                                    ? [...newTeamMember.department_ids, dept.id]
                                    : newTeamMember.department_ids.filter(id => id !== dept.id),
                                });
                              }}
                            />
                            <label htmlFor={`new-member-dept-${dept.id}`} className="text-sm cursor-pointer">{dept.name}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddTeamMember} disabled={savingTeamMember}>
                        {savingTeamMember ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                {teamLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading team...</div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No team members found</div>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-4 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {(member.first_name || member.email).substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.first_name || member.email.split('@')[0]}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{member.email}</span>
                            {member.phone && <span>· {member.phone}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {member.departments.map((d) => (
                              <Badge key={d.id} variant="outline" className="text-[10px]">{d.name}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {member.role && (
                          <Badge variant="secondary">{member.role.name}</Badge>
                        )}
                        {!!member.permission_overrides?.length && (
                          <Badge variant="outline" className="text-[10px]">
                            {member.permission_overrides.length} customized
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openCustomizePermissionsForMember(member)}>
                          Permissions
                        </Button>
                        <Switch
                          checked={member.is_active}
                          onCheckedChange={() => handleToggleTeamMemberActive(member)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "roles":
        return !hasPermission('settings.manage_roles') ? (
          <div className="text-center py-16 text-muted-foreground">
            You don't have permission to manage roles. Contact your organization admin.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Role Management</h2>
                <p className="text-muted-foreground">
                  Define roles and the permissions each one grants across the system.
                </p>
              </div>
              <Button onClick={openCreateRole}>
                <Plus className="h-4 w-4 mr-2" />
                Create role
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {role.is_system && <Badge variant="outline" className="text-[10px]">System</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {role.permissions.length} permission(s) · {role.users_count} member(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditRole(role)} disabled={role.is_system}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRole(role)}
                          disabled={role.is_system}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRole ? `Edit ${editingRole.name}` : "Create Role"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Role Name *</Label>
                    <Input
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                      placeholder="e.g. Quality Inspector"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Permissions</Label>
                    {Object.entries(
                      permissionsCatalog.reduce((acc: Record<string, PermissionRow[]>, p) => {
                        (acc[p.module] = acc[p.module] || []).push(p);
                        return acc;
                      }, {})
                    ).map(([module, perms]) => (
                      <div key={module} className="border rounded-md p-3">
                        <p className="text-sm font-semibold mb-2">{module}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {perms.map((perm) => (
                            <div key={perm.key} className="flex items-center gap-2">
                              <Checkbox
                                id={`perm-${perm.key}`}
                                checked={roleForm.permissions.includes(perm.key)}
                                onCheckedChange={() => toggleRolePermission(perm.key)}
                              />
                              <label htmlFor={`perm-${perm.key}`} className="text-sm cursor-pointer">{perm.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveRole} disabled={savingRole}>
                      {savingRole ? "Saving..." : "Save Role"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );

      case "departments":
        return !hasPermission('settings.manage_departments') ? (
          <div className="text-center py-16 text-muted-foreground">
            You don't have permission to manage departments. Contact your organization admin.
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Departments</h2>
              <p className="text-sm text-muted-foreground">
                Define the departments team members can be assigned to.
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="border-b">
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50">
                    <div className="col-span-8">
                      <span className="text-sm font-medium text-muted-foreground">Name</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Status</span>
                    </div>
                    <div className="col-span-2"></div>
                  </div>
                </div>

                <div className="divide-y">
                  {departmentsList.length === 0 && (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">No departments defined yet. Add one below.</div>
                  )}
                  {departmentsList.map((dept) => (
                    <div key={dept.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="col-span-8">
                        <span className="text-sm font-medium">{dept.name}</span>
                      </div>
                      <div className="col-span-2">
                        <Switch checked={dept.is_active} onCheckedChange={() => handleToggleDepartmentActive(dept)} />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDepartment(dept.id)} className="h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t px-4 py-4">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-8">
                      <Label className="text-xs text-muted-foreground mb-1 block">Department Name *</Label>
                      <Input
                        placeholder="e.g. Assembly"
                        value={newDepartment.name}
                        onChange={(e) => setNewDepartment({ name: e.target.value })}
                        className={cn("h-9", departmentErrors.name && "border-destructive")}
                      />
                      {departmentErrors.name && <p className="text-xs text-destructive mt-1">{departmentErrors.name}</p>}
                    </div>
                    <div className="col-span-4"></div>
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="link"
                      onClick={handleAddDepartment}
                      className="text-primary p-0 h-auto"
                      disabled={!newDepartment.name.trim() || savingDepartment}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {savingDepartment ? "Adding..." : "Add department"}
                    </Button>
                  </div>
                </div>
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
                              onChange={(e) => updateLocationFieldLocal(location.id, "location_name", e.target.value)}
                              onBlur={(e) => handleUpdateLocation(location.id, "location_name", e.target.value)}
                              className="h-8"
                            />
                          </div>

                          {/* LEGAL NAME */}
                          <div className="col-span-2">
                            <Input
                              value={location.legal_name || ""}
                              onChange={(e) => updateLocationFieldLocal(location.id, "legal_name", e.target.value)}
                              onBlur={(e) => handleUpdateLocation(location.id, "legal_name", e.target.value)}
                              className="h-8"
                            />
                          </div>

                          {/* ADDRESS */}
                          <div className="col-span-3">
                            <Input
                              value={location.address || ""}
                              onChange={(e) => updateLocationFieldLocal(location.id, "address", e.target.value)}
                              onBlur={(e) => handleUpdateLocation(location.id, "address", e.target.value)}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLocation(location.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
                      <Select
                        value={newOperation.department}
                        onValueChange={(v) => setNewOperation({ ...newOperation, department: v })}
                      >
                        <SelectTrigger className={cn("h-9", operationErrors.department && "border-destructive")}>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentsList.length > 0 ? (
                            departmentsList.map((dept) => (
                              <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No departments defined</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
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

            {departmentsList.length === 0 && (
              <div className="bg-muted/50 border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <Info className="h-4 w-4 inline mr-2" />
                  No departments defined yet. Add one in the{" "}
                  <button
                    onClick={() => setActiveSection("departments")}
                    className="text-primary hover:underline"
                  >
                    Departments settings
                  </button>
                  {" "}before creating operations.
                </p>
              </div>
            )}
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

      case "operators":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Operators</h2>
              <p className="text-sm text-muted-foreground">
                Manage the shop floor operators who can be assigned to production operations.
              </p>
            </div>

            <Card>
              <CardContent className="p-0">
                {/* Table Header */}
                <div className="border-b">
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50">
                    <div className="col-span-3">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        Name <ArrowUp className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm font-medium text-muted-foreground">Employee Code</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm font-medium text-muted-foreground">Department</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Status</span>
                    </div>
                    <div className="col-span-1"></div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y">
                  {operatorsLoading && (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">Loading operators...</div>
                  )}
                  {!operatorsLoading && operators.length === 0 && (
                    <div className="px-4 py-6 text-sm text-muted-foreground text-center">No operators defined yet. Add one below.</div>
                  )}
                  {!operatorsLoading && operators.map((operator) => (
                    <div key={operator.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{operator.name}</span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <Badge variant="outline">{operator.employee_code}</Badge>
                      </div>
                      <div className="col-span-3">
                        <span className="text-sm text-muted-foreground">{operator.department || "-"}</span>
                      </div>
                      <div className="col-span-2">
                        <Switch
                          checked={operator.is_active}
                          onCheckedChange={() => handleToggleOperatorActive(operator.id)}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOperator(operator.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Operator Form */}
                <div className="border-t px-4 py-4">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Name *</Label>
                      <Input
                        placeholder="e.g. Ramesh Kumar"
                        value={newOperator.name}
                        onChange={(e) => setNewOperator({ ...newOperator, name: e.target.value })}
                        className={cn("h-9", operatorErrors.name && "border-destructive")}
                      />
                      {operatorErrors.name && (
                        <p className="text-xs text-destructive mt-1">{operatorErrors.name}</p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Employee Code</Label>
                      <Input
                        placeholder="Auto-generated if left blank"
                        value={newOperator.employee_code}
                        onChange={(e) => setNewOperator({ ...newOperator, employee_code: e.target.value })}
                        className={cn("h-9", operatorErrors.employee_code && "border-destructive")}
                      />
                      {operatorErrors.employee_code && (
                        <p className="text-xs text-destructive mt-1">{operatorErrors.employee_code}</p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground mb-1 block">Department</Label>
                      <Input
                        placeholder="e.g. Assembly"
                        value={newOperator.department}
                        onChange={(e) => setNewOperator({ ...newOperator, department: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2"></div>
                    <div className="col-span-1"></div>
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="link"
                      onClick={handleAddOperator}
                      className="text-primary p-0 h-auto"
                      disabled={!newOperator.name.trim() || savingOperator}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {savingOperator ? "Adding..." : "Add operator"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "barcodes": {
        const canManageBarcodes = hasPermission('settings.manage_general');
        const barcodePreviewNumber = String(orgSettings.barcode_starting_number || 0).padStart(
          Number(orgSettings.barcode_number_length) || 4,
          '0'
        );
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
                    <Select
                      value={orgSettings.barcode_type}
                      onValueChange={(value) => setOrgSettings({ ...orgSettings, barcode_type: value })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    >
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
                    <Input
                      id="barcode-width"
                      type="number"
                      value={orgSettings.barcode_width}
                      onChange={(e) => setOrgSettings({ ...orgSettings, barcode_width: e.target.value })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode-height">Barcode Height (mm)</Label>
                    <Input
                      id="barcode-height"
                      type="number"
                      value={orgSettings.barcode_height}
                      onChange={(e) => setOrgSettings({ ...orgSettings, barcode_height: e.target.value })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label-size">Label Size</Label>
                    <Select
                      value={orgSettings.barcode_label_size}
                      onValueChange={(value) => setOrgSettings({ ...orgSettings, barcode_label_size: value })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    >
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
                    <Switch
                      checked={orgSettings.barcode_show_item_code}
                      onCheckedChange={(v) => setOrgSettings({ ...orgSettings, barcode_show_item_code: !!v })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Show Item Name</p>
                      <p className="text-xs text-muted-foreground">Display the item name on the label</p>
                    </div>
                    <Switch
                      checked={orgSettings.barcode_show_item_name}
                      onCheckedChange={(v) => setOrgSettings({ ...orgSettings, barcode_show_item_name: !!v })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Show Location</p>
                      <p className="text-xs text-muted-foreground">Include storage location on the label</p>
                    </div>
                    <Switch
                      checked={orgSettings.barcode_show_location}
                      onCheckedChange={(v) => setOrgSettings({ ...orgSettings, barcode_show_location: !!v })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveBarcodeFormat} disabled={!canManageBarcodes || savingBarcodeFormat || orgSettingsLoading}>
                  {savingBarcodeFormat ? "Saving..." : "Save Format Settings"}
                </Button>
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
                    <Input
                      id="barcode-prefix"
                      value={orgSettings.barcode_prefix}
                      onChange={(e) => setOrgSettings({ ...orgSettings, barcode_prefix: e.target.value })}
                      placeholder="e.g., INV, SKU, PRD"
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Prefix added to all generated barcodes
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode-suffix">Barcode Suffix</Label>
                    <Input
                      id="barcode-suffix"
                      value={orgSettings.barcode_suffix}
                      onChange={(e) => setOrgSettings({ ...orgSettings, barcode_suffix: e.target.value })}
                      placeholder="Optional suffix"
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="starting-number">Starting Number</Label>
                    <Input
                      id="starting-number"
                      type="number"
                      value={orgSettings.barcode_starting_number}
                      onChange={(e) => setOrgSettings({ ...orgSettings, barcode_starting_number: e.target.value })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number-length">Number Length (digits)</Label>
                    <Input
                      id="number-length"
                      type="number"
                      value={orgSettings.barcode_number_length}
                      onChange={(e) => setOrgSettings({ ...orgSettings, barcode_number_length: e.target.value })}
                      min={4}
                      max={12}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Numbers will be zero-padded to this length
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base font-mono">
                      {[orgSettings.barcode_prefix, barcodePreviewNumber, orgSettings.barcode_suffix].filter(Boolean).join('-')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">(Next barcode)</span>
                  </div>
                </div>

                <Button onClick={handleSaveBarcodeNumbering} disabled={!canManageBarcodes || savingBarcodeNumbering || orgSettingsLoading}>
                  {savingBarcodeNumbering ? "Saving..." : "Save Numbering Settings"}
                </Button>
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
                    <Select
                      value={orgSettings.barcode_printer_type}
                      onValueChange={(value) => setOrgSettings({ ...orgSettings, barcode_printer_type: value })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    >
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
                    <Input
                      id="labels-per-row"
                      type="number"
                      value={orgSettings.barcode_labels_per_row}
                      onChange={(e) => setOrgSettings({ ...orgSettings, barcode_labels_per_row: e.target.value })}
                      min={1}
                      max={5}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="page-size">Page Size</Label>
                    <Select
                      value={orgSettings.barcode_page_size}
                      onValueChange={(value) => setOrgSettings({ ...orgSettings, barcode_page_size: value })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    >
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
                    <Input
                      id="margin"
                      type="number"
                      value={orgSettings.barcode_margin}
                      onChange={(e) => setOrgSettings({ ...orgSettings, barcode_margin: e.target.value })}
                      disabled={!canManageBarcodes || orgSettingsLoading}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto-print on Item Creation</p>
                    <p className="text-xs text-muted-foreground">Automatically print barcode label when new item is added</p>
                  </div>
                  <Switch
                    checked={orgSettings.barcode_auto_print_on_creation}
                    onCheckedChange={(v) => setOrgSettings({ ...orgSettings, barcode_auto_print_on_creation: !!v })}
                    disabled={!canManageBarcodes || orgSettingsLoading}
                  />
                </div>

                <Button onClick={handleSavePrintSettings} disabled={!canManageBarcodes || savingPrintSettings || orgSettingsLoading}>
                  {savingPrintSettings ? "Saving..." : "Save Print Settings"}
                </Button>
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
                  <Switch
                    checked={orgSettings.barcode_camera_scanning_enabled}
                    onCheckedChange={(v) => setOrgSettings({ ...orgSettings, barcode_camera_scanning_enabled: !!v })}
                    disabled={!canManageBarcodes || orgSettingsLoading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Beep on Successful Scan</p>
                    <p className="text-xs text-muted-foreground">Play a sound when barcode is scanned successfully</p>
                  </div>
                  <Switch
                    checked={orgSettings.barcode_beep_on_scan}
                    onCheckedChange={(v) => setOrgSettings({ ...orgSettings, barcode_beep_on_scan: !!v })}
                    disabled={!canManageBarcodes || orgSettingsLoading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Vibrate on Scan</p>
                    <p className="text-xs text-muted-foreground">Vibrate device on successful scan (mobile only)</p>
                  </div>
                  <Switch
                    checked={orgSettings.barcode_vibrate_on_scan}
                    onCheckedChange={(v) => setOrgSettings({ ...orgSettings, barcode_vibrate_on_scan: !!v })}
                    disabled={!canManageBarcodes || orgSettingsLoading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto-redirect after Scan</p>
                    <p className="text-xs text-muted-foreground">Automatically navigate to item details after scanning</p>
                  </div>
                  <Switch
                    checked={orgSettings.barcode_auto_redirect_on_scan}
                    onCheckedChange={(v) => setOrgSettings({ ...orgSettings, barcode_auto_redirect_on_scan: !!v })}
                    disabled={!canManageBarcodes || orgSettingsLoading}
                  />
                </div>

                <Button onClick={handleSaveScanningSettings} disabled={!canManageBarcodes || savingScanningSettings || orgSettingsLoading}>
                  {savingScanningSettings ? "Saving..." : "Save Scanning Settings"}
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }

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
          {navigationItems.filter((item) => {
            const requiredPermission = SECTION_PERMISSIONS[item.id];
            return !requiredPermission || hasPermission(requiredPermission);
          }).map((item) => (
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

      {/* Customize Permissions — per-user exceptions on top of a role's
          defaults, shared by the Add Team Member dialog and each existing
          member's "Permissions" action. */}
      <Dialog open={permCustomizeOpen} onOpenChange={setPermCustomizeOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize Permissions</DialogTitle>
            <DialogDescription>
              Starts from {roles.find((r) => r.id === permCustomizeRoleId)?.name || "the selected role"}'s defaults —
              toggle anything to grant or revoke it just for this person.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={permCustomizeTab} onValueChange={(v) => setPermCustomizeTab(v as typeof permCustomizeTab)}>
            <TabsList>
              <TabsTrigger value="visibility">
                Visibility {permissionsCatalog.filter(p => p.category === "visibility" && permCustomizeChecked[p.key]).length}/{permissionsCatalog.filter(p => p.category === "visibility").length}
              </TabsTrigger>
              <TabsTrigger value="workflow">
                Workflows {permissionsCatalog.filter(p => p.category === "workflow" && permCustomizeChecked[p.key]).length}/{permissionsCatalog.filter(p => p.category === "workflow").length}
              </TabsTrigger>
              <TabsTrigger value="admin">
                Admin {permissionsCatalog.filter(p => p.category === "admin" && permCustomizeChecked[p.key]).length}/{permissionsCatalog.filter(p => p.category === "admin").length}
              </TabsTrigger>
            </TabsList>
            {(["visibility", "workflow", "admin"] as const).map((category) => (
              <TabsContent key={category} value={category} className="space-y-3 mt-4">
                {permissionsCatalog.filter((p) => p.category === category).map((perm) => (
                  <div key={perm.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`customize-perm-${perm.key}`}
                      checked={!!permCustomizeChecked[perm.key]}
                      onCheckedChange={(checked) => setPermCustomizeChecked({ ...permCustomizeChecked, [perm.key]: !!checked })}
                    />
                    <label htmlFor={`customize-perm-${perm.key}`} className="text-sm cursor-pointer">{perm.label}</label>
                  </div>
                ))}
                {permissionsCatalog.filter((p) => p.category === category).length === 0 && (
                  <p className="text-sm text-muted-foreground">No permissions in this category yet.</p>
                )}
              </TabsContent>
            ))}
          </Tabs>
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:underline"
              onClick={() => {
                const defaults = getRoleDefaultKeys(permCustomizeRoleId);
                const checked: Record<string, boolean> = {};
                permissionsCatalog.forEach((p) => { checked[p.key] = defaults.includes(p.key); });
                setPermCustomizeChecked(checked);
              }}
            >
              Reset to default
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPermCustomizeOpen(false)}>Cancel</Button>
              <Button onClick={handleApplyPermissionCustomization} disabled={savingPermCustomize}>
                {savingPermCustomize ? "Applying..." : "Apply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Settings;
