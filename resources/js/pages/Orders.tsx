import Layout from "@/components/Layout";
import RFQForm from "@/components/RFQForm";
import OrderPackagesTab from "@/components/orders/OrderPackagesTab";
import { RefundDialog } from "@/components/orders/RefundDialog";
import { RefundsTab } from "@/components/orders/RefundsTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, XCircle } from "lucide-react";
import axios from "axios";
import { Money } from "@/components/Money";
import { useCurrency } from "@/hooks/useCurrency";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Factory,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  MapPin,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface BOMComponent {
  component: string;
  description: string;
  uom: string;
  type: string;
  bomQuantity: number;
  availableQty: number;
  requiredQty: number;
}

interface LineItem {
  id: string;

  itemType: string;
  itemCode: string;
  itemName: string;
  uom: string;

  quantityOrdered: number;
  availableStock?: number;     // ✅ make optional
  rackLocation?: string;       // ✅ make optional
  batchNo?: string;            // ✅ make optional
  expiryDate?: string;         // ✅ make optional

  rate: number;
  tax: number;

  totalAmount?: number;        // ✅ make optional

  stockValidated?: boolean;    // ✅ make optional

  hasBOM?: boolean;
  bomComponents?: BOMComponent[];
  bomLoading?: boolean;
  noBOM?: boolean;

  discount?: number;
}

interface Order {
  id: string;
  orderDate: string;
  orderType: string;
  customer: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  referenceNo: string;
  priority: string;
  remarks: string;
  items: LineItem[];
  dispatchMode: string;
  transporterName: string;
  vehicleNo: string;
  expectedDispatchDate: string;
  deliveryStatus: string;
  warehouseLocation: string;
  location: string;
  paymentType: string;
  paymentTerms: string;
  advanceAmount: number;
  balanceAmount: number;
  invoiceRequired: string;
  status: string;
}

interface RefundItem {
  itemCode: string;
  itemName: string;
  quantityOrdered: number;
  quantityRefunded: number;
  unitPrice: number;
  refundAmount: number;
  restoreInventory: boolean;
}

interface RefundRecord {
  id: string;
  refundNumber: string;
  orderId: string;
  customerName: string;
  refundType: "full" | "partial";
  status: "pending" | "approved" | "rejected" | "processed";
  reason: string;
  notes?: string;
  originalAmount: number;
  refundAmount: number;
  items: RefundItem[];
  approvedBy?: string;
  approvedAt?: string;
  processedAt?: string;
  createdAt: string;
}

interface RegularOrderTemplate {
  id: string;
  templateNumber: string;
  customer: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  frequency: string;
  nextOrderDate: string;
  lastOrdered?: string;
  status: "Active" | "Paused";
  price: number;
}

interface FormDataState {
  customerId: number | string;
  customerName: string;
  customerCode: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  orderNo: string;
  orderDate: string;
  expectedDeliveryDate: string;
  orderType: string;
  referenceNo: string;
  priority: string;
  remarks: string;
  dispatchMode: string;
  transporterName: string;
  vehicleNo: string;
  expectedDispatchDate: string;
  deliveryStatus: string;
  warehouseLocation: string;
  location: string;
  paymentType: string;
  paymentTerms: string;
  advanceAmount: number;
  balanceAmount: number;
  invoiceRequired: string;
}

type OrderWorkspaceView =
  | "new"
  | "orders"
  | "clone"
  | "regular"
  | "validation"
  | "purchase"
  | "excess"
  | "dashboard";

type MainTab = "orders" | "packages" | "refunds";
type ValidationState = "available" | "partial" | "purchase" | "produce" | "missing";
type SortField = "date" | "amount" | "customer" | "status";

const ORDER_VIEWS: Array<{ id: OrderWorkspaceView; label: string; icon: any; countKey?: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new", label: "New Order", icon: Plus },
  { id: "orders", label: "All Orders", icon: ShoppingCart, countKey: "orders" },
  { id: "clone", label: "Clone Last Order", icon: Copy },
  { id: "regular", label: "Regular Orders", icon: RotateCcw, countKey: "regular" },
  { id: "validation", label: "Stock Validation", icon: CheckCircle2 },
  { id: "purchase", label: "Purchase Needs", icon: Truck, countKey: "purchase" },
];

const initialOrderState = {
  customer: "",
  customer_id: "",
  order_no: "",
  order_type: "",
  priority: "Normal",
  expected_delivery_date: "",
  dispatch_mode: "",
  items: [],
};

const todayISO = () => new Date().toISOString().split("T")[0];
const integer = (value: number) => Math.max(0, Math.round(value || 0));
const normalizeText = (value?: string | null) => (value || "").trim().toLowerCase();

const createEmptyLineItem = (itemType = "Material"): LineItem => ({
  id: crypto.randomUUID(),
  itemType,
  itemCode: "",
  itemName: "",
  uom: "pcs",
  quantityOrdered: 1,
  availableStock: 0,
  rackLocation: "",
  batchNo: "",
  expiryDate: "",
  rate: 0,
  tax: 18,
  totalAmount: 0,
  stockValidated: false,
  bomComponents: [],
  bomLoading: false,
  noBOM: false,
});

const getDefaultItemType = (orderType: string) => {
  if (normalizeText(orderType).includes("manufacturing")) return "Product";
  return "Material";
};

const normalizeItemType = (value?: string | null) => {
  const type = normalizeText(value);
  if (type.includes("product")) return "Product";
  if (type.includes("component")) return "Component";
  if (type.includes("material")) return "Material";
  return value?.trim() || "Material";
};

