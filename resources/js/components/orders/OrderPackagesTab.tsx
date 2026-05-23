import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Menu, X, ChevronDown, Truck, Package, CheckCircle, Barcode, ScanLine, Printer, Filter, Search, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Order {
  id: string;
  orderNo: string;
  customer: string;
  status: string;
   order_no: string;
   order_number: string;
  contact_person?: string;
  phone?: string;
  contact_number?: string;
  email?: string;

  shipping_address?: string;
  items: {
    id: string;
    itemCode: string;
    itemName: string;
    quantityOrdered: number;
    uom?: string;
     item_code?: string;
  item_name?: string;
  quantity?: number;
  }[];
}


interface OrderItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantityOrdered: number;
  uom?: string;

  // optional backend variants (prevents runtime crashes)
  item_code?: string;
  item_name?: string;
  quantity?: number;
}

interface PackageItem {
  id: string;
  itemName: string;
  itemCode: string;
  description: string;
  ordered: number;
  packed: number;
  quantityToPack: number;
  uom: string;
  line_id?: number;
  item_name?: string;
  item_code?: string;
  ordered_quantity?: number;
  packed_quantity?: number;
}

interface OrderPackage {
  id: string;
  orderNumber: string;
  order_number: string;
  customerName: string;
  customer_name: string;
  package_slip: string;
  packageSlip: string;
  date: string;
  status: "not_shipped" | "shipped" | "delivered";

  order?: {
    customerData?: {
      customer_name?: string;
      contact_person?: string;
      phone?: string;
      email?: string;
      shipping_address?: string;
    };
  };

  items: PackageItem[];
  internalNotes?: string;
  carrier?: string;
  trackingNumber?: string;
}

interface OrderPackagesTabProps {
  orders: Order[];
}

const OrderPackagesTab = ({ orders }: OrderPackagesTabProps) => {
  const [packages, setPackages] = useState<OrderPackage[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [newPackageOpen, setNewPackageOpen] = useState(false);
  const [scanModeActive, setScanModeActive] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("packages");

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCarrier, setFilterCarrier] = useState<string>("all");
  const [filterOrder, setFilterOrder] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  const [companyDetails, setCompanyDetails] = useState<any>(null);
const [companyLoading, setCompanyLoading] = useState(false);
  // Report state
  const [reportMonth, setReportMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [reportYear, setReportYear] = useState<string>(String(new Date().getFullYear()));

  // New package form state
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [packageSlip, setPackageSlip] = useState("");
  const [packageDate, setPackageDate] = useState(new Date().toISOString().split("T")[0]);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [internalNotes, setInternalNotes] = useState("");


  // Get confirmed/approved orders only
 const confirmedOrders = useMemo(() => {
  return orders.filter(order =>
    order.status === "Confirmed" ||
    order.status === "Approved" ||
    order.status === "Processing" ||
    order.status === "In Progress" ||

    // ✅ ADD PARTIAL STATUSES
    order.status === "Partially Shipped" ||
    order.status === "Partially Delivered" ||
    order.status === "Partially Shipped & Delivered" ||

     order.status === "Partially Fulfilled" ||

    // optional but recommended
    order.status === "Shipped"
  );
}, [orders]);

  // Generate package slip number
  const generatePackageSlip = () => {
    const count = packages.length + 1;
    return `PKG-${new Date().getFullYear()}-${String(count).padStart(5, "0")}`;
  };

  const getPackedMap = (orderNumber: string) => {
  const map: Record<string, number> = {};

  packages.forEach(pkg => {
    if (String(pkg.order_number) !== String(orderNumber)) return;

    let items: any[] = [];

    try {
      items =
        typeof pkg.items === "string"
          ? JSON.parse(pkg.items)
          : pkg.items || [];
    } catch {
      items = [];
    }

    items.forEach((item: any) => {
      const key = `${item.item_code}_${item.line_id}`;

      const qty = Number(item.packed_quantity || 0);

      map[key] = (map[key] || 0) + qty;
    });
  });

  return map;
};

  useEffect(() => {
  const fetchCompanyDetails = async () => {
    try {
      setCompanyLoading(true);

      const res = await axios.get("/api/company");

      if (!res.data) {
        console.warn("⚠️ No company data returned from API");
      }

      setCompanyDetails(res.data);

    } catch (error: any) {
      console.error("❌ Failed to fetch company details:", error);
      console.error("❌ Error response:", error?.response?.data);
    } finally {
      setCompanyLoading(false);
      console.log("🏁 Company loading finished");
    }
  };

  fetchCompanyDetails();
}, []);

  // Load order items when order is selected
  useEffect(() => {
    if (selectedOrder) {
      const order = confirmedOrders.find(o => o.id === selectedOrder);
      if (order) {
        console.log("Order items from selected order:", order.items);
        if (order.items?.length > 0) {
          const packedMap = getPackedMap(
            order.orderNo ||
            order.order_number ||
            order.order_no
          );



          const items: PackageItem[] = order.items.map((item, idx) => {
            const itemCode = String(
  item.itemCode || item.item_code
).trim().toLowerCase();

const lineId = item.line_id ?? idx;

const mapKey = `${itemCode}_${lineId}`;

const orderedQty = Number(
  item.quantityOrdered || item.quantity || 0
);

const alreadyPacked = packedMap[mapKey] || 0;

const remainingQty = Math.max(
  orderedQty - alreadyPacked,
  0
);

            return {
              id: `pkg-item-${idx}`,
              line_id: item.line_id ?? idx,
              itemName: item.itemName || item.item_name,
              itemCode,
              ordered: orderedQty,
              description: "",
              packed: alreadyPacked,
              quantityToPack: remainingQty,// ✅ IMPORTANT FIX
              uom: item.uom || "pcs",
            };
          });
          console.log("Mapped package items:", items);
          setPackageItems(items); // ✅ should populate state
        }
        setPackageSlip(generatePackageSlip());
      }
    }
  }, [selectedOrder, confirmedOrders]);


  const packableOrders = useMemo(() => {
  return confirmedOrders.filter((order) => {
    const packedMap = getPackedMap(
      order.orderNo || order.order_number || order.order_no
    );

    const isFullyPacked = order.items?.every((item) => {
      const code = String(item.itemCode || item.item_code).trim().toLowerCase();
      const orderedQty = Number(item.quantityOrdered || item.quantity || 0);
      const packedQty = packedMap[code] || 0;

      return packedQty >= orderedQty;
    });

    return !isFullyPacked; // ❗ keep only NOT fully packed orders
  });
}, [confirmedOrders, packages]);


const isOrderFullyPacked = (order: Order, packages: OrderPackage[]) => {
  const packedMap = getPackedMap(
    order.orderNo || order.order_number || order.order_no
  );

  return order.items.every((item) => {
    const code = String(item.itemCode || item.item_code).trim().toLowerCase();
    const orderedQty = Number(item.quantityOrdered || item.quantity || 0);
    const packedQty = packedMap[code] || 0;

    return packedQty >= orderedQty;
  });
};

  // Apply filters
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (filterStatus !== "all" && pkg.status !== filterStatus) return false;
      if (filterCarrier !== "all") {
        const pkgCarrier = pkg.carrier || "Other";
        if (pkgCarrier !== filterCarrier) return false;
      }
      if (filterOrder !== "all" && pkg.orderNumber !== filterOrder) return false;
      if (filterDateFrom && pkg.date < filterDateFrom) return false;
      if (filterDateTo && pkg.date > filterDateTo) return false;
      return true;
    });
  }, [packages, filterStatus, filterCarrier, filterOrder, filterDateFrom, filterDateTo]);

  const notShippedPackages = filteredPackages.filter((p) => p.status === "not_shipped");
  const shippedPackages = filteredPackages.filter((p) => p.status === "shipped");
  const deliveredPackages = filteredPackages.filter((p) => p.status === "delivered");

  // Get unique carriers and orders for filter
  const uniqueCarriers = useMemo(() => {
    const carriers = new Set<string>();
    packages.forEach((pkg) => {
      if (pkg.carrier) carriers.add(pkg.carrier);
    });
    return Array.from(carriers);
  }, [packages]);

  const uniqueOrderNumbers = useMemo(() => {
    const orderNums = new Set<string>();
    packages.forEach((pkg) => orderNums.add(pkg.orderNumber));
    return Array.from(orderNums);
  }, [packages]);

  // Generate monthly report data
  const monthlyReport = useMemo(() => {
    const month = parseInt(reportMonth);
    const year = parseInt(reportYear);

    const monthPackages = packages.filter((pkg) => {
      const date = new Date(pkg.date);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });

    const byStatus = {
      not_shipped: monthPackages.filter((p) => p.status === "not_shipped").length,
      shipped: monthPackages.filter((p) => p.status === "shipped").length,
      delivered: monthPackages.filter((p) => p.status === "delivered").length,
    };

    const byCarrier: Record<string, number> = {};
    monthPackages.forEach((pkg) => {
      const carrier = pkg.carrier || "Unassigned";
      byCarrier[carrier] = (byCarrier[carrier] || 0) + 1;
    });

    const byOrder: Record<string, number> = {};
    monthPackages.forEach((pkg) => {
      byOrder[pkg.orderNumber] = (byOrder[pkg.orderNumber] || 0) + 1;
    });

    return {
      total: monthPackages.length,
      byStatus,
      byCarrier,
      byOrder,
      packages: monthPackages,
    };
  }, [packages, reportMonth, reportYear]);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterCarrier("all");
    setFilterOrder("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  useEffect(() => {
    if (scanModeActive && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [scanModeActive]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const togglePackageSelection = (id: string) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPackages(newSelected);
  };

  // Status update functions
  const updatePackageStatus = (packageId: string, newStatus: OrderPackage["status"]) => {
    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === packageId ? { ...pkg, status: newStatus } : pkg))
    );
    const statusLabels = {
      not_shipped: "Not Shipped",
      shipped: "Shipped",
      delivered: "Delivered",
    };
    toast.success(`Package status updated to ${statusLabels[newStatus]}`);
  };

  // Shipment dialog state
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const [selectedPackageForShipment, setSelectedPackageForShipment] = useState<string | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isBulkShipment, setIsBulkShipment] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const openShipmentDialog = (packageId: string) => {
    setSelectedPackageForShipment(packageId);
    setIsBulkShipment(false);
    setSelectedCarrier("");
    setTrackingNumber("");
    setShipmentDialogOpen(true);
  };

  const openBulkShipmentDialog = () => {
    if (selectedPackages.size === 0) {
      toast.error("Please select packages to ship");
      return;
    }
    setIsBulkShipment(true);
    setSelectedCarrier("");
    setTrackingNumber("");
    setShipmentDialogOpen(true);
  };

  // Confirm shipment (single or bulk)
  const confirmShipment = async () => {
    if (!selectedCarrier) {
      toast.error("Please select a carrier");
      return;
    }
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }

    try {
      const packagesToShip = isBulkShipment
        ? packages.filter((pkg) => selectedPackages.has(pkg.id))
        : packages.filter((pkg) => pkg.id === selectedPackageForShipment);

      if (packagesToShip.length === 0) {
        toast.error("No packages selected for shipment");
        return;
      }

      // Update each package via API
      await Promise.all(
        packagesToShip.map((pkg) =>
          axios.put(`/api/order-packages/${pkg.id}`, {
            carrier: selectedCarrier,
            tracking_number: trackingNumber.trim(),
            status: "shipped",
            items: pkg.items, // preserve item details
          })
        )
      );

      // ✅ ADD THIS (IMPORTANT)
const orderNumber = packagesToShip[0]?.order_number;

if (orderNumber) {
  await axios.put(`/api/orders/recalculate-status`, {
    order_number: orderNumber,
  });
}
      // Update frontend state
      setPackages((prevPackages) =>
        prevPackages.map((pkg) =>
          packagesToShip.find((p) => p.id === pkg.id)
            ? { ...pkg, status: "shipped", carrier: selectedCarrier, trackingNumber: trackingNumber.trim() }
            : pkg
        )
      );

       await fetchPackages();

      // Toast feedback
      if (isBulkShipment) {
        toast.success(`${packagesToShip.length} package(s) marked as shipped via ${selectedCarrier}`);
        setSelectedPackages(new Set());
      } else {
        toast.success(`Package shipped via ${selectedCarrier}`);
      }

      // Reset dialog
      setShipmentDialogOpen(false);
      setSelectedPackageForShipment(null);
      setSelectedCarrier("");
      setTrackingNumber("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Error updating shipment");
    }
  };

  const selectedOrderData = useMemo(() => {
    return confirmedOrders.find(
      (o) => String(o.id) === String(selectedOrder)
    );
  }, [selectedOrder, confirmedOrders]);



  // Mark package as delivered
 const markAsDelivered = async (packageId: string) => {
  try {
    // 1. Update package
    const res = await axios.put(`/api/order-packages/${packageId}`, {
      status: "delivered",
    });

    const orderNumber = res.data?.data?.order_number;

    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId ? { ...pkg, status: "delivered" } : pkg
      )
    );

    // 2. Ask backend to recalculate order status
    await axios.put(`/api/orders/recalculate-status`, {
      order_number: orderNumber,
    });

    toast.success("Package marked as delivered");
  } catch (error: any) {
    toast.error(error.response?.data?.message || "Failed to update package status");
  }
};

  // Revert package to Not Shipped
 const markAsNotShipped = async (packageId: string) => {
  try {
    const res = await axios.put(`/api/order-packages/${packageId}`, {
      status: "not_shipped",
      carrier: null,
      tracking_number: null,
    });

    const orderNumber = res.data?.data?.order_number;

    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId
          ? {
              ...pkg,
              status: "not_shipped",
              carrier: undefined,
              trackingNumber: undefined,
            }
          : pkg
      )
    );

    // ✅ IMPORTANT: recalculate order status
    if (orderNumber) {
      await axios.put(`/api/orders/recalculate-status`, {
        order_number: orderNumber,
      });
    }

    toast.success("Package status updated to Not Shipped");
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "Failed to update package status"
    );
  }
};

  const handleRemoveItem = (itemId: string) => {
    setPackageItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleQuantityChange = (
    itemId: string,
    newQuantity: number
  ) => {
    setPackageItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;

        const remaining = item.ordered - item.packed;

        // ❌ prevent over packing
        if (newQuantity > remaining) {
          toast.error(
            `Cannot pack more than remaining quantity (${remaining})`
          );

          return {
            ...item,
            quantityToPack: remaining,
          };
        }

        return {
          ...item,
          quantityToPack: newQuantity,
        };
      })
    );
  };

  const handleSavePackage = async () => {
    if (!selectedOrder) {
      toast.error("Please select an order");
      return;
    }
    if (!packageSlip) {
      toast.error("Please enter a package slip number");
      return;
    }

   const hasInvalidNegative = packageItems.some(
  item => Number(item.quantityToPack) < 0
);

if (hasInvalidNegative) {
  toast.error("Quantity cannot be negative");
  return;
}

const hasValidItems = packageItems.some(
  item => Number(item.quantityToPack) > 0
);

if (!hasValidItems) {
  toast.error("At least one item must have quantity greater than 0");
  return;
}
    // Use all package items (even if quantityToPack = 0)
    const itemsToPack = packageItems;

    if (itemsToPack.length === 0) {
      toast.error("Please add at least one item to pack");
      return;
    }

    const order = confirmedOrders.find(o => o.id === selectedOrder);
    if (!order) {
      toast.error("Selected order not found");
      return;
    }

    const payload = {
      order_id: selectedOrder,
      order_number: order.orderNo || order.order_no,
      customer_name: order.customer,
      package_slip: packageSlip,
      date: packageDate,
      status: "not_shipped",
      internal_notes: internalNotes,
      items: itemsToPack.map(item => ({
        line_id: item.line_id,
        item_name: item.itemName,
        item_code: item.itemCode,
        description: item.description || "",
        ordered_quantity: item.ordered,
        packed_quantity: item.quantityToPack,
        quantity_to_pack: item.quantityToPack,
        uom: item.uom,
      })),
    };

    console.log("Payload being sent to backend:", payload);

    try {
      const { data } = await axios.post("/api/order-packages", payload);

        const orderNumber = data?.data?.order_number;

      await fetchPackages();

      const order = confirmedOrders.find(o => o.id === selectedOrder);

if (order) {
  // get updated packages AFTER save
  const updatedPackages = await axios.get("/api/order-packages");

  const normalized = updatedPackages.data.data;

  const isFullyPacked = isOrderFullyPacked(order, normalized);

  if (isFullyPacked) {
    await axios.put(`/api/orders/${order.id}`, {
      status: "Packed"
    });
  }
}

 await axios.put(`/api/orders/recalculate-status`, {
    order_number: orderNumber,
  });

      setPackageItems(prev =>
        prev.map(item => ({
          ...item,
          packed: item.packed + item.quantityToPack,
          quantityToPack: 0
        }))
      );
      toast.success(`Package ${packageSlip} created for order ${order.order_no}`);
      fetchPackages();
      setNewPackageOpen(false);
      setSelectedOrder("");
      setPackageSlip("");
      setPackageDate(new Date().toISOString().split("T")[0]);
      setPackageItems([]);
      setInternalNotes("");
      setScanModeActive(false);
      setBarcodeInput("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create package");
    }
  };


  const fetchPackages = async () => {
    try {
      const response = await axios.get("/api/order-packages");

      const packagesArray = response.data.data;

      if (!Array.isArray(packagesArray)) {
        setPackages([]);
        return;
      }

      const normalized = packagesArray.map((pkg: any) => {
        const order = orders.find(
          (o) =>
            String(o.orderNo) === String(pkg.order_number) ||
            String(o.order_no) === String(pkg.order_number)
        );

        return {
          ...pkg,
          items: typeof pkg.items === "string"
            ? JSON.parse(pkg.items)
            : pkg.items ?? [],
          order, // ✅ attach full order object here
        };
      });

      setPackages(normalized);
    } catch (error) {
      setPackages([]);
    }
  };

  // Call fetchPackages once on component mount
  useEffect(() => {
    fetchPackages();
  }, []);

  // Print shipping label
 const printShippingLabel = (pkg: OrderPackage) => {
  const printWindow = window.open("", "_blank", "width=1200,height=900");

  if (!printWindow) {
    toast.error("Unable to open print window. Please allow popups.");
    return;
  }

  const items = Array.isArray(pkg.items)
    ? pkg.items
    : typeof pkg.items === "string"
      ? JSON.parse(pkg.items)
      : [];

  const totalOrderedQty = items.reduce(
    (sum: number, item: any) =>
      sum + Number(item.ordered_quantity || item.qty || 0),
    0
  );

  const totalPackedQty = items.reduce(
    (sum: number, item: any) =>
      sum + Number(item.packed_quantity || 0),
    0
  );


  const company = companyDetails || {};

  const css = `
/* ── RESET & BASE ─────────────────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#111111;--ink2:#333333;--ink3:#666666;--ink4:#999999;
  --border:#CCCCCC;--border2:#E5E5E5;--bg:#FFFFFF;--bg2:#F5F5F5;
  --accent:#2563EB;
  --amber:#CC5500;
  --mono:'IBM Plex Mono',monospace;
  --sans:'IBM Plex Sans',sans-serif;
}

body{
  font-family:var(--sans);
  background:#E8E8E8;
  min-height:100vh;
  padding:24px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:16px;
}

/* ── TOOLBAR ──────────────────────────────────────────────────────── */
.toolbar{
  display:flex;
  align-items:center;
  gap:10px;
  background:#fff;
  border:1px solid var(--border);
  border-radius:8px;
  padding:10px 16px;
  width:780px;
  max-width:100%;
  box-shadow:0 2px 8px rgba(0,0,0,.06);
}

.toolbar-title{
  font-size:13px;
  font-weight:600;
  color:var(--ink2);
  flex:1;
}

.tb-btn{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:0 14px;
  height:32px;
  border-radius:6px;
  border:1.5px solid var(--border);
  background:#fff;
  font-family:var(--sans);
  font-size:12px;
  font-weight:600;
  color:var(--ink2);
  cursor:pointer;
}

.tb-btn.primary{
  background:var(--ink);
  border-color:var(--ink);
  color:#fff;
}

/* ── SLIP ─────────────────────────────────────────────────────────── */
.slip-outer{
  width:780px;
  max-width:100%;
  background:#fff;
  border:1.5px solid #999;
  box-shadow:0 4px 24px rgba(0,0,0,.12);
}

.slip-inner{
  margin:10px;
  border:1px solid var(--ink);
  padding:24px 28px;
}

/* ── HEADER ───────────────────────────────────────────────────────── */
.slip-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding-bottom:14px;
  border-bottom:2.5px solid var(--ink);
  margin-bottom:16px;
  gap:16px;
}

.company-logo-block{
  display:flex;
  align-items:center;
  gap:12px;
}

.logo-mark{
  width:50px;
  height:50px;
  border-radius:10px;
  background:#1A1A2E;
  display:flex;
  align-items:center;
  justify-content:center;
}

.logo-letter{
  font-family:var(--mono);
  font-weight:700;
  font-size:18px;
  color:#fff;
}

.company-name{
  font-family:var(--mono);
  font-weight:700;
  font-size:17px;
}

.company-name .accent{
  color:#2563EB;
}

.company-sub{
  font-size:9px;
  font-weight:600;
  letter-spacing:.18em;
  text-transform:uppercase;
  color:var(--ink3);
  margin-top:3px;
}

.company-addr{
  font-family:var(--mono);
  font-size:9.5px;
  color:var(--ink4);
  margin-top:2px;
}

.slip-doc-block{
  text-align:right;
}

.slip-doc-title{
  font-family:var(--mono);
  font-weight:700;
  font-size:16px;
  letter-spacing:.08em;
  text-transform:uppercase;
}

.slip-doc-badge{
  display:inline-block;
  font-family:var(--mono);
  font-size:10px;
  font-weight:700;
  background:var(--ink);
  color:#fff;
  padding:2px 9px;
  border-radius:3px;
  margin-top:5px;
}

.slip-doc-date{
  font-family:var(--mono);
  font-size:10px;
  color:var(--ink3);
  margin-top:4px;
}

/* ── TOP ──────────────────────────────────────────────────────────── */
.slip-top{
  display:grid;
  grid-template-columns:1fr 1fr;
  border-bottom:1px dashed var(--border);
  padding-bottom:14px;
  margin-bottom:14px;
}

.ship-to{
  border-right:1px solid var(--border2);
  padding-right:20px;
}

.tracking-col{
  padding-left:20px;
  text-align:center;
}

.field-label{
  font-family:var(--mono);
  font-size:9px;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:var(--ink3);
  margin-bottom:4px;
}

.field-value{
  font-size:11px;
  font-weight:700;
}

.field-value.lg{
  font-size:15px;
}

.field-sub{
  font-size:11px;
  color:var(--ink2);
  line-height:1.6;
  margin-top:3px;
}

.track-num{
  font-family:var(--mono);
  font-size:18px;
  font-weight:700;
  letter-spacing:.2em;
  margin:8px 0;
}

.barcode-wrap{
  display:flex;
  justify-content:center;
}

.barcode-svg{
  width:160px;
  height:52px;
}

/* ── META ─────────────────────────────────────────────────────────── */
.meta-row{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  border:1px solid var(--border);
  margin-bottom:14px;
}

.meta-cell{
  padding:8px 10px;
  border-right:1px solid var(--border);
}

.meta-cell:last-child{
  border-right:none;
}

/* ── TABLE ────────────────────────────────────────────────────────── */
/* ── TABLE ────────────────────────────────────────────────────────── */

.section-label{
  font-family:var(--mono);
  font-size:9px;
  font-weight:700;
  letter-spacing:.15em;
  text-transform:uppercase;
  color:var(--ink3);
  margin-bottom:8px;
}

.items-table{
  width:100%;
  border-collapse:collapse;
  table-layout:fixed;
  font-size:11px;
  border:1px solid var(--border);
}

.items-table th{
  font-family:var(--mono);
  font-size:9px;
  font-weight:700;
  letter-spacing:.08em;
  text-transform:uppercase;
  background:var(--ink);
  color:#fff;
  padding:9px 8px;
  text-align:center;
  border:1px solid #444;
}

.items-table td{
  padding:9px 8px;
  border:1px solid var(--border2);
  vertical-align:middle;
  word-wrap:break-word;
  overflow-wrap:break-word;
}

.items-table tbody tr:nth-child(even){
  background:var(--bg2);
}

/* COLUMN STYLES */

.td-no{
  text-align:center;
  width:40px;
  font-weight:600;
}

.td-code{
  text-align:center;
  width:130px;
  font-family:var(--mono);
  font-size:10px;
}

.td-name{
  text-align:left;
  font-weight:600;
  padding-left:12px;
}

.td-uom{
  text-align:center;
  width:70px;
}

.td-packed{
  text-align:center;
  width:90px;
  font-weight:700;
}

.td-packed.ok{
  color:#111;
}

.td-packed.short{
  color:var(--amber);
}

/* FOOTER */

.items-table tfoot tr{
  background:#EFEFEF;
  border-top:2px solid var(--ink);
}

.items-table tfoot td{
  padding:10px 8px;
  font-family:var(--mono);
  font-weight:700;
  border:1px solid var(--border);
}

/* ── FOOTER ───────────────────────────────────────────────────────── */
.dashed{
  border:none;
  border-top:1px dashed var(--border);
  margin:14px 0;
}

.slip-footer{
  text-align:center;
  font-family:var(--mono);
  font-size:9px;
  color:var(--ink3);
  margin-top:14px;
}

/* ── PRINT ────────────────────────────────────────────────────────── */
@media print{
  body{
    background:#fff;
    padding:0;
  }

  .toolbar{
    display:none !important;
  }

  .slip-outer{
    width:100%;
    border:none;
    box-shadow:none;
  }

  @page{
    size:A4 portrait;
    margin:10mm;
  }
}
`;

  const rows = items.map((item: any, index: number) => {
  const ordered = Number(item.ordered_quantity || item.qty || 0);
  const packed = Number(item.packed_quantity || 0);

  return `
<tr>
  <td class="td-no">
    ${index + 1}
  </td>

  <td class="td-code">
    ${item.item_code || "-"}
  </td>

  <td class="td-name">
    ${item.item_name || "Item"}
  </td>

  <td class="td-uom">
    ${item.uom || "Nos"}
  </td>

  <td class="td-packed ${packed < ordered ? "short" : "ok"}">
    ${packed}
  </td>
</tr>
`;
}).join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>

<title>Packing Slip</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<style>
${css}
</style>
</head>

<body>

<!-- SLIP -->
<div class="slip-outer">
<div class="slip-inner">

  <!-- HEADER -->
  <div class="slip-header">

   <div class="company-logo-block">
  <div class="logo-mark">
    <span class="logo-letter">
      ${company.name ? company.name.slice(0, 2).toUpperCase() : "MS"}
    </span>
  </div>

  <div>
    <div class="company-name">
  ${company.name || "Company Name"}
</div>


    <div class="company-addr">
  ${company.address || "Address not available"}
</div>
  </div>
</div>

    <div class="slip-doc-block">
      <div class="slip-doc-title">
        Packing Slip
      </div>

      <div class="slip-doc-badge">
        ${pkg.package_slip}
      </div>

      <div class="slip-doc-date">
        ${new Date(pkg.date).toLocaleDateString()}
      </div>
    </div>

  </div>

  <!-- TOP -->
  <div class="slip-top">

    <div class="ship-to">
      <div class="field-label">Ship To</div>

      <div class="field-value lg">
        ${pkg.order?.customer || pkg.customer_name || ""}
      </div>

      <div class="field-sub">
        ${pkg.order?.contact_person || ""}<br/>
        ${pkg.order?.contact_number || ""}<br/>
        ${pkg.order?.email || ""}<br/>
        ${
          pkg.order?.shipping_address ||
          pkg.order?.shippingAddress ||
          pkg.shipping_address ||
          ""
        }
      </div>
    </div>

    <div class="tracking-col">
      <div class="field-label">
        Tracking Number
      </div>

      <div class="track-num">
        ${pkg.tracking_number || "N/A"}
      </div>

      <div class="barcode-wrap">
        <svg class="barcode-svg" id="barcode-svg"
          viewBox="0 0 160 52"
          xmlns="http://www.w3.org/2000/svg">
        </svg>
      </div>
    </div>

  </div>

  <!-- META -->
  <div class="meta-row">

    <div class="meta-cell">
      <div class="field-label">
        Total Packed Qty
      </div>

      <div class="field-value">
        ${totalPackedQty}
      </div>
    </div>

    <div class="meta-cell">
      <div class="field-label">
        Package Slip
      </div>

      <div class="field-value">
        ${pkg.package_slip}
      </div>
    </div>

    <div class="meta-cell">
      <div class="field-label">
        Order Number
      </div>

      <div class="field-value">
        ${pkg.order_number || "-"}
      </div>
    </div>

    <div class="meta-cell">
      <div class="field-label">
        Date
      </div>

      <div class="field-value">
        ${new Date(pkg.date).toLocaleDateString()}
      </div>
    </div>

    <div class="meta-cell">
      <div class="field-label">
        Status
      </div>

      <div class="field-value">
        ${
          pkg.status === "shipped"
            ? "Shipped"
            : pkg.status === "delivered"
            ? "Delivered"
            : "Not Shipped"
        }
      </div>
    </div>

  </div>

  <hr class="dashed"/>

  <!-- TABLE -->
  <div class="section-label">
    Packed Items
  </div>

  <table class="items-table">

    <thead>
  <tr>
    <th style="width:40px">#</th>
    <th style="width:130px">Item Code</th>
    <th>Item Name</th>
    <th style="width:70px">UOM</th>
    <th style="width:90px">Packed Qty</th>
  </tr>
</thead>

    <tbody>
      ${rows}
    </tbody>

    <tfoot>
  <tr>
    <td colspan="4" style="text-align:right">
      TOTAL
    </td>

    <td class="td-packed">
      ${totalPackedQty}
    </td>
  </tr>
</tfoot>

  </table>

  <hr class="dashed"/>

  <!-- FOOTER -->
  <div class="slip-footer">
    Printed: ${new Date().toLocaleString()}
  </div>

</div>
</div>

<script>
function drawBarcode(value) {
  const svg = document.getElementById('barcode-svg');

  if (!svg) return;

  const str = String(value);
  const bars = [];

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);

    for (let b = 0; b < 9; b++) {
      const wide = ((code >> b) & 1) === 1;

      bars.push(wide ? 3 : 1);
      bars.push(1);
    }

    bars.push(2);
  }

  const totalWidth = bars.reduce((a,b) => a+b, 0);

  const svgW = 160;
  const scale = svgW / totalWidth;

  let paths = '';
  let x = 0;
  let isBar = true;

  bars.forEach(w => {
    if(isBar) {
      paths += '<rect x="' + (x*scale).toFixed(2) +
      '" y="0" width="' + (w*scale).toFixed(2) +
      '" height="44" fill="#111"/>';
    }

    x += w;
    isBar = !isBar;
  });

  svg.innerHTML = paths;
}