const Orders = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mainTab, setMainTab] = useState<MainTab>("orders");
  const [workspaceView, setWorkspaceView] = useState<OrderWorkspaceView>("new");
  const [orders, setOrders] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [regularOrders, setRegularOrders] = useState<RegularOrderTemplate[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormDataState>({
    customerId: "",
    customerName: "",
    customerCode: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    billingAddress: "",
    shippingAddress: "",
    orderNo: "",
    orderDate: todayISO(),
    expectedDeliveryDate: "",
    orderType: "Sales",
    referenceNo: "",
    priority: "Normal",
    remarks: "",
    dispatchMode: "Courier",
    transporterName: "",
    vehicleNo: "",
    expectedDispatchDate: "",
    deliveryStatus: "Awaiting",
    warehouseLocation: "",
    location: "",
    paymentType: "Credit",
    paymentTerms: "Net 30 days",
    advanceAmount: 0,
    balanceAmount: 0,
    invoiceRequired: "1",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem(getDefaultItemType("Sales"))]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("order_no");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [validationRun, setValidationRun] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedCloneId, setSelectedCloneId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [regularDialogOpen, setRegularDialogOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelOrder, setCancelOrder] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  const currency = useCurrency();

  const formatPrintMoney = (value: number) => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency, // ✅ now it's being used
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};


  const [regularForm, setRegularForm] = useState({
    customer: "",
    itemCode: "",
    quantity: 1,
    frequency: "Weekly",
    nextOrderDate: todayISO(),
    price: 0,
  });

  const [rfqDialogOpen, setRfqDialogOpen] = useState(false);
  const [rfqItem, setRfqItem] = useState<{
    item_code: string;
    item_name: string;
    description?: string;
    quantity: number;
  } | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeInventoryItems = Array.isArray(inventoryItems) ? inventoryItems : [];
  const safeLineItems = Array.isArray(lineItems) ? lineItems : [];

  // Add this after your interfaces (around line 100)
  const getOrderField = (order: any, field: string, fallback: any = "—") => {
    if (!order) return fallback;
    return order[field] ??
      order[field.replace(/_/g, '')] ??  // try camelCase version
      order[field.toLowerCase()] ??
      fallback;
  };

  useEffect(() => {
    fetchRegularOrders();
  }, []);

  const fetchRegularOrders = async () => {
    try {
      const res = await axios.get("/api/regular-template");

      console.log(res.data); // 👈 check data first

      setRegularOrders(res.data); // IMPORTANT
    } catch (error) {
      console.error("Failed to fetch templates", error);
    }
  };


  const generateSONumber = async () => {
    try {
      const res = await axios.get("/api/orders/next-so");

      return res.data.data;
    } catch (err) {
      console.error("SO GENERATION FAILED:", err.response?.data || err);
      return "SO-ERROR";
    }
  };

  const generateRegularNumber = () => {
    const year = new Date().getFullYear();

    const prefix = `REG-${year}-`;

    const numbers = regularOrders
      .map((o) => o.template_number || o.order_number)
      .filter(Boolean)
      .filter((n) => n.startsWith(prefix))
      .map((n) => parseInt(n.split("-").pop() || "0", 10));

    const lastNumber = numbers.length > 0 ? Math.max(...numbers) : 0;

    const nextNumber = lastNumber + 1;

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  };


  const calculateOrderValue = (order: any) =>
    (order.items || []).reduce(
      (sum: number, item: any) =>
        sum +
        (Number(item.quantity || 0) *
          Number(item.rate || item.price || 0)),
      0
    );

  useEffect(() => {
    const loadSO = async () => {
      const so = await generateSONumber();
      setFormData((prev) => ({ ...prev, orderNo: so }));
    };

    loadSO();
  }, []);

  const inventoryByCode = useMemo(() => {
    if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
      console.log("⚠️ inventoryItems is empty");
      return new Map();
    }

    const map = new Map();
    inventoryItems.forEach((item) => {
      const code1 = normalizeText(item.item_code);
      const code2 = normalizeText(item.itemCode);

      if (code1) map.set(code1, item);
      if (code2 && code2 !== code1) map.set(code2, item);
    });

    console.log(`✅ Inventory map created with ${map.size} items`);
    return map;
  }, [inventoryItems]);

  const customerByName = useMemo(() => {
    return new Map(customers.map((customer) => [normalizeText(customer.customer_name), customer]));
  }, [customers]);

  const getInventoryRecord = (itemCode: string) => {
    if (!itemCode) return null;
    const normalized = normalizeText(itemCode);
    return inventoryByCode.get(normalized) || null;
  };

  const getAvailableStock = (itemCode: string): number => {
    if (!itemCode) return 0;

    const inventory = getInventoryRecord(itemCode);
    if (!inventory) return 0;

    const fields = [
      inventory.available_quantity,
      inventory.availableQuantity,
      inventory.available_stock,
    ];

    const direct = fields.find(v => v !== null && v !== undefined);

    if (direct !== undefined) {
      return Math.max(0, Math.round(Number(direct)));
    }

    const computed =
      (Number(inventory.quantity_on_hand ?? 0) -
        Number(inventory.allocated_quantity ?? 0));

    return Math.max(0, Math.round(computed));
  };

  const handleEditOrder = async (order: any) => {
    const orderData = order?.items ? order : order?.data ? order.data[0] : order;

    setIsEditing(true);              // ✅ ADD THIS
    setEditingOrderId(orderData.id); // ✅ ADD THIS
    console.log("EDITING ORDER:", orderData);

    // DO NOT CHANGE ORDER NO
    const existingSONumber = orderData.order_no;

    // 1. SET FORM DATA (same structure as cloneIntoComposer)
    setFormData({
      customerId: orderData.customer_id ?? "",
      customerName: orderData.customer ?? orderData.customer_name ?? "",

      customerCode: "",
      contactPerson: orderData.contact_person ?? "",
      contactNumber: orderData.contact_number ?? "",
      email: orderData.email ?? "",

      billingAddress: orderData.address_line1 ?? "",
      shippingAddress: orderData.shipping_address_line1 ?? "",

      orderNo: existingSONumber, // ✅ IMPORTANT: KEEP SAME
      orderDate: orderData.order_date ?? todayISO(),

      expectedDeliveryDate:
        orderData.expected_delivery_date || orderData.order_date,

      orderType: orderData.order_type ?? "",
      referenceNo: orderData.reference_no ?? "",
      priority: orderData.priority ?? "Normal",
      remarks: orderData.remarks ?? "",
      status: orderData.status ?? "Awaiting Confirmation",

      dispatchMode: orderData.dispatch_mode ?? "",
      transporterName: orderData.transporter_name ?? "",
      vehicleNo: orderData.vehicle_no ?? "",
      expectedDispatchDate: orderData.expected_dispatch_date ?? "",

      deliveryStatus: orderData.delivery_status ?? "Awaiting",
      warehouseLocation: orderData.warehouse_location ?? "",
      location: orderData.location ?? "",

      paymentType: orderData.payment_type ?? "",
      paymentTerms: orderData.payment_terms ?? "",

      advanceAmount: Number(orderData.advance_amount ?? 0),
      balanceAmount: Number(orderData.balance_amount ?? 0),
      invoiceRequired: orderData.invoice_required ?? 0,
    });

    // 2. ITEMS SAME AS CLONE
    const items =
      orderData.items && orderData.items.length > 0
        ? orderData.items
        : [
          {
            item_code: orderData.item_code,
            item_name: orderData.item_name,
            item_type: orderData.item_type,
            uom: orderData.uom,
            quantity: orderData.quantity,
            rate: orderData.rate,
            tax: orderData.tax,
            total_amount: orderData.total_amount,
            available_stock: Number(orderData.available_stock ?? 0),
          },
        ];

    const fetchBomByItemCode = async (itemCode: string) => {
      try {
        const res = await axios.get(`/api/bom-component`, {
          params: { item_code: itemCode },
        });

        const data = res.data;

        if (Array.isArray(data)) return data;
        if (data && typeof data === "object") return Object.values(data).flat();

        return [];
      } catch (err) {
        console.error("BOM API ERROR:", err);
        return [];
      }
    };

    const itemsWithBom = await Promise.all(
      items.map(async (item: any) => {
        const bomComponents = item.item_code
          ? await fetchBomByItemCode(item.item_code)
          : [];

        return {
          id: crypto.randomUUID(),
          itemCode: item.item_code,
          itemName: item.item_name,
          itemType: item.item_type,
          quantityOrdered: Number(item.quantity ?? 0),
          uom: item.uom ?? "",
          rate: Number(item.rate ?? 0),
          tax: Number(item.tax ?? 0),
          totalAmount: Number(item.total_amount ?? 0),
          availableStock: Number(item.available_stock ?? 0),

          bomComponents: Array.isArray(bomComponents)
            ? bomComponents.map((c: any) => ({
              component: c.component,
              description: c.description,
              type: c.type,
              requiredQty: Number(
                c.requiredQty ??
                c.required_qty ??
                c.qty_required ??
                c.quantity ??
                0
              ),
            }))
            : [],

          discount: Number(item.discount ?? 0),
        };
      })
    );

    setLineItems(itemsWithBom);

    // 3. OPEN AFTER STATE READY (important fix)
    requestAnimationFrame(() => {
      setWorkspaceView("new");
    });

    toast({
      title: "Order loaded for editing",
      description: `${existingSONumber} loaded into composer.`,
    });
  };

  const fetchInventory = async () => {
    try {
      const res = await axios.get("/api/inventory-stock");
      console.log("📦 INVENTORY RAW RESPONSE:", res.data);

      const data = res.data?.items ?? [];   // ✅ FIX HERE

      setInventoryItems(data);
    } catch (error) {
      console.error("❌ Inventory fetch error:", error);
      setInventoryItems([]);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);


  const fetchBOMComponents = async (itemCode: string, qty: number) => {
    try {
      console.log("📦 ITEM CODE:", itemCode);

      // 🔹 1. BOM API
      const res = await axios.get("/api/bom-component", {
        params: { item_code: itemCode },
      });

      const components = res.data;

      console.log("📦 BOM RESPONSE:", components);

      if (!Array.isArray(components) || components.length === 0) {
        console.warn("⚠️ No BOM found");
        return { components: [], noBOM: true };
      }

      // 🔹 2. STOCK API
      const stockRes = await axios.get("/api/inventory-stock", {
        params: {
          item_codes: components.map((c: any) => c.component).join(","),
        },
      });

      console.log("📦 STOCK RAW RESPONSE:", stockRes.data);

      // 🔹 3. Normalize stock
      const stockArray = Array.isArray(stockRes.data)
        ? stockRes.data
        : stockRes.data?.data || stockRes.data?.stocks || [];

      console.log("📦 STOCK ARRAY:", stockArray);

      // 🔹 4. Build map
      const stockMap = new Map(
        stockArray.map((s: any) => [
          String(s.item_code).trim().toUpperCase(),
          Number(s.available_quantity || 0),
        ])
      );

      console.log("📦 STOCK MAP:", Object.fromEntries(stockMap));

      // 🔹 5. Final merge
      const result = components.map((c: any) => {
        const key = String(c.component).trim().toUpperCase();
        const available = stockMap.get(key) || 0;

        console.log("🔍 COMPONENT CHECK:", {
          component: c.component,
          key,
          available,
        });

        return {
          component: c.component,
          description: c.description,
          type: c.type,
          uom: c.uom || "NOS",

          bomQuantity: Number(c.quantity),
          requiredQty: Number(c.quantity) * qty,

          availableQty: stockMap.get(key) || 0,

        };
      });

      console.log("📦 FINAL COMPONENTS:", result);

      return {
        components: result,
        noBOM: false,
      };
    } catch (err) {
      console.error("❌ BOM fetch error:", err);
      return { components: [], noBOM: true };
    }
  };

  const getLineAssessment = (item: LineItem) => {
    const code = (item.itemCode || item.item_code || "").trim();

    // Get fresh inventory record
    const inventory = code ? getInventoryRecord(code) : null;

    // Get available stock - use the most reliable method
    const available = code ? getAvailableStock(code) : 0;

    const quantity = integer(item.quantityOrdered ?? item.quantity ?? 0);
    const gap = Math.max(0, quantity - available);

    const openPO = integer(inventory?.open_po ?? 0);

    const reorderPoint = integer(inventory?.reorder_point || inventory?.reorderPoint || 0);

    const rawType = item.itemType || inventory?.item_type || inventory?.itemType || "";
    const type = normalizeItemType(rawType);

    const isProduct = type === "Product";

    if (!code) {
      return {
        state: "missing" as ValidationState,
        label: "Missing item",
        action: "Add an item code.",
        available,
        gap,
        quantity,
        reorderPoint,
        inventory,
        type,
        openPO,
      };
    }

    if (quantity <= 0) {
      return {
        state: "missing" as ValidationState,
        label: "Missing qty",
        action: "Enter quantity greater than zero.",
        available,
        gap: 0,
        quantity,
        reorderPoint,
        inventory,
        type,
        openPO,
      };
    }

    // FULL STOCK
    if (available >= quantity) {
      return {
        state: "available" as ValidationState,
        label: reorderPoint > 0 && available < reorderPoint ? "Below reorder" : "Stock OK",
        action: reorderPoint > 0 && available < reorderPoint
          ? "Monitor stock and restock soon."
          : "Can be fulfilled from stock.",
        available,
        gap,
        quantity,
        reorderPoint,
        inventory,
        type,
        openPO,
      };
    }

    // PARTIAL STOCK
    if (available > 0) {
      return {
        state: "partial" as ValidationState,
        label: `Partial ${available}/${quantity}`,
        action: `Short by ${gap}. Split delivery or trigger replenishment.`,
        available,
        gap,
        quantity,
        reorderPoint,
        inventory,
        type,
        openPO,
      };
    }

    // PRODUCE (for Products)
    if (isProduct) {
      return {
        state: "produce" as ValidationState,
        label: `Produce ${quantity}`,
        action: "Trigger BOM-based production plan.",
        available,
        gap,
        quantity,
        reorderPoint,
        inventory,
        type,
        openPO,
      };
    }

    // PURCHASE (for Materials/Components)
    return {
      state: "purchase" as ValidationState,
      label: `Buy ${gap}`,
      action: "Raise RFQ or purchase request.",
      available,
      gap,
      quantity,
      reorderPoint,
      inventory,
      type,
      openPO,
    };
  };

  const lineAssessments = useMemo(() => lineItems.map((item) => ({ item, assessment: getLineAssessment(item) })), [lineItems, inventoryItems]);

  const validationMetrics = useMemo(() => {
    const values = lineAssessments.reduce(
      (acc, entry) => {
        acc[entry.assessment.state] += 1;
        return acc;
      },
      { available: 0, partial: 0, purchase: 0, produce: 0, missing: 0 } as Record<ValidationState, number>,
    );
    return values;
  }, [lineAssessments]);

  const totalSummary = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantityOrdered * item.rate, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.quantityOrdered * item.rate * (item.tax / 100), 0);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }, [lineItems]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      balanceAmount: Math.max(0, totalSummary.total - Number(prev.advanceAmount || 0)),
    }));
  }, [totalSummary.total]);

  const resetComposer = async () => {
    const defaultType = getDefaultItemType("Sales");
    const newSONumber = await generateSONumber();
    setFormData({
      customerId: "",
      customerName: "",
      customerCode: "",
      contactPerson: "",
      contactNumber: "",
      email: "",
      billingAddress: "",
      shippingAddress: "",
      orderNo: newSONumber || `SO-${Date.now()}`,
      orderDate: todayISO(),
      expectedDeliveryDate: "",
      orderType: "Sales",
      referenceNo: "",
      priority: "Normal",
      remarks: "",
      dispatchMode: "Courier",
      transporterName: "",
      vehicleNo: "",
      expectedDispatchDate: "",
      deliveryStatus: "Awaiting",
      warehouseLocation: "",
      location: "",
      paymentType: "Credit",
      paymentTerms: "Net 30 days",
      advanceAmount: 0,
      balanceAmount: 0,
      invoiceRequired: "1",
    });
    setLineItems([createEmptyLineItem(defaultType)]);
    setValidationRun(false);
  };

  const applyCustomerSelection = async (id: number) => {


    try {

      const res = await fetch(`/api/customers/${id}`);

      if (!res.ok) {
        throw new Error("Customer not found");
      }

      const customer = await res.json();


      setFormData((prev) => {
        const updated = {
          ...prev,
          customerId: id,

          customerName:
            customer.customer ??
            customer.customer_name ??
            prev.customerName ?? "",

          customerCode: customer.customer_code || "",
          email: customer.email || "",

          // ✅ FIXED CONTACT NUMBER (safe mapping)
          contactNumber:
            customer.contact_number ||
            customer.phone ||
            customer.mobile ||
            customer.phone_number ||
            "",

          contactPerson: customer.contact_person || "",

          billingAddress: customer.billing_address || "",

          shippingAddress:
            customer.shipping_address_line1 || customer.billing_address || "",

          location: customer.city || prev.location,
        };

        console.log("🧾 Updated form data:", updated);

        return updated;
      });
    } catch (error) {
      console.error("❌ Customer fetch error:", error);
    }
  };

  const syncItemCode = async (id: string, code: string) => {
    const inventory = getInventoryRecord(code);
    const normalizedType = normalizeItemType(inventory?.item_type || getDefaultItemType(formData.orderType));

    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const quantity = integer(item.quantityOrdered || 1);
        const rate = Number(inventory?.unit_cost || item.rate || 0);
        const tax = Number(item.tax || 18);
        return {
          ...item,
          itemCode: inventory?.item_code || code,
          itemName: inventory?.item_name || item.itemName,
          itemType: normalizedType,
          uom: inventory?.item_mode || inventory?.uom || item.uom || "pcs",
          availableStock: getAvailableStock(code),
          rackLocation: inventory?.location || "",
          rate,
          totalAmount: quantity * rate * (1 + tax / 100),
          stockValidated: Boolean(inventory),
          bomLoading: normalizedType === "Product",
          bomComponents: normalizedType === "Product" ? [] : undefined,
          noBOM: false,
        };
      }),
    );

    if (normalizedType === "Product" && code) {
      const { components, noBOM } = await fetchBOMComponents(code, integer(lineItems.find((item) => item.id === id)?.quantityOrdered || 1));
      setLineItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, bomComponents: components, bomLoading: false, noBOM } : item)),
      );
    }
  };

  const updateLineItem = async (id: string, field: keyof LineItem, value: any) => {
    if (field === "itemCode") {
      await syncItemCode(id, value);
      return;
    }

    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const quantity = integer(field === "quantityOrdered" ? value : updated.quantityOrdered);
        const rate = Number(field === "rate" ? value : updated.rate || 0);
        const tax = Number(field === "tax" ? value : updated.tax || 0);
        updated.quantityOrdered = quantity;
        updated.availableStock = updated.itemCode ? getAvailableStock(updated.itemCode) : 0;
        updated.stockValidated = updated.itemCode ? updated.availableStock >= quantity : false;
        updated.totalAmount = quantity * rate * (1 + tax / 100);

        if (field === "itemType" && value !== "Product") {
          updated.bomComponents = [];
          updated.bomLoading = false;
          updated.noBOM = false;
        }

        if (field === "quantityOrdered" && updated.bomComponents?.length) {
          updated.bomComponents = updated.bomComponents.map((component) => ({
            ...component,
            requiredQty: integer(component.bomQuantity * quantity),
          }));
        }

        return updated;
      }),
    );

    if (field === "itemType" && value === "Product") {
      const currentItem = lineItems.find((item) => item.id === id);
      if (currentItem?.itemCode) {
        const { components, noBOM } = await fetchBOMComponents(currentItem.itemCode, integer(currentItem.quantityOrdered));
        setLineItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, bomComponents: components, bomLoading: false, noBOM } : item)),
        );
      }
    }
  };

  const addLineItem = () => setLineItems((prev) => [...prev, createEmptyLineItem(getDefaultItemType(formData.orderType))]);
  const removeLineItem = (id: string) => setLineItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const validateComposer = () => {
    if (!formData.customerName.trim()) {
      toast({ title: "Customer required", description: "Select or enter a customer name.", variant: "destructive" });
      return false;
    }
    if (!formData.expectedDeliveryDate) {
      toast({ title: "Delivery date required", description: "Enter a required delivery date.", variant: "destructive" });
      return false;
    }
    if (new Date(formData.expectedDeliveryDate) < new Date(formData.orderDate)) {
      toast({
        title: "Invalid delivery date",
        description: "Expected delivery date cannot be earlier than order date.",
        variant: "destructive",
      });
      return false;
    }
    const validItems = lineItems.filter((item) => item.itemCode && integer(item.quantityOrdered) > 0);
    if (validItems.length === 0) {
      toast({ title: "Items required", description: "Add at least one valid line item.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const closeOrderSheet = () => setViewOrder(null);

  const createOrderFromComposer = async (status: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (!validateComposer()) return;

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.contactNumber)) {
        toast({
          title: "Invalid phone number",
          description: "Phone number must be exactly 10 digits.",
          variant: "destructive",
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.email && !emailRegex.test(formData.email)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }

      const items = lineItems
        .filter((item) => item.itemCode && item.quantityOrdered > 0)
        .map((item) => ({
          item_code: item.itemCode,
          item_name: item.itemName,
          item_type: item.itemType,
          available_stock: Number(item.availableStock || 0),
          uom: item.uom,
          quantity: Number(item.quantityOrdered),
          rate: Number(item.rate || 0),
          tax: Number(item.tax || 0),
          total_amount: Number(item.totalAmount || 0),
        }));

      if (!formData.customerId || items.length === 0) {
        toast({
          title: "Missing data",
          description: "Customer and items are required.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        id: formData.orderNo || generateSONumber(),
        customer_id: Number(formData.customerId),
        order_date: formData.orderDate,
        order_type: formData.orderType,
        customer: formData.customerName,
        contact_person: formData.contactPerson,
        contact_number: formData.contactNumber,
        email: formData.email,
        billing_address: formData.billingAddress,
        shipping_address: formData.shippingAddress || null,
        reference_no: formData.referenceNo || null,
        priority: formData.priority,
        remarks: formData.remarks,
        items,
        dispatch_mode: formData.dispatchMode,
        transporter_name: formData.transporterName,
        vehicle_no: formData.vehicleNo,
        expected_dispatch_date: formData.expectedDispatchDate,
        expected_delivery_date: formData.expectedDeliveryDate,
        delivery_status: formData.deliveryStatus,
        warehouse_location: formData.warehouseLocation,
        location: formData.location,
        payment_type: formData.paymentType,
        payment_terms: formData.paymentTerms,
        advance_amount: Number(formData.advanceAmount || 0),
        balance_amount:
          totalSummary.total - Number(formData.advanceAmount || 0),
        invoice_required: formData.invoiceRequired,
        status: isEditing ? formData.status : status,
      };

      let res;

      if (isEditing && editingOrderId) {
        res = await axios.put(`/api/orders/${editingOrderId}`, payload);

        toast({
          title: "Order updated",
          description: `${payload.id} updated successfully.`,
        });
      } else {
        res = await axios.post("/api/orders", payload);

        toast({
          title: "Order created",
          description: `${payload.id} saved successfully.`,
        });
      }

      setOrders((prev) =>
        isEditing
          ? prev.map((o) => (o.id === editingOrderId ? res.data : o))
          : [...prev, res.data]
      );

      resetComposer();
      setIsEditing(false);
      setEditingOrderId(null);

      await fetchOrders();
      setWorkspaceView("orders");
    } catch (error: any) {
      console.error(error?.response?.data || error);

      toast({
        title: "Error",
        description:
          error?.response?.data?.message || "Failed to save order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


 const confirmCancelOrder = async () => {
  if (!cancelOrder) return;

  try {
    setCancelling(true);

    const cancelRes = await axios.post(
      `/api/orders/${cancelOrder.id}/cancel`
    );

    if (!cancelRes.data.success) {
      throw new Error(cancelRes.data.message || "Cancel failed");
    }

    // UI update only
    setOrders((prev) =>
      prev.map((order) =>
        order.id === cancelOrder.id
          ? {
              ...order,
              status: "Cancelled",
              delivery_status: "Cancelled",
            }
          : order
      )
    );

    toast({
      title: "Order Cancelled",
      description: cancelRes.data.should_return_stock
        ? "Stock returned successfully."
        : "Order cancelled (no stock return).",
    });

    setCancelDialogOpen(false);
    setCancelOrder(null);
    closeOrderSheet();

  } catch (error) {
    toast({
      title: "Cancel failed",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  } finally {
    setCancelling(false);
  }
};


  const fetchOrders = async () => {
    try {
      const res = await axios.get("/api/orders");

      console.log("🔵 FULL RESPONSE:", res);
      console.log("🟢 RESPONSE DATA:", res.data);

      let data = res.data?.data ?? res.data ?? [];

      // Normalize inconsistent keys from backend
      data = data.map((order: any) => ({
        ...order,
        id: order.id || order.order_no || order.orderNo,
        order_no: order.order_no || order.id || order.orderNo,
        orderDate: order.orderDate || order.order_date || order.created_at,
        order_type: order.order_type || order.orderType || "Sales",
        customer: order.customer || order.customer_name || "",
        status: order.status || "Draft",
        priority: order.priority || "Normal",
        expected_delivery_date: order.expected_delivery_date || order.expectedDeliveryDate || "",
        deliveryStatus: order.deliveryStatus || order.delivery_status || "Awaiting",
        // Add more if needed
        shippingAddress:
          order.shippingAddress ||
          order.shipping_address ||
          order.shipping_address_line1 ||
          "",
      }));

      console.log("🟣 FINAL NORMALIZED ORDERS ARRAY:", data);

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ FETCH ERROR:", error);
      setOrders([]);
    }
  };

  useEffect(() => {
    console.log("FETCHING CUSTOMERS...");
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => {
        console.log("API RESPONSE:", data);
        setCustomers(data);
      });
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);


  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();

      console.log("API RESPONSE11:", data);

      setCustomers(data.data || data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const deleteRegularTemplate = async (id: string) => {
    try {
      await axios.delete(`/api/regular-template/${id}`);

      setRegularOrders((prev) =>
        prev.filter((item) => item.id !== id)
      );

      toast({
        title: "Template deleted",
        description: "Regular order template removed successfully.",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || error.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };



  const runValidation = () => {
    setValidationRun(true);
    toast({ title: "Validation complete", description: "Stock and MRP recommendations are up to date." });
  };



  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    const search = (searchTerm || "").toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        (order?.customer || "").toLowerCase().includes(search) ||
        (order?.order_no || "").toString().toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || order?.status === statusFilter;

      const matchesType =
        typeFilter === "all" || order?.order_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [orders, searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (mainTab === "orders") {
      fetchOrders();
    }
  }, [mainTab]);

  const sortedOrders = useMemo(() => {
    const data = [...filteredOrders];

    data.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "date":
          aValue = new Date(a.orderDate).getTime();
          bValue = new Date(b.orderDate).getTime();
          break;

        case "order_no":
          // SO-2026-00004 → extract number
          aValue = Number(String(a.order_no || a.id).split("-").pop());
          bValue = Number(String(b.order_no || b.id).split("-").pop());
          break;

        case "customer":
          aValue = a.customer?.toLowerCase();
          bValue = b.customer?.toLowerCase();
          break;

        case "amount":
          aValue = (a.items || []).reduce((s, i) => s + Number(i.total_amount || 0), 0);
          bValue = (b.items || []).reduce((s, i) => s + Number(i.total_amount || 0), 0);
          break;

        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredOrders, sortField, sortDirection]);

  const selectedCloneOrder = useMemo(
    () => orders.find((order) => order.id === selectedCloneId) || orders[orders.length - 1] || null,
    [orders, selectedCloneId],
  );

  const pendingOrders = useMemo(
    () => orders.filter((order) => ["Confirmed", "Processing"].includes(order.status)),
    [orders],
  );

  const validationRows = useMemo(() => {
    return pendingOrders.flatMap((order) =>
      (order.items ?? []).map((item) => {
        const assessment = getLineAssessment(item);
        return { order, item, assessment };
      }),
    );
  }, [pendingOrders, inventoryItems]);

  const purchaseNeeds = useMemo(() => {
    return validationRows.filter(({ item, assessment }) => {
      const type = normalizeItemType(item.itemType || assessment.inventory?.item_type);
      return assessment.gap > 0 && type !== "Product";
    });
  }, [validationRows]);

  const excessRows = useMemo(() => {
    const demandMap = new Map<string, number>();
    orders.filter((order) => order.status !== "Cancelled").forEach((order) => {
      (order.items ?? []).forEach((item) => {
        demandMap.set(item.itemCode, (demandMap.get(item.itemCode) || 0) + integer(item.quantityOrdered));
      });
    });

    return (Array.isArray(inventoryItems) ? inventoryItems : [])
      .map((inventory) => {
        const code = inventory.item_code;
        const available = getAvailableStock(code);
        const netOrders = demandMap.get(code) || 0;
        const excessQty = available - netOrders;
        return {
          code,
          name: inventory.item_name,
          type: normalizeItemType(inventory.item_type),
          available,
          allocated: integer(inventory.allocated_quantity || 0),
          netOrders,
          excessQty,
          excessValue: excessQty * Number(inventory.unit_cost || 0),
        };
      })
      .filter((row) => row.excessQty > 0)
      .sort((a, b) => b.excessQty - a.excessQty);
  }, [inventoryItems, orders]);

  const dashboardStats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const monthOrders = orders.filter((order) => {
      if (!order.orderDate) return false;
      return String(order.orderDate).startsWith(currentMonth);
    });

    const orderValue = monthOrders.reduce((sum, order) => {
      const itemsTotal = (order.items || []).reduce((itemSum, item) => {
        return itemSum + (Number(item.total_amount) || 0);
      }, 0);

      return sum + itemsTotal;
    }, 0);

    const overdue = orders.filter(
      (order) =>
        order.expectedDispatchDate &&
        order.expectedDispatchDate < todayISO() &&
        !["Delivered", "Cancelled"].includes(order.status)
    );

    return {
      monthOrders: monthOrders.length,
      orderValue,
      pendingDelivery: orders.filter(
        (order) => !["Delivered", "Cancelled"].includes(order.deliveryStatus)
      ).length,
      overdue: overdue.length,
    };
  }, [orders]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);

    // default behavior per column
    setSortDirection(field === "order_no" ? "desc" : "asc");
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const exportOrders = () => {
    const rows = filteredOrders.map((order) => ({
      "Order ID": order?.order_no || "",
      Customer: order?.customer || "",
      "Order Date": order?.order_date || order?.orderDate || "",

      "Order Type": order?.order_type || order?.orderType || "",
      Priority: order?.priority || "",
      Status: order?.status || "",
      "Delivery Status": order?.deliveryStatus || "",

      // ✅ FIX: correct total field mapping
      Total: (order?.items || []).reduce(
        (sum, item) =>
          sum + Number(item?.total_amount || item?.totalAmount || 0),
        0
      ),

      Items: (order?.items || []).length || 0,
      Location: order?.location || "",
    }));

    console.log("Export Rows:", rows);

    // your CSV/Excel logic continues here...


    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `orders_${todayISO()}.xlsx`);
    toast({ title: "Exported", description: "Orders exported successfully." });
  };


  const exportPurchaseNeeds = () => {
    const rows = purchaseNeeds.map(({ order, item, assessment }) => ({
      item_code: item.item_code,
      item_name: item.item_name,
      order_no: order.order_no,
      required: assessment.quantity,
      available: assessment.available,
      to_purchase: assessment.gap,
      estimated_cost:
        assessment.gap *
        Number(assessment.inventory?.unit_cost || item.rate || 0),
      urgency: order.priority,

    }));

    const headers = Object.keys(rows[0] || {});

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "purchase-needs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printOrder = (order: any) => {
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) return;

    const itemsHtml = (order.items || [])
      .map((item: any) => {
        const assessment = getLineAssessment?.(item);

        return `
        <tr>
          <td>
            <div class="item-code">${item.item_code || "-"}</div>
            <div class="item-name">${item.item_name || ""}</div>
          </td>
          <td class="right">${item.quantity || 0}</td>
          <td class="right">
          ${item.delivered_qty ?? 0}
        </td>
          <td class="right">${formatPrintMoney(Number(item.rate || 0))}</td>

<td class="right">${formatPrintMoney(Number(item.total_amount || 0))}</td>
          <td class="center">${assessment?.label || "Stock OK"}</td>
        </tr>
      `;
      })
      .join("");

    printWindow.document.write(`
    <html>
      <head>
        <title>${order.order_no}</title>
        <style>
          @page {
            margin: 16mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #111;
            margin: 0;
            padding: 0;
            background: #fff;
          }

          .container {
            padding: 24px;
          }

          /* HEADER */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #eee;
            padding-bottom: 12px;
          }

          .title {
            font-size: 20px;
            font-weight: 700;
          }

          .sub {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
          }

          /* META GRID */
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 16px;
          }

          .box {
            border: 1px solid #eee;
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
          }

          .label {
            font-size: 11px;
            color: #777;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .value {
            font-weight: 600;
          }

          /* TABLE */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 18px;
          }

          th {
            background: #f6f6f6;
            text-align: left;
            font-size: 12px;
            padding: 10px;
            border: 1px solid #eee;
          }

          td {
            padding: 10px;
            border: 1px solid #eee;
            font-size: 13px;
            vertical-align: top;
          }

          .right {
            text-align: right;
          }

          .center {
            text-align: center;
          }

          .item-code {
            font-weight: 700;
            font-size: 12px;
            color: #2563eb;
          }

          .item-name {
            font-size: 12px;
            color: #555;
            margin-top: 2px;
          }

          /* FOOTER TOTAL */
          .total {
            margin-top: 14px;
            text-align: right;
            font-size: 16px;
            font-weight: 700;
          }

          /* BADGE STYLE */
          .badge {
            display: inline-block;
            padding: 4px 8px;
            font-size: 11px;
            border-radius: 4px;
            background: #f3f4f6;
          }
        </style>
      </head>

      <body>
        <div class="container">

          <!-- HEADER -->
          <div class="header">
            <div>
              <div class="title">${order.order_no}</div>
              <div class="sub">Order Booking Document</div>
            </div>
            <div class="sub">
              Generated: ${new Date().toLocaleString()}
            </div>
          </div>

          <!-- META -->
          <div class="grid">
            <div class="box">
              <div class="label">Customer</div>
              <div class="value">${order.customer || "-"}</div>
              <div>${order.contact_person || ""}</div>
              <div>${order.contact_number || ""}</div>
            </div>

            <div class="box">
              <div class="label">Order Info</div>
              <div><b>Type:</b> ${order.order_type || "Sales"}</div>
              <div><b>Status:</b> ${order.status}</div>
              <div><b>Priority:</b> ${order.priority}</div>
            </div>

            <div class="box">
              <div class="label">Delivery</div>
              <div><b>Dispatch:</b> ${order.expected_delivery_date || "-"}</div>
              <div><b>Mode:</b> ${order.dispatch_mode || "-"}</div>
            </div>

            <div class="box">
              <div class="label">Summary</div>
              <div>Total Items: ${(order.items || []).length}</div>
            </div>
          </div>

          <!-- ITEMS -->
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                 <th class="right">Delivered Qty</th>
                <th class="right">Rate</th>
                <th class="right">Amount</th>
                <th class="center">Stock</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

        </div>

        <script>
          window.onload = function () {
            window.print();
            window.onafterprint = function () {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);

    printWindow.document.close();
  };

  const handleOrderStatusChange = async (
    orderId: string,
    nextStatus: string
  ) => {
    const current = orders.find((order) => order.id === orderId);
    if (!current) return;

    try {
      /**
       * =========================
       * 1️⃣ CONFIRM ORDER → ALLOCATE STOCK
       * =========================
       */
      if (current.status !== "Confirmed" && nextStatus === "Confirmed") {
        for (const item of current.items) {
          const itemCode = item.itemCode || item.item_code;

          if (!itemCode) {
            console.warn("Skipping item (missing itemCode):", item);
            continue;
          }

          const qty = Number(item.quantity || item.quantityOrdered || 0);
          if (qty <= 0) continue;

          const unitCost = Number(
            item.unitCost || item.unit_cost || item.rate || 0
          );
          // ✅ Allocate stock (CORRECT API YOU ALREADY HAVE)
          await axios.post("/api/inventory-stock/allocate", {
            itemCode: itemCode,
            quantity: qty,
          });

          // ✅ Stock transaction log
          await axios.post("/api/stock-transactions", {
            item_code: itemCode,
            transaction_type: "Order Allocation",
            quantity: qty,
            unit_cost: unitCost,
            reference_type: "Order",
            reference_number: current.order_no,
            notes: `Stock allocated for order ${current.order_no}`,
          });
        }
      }

      /**
       * =========================
       * 2️⃣ CONFIRMED → PROCESSING
       * =========================
       */
      if (current.status === "Confirmed" && nextStatus === "Processing") {
        for (const item of current.items) {
          const itemCode = item.itemCode || item.item_code;

          if (!itemCode) continue;

          const qty = Number(item.quantity || item.quantityOrdered || 0);

          console.log("Processing stage reached for:", itemCode, qty);
        }
      }

      /**
       * =========================
       * 3️⃣ UPDATE ORDER STATUS
       * =========================
       */
      await axios.put(`/api/orders/${orderId}/status`, {
        status: nextStatus,
      });

      /**
       * =========================
       * 4️⃣ UI UPDATE
       * =========================
       */
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status: nextStatus }
            : order
        )
      );

      toast({
        title: "Status updated",
        description: `${current.order_no} is now ${nextStatus}.`,
      });

    } catch (error: any) {
      console.error("Error updating order status:", error);

      /**
       * =========================
       * 5️⃣ FALLBACK
       * =========================
       */
      if (error?.response?.status === 405) {
        try {
          await axios.post(`/api/orders/update-status`, {
            orderId,
            status: nextStatus,
          });

          setOrders((prev) =>
            prev.map((order) =>
              order.id === orderId
                ? { ...order, status: nextStatus }
                : order
            )
          );

          toast({
            title: "Status updated (fallback)",
            description: `${current.order_no} is now ${nextStatus}.`,
          });

          return;
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
        }
      }

      toast({
        title: "Error",
        description: "Failed to update order status.",
      });
    }
  };

  const calculateNextOrderDate = (currentDate: string, frequency: string) => {
    const date = new Date(currentDate);

    switch (frequency) {
      case "Weekly":
        date.setDate(date.getDate() + 7);
        break;

      case "Fortnightly":
        date.setDate(date.getDate() + 14);
        break;

      case "Monthly":
        date.setMonth(date.getMonth() + 1);
        break;

      case "Quarterly":
        date.setMonth(date.getMonth() + 3);
        break;

      default:
        return currentDate;
    }

    return date.toISOString().split("T")[0];
  };


  const startClone = (order: Order) => {
    setSelectedCloneId(order.id);
    setWorkspaceView("clone");
  };

  const cloneIntoComposer = async (row: any) => {
    const newSONumber = await generateSONumber();

    // 🔥 normalize order source
    const order = row?.items ? row : row?.data ? row.data[0] : row;

    console.log("CLONING ORDER:", order);

    setFormData({
      customerId: order.customer_id ?? "",
      customerName: order.customer ?? order.customer_name ?? "",

      customerCode: "",
      contactPerson: order.contact_person ?? "",
      contactNumber: order.contact_number ?? "",
      email: order.email ?? "",

      billingAddress: order.billing_address ?? "",
      shippingAddress: order.shipping_address ?? "",

      orderNo: newSONumber || `SO-${Date.now()}`,
      orderDate: todayISO(),

      expectedDeliveryDate:
        order.expected_delivery_date || order.order_date,

      orderType: order.order_type ?? "",
      referenceNo: order.reference_no ?? "",
      priority: order.priority ?? "",
      remarks: order.remarks ?? "",

      dispatchMode: order.dispatch_mode ?? "",
      transporterName: order.transporter_name ?? "",
      vehicleNo: order.vehicle_no ?? "",
      expectedDispatchDate: order.expected_dispatch_date ?? "",

      deliveryStatus: "Awaiting",
      warehouseLocation: order.warehouse_location ?? "",
      location: order.location ?? "",

      paymentType: order.payment_type ?? "",
      paymentTerms: order.payment_terms ?? "",

      advanceAmount: Number(order.advance_amount ?? 0),
      balanceAmount: Number(order.balance_amount ?? 0),
      invoiceRequired: order.invoice_required ?? 0,
    });

    // 🔥 FIX: MULTIPLE ITEMS SUPPORT
    const items = (order.items && order.items.length > 0)
      ? order.items
      : [
        {
          item_code: order.item_code,
          item_name: order.item_name,
          item_type: order.item_type,
          uom: order.uom,
          quantity: order.quantity,
          rate: order.rate,
          tax: order.tax,
          total_amount: order.total_amount,
          available_stock: Number(order.available_stock ?? 0),
        },
      ];

    const fetchBomByItemCode = async (itemCode: string) => {
      try {
        const res = await axios.get(`/api/bom-component`, {
          params: { item_code: itemCode }
        });

        const data = res.data;

        if (Array.isArray(data)) return data;
        if (data && typeof data === "object") return Object.values(data).flat();

        return [];
      } catch (err) {
        console.error("BOM API ERROR:", err);
        return [];
      }
    };

    const itemsWithBom = await Promise.all(
      items.map(async (item: any) => {
        console.log("ITEM:", item.item_code);

        const bomComponents = item.item_code
          ? await fetchBomByItemCode(item.item_code)
          : [];

        console.log("BOM RESULT:", item.item_code, bomComponents);

        return {
          id: crypto.randomUUID(),
          itemCode: item.item_code,
          itemName: item.item_name,
          itemType: item.item_type,
          quantityOrdered: Number(item.quantity ?? 0),
          uom: item.uom ?? "",
          rate: Number(item.rate ?? 0),
          tax: Number(item.tax ?? 0),
          totalAmount: Number(item.total_amount ?? 0),
          availableStock: Number(item.available_stock ?? 0),

          bomComponents: Array.isArray(bomComponents)
            ? bomComponents.map((c: any) => ({
              component: c.component,
              description: c.description,
              type: c.type,
              requiredQty: Number(
                c.requiredQty ??
                c.required_qty ??
                c.qty_required ??
                c.quantity ??
                0
              ),
            }))
            : [],

          discount: Number(item.discount ?? 0),
        };
      })
    );
    setLineItems(itemsWithBom);
    setWorkspaceView("new");

    toast({
      title: "Order cloned",
      description: `${order.order_no ?? "Order"} copied into the composer.`,
    });
  };

  const createRegularTemplate = async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);

    try {

      const inventory = getInventoryRecord(regularForm.itemCode);

      if (!regularForm.customer || !regularForm.itemCode) {
        toast({
          title: "Missing fields",
          description: "Customer and product are required.",
          variant: "destructive",
        });

        return;
      }

      const payload = {
        template_number: generateRegularNumber(),
        customer: regularForm.customer,
        customer_id: regularForm.customer_id,
        item_code: inventory?.item_code || regularForm.itemCode,
        item_name: inventory?.item_name || regularForm.itemName,
        quantity: Number(regularForm.quantity),
        frequency: regularForm.frequency,
        next_order_date: regularForm.nextOrderDate,
        price: Number(regularForm.price || inventory?.unit_cost || 0),
      };


      const res = await axios.post("/api/regular-template", payload);

      const data = res.data;

      setRegularOrders((prev) => [
        {
          id: data.data.id,
          templateNumber: data.data.template_number,
          customer: data.data.customer,
          itemCode: data.data.item_code,
          itemName: data.data.item_name,
          quantity: data.data.quantity,
          frequency: data.data.frequency,
          nextOrderDate: data.data.next_order_date,
          lastOrdered: "—",
          status: data.data.status,
          price: data.data.price,
        },
        ...prev,
      ]);

      await fetchRegularOrders();

      setRegularDialogOpen(false);

      setRegularForm({
        customer: "",
        itemCode: "",
        quantity: 1,
        frequency: "Weekly",
        nextOrderDate: todayISO(),
        price: 0,
      });

      toast({
        title: "Template created",
        description: "Regular order template saved successfully.",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || error.message || "Failed to create template",
        variant: "destructive",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };


  const fireRegularOrder = async (template: RegularOrderTemplate) => {
    const inventory = getInventoryRecord(template.item_code);

    const quantity = integer(template.quantity);
    const rate = Number(template.price || inventory?.unit_cost || 0);
    const gstMultiplier = 1.18;

    const customerData = customers.find(
      (c) => c.id === template.customer_id
    );

    const orderPayload = {
      order_date: todayISO(),
      order_type: "Regular",

      customer: template.customer,

      // FIXED: safe customer_id
      customer_id: template.customer_id || template.customerId,

      contact_person:
        customerData?.contact_person ??
        customerData?.contactPerson ??
        "",

      contact_number:
        customerData?.contact_number ??
        customerData?.phone ??
        customerData?.mobile ??
        "",

      email:
        customerData?.email ??
        customerData?.customer_email ??
        "",

      location: customerData?.city ??
        customerData?.customer_city ??
        "",
      dispatch_mode: "Courier",

      expected_delivery_date: template.next_order_date,
      billingAddress: "",
      shipping_address: String(
        template.shipping_address ||
        (template as any).shippingAddress ||
        customerData?.shipping_address ||
        customerData?.shippingAddress ||
        customerData?.shipping_address_line1 ||
        customerData?.address ||
        ""
      ),
      referenceNo: "",
      priority: "Normal",

      remarks: `Auto-generated from ${template.template_number ?? template.id}`,

      items: [
        {
          item_code: template.item_code,
          item_name: template.item_name,
          item_type:
            inventory?.item_type ??
            inventory?.category ??
            inventory?.type ??
            "",
          tax:
            inventory?.tax ??
            inventory?.gst ??
            18,

          // FIXED: backend expects "quantity"
          quantity: quantity,

          rate,
          available_stock: Number(getAvailableStock(template.item_code) ?? 0),
          stockValidated: getAvailableStock(template.item_code) >= quantity,

          total_amount: quantity * rate * gstMultiplier,
        },
      ],

      dispatchMode: "Courier",
      transporterName: "",
      vehicleNo: "",
      expectedDispatchDate: template.next_order_date,

      deliveryStatus: "Awaiting",
      warehouseLocation: "",


      paymentType: "Credit",
      payment_terms: "Net 30 days",
      advanceAmount: 0,
      balanceAmount: quantity * rate * gstMultiplier,

      invoiceRequired: "1",
      status: "Awaiting Confirmation",
    };

    try {

      console.log("========== TEMPLATE ==========");
      console.log(template);

      console.log("========== ORDER PAYLOAD ==========");
      console.log(orderPayload);
      // 1. CREATE ORDER
      const { data: createdOrder } = await axios.post("/api/orders", orderPayload);

      await fetchOrders();

      // 2. UPDATE TEMPLATE (FIXED FIELD NAMES)
      const nextDate = calculateNextOrderDate(
        template.next_order_date || todayISO(),
        template.frequency
      );

      await axios.put(`/api/regular-template/${template.id}`, {
        last_ordered: todayISO(),
        next_order_date: nextDate,
      });

      // 3. UPDATE UI STATE
      setRegularOrders((prev) =>
        prev.map((item) =>
          item.id === template.id
            ? {
              ...item,
              lastOrdered: todayISO(),      // UI field
              nextOrderDate: nextDate,      // UI field
            }
            : item
        )
      );

      await fetchRegularOrders();

      toast({
        title: "Regular order created",
        description: `${template.template_number ?? "Template"} generated a new order.`,
      });
    } catch (error: any) {
      console.error("ORDER ERROR:", error?.response?.data);

      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to generate regular order",
      });
    }
  };


  const openRFQ = (item: LineItem, shortage: number) => {
    setRfqItem({
      item_code: item.itemCode,
      item_name: item.itemName,
      description: item.itemName,
      quantity: integer(shortage),
    });
    setRfqDialogOpen(true);
  };

  useEffect(() => {
    if (location.state?.autoCreateOrder && location.state?.orderData && location.state?.lineItems) {
      const { orderData, lineItems: returnedLineItems, bomData } = location.state;
      setFormData(orderData);
      setLineItems(returnedLineItems);
      toast({ title: "BOM ready", description: `BOM ${bomData.itemCode} added back to this order.` });
      window.history.replaceState({}, document.title);
      setWorkspaceView("new");
    }
  }, [location.state]);

  const counts = {
    orders: orders.length,
    regular: regularOrders.length,
    purchase: purchaseNeeds.length,
  };

  const recentOrders = [...orders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 5);

  const renderValidationBadge = (state: ValidationState, label: string = "Unknown") => {
    const safeState: ValidationState =
      ["available", "partial", "purchase", "produce", "missing"].includes(state as any)
        ? (state as ValidationState)
        : "missing";

    const safeLabel = (label || "—").toString().trim();

    const classes: Record<ValidationState, string> = {
      available: "border-success/20 bg-success/10 text-success",
      partial: "border-warning/20 bg-warning/10 text-warning",
      purchase: "border-primary/20 bg-primary/10 text-primary",
      produce: "border-accent/20 bg-accent/10 text-accent",
      missing: "border-border bg-muted text-muted-foreground",
    };

    return (
      <span className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        classes[safeState]
      )}>
        {safeLabel}
      </span>
    );
  };

  const renderWorkspaceSidebar = () => (
    <aside className="w-full border-b border-border bg-card lg:w-64 lg:border-b-0 lg:border-r">
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">Order Booking</h2>
        <p className="mt-1 text-xs text-muted-foreground">Sales planning, validation, purchasing, and follow-up in one workspace.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible lg:px-3 lg:pb-4">
        {ORDER_VIEWS.map((view) => {
          const Icon = view.icon;
          const active = workspaceView === view.id;
          const count = view.countKey ? counts[view.countKey as keyof typeof counts] : undefined;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setWorkspaceView(view.id)}
              className={cn(
                "flex min-w-fit items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors lg:w-full",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 whitespace-nowrap">{view.label}</span>
              {typeof count === "number" && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );

  const renderComposer = () => (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-portal-fieldset px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Order Header</h3>
              <p className="mt-1 text-xs text-muted-foreground">Customer, delivery commitment, commercial terms.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground">{formData.orderNo}</span>
              <Select
                value={formData.orderType}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, orderType: value }));
                  setLineItems((prev) =>
                    prev.map((item) => (item.itemCode ? item : { ...item, itemType: getDefaultItemType(value) })),
                  );
                }}
              >
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Sample">Sample</SelectItem>
                  <SelectItem value="Export">Export</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="space-y-2">
              <label>Customer Name *</label>

              <select
                className="w-full border rounded px-3 py-2"
                value={formData.customerId}   // 🔥 ADD THIS
                onChange={(e) => {
                  console.log("SELECTED ID:", e.target.value);
                  applyCustomerSelection(Number(e.target.value));
                }}
              >
                <option value="">Select customer</option>

                {customers?.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Customer PO #</Label>
              <Input value={formData.referenceNo} onChange={(event) => setFormData((prev) => ({ ...prev, referenceNo: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input type="date" value={formData.orderDate} onChange={(event) => setFormData((prev) => ({ ...prev, orderDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Required Delivery Date *</Label>
              <Input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, expectedDeliveryDate: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select value={formData.paymentTerms} onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentTerms: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 30 days">Net 30 days</SelectItem>
                  <SelectItem value="Net 45 days">Net 45 days</SelectItem>
                  <SelectItem value="Net 60 days">Net 60 days</SelectItem>
                  <SelectItem value="Advance">Advance</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={formData.contactPerson} onChange={(event) => setFormData((prev) => ({ ...prev, contactPerson: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input value={formData.contactNumber} onChange={(event) => setFormData((prev) => ({ ...prev, contactNumber: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={formData.location} onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Delivery Address/Notes</Label>
              <Textarea value={formData.shippingAddress} onChange={(event) => setFormData((prev) => ({ ...prev, shippingAddress: event.target.value }))} rows={3} />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-portal-fieldset px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Order Line Items</h3>
              <p className="mt-1 text-xs text-muted-foreground">Add products or materials, then validate stock and MRP actions.</p>
            </div>
            <Button size="sm" onClick={addLineItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
          <div className="overflow-x-auto p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead className="min-w-[120px]">Type</TableHead>
                  <TableHead className="min-w-[170px]">Item Code</TableHead>
                  <TableHead className="min-w-[220px]">Item Name</TableHead>
                  <TableHead className="min-w-[110px]">Qty</TableHead>
                  <TableHead className="min-w-[110px]">UOM</TableHead>
                  <TableHead className="min-w-[110px]">Rate</TableHead>
                  <TableHead className="min-w-[90px]">Tax %</TableHead>
                  <TableHead className="w-[130px] text-right">Amount</TableHead>
                  <TableHead className="min-w-[150px]">Stock Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => {
                  const assessment = getLineAssessment(item);

                  const filteredInventory = safeInventoryItems.filter((inv: any) => {
                    if (item.itemType === "Material") return inv.itemCode.startsWith("MAT");
                    if (item.itemType === "Product") return inv.itemCode.startsWith("PRD");
                    if (item.itemType === "Component") return inv.itemCode.startsWith("CMP"); // adjust if needed
                    return true;
                  });

                  return (
                    <TableRow key={item.id || item.item_code}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <Select
                          key={`${item.id}-${item.itemType}`}
                          value={item.itemType}
                          onValueChange={(value) => {
                            setLineItems(prev =>
                              prev.map(li =>
                                li.id === item.id
                                  ? {
                                    ...li,
                                    itemType: value,

                                    // reset everything dependent
                                    itemCode: "",
                                    item_code: "",
                                    itemName: "",
                                    rate: 0,
                                    available: 0,
                                    quantityOrdered: 1,
                                    bomComponents: [],
                                    noBOM: false,
                                    bomLoading: false,
                                    totalAmount: 0,
                                  }
                                  : li
                              )
                            );
                          }}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Material">Material</SelectItem>
                            <SelectItem value="Product">Product</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.itemCode || ""}
                          onValueChange={async (value) => {
                            const selected = safeInventoryItems.find(
                              (inv: any) => inv.itemCode === value
                            );

                            updateLineItem(item.id, "itemCode", value);
                            updateLineItem(item.id, "item_code", value);
                            updateLineItem(item.id, "itemName", selected?.itemName || "");
                            updateLineItem(item.id, "uom", selected?.uom || "pcs");
                            updateLineItem(item.id, "rate", selected?.unit_cost || 0);

                            updateLineItem(item.id, "available", selected?.available_quantity || 0);


                            // ✅ mark loading
                            updateLineItem(item.id, "bomLoading", true);

                            // ✅ fetch BOM properly
                            const { components, noBOM } = await fetchBOMComponents(
                              value,
                              item.quantityOrdered || 1
                            );

                            const enrichedComponents = components.map((c: any) => ({
                              ...c,
                              uom: selected?.uom || "",
                            }));

                            updateLineItem(item.id, "bomComponents", components);
                            updateLineItem(item.id, "noBOM", noBOM);
                            updateLineItem(item.id, "bomLoading", false);
                          }}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select Item Code" />
                          </SelectTrigger>

                          <SelectContent>
                            {filteredInventory.map((inventory: any) => (
                              <SelectItem
                                key={inventory.id}
                                value={inventory.itemCode}
                              >
                                {inventory.itemCode}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                      </TableCell>
                      <TableCell>
                        <Input value={item.itemName} onChange={(event) => updateLineItem(item.id, "itemName", event.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          min={1}
                          value={item.quantityOrdered}
                          onChange={(event) => updateLineItem(item.id, "quantityOrdered", Number(event.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input value={item.uom} onChange={(event) => updateLineItem(item.id, "uom", event.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          value={item.rate}
                          onChange={(event) => updateLineItem(item.id, "rate", Number(event.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="text-right"
                          value={item.tax}
                          onChange={(event) => updateLineItem(item.id, "tax", Number(event.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground"> <Money value={item.totalAmount || 0} /></TableCell>
                      <TableCell>
                        {renderValidationBadge(assessment.state, assessment.label)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} disabled={lineItems.length === 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {lineItems.some((item) => item.itemType === "Product" && item.itemCode) && (
            <div className="space-y-4 border-t px-5 py-5">
              {lineItems
                .filter((item) => item.itemType === "Product" && item.itemCode)
                .map((item) => (
                  <div key={`${item.id}-bom`} className="rounded-md border bg-background">
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">{item.itemCode} BOM</div>
                        <div className="text-xs text-muted-foreground">Component availability rolls with order quantity.</div>
                      </div>
                      {!item.noBOM && item.bomComponents && item.bomComponents.length > 0 && (
                        <Badge variant="outline">{item.bomComponents.length} components</Badge>
                      )}
                    </div>
                    {item.bomLoading ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">Loading BOM components…</div>
                    ) : item.noBOM ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          No BOM is defined for this product.
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/bom", { state: { itemCode: item.itemCode, itemName: item.itemName } })}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Create BOM
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Component</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Available</TableHead>
                              <TableHead className="text-right">Required</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(item.bomComponents || []).map((component) => {
                              const inventory = getInventoryRecord(component.component);

                              const available = getAvailableStock(component.component);
                              const required = Number(component.requiredQty || 0);

                              return (
                                <TableRow key={`${item.id}-${component.component}`}>
                                  <TableCell className="font-mono text-xs">
                                    {component.component}
                                  </TableCell>

                                  <TableCell>{component.description}</TableCell>

                                  <TableCell>{component.type}</TableCell>

                                  {/* AVAILABLE */}
                                  <TableCell className="text-right">
                                    {available}
                                  </TableCell>

                                  {/* REQUIRED + STATUS */}
                                  <TableCell className="text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <span>{required}</span>
                                      {available < required && (
                                        <Badge variant="outline" className="border-warning/20 bg-warning/10 text-warning">
                                          Low
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          <div className="border-t px-5 py-5">
            <div className="rounded-lg border bg-portal-fieldset p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono"> <Money value={totalSummary.subtotal || 0} /></span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span className="font-mono"><Money value={totalSummary.taxAmount || 0} /></span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span className="font-mono"> <Money value={totalSummary.total || 0} /></span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={resetComposer}>
                  Reset
                </Button>

                {/* ❌ Hide Draft in edit mode */}
                {!isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => createOrderFromComposer("Draft")}
                    disabled={isSubmitting}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                )}

                <Button
                  onClick={() =>
                    createOrderFromComposer(
                      isEditing ? "Updated" : "Awaiting Confirmation"
                    )
                  }
                  disabled={isSubmitting}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Order" : "Submit Order"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b bg-portal-fieldset px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Stock Validation</h3>
              <p className="mt-1 text-xs text-muted-foreground">Availability after allocations, shortages, and next action.</p>
            </div>

          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-success/20 bg-success/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-success">Available</div>
                <div className="mt-1 text-2xl font-semibold text-success">{validationMetrics.available}</div>
              </div>
              <div className="rounded-md border border-warning/20 bg-warning/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-warning">Partial</div>
                <div className="mt-1 text-2xl font-semibold text-warning">{validationMetrics.partial}</div>
              </div>
              <div className="rounded-md border border-primary/20 bg-primary/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-primary">Buy</div>
                <div className="mt-1 text-2xl font-semibold text-primary">{validationMetrics.purchase}</div>
              </div>
              <div className="rounded-md border border-accent/20 bg-accent/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-accent">Produce</div>
                <div className="mt-1 text-2xl font-semibold text-accent">{validationMetrics.produce}</div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {lineAssessments.map(({ item, assessment }) => (
                <div key={`val-${item.id}`} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{item.itemName || item.itemCode || "New line item"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Ordered {assessment.quantity} •
                        Available <span className="font-medium text-foreground">{assessment.available}</span> •
                        Gap <span className={assessment.gap > 0 ? "text-destructive" : ""}>{assessment.gap}</span>
                      </div>
                    </div>
                    {renderValidationBadge(assessment.state, assessment.label)}
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        assessment.state === "available" && "bg-success",
                        assessment.state === "partial" && "bg-warning",
                        assessment.state === "purchase" && "bg-primary",
                        assessment.state === "produce" && "bg-accent",
                        assessment.state === "missing" && "bg-border",
                      )}
                      style={{ width: `${assessment.quantity ? Math.min(100, Math.max(0, (assessment.available / assessment.quantity) * 100)) : 0}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{assessment.action}</span>
                    {assessment.state === "purchase" && assessment.gap > 0 && (
                      <Button variant="outline" size="sm" onClick={() => openRFQ(item, assessment.gap)}>
                        Buy
                      </Button>
                    )}
                    {assessment.state === "produce" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/bom", { state: { itemCode: item.itemCode, itemName: item.itemName } })}
                      >
                        Open BOM
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b bg-portal-fieldset px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">MRP Recommendation</h3>
            <p className="mt-1 text-xs text-muted-foreground">Recommended next steps from the current order mix.</p>
          </div>
          <div className="space-y-3 px-5 py-4 text-sm">
            {validationRun || lineItems.some((item) => item.itemCode) ? (
              <>
                {validationMetrics.available > 0 && (
                  <div className="rounded-md border border-success/20 bg-success/10 px-3 py-2 text-success">
                    {validationMetrics.available} item(s) can be fulfilled immediately from stock.
                  </div>
                )}
                {validationMetrics.purchase > 0 && (
                  <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-primary">
                    Raise RFQ / purchase action for {validationMetrics.purchase} material line(s).
                  </div>
                )}
                {validationMetrics.produce > 0 && (
                  <div className="rounded-md border border-accent/20 bg-accent/10 px-3 py-2 text-accent">
                    Review BOM and release production for {validationMetrics.produce} product line(s).
                  </div>
                )}
                {validationMetrics.partial > 0 && (
                  <div className="rounded-md border border-warning/20 bg-warning/10 px-3 py-2 text-warning">
                    Partial fulfillment detected — split dispatch or expedite replenishment.
                  </div>
                )}
                {validationMetrics.available + validationMetrics.partial + validationMetrics.purchase + validationMetrics.produce === 0 && (
                  <div className="rounded-md border bg-background px-3 py-2 text-muted-foreground">Add valid lines to see recommendations.</div>
                )}
              </>
            ) : (
              <div className="rounded-md border bg-background px-3 py-2 text-muted-foreground">Validate items to see MRP recommendations.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  const renderAllOrders = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Orders", value: orders.length, tone: "primary" },
          { label: "Awaiting", value: orders.filter((order) => order.status === "Awaiting Confirmation").length, tone: "warning" },
          { label: "Confirmed", value: orders.filter((order) => order.status === "Confirmed").length, tone: "accent" },
          { label: "Cancelled", value: orders.filter((order) => order.status === "Cancelled").length, tone: "destructive" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{metric.label}</div>
            <div className={cn(
              "mt-2 text-2xl font-semibold",
              metric.tone === "primary" && "text-primary",
              metric.tone === "warning" && "text-warning",
              metric.tone === "accent" && "text-accent",
              metric.tone === "success" && "text-success",
              metric.tone === "destructive" && "text-destructive",
            )}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search orders or customers" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["Draft", "Awaiting Confirmation", "Confirmed", "Delivered", "Cancelled"].map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Array.from(new Set(orders.map((order) => order.order_type))).filter(Boolean).map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportOrders}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export
        </Button>

        <Button onClick={() => setWorkspaceView("new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44px]">
                  <Checkbox
                    checked={
                      selectedOrderIds.size > 0 &&
                      selectedOrderIds.size === sortedOrders.length
                    }
                    onCheckedChange={(checked) =>
                      setSelectedOrderIds(checked ? new Set(sortedOrders.map((order) => order.id)) : new Set())
                    }
                  />
                </TableHead>
                <TableHead>
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => handleSort("order_no")}
                  >
                    Order # {sortIcon("order_no")}
                  </button>
                </TableHead>
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => handleSort("customer")}>Customer {sortIcon("customer")}</button>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => handleSort("amount")}>Total {sortIcon("amount")}</button>
                </TableHead>
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => handleSort("status")}>Status {sortIcon("status")}</button>
                </TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">No orders found.</TableCell>
                </TableRow>
              ) : (
                sortedOrders.map((order) => {
                  const orderTotal =
                    Array.isArray(order.items)
                      ? order.items.reduce(
                        (sum, item) => sum + (Number(item.total_amount) || 0),
                        0
                      )
                      : 0;
                  const selected = selectedOrderIds.has(order.id);
                  return (
                    <TableRow key={order.id} data-state={selected ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) =>
                            setSelectedOrderIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(order.id);
                              else next.delete(order.id);
                              return next;
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-primary">
                        {getOrderField(order, "order_no") || getOrderField(order, "id")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.customer}</div>
                        <div className="text-xs text-muted-foreground">{new Date(order.orderDate).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>{order.order_type}</TableCell>
                      <TableCell className="text-right">
                        {(order.items ?? []).length}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">  <Money value={orderTotal || 0} /></TableCell>
                      <TableCell>
                        {order.delivery_status === "Partially Delivered"
                          ? renderValidationBadge(
                            "partial",
                            order.delivery_status
                          )
                          : renderValidationBadge(
                            getOrderField(order, "status") === "Cancelled"
                              ? "missing"
                              : getOrderField(order, "status") === "Processing"
                                ? "produce"
                                : getOrderField(order, "status") === "Confirmed"
                                  ? "available"
                                  : "partial",
                            getOrderField(order, "status", "Unknown")
                          )}
                      </TableCell>                  <TableCell>{order.priority}</TableCell>
                      <TableCell>{order.expected_delivery_date || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setViewOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const blockedStatuses = [
                                "Confirmed",
                                "Not Shipped",
                                "Processing",
                                "Shipped",
                                "Delivered",
                                "Partially Fulfilled",
                              ];

                              const status = order.status || order.delivery_status;

                              if (blockedStatuses.includes(status)) {
                                toast({
                                  title: "Editing blocked",
                                  description: `Order is already ${status}. You cannot edit it.`,
                                  variant: "destructive",
                                });
                                return;
                              }

                              handleEditOrder(order);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => printOrder(order)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => startClone(order)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          {/*           <Button variant="ghost" size="icon" onClick={() => { setRefundOrder(order); setRefundDialogOpen(true); }}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>  */}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const renderCloneView = () => {
    const sortedOrders = [...orders].sort((a, b) => {
      // Best case: if createdAt exists
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      // fallback: order_no sorting (SO-2026-00004 > SO-2026-00003)
      return String(b.order_no || "").localeCompare(String(a.order_no || ""));
    });

    return (
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b bg-portal-fieldset px-5 py-4">
            <h3 className="text-sm font-semibold">Select Order to Clone</h3>
          </div>

          <div className="space-y-3 p-5">
            {sortedOrders.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No orders available to clone.
              </div>
            ) : (
              sortedOrders.map((order) => {
                const active = selectedCloneOrder?.id === order.id;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedCloneId(order.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Copy className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs text-primary">
                        {order.order_no}
                      </div>

                      <div className="mt-1 font-medium text-foreground">
                        {order.customer}
                      </div>

                     <div className="mt-1 text-xs text-muted-foreground">
  {order.order_type} • {order.items.length} lines •{" "}
  <Money
    value={order.items.reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    )}
  />
</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b bg-portal-fieldset px-5 py-4">
            <h3 className="text-sm font-semibold">Clone Preview</h3>
            {selectedCloneOrder && (
              <Button onClick={() => cloneIntoComposer(selectedCloneOrder)}>
                <Copy className="mr-2 h-4 w-4" />
                Clone to Composer
              </Button>
            )}
          </div>

          <div className="p-5">
            {!selectedCloneOrder ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select an order to preview and clone.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Type</div>
                    <div className="mt-1 font-medium">{selectedCloneOrder.order_type}</div>
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</div>
                    <div className="mt-1 font-medium">{selectedCloneOrder.status}</div>
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</div>
                    <div className="mt-1 font-medium">{selectedCloneOrder.priority}</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {selectedCloneOrder?.items?.map((item: any) => (
                        <TableRow key={item.id || item.item_code}>
                          <TableCell>
                            <div className="font-mono text-xs text-primary">
                              {item.item_code}
                            </div>
                            <div className="text-sm text-foreground">
                              {item.item_name}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            {item.quantity ?? 0}
                          </TableCell>

                          <TableCell className="text-right">
                           <Money value={Number(item.rate) || 0} />
                          </TableCell>

                          <TableCell className="text-right">
                           <Money value={Number(item.total_amount) || 0} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRegularOrders = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold">Regular / Repeat Orders</h3>
          <p className="mt-1 text-xs text-muted-foreground">Save recurring demand patterns and fire them into new orders.</p>
        </div>
        <Dialog open={regularDialogOpen} onOpenChange={setRegularDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Regular Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regular Order Template</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer *</Label>

                <select
                  value={regularForm.customer_id}
                  onChange={(event) => {
                    const selectedId = event.target.value;

                    const selectedCustomer = customers.find(
                      (c) => String(c.id) === String(selectedId)
                    );

                    setRegularForm((prev) => ({
                      ...prev,
                      customer_id: selectedCustomer?.id || "",
                      customer:
                        selectedCustomer?.name ||
                        selectedCustomer?.customer_name ||
                        "",
                    }));
                  }}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">Select Customer</option>

                  {customers?.length > 0 &&
                    customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name || customer.customer_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Product *</Label>

                <select
                  value={regularForm.itemCode}
                  onChange={(event) => {
                    const code = event.target.value;

                    const selectedItem = inventoryItems.find(
                      (item) => String(item.itemCode) === String(code)
                    );

                    console.log("👉 SELECTED CODE:", code);
                    console.log("👉 INVENTORY ITEMS SAMPLE:", inventoryItems?.[0]);
                    console.log("👉 MATCHED ITEM:", selectedItem);

                    setRegularForm((prev) => ({
                      ...prev,
                      itemCode: code,
                      itemName: selectedItem?.itemName || "",
                      price: Number(selectedItem?.unit_cost ?? 0),
                    }));
                  }}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">Select Product</option>

                  {inventoryItems?.map((inventory) => (
                    <option
                      key={inventory.id || inventory.item_code}
                      value={inventory.itemCode}
                    >
                      {inventory.itemCode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Qty per Order</Label>
                <Input type="number" min={1} value={regularForm.quantity} onChange={(event) => setRegularForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={regularForm.frequency} onValueChange={(value) => setRegularForm((prev) => ({ ...prev, frequency: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next Order Date</Label>
                <Input type="date" value={regularForm.nextOrderDate} onChange={(event) => setRegularForm((prev) => ({ ...prev, nextOrderDate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  value={regularForm.price}
                  onChange={(event) =>
                    setRegularForm((prev) => ({
                      ...prev,
                      price: Number(event.target.value),
                    }))
                  }
                />              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegularDialogOpen(false)}>Cancel</Button>
              <Button
                type="button"
                onClick={createRegularTemplate}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Order Date</TableHead>
                <TableHead>Last Ordered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regularOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">No regular order templates yet.</TableCell>
                </TableRow>
              ) : (
                regularOrders.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-mono text-xs text-primary">{template.template_number}</TableCell>
                    <TableCell>{template.customer}</TableCell>
                    <TableCell>
                      <div className="font-mono text-xs text-primary">{template.item_code}</div>
                      <div className="text-sm text-muted-foreground">{template.item_name}</div>
                    </TableCell>
                    <TableCell>{template.frequency}</TableCell>
                    <TableCell>{template.next_order_date}</TableCell>
                    <TableCell>{template.last_ordered ?? "—"}</TableCell>
                    <TableCell>{renderValidationBadge(template.status === "Active" ? "available" : "missing", template.status)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => fireRegularOrder(template)}>Create Order</Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRegularTemplate(template.id)}
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
        </div>
      </div>
    </div>
  );

  const renderStockValidation = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Fully Available", value: validationRows.filter((row) => row.assessment.state === "available").length, tone: "success" },
          { label: "Partial Stock", value: validationRows.filter((row) => row.assessment.state === "partial").length, tone: "warning" },
          { label: "Need to Purchase", value: validationRows.filter((row) => row.assessment.state === "purchase").length, tone: "primary" },
          { label: "Need Production", value: validationRows.filter((row) => row.assessment.state === "produce").length, tone: "accent" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{metric.label}</div>
            <div className={cn(
              "mt-2 text-2xl font-semibold",
              metric.tone === "success" && "text-success",
              metric.tone === "warning" && "text-warning",
              metric.tone === "primary" && "text-primary",
              metric.tone === "accent" && "text-accent",
            )}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b bg-portal-fieldset px-5 py-4">
          <h3 className="text-sm font-semibold">Pending Orders — Stock Validation</h3>

        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Open PO</TableHead>
                <TableHead className="text-right">Gap</TableHead>
                <TableHead>Action Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validationRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No pending orders to validate.
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  const runningStock: Record<string, number> = {};

                  return [...validationRows]
                    .sort((a, b) =>
                      new Date(a.order.orderDate).getTime() -
                      new Date(b.order.orderDate).getTime()
                    )
                    .map(({ order, item, assessment }) => {
                      const itemCode = item.item_code;

                      const initialStock = Number(
                        item.available_stock ??
                        item.quantity_on_hand ??
                        assessment.inventory?.quantity_on_hand ??
                        assessment.available ??
                        0
                      );

                      if (runningStock[itemCode] === undefined) {
                        runningStock[itemCode] = initialStock;
                      }

                      const stockBefore = runningStock[itemCode];
                      const orderedQty = Number(assessment.quantity || 0);

                      // ❗ GAP = how much CANNOT be fulfilled
                      const gap =
                        stockBefore >= orderedQty
                          ? 0
                          : orderedQty - stockBefore;

                      // ❗ stock becomes zero if insufficient
                      // otherwise reduce normally
                      const stockAfter =
                        stockBefore >= orderedQty
                          ? stockBefore - orderedQty
                          : 0;

                      runningStock[itemCode] = stockAfter;

                      return (
                        <TableRow key={`${order.id}-${item.item_code}`}>
                          <TableCell className="font-mono text-xs text-primary">
                            {order.order_no}
                          </TableCell>

                          <TableCell>{order.customer}</TableCell>

                          <TableCell>
                            {item.item_name || item.item_code}
                          </TableCell>

                          <TableCell className="text-right">
                            {orderedQty}
                          </TableCell>

                          {/* AVAILABLE AFTER ALLOCATION */}
                          <TableCell className="text-right">
                            {stockAfter}
                          </TableCell>

                          <TableCell className="text-right">
                            {assessment.openPO ?? assessment.open_po ?? 0}
                          </TableCell>

                          {/* GAP */}
                          <TableCell className="text-right font-medium">
                            {gap > 0 ? gap : "—"}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              {renderValidationBadge(
                                gap > 0 ? "purchase" : "available",
                                gap > 0 ? "Need Purchase" : "Available"
                              )}

                              {gap > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRFQ(item, gap)}
                                >
                                  Buy
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    });
                })()
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const renderPurchaseNeeds = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Items to Purchase</div><div className="mt-2 text-2xl font-semibold text-primary">{purchaseNeeds.length}</div></div>
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Estimated Value</div><div className="mt-2 text-2xl font-semibold text-warning">
          <Money
  value={purchaseNeeds.reduce(
    (sum, row) =>
      sum +
      row.assessment.gap *
        Number(row.assessment.inventory?.unit_cost || row.item.rate || 0),
    0
  )}
/>
</div></div>
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Urgent Buys</div><div className="mt-2 text-2xl font-semibold text-destructive">{purchaseNeeds.filter((row) => ["High", "Critical"].includes(row.order.priority)).length}</div></div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b bg-portal-fieldset px-5 py-4">
          <h3 className="text-sm font-semibold">Purchase Requirements</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPurchaseNeeds}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead className="text-right">Required</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">To Purchase</TableHead>
                <TableHead className="text-right">Est. Cost</TableHead>
                <TableHead>Urgency</TableHead>

                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseNeeds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-success">All material lines are covered by available stock.</TableCell>
                </TableRow>
              ) : (
                purchaseNeeds.map(({ order, item, assessment }, index) => (
                  <TableRow key={`purchase-${order.id}-${item.itemCode}-${index}`}>
                    <TableCell className="font-mono text-xs text-primary">{item.item_code}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell className="font-mono text-xs">{order.order_no}</TableCell>
                    <TableCell className="text-right">{assessment.quantity}</TableCell>
                    <TableCell className="text-right">{assessment.available}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {(() => {
                        const itemCode = item.item_code;

                        const initialStock = Number(
                          item.available_stock ??
                          item.quantity_on_hand ??
                          assessment.inventory?.quantity_on_hand ??
                          assessment.available ??
                          0
                        );

                        const requiredQty = Number(assessment.quantity || 0);

                        // simple single-line calculation (purchase view only)
                        const gap =
                          initialStock >= requiredQty
                            ? 0
                            : requiredQty - initialStock;

                        return gap > 0 ? gap : "—";
                      })()}
                    </TableCell>
                   <TableCell className="text-right">
  <Money
    value={
      assessment.gap *
      Number(assessment.inventory?.unit_cost || item.rate || 0)
    }
  />
</TableCell>
                    <TableCell>{renderValidationBadge(order.priority === "Critical" ? "missing" : order.priority === "High" ? "partial" : "available", order.priority)}</TableCell>

                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openRFQ(item, assessment.gap)}>Fix / Order</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const renderExcessProduction = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Excess Items</div><div className="mt-2 text-2xl font-semibold text-primary">{excessRows.length}</div></div>
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Excess Qty Total</div><div className="mt-2 text-2xl font-semibold text-success">{excessRows.reduce((sum, row) => sum + row.excessQty, 0)}</div></div>
<div className="rounded-lg border bg-card p-4 shadow-sm">
  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
    Excess Value
  </div>

  <div className="mt-2 text-2xl font-semibold text-warning">
    <Money
      value={excessRows.reduce((sum, row) => sum + row.excessValue, 0)}
    />
  </div>
</div>
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Reusable</div><div className="mt-2 text-2xl font-semibold text-accent">{excessRows.filter((row) => row.type !== "Product").length}</div></div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="border-b bg-portal-fieldset px-5 py-4">
          <h3 className="text-sm font-semibold">Excess Stock / Over-Production Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Net Orders</TableHead>
                <TableHead className="text-right">Excess Qty</TableHead>
                <TableHead className="text-right">Excess Value</TableHead>
                <TableHead>Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {excessRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">No excess stock detected.</TableCell>
                </TableRow>
              ) : (
                excessRows.map((row, index) => (
                  <TableRow key={`${row.code}-${index}`}>
                    <TableCell className="font-mono text-xs text-primary">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.available}</TableCell>
                    <TableCell className="text-right">{row.allocated}</TableCell>
                    <TableCell className="text-right">{row.netOrders}</TableCell>
                    <TableCell className="text-right font-medium text-primary">{row.excessQty}</TableCell>
                    <TableCell className="text-right"> <Money value={row.excessValue || 0} /></TableCell>
                    <TableCell>{renderValidationBadge(row.type === "Product" ? "produce" : "available", row.type === "Product" ? "Reduce production run" : "Use in future orders")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Orders This Month</div><div className="mt-2 text-2xl font-semibold text-primary">{dashboardStats.monthOrders}</div></div>
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Order Value</div><div className="mt-2 text-2xl font-semibold text-success"> <Money value={dashboardStats.orderValue || 0} /></div></div>
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pending Delivery</div><div className="mt-2 text-2xl font-semibold text-warning">{dashboardStats.pendingDelivery}</div></div>
        <div className="rounded-lg border bg-card p-4 shadow-sm"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Overdue</div><div className="mt-2 text-2xl font-semibold text-destructive">{dashboardStats.overdue}</div></div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b bg-portal-fieldset px-5 py-4"><h3 className="text-sm font-semibold">Recent Orders</h3></div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...orders]
                  .sort((a, b) =>
                    String(b.order_no || "").localeCompare(String(a.order_no || ""))
                  )
                  .map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs text-primary">{order.order_no}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>
  <Money
    value={(order.items || []).reduce(
      (sum, item) => sum + (Number(item.total_amount) || 0),
      0
    )}
  />
</TableCell>
                      <TableCell>{order.status}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b bg-portal-fieldset px-5 py-4"><h3 className="text-sm font-semibold">Action Required</h3></div>
          <div className="space-y-3 p-5">
            {purchaseNeeds.length > 0 && (
              <button type="button" onClick={() => setWorkspaceView("purchase")} className="w-full rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-left text-sm text-primary">
                {purchaseNeeds.length} material line(s) need purchasing →
              </button>
            )}
            {dashboardStats.overdue > 0 && (
              <button type="button" onClick={() => setWorkspaceView("orders")} className="w-full rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-left text-sm text-destructive">
                {dashboardStats.overdue} overdue order(s) need attention →
              </button>
            )}
            {validationRows.filter((row) => row.assessment.state === "produce").length > 0 && (
              <button type="button" onClick={() => setWorkspaceView("validation")} className="w-full rounded-md border border-accent/20 bg-accent/10 px-4 py-3 text-left text-sm text-accent">
                {validationRows.filter((row) => row.assessment.state === "produce").length} line(s) require production planning →
              </button>
            )}
            {purchaseNeeds.length === 0 && dashboardStats.overdue === 0 && validationRows.filter((row) => row.assessment.state === "produce").length === 0 && (
              <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">Everything looks healthy right now.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderWorkspace = () => {
    switch (workspaceView) {
      case "new":
        return renderComposer();
      case "orders":
        return renderAllOrders();
      case "clone":
        return renderCloneView();
      case "regular":
        return renderRegularOrders();
      case "validation":
        return renderStockValidation();
      case "purchase":
        return renderPurchaseNeeds();
      case "excess":
        return renderExcessProduction();
      case "dashboard":
        return renderDashboard();
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="flex h-full min-h-0 flex-col bg-portal-fieldset lg:flex-row">
        {renderWorkspaceSidebar()}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border bg-card px-4 py-4 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Order Booking</div>
                <h1 className="mt-1 text-xl font-semibold text-foreground">{ORDER_VIEWS.find((view) => view.id === workspaceView)?.label}</h1>
              </div>
              <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as MainTab)}>
                <TabsList>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="packages">Packages</TabsTrigger>
                  {/*   <TabsTrigger value="refunds">Refunds</TabsTrigger> */}
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
            {mainTab === "packages" ? (
              <OrderPackagesTab orders={orders} />
            ) : mainTab === "refunds" ? (
              <RefundsTab
                refunds={refunds}
                onUpdateRefund={(refundId, updates) =>
                  setRefunds((prev) =>
                    prev.map((refund) =>
                      refund.id === refundId
                        ? { ...refund, ...updates }
                        : refund
                    )
                  )
                }
                onRestoreInventory={async (refund) => {
                  try {
                    for (const item of refund.items) {
                      if (
                        !item.restoreInventory ||
                        item.quantityRefunded <= 0
                      )
                        continue;



                    }
                  } catch (error) {
                    console.error("Error restoring inventory:", error);
                  }
                }}
              />
            ) : (
              renderWorkspace()
            )}
          </div>
        </div>
      </div>

      <Sheet open={Boolean(viewOrder)} onOpenChange={(open) => !open && setViewOrder(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{getOrderField(viewOrder, "order_no") || getOrderField(viewOrder, "id")} — {viewOrder?.customer}</SheetTitle>
          </SheetHeader>
          {viewOrder && (
            <div className="space-y-6 py-6">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border bg-muted/40 p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Type</div><div className="mt-1 font-medium">{viewOrder.order_type}</div></div>
                <div className="rounded-md border bg-muted/40 p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</div><div className="mt-1 font-medium">
                  {viewOrder.delivery_status === "Partially Delivered"
                    ? "Partially Delivered"
                    : viewOrder.status}
                </div></div>
                <div className="rounded-md border bg-muted/40 p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</div><div className="mt-1 font-medium">{viewOrder.priority}</div></div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <div className="font-medium">Customer</div>
                  <div className="text-muted-foreground">{viewOrder.customer}</div>
                  <div className="text-muted-foreground">{viewOrder.contact_person || "—"}</div>
                  <div className="text-muted-foreground">{viewOrder.contact_number || "—"}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="font-medium">Delivery</div>
                  <div className="text-muted-foreground">Dispatch: {viewOrder.expected_delivery_date || "—"}</div>
                  <div className="text-muted-foreground">
                    Status: {viewOrder.delivery_status === "Partially Delivered"
                      ? "Partially Delivered"
                      : viewOrder.status}
                  </div>
                  <div className="text-muted-foreground">Mode: {viewOrder.dispatch_mode}</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>

                      <TableHead className="text-right">Delivered Qty</TableHead>

                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewOrder.items || []).map((item) => {
                      const assessment = getLineAssessment(item);
                      return (
                        <TableRow key={item.id || item.item_code}>
                          <TableCell>
                            <div className="font-mono text-xs text-primary">{item.item_code}</div>
                            <div>{item.item_name}</div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>

                          <TableCell className="text-right">
                            {item.delivered_qty ?? 0}
                          </TableCell>

                          <TableCell className="text-right">  <Money value={Number(item.rate || 0)} /></TableCell>
                          <TableCell className="text-right">  <Money value={Number(item.total_amount || 0)} /></TableCell>
                          <TableCell>
                            {(() => {
                              const available = Number(
                                item.available_stock ??
                                item.quantity_on_hand ??
                                assessment.inventory?.quantity_on_hand ??
                                assessment.available ??
                                0
                              );

                              const ordered = Number(assessment.quantity || 0);

                              const gap = available >= ordered ? 0 : ordered - available;

                              const state: ValidationState =
                                gap === 0
                                  ? "available"
                                  : gap > 0
                                    ? "purchase"
                                    : "available";

                              const label =
                                gap === 0 ? "Available" : `Buy ${gap}`;

                              return renderValidationBadge(state, label);
                            })()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  cloneIntoComposer(viewOrder);
                  closeOrderSheet();
                }}>
                  <Copy className="mr-2 h-4 w-4" />Clone
                </Button>
                {/*      <Button variant="outline" onClick={() => { setRefundOrder(viewOrder); setRefundDialogOpen(true); }}>
                  <RotateCcw className="mr-2 h-4 w-4" />Refund
                </Button>  */}

                <Button
                  variant="outline"
                  onClick={() => {
                    const blockedStatuses = [
                      "Confirmed",
                      "Processing",
                      "Not Shipped",
                      "Shipped",
                      "Delivered",
                      "Partially Fulfilled",
                    ];

                    if (blockedStatuses.includes(viewOrder.status || viewOrder.delivery_status)) {
                      toast({
                        title: "Editing blocked",
                        description: `Order is already ${viewOrder.status || viewOrder.delivery_status}. You cannot edit it.`,
                        variant: "destructive",
                      });
                      return;
                    }

                    handleEditOrder(viewOrder);
                    closeOrderSheet();
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  disabled={
                    ["Confirmed", "Delivered", "Cancelled"].includes(viewOrder.status) ||
                    viewOrder.delivery_status === "Delivered" ||
                    viewOrder.delivery_status === "Shipped" ||
                    viewOrder.delivery_status === "Not Shipped" ||
                    viewOrder.delivery_status === "Partially Fulfilled"
                  }
                  onClick={() => {
                    handleOrderStatusChange(viewOrder.id, "Confirmed");
                    closeOrderSheet();
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Confirm
                </Button>
                <Button
                  variant="destructive"
                  disabled={
                    ["Delivered",  "Cancelled"].includes(viewOrder.status) ||
                    viewOrder.delivery_status === "Delivered" ||
                    viewOrder.delivery_status === "Shipped" ||
                    viewOrder.delivery_status === "Partially Fulfilled"
                  }
                  onClick={() => {
                    setCancelOrder(viewOrder);
                    setCancelDialogOpen(true);
                     setCancelling(true);
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={rfqDialogOpen} onOpenChange={setRfqDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create RFQ</DialogTitle>
          </DialogHeader>

          <RFQForm
            initialItem={rfqItem || undefined}
            onSuccess={() => setRfqDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

     <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle className="text-red-600">
        Cancel Order
      </DialogTitle>
    </DialogHeader>

    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        This action cannot be undone. The order will be permanently cancelled.
      </p>
    </div>

    <DialogFooter className="gap-2">
      <Button
        variant="outline"
        onClick={() => setCancelDialogOpen(false)}
      >
        Keep Order
      </Button>

      <Button
        variant="destructive"
        onClick={confirmCancelOrder}
      >
        Yes, Cancel Order
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
      <RefundDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen} order={refundOrder} onRefundCreated={(refund) => setRefunds((prev) => [refund, ...prev])} />
    </Layout>
  );
};

export default Orders;