window.onload = async function () {

  if (document.fonts) {
    await document.fonts.ready;
  }

  drawBarcode("${pkg.tracking_number || "56321"}");

  setTimeout(() => {
    window.print();
  }, 500);
};
</script>

</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  toast.success("Packing slip sent to print");
};


  const PackageCard = ({ pkg }: { pkg: OrderPackage }) => (
    <div className="flex items-start gap-3 p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors group">
      <Checkbox
        checked={selectedPackages.has(pkg.id)}
        onCheckedChange={() => togglePackageSelection(pkg.id)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground">{pkg.customer_name}</div>
        <div className="flex items-center gap-2 mt-1 text-sm">
          <span className="text-primary font-medium">{pkg.package_slip}</span>
          <span className="text-muted-foreground">|</span>
          <Badge variant="outline" className="text-xs">{pkg.order_number}</Badge>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {pkg.carrier && <span>{pkg.carrier} | </span>}
          {pkg.trackingNumber && <span className="text-primary font-medium">{pkg.trackingNumber} | </span>}
          {formatDate(pkg.date)}
        </div>
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {pkg.status === "not_shipped" && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openShipmentDialog(pkg.id)}>
              <Truck className="h-3 w-3" />
              Mark Shipped
            </Button>
          )}
          {pkg.status === "shipped" && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => printShippingLabel(pkg)}>
                <Printer className="h-3 w-3" />
                Print Label
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => markAsDelivered(pkg.id)}>
                <CheckCircle className="h-3 w-3" />
                Mark Delivered
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => markAsNotShipped(pkg.id)}>
                <Package className="h-3 w-3" />
                Unship
              </Button>
            </>
          )}
          {pkg.status === "delivered" && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => printShippingLabel(pkg)}>
              <Printer className="h-3 w-3" />
              Print Label
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const ColumnHeader = ({ title, color }: { title: string; color: string }) => (
    <div className={`flex items-center justify-between px-4 py-3 rounded-t-lg ${color}`}>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Sort by</DropdownMenuItem>
          <DropdownMenuItem>Export Packages</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Order Packages</h2>
        <Button
          onClick={() => {
            if (confirmedOrders.length === 0) {
              toast.error("No confirmed orders available. Package creation is only allowed for confirmed/approved orders.");
              return;
            }
            setNewPackageOpen(true);
          }}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Package
        </Button>
      </div>

      {/* Info Banner */}
      {confirmedOrders.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              Package creation is only available for confirmed or approved orders. Currently, there are no eligible orders.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Packages and Reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted rounded-lg">
          <TabsTrigger value="packages" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="h-4 w-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-4 w-4" />
            Monthly Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-4 space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Filters</span>
                {(filterStatus !== "all" || filterCarrier !== "all" || filterOrder !== "all" || filterDateFrom || filterDateTo) && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="not_shipped">Not Shipped</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Carrier</Label>
                  <Select value={filterCarrier} onValueChange={setFilterCarrier}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Carriers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Carriers</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                      <SelectItem value="USPS">USPS</SelectItem>
                      <SelectItem value="Australia Post">Australia Post</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Order Number</Label>
                  <Select value={filterOrder} onValueChange={setFilterOrder}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Orders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      {uniqueOrderNumbers.map((orderNum, index) => (
                        <SelectItem key={`${orderNum}-${index}`} value={orderNum}>
                          {orderNum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="h-9" />
                </div>
              </div>
              {filteredPackages.length !== packages.length && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Showing {filteredPackages.length} of {packages.length} packages
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Not Shipped Column */}
            <Card className="overflow-hidden">
              <ColumnHeader title={`Not Shipped (${notShippedPackages.length})`} color="bg-amber-50" />
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {notShippedPackages.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No packages</div>
                  ) : (
                    notShippedPackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Shipped Column */}
            <Card className="overflow-hidden">
              <ColumnHeader title={`Shipped (${shippedPackages.length})`} color="bg-blue-50" />
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {shippedPackages.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No packages</div>
                  ) : (
                    shippedPackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Delivered Column */}
            <Card className="overflow-hidden">
              <ColumnHeader title={`Delivered (${deliveredPackages.length})`} color="bg-green-50" />
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {deliveredPackages.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No packages</div>
                  ) : (
                    deliveredPackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-6">
          {/* Month/Year Selector */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Month</Label>
                  <Select value={reportMonth} onValueChange={setReportMonth}>
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, idx) => (
                        <SelectItem key={idx} value={String(idx + 1)}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <Select value={reportYear} onValueChange={setReportYear}>
                    <SelectTrigger className="h-9 w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map((year) => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{monthlyReport.total}</div>
                <div className="text-sm text-muted-foreground">Total Packages</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-amber-500">{monthlyReport.byStatus.not_shipped}</div>
                <div className="text-sm text-muted-foreground">Not Shipped</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-500">{monthlyReport.byStatus.shipped}</div>
                <div className="text-sm text-muted-foreground">Shipped</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-500">{monthlyReport.byStatus.delivered}</div>
                <div className="text-sm text-muted-foreground">Delivered</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Packages by Carrier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(monthlyReport.byCarrier).length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No data for this period</div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(monthlyReport.byCarrier).map(([carrier, count]) => (
                      <div key={carrier} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="font-medium">{carrier}</span>
                        <span className="text-primary font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Packages by Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyReport.packages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No data for this period
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {Object.entries(
                        monthlyReport.packages.reduce<Record<string, number>>((acc, pkg) => {
                          if (pkg.order_number) {
                            acc[pkg.order_number] = (acc[pkg.order_number] || 0) + 1;
                          }
                          return acc;
                        }, {})
                      )
                        .filter(([_, count]) => count > 0)
                        .sort(([, a], [, b]) => b - a)
                        .map(([orderNumber, count]) => (
                          <div
                            key={orderNumber}
                            className="flex items-center justify-between p-2 bg-muted/30 rounded"
                          >
                            <span className="font-medium">{orderNumber}</span>
                            <span className="text-primary font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Package List for Period */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Package Details</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyReport.packages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No packages for this period</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">Package Slip</TableHead>
                        <TableHead className="font-semibold">Order Number</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Carrier</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReport.packages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium text-primary">{pkg.package_slip}</TableCell>
                          <TableCell><Badge variant="outline">{pkg.order_number}</Badge></TableCell>
                          <TableCell>{pkg.customer_name}</TableCell>
                          <TableCell>{formatDate(pkg.date)}</TableCell>
                          <TableCell>{pkg.carrier || "-"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${pkg.status === "delivered"
                              ? "bg-green-100 text-green-700"
                              : pkg.status === "shipped"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                              }`}>
                              {pkg.status === "not_shipped" ? "Not Shipped" : pkg.status === "shipped" ? "Shipped" : "Delivered"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Package Dialog */}
      <Dialog open={newPackageOpen} onOpenChange={setNewPackageOpen}>
        <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" /> New Package
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Order Selection - Only Confirmed Orders */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-destructive">Order Number*</Label>
                  <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select a confirmed order" />
                    </SelectTrigger>
                    <SelectContent>
                      {confirmedOrders.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No confirmed orders available</div>
                      ) : (
                        packableOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.orderNo || order.order_no} - {order.customer}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Only confirmed/approved orders can be packaged</p>
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input
                    value={selectedOrderData?.customer || selectedOrderData?.customer_name || ""}
                    disabled
                    className="h-10 bg-muted"
                  />
                </div>
              </div>

              {/* Package Slip and Date */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-destructive">Package Slip#*</Label>
                  <Input
                    value={packageSlip}
                    onChange={(e) => setPackageSlip(e.target.value)}
                    className="h-10"
                    placeholder="PKG-XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-destructive">Date*</Label>
                  <Input
                    type="date"
                    value={packageDate}
                    onChange={(e) => setPackageDate(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Items Table */}
              {packageItems.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold text-xs uppercase tracking-wide w-[40%]">Item & Code</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">Ordered</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">Packed</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">Quantity to Pack</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableBody>
                        {packageItems.map((item) => (
                          <TableRow key={item.id} className="border-b">
                            <TableCell className="py-4 w-[40%]">
                              <div>
                                <div className="font-medium text-foreground">{item.itemName}</div>
                                <div className="text-sm text-muted-foreground">Code: {item.itemCode}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-primary font-medium">{item.ordered}</TableCell>
                            <TableCell className="text-right">{item.packed}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={item.quantityToPack}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                className="w-24 ml-auto text-right"
                                min={0}
                                max={item.ordered - item.packed}
                              />
                            </TableCell>
                            <TableCell className="w-20">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-sm">{item.uom}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {/* Internal Notes */}
              <div className="space-y-2">
                <Label className="text-muted-foreground font-semibold uppercase text-xs tracking-wide">Internal Notes</Label>
                <Textarea
                  placeholder="Enter internal notes..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setNewPackageOpen(false)}>Cancel</Button>
            <Button
  onClick={(e) => {
    e.currentTarget.disabled = true;
    handleSavePackage();
  }}
  className="bg-primary"
>
  Save Package
</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipment Dialog */}
      <Dialog open={shipmentDialogOpen} onOpenChange={setShipmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {isBulkShipment ? `Ship ${selectedPackages.size} Package(s)` : "Ship Package"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Carrier*</Label>
              <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="UPS">UPS</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                  <SelectItem value="USPS">USPS</SelectItem>
                  <SelectItem value="Australia Post">Australia Post</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tracking Number*</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShipmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmShipment}>Confirm Shipment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderPackagesTab;
