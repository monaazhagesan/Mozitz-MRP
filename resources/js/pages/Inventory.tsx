import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import {
  Search,
  Plus,
  Download,
  Edit,
  Eye,
  AlertTriangle,
  TrendingDown,
  Package as PackageIcon,
  Trash2,
  Filter,
  ChevronDown,
  FileText,
  Link2,
  Sparkles,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import StatCard from "@/components/StatCard";
import { GripVertical } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import InventoryChat from "@/components/inventory/InventoryChat";
import ItemTransactionsTab from "@/components/inventory/ItemTransactionsTab";
import IssuesTab from "@/components/inventory/IssuesTab";
import StocktakesTab from "@/components/inventory/StocktakesTab";
import StockAdjustmentsTab from "@/components/inventory/StockAdjustmentsTab";
import MRPPlannerTab from "@/components/inventory/MRPPlannerTab";


interface Item {
  id: string;
  itemCode: string;
  code: string;
  type: string;
  name: string;
  itemName: string;
  item_type: string;
  description: string;
  sku: string;
  defaultSupplier: string;
  purchasePrice: string;
  sellingPrice: string;
  location: string;
  locationTracking: boolean;
  autoReorder: boolean;
  grnRequired: boolean;
  hsnCode?: string;
  taxRate?: string;
  reorderPoint?: string;
  reorderQty?: string;
  quantityOnHand?: number;
  availableQuantity?: number;
  expectedQuantity?: number;
  committedQuantity?: number;
  barcode?: string;
  itemMode?: string; // "batch" or "variant"
  variantName?: string;
  variantAttributes?: string;
  trackingType?: string; // "none", "batch", "serial"
  serialNumberFormat?: string;
  autoGenerateSerial?: boolean;
  categories?: string;
  usabilityMake?: boolean;
  usabilityBuy?: boolean;
  usabilitySell?: boolean;
}

const Inventory = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState("inventory");
  const [filterTab, setFilterTab] = useState("all");
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [selectedItemForAllocation, setSelectedItemForAllocation] = useState<Item | null>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showOnlyExpected, setShowOnlyExpected] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
const [insights, setInsights] = useState<any[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [filters, setFilters] = useState({ name: "", category: "", supplier: "" });
  const [showChat, setShowChat] = useState(false);
  const { toast } = useToast();

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    checkbox: 40,
    itemCode: 120,
    name: 180,
    category: 120,
    onHand: 100,
    expected: 100,
    committed: 100,
    
    reorderPoint: 120,
    warehouse: 100,
    location: 120,
    status: 120,
    cost: 100,
    value: 120,
    lastTransaction: 140,
    makeOrBuy: 120,
  });

  const [resizing, setResizing] = useState<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Item Master states
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [itemType, setItemType] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [barcode, setBarcode] = useState("");

  const generateItemCode = (type: string) => {
    const prefixMap: { [key: string]: string } = {
      Product: "PRD",
      Component: "MAT",
    };

    const prefix = prefixMap[type] || "IT";
    const typeItems = items.filter((item) => item.code.startsWith(prefix));
    const nextNumber = typeItems.length + 1;
    return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
  };

  const generateBarcode = (itemCode: string) => {
    // Generate a 13-digit EAN-13 style barcode
    const timestamp = Date.now().toString().slice(-6);
    const codeHash = itemCode
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
      .toString()
      .slice(-6);
    return `${timestamp}${codeHash}`.padStart(13, "0");
  };

  const handleTypeChange = (type: string) => {
    setItemType(type);
    const newCode = generateItemCode(type);
    setItemCode(newCode);
    setBarcode(generateBarcode(newCode));

    // Auto-set usability based on item type
    if (type === "Product") {
      setUsabilityMake(true);
      setUsabilityBuy(true);
      setUsabilitySell(true);
    } else if (type === "Component") {
      setUsabilityMake(false);
      setUsabilityBuy(false);
      setUsabilitySell(true);
    }
  };

  // Additional form states
  const [sku, setSku] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [location, setLocation] = useState("");
  const [locationTracking, setLocationTracking] = useState(false);
  const [grnRequired, setGrnRequired] = useState(false);
  const [hsnCode, setHsnCode] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [reorderQty, setReorderQty] = useState("");
  const [initialStockQty, setInitialStockQty] = useState("");
  const [itemMode, setItemMode] = useState<string>("batch");
  const [variantName, setVariantName] = useState("");
  const [variantAttributes, setVariantAttributes] = useState("");
  const [defaultSupplier, setDefaultSupplier] = useState("");
  const [trackingType, setTrackingType] = useState<string>("none");
  const [serialNumberFormat, setSerialNumberFormat] = useState("MO1-0001");
  const [autoGenerateSerial, setAutoGenerateSerial] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string }[]>([]);
  const [usabilityMake, setUsabilityMake] = useState(true);
  const [usabilityBuy, setUsabilityBuy] = useState(true);
  const [usabilitySell, setUsabilitySell] = useState(true);
   const [inventory, setInventory] = useState<any[]>([]);
     const [loading, setLoading] = useState<boolean>(false);


     
 const loadCategories = async () => {
  try {
    const response = await axios.get("/api/categories"); // adjust base URL if needed
    const data = response.data;

    // Assuming your API returns an array of categories
    setAvailableCategories(data || []);
  } catch (error: any) {
    console.error("Error loading categories:", error);
    toast({
      title: "Error Loading Categories",
      description: error.response?.data?.message || error.message,
      variant: "destructive",
    });
  }
};

  const resetForm = () => {
    setItemType("");
    setItemName("");
    setItemDescription("");
    setItemCode("");
    setBarcode("");
    setSku("");
    setPurchasePrice("");
    setSellingPrice("");
    setLocation("");
    setLocationTracking(false);
    setGrnRequired(false);
    setHsnCode("");
    setTaxRate("");
    setReorderPoint("");
    setReorderQty("");
    setInitialStockQty("");
    setItemMode("batch");
    setVariantName("");
    setVariantAttributes("");
    setEditMode(false);
    setEditingItemId(null);
    setDefaultSupplier("");
    setTrackingType("none");
    setSerialNumberFormat("MO1-0001");
    setAutoGenerateSerial(false);
    setCategories([]);
    setUsabilityMake(false);
    setUsabilityBuy(false);
    setUsabilitySell(false);
  };

  const handleEditItem = (item: Item) => {
    setItemType(item.item_type);
    setItemName(item.itemName);
    setItemDescription(item.description);
    setItemCode(item.itemCode);
    setSku(item.sku);
    setBarcode(item.barcode || "");
    setDefaultSupplier(item.defaultSupplier || "");
    setSku(item.sku);
    setPurchasePrice(item.purchasePrice);
    setSellingPrice(item.sellingPrice);
    setLocation(item.location);
    setLocationTracking(item.locationTracking);
    setGrnRequired(item.grnRequired);
    setHsnCode(item.hsnCode || "");
    setTaxRate(item.taxRate || "");
    setReorderPoint(item.reorderPoint || "");
    setReorderQty(item.reorderQty || "");
    setInitialStockQty(item.quantityOnHand?.toString() || "");
    setItemMode(item.itemMode || "batch");
    setVariantName(item.variantName || "");
    setVariantAttributes(item.variantAttributes || "");
    setEditMode(true);
    setEditingItemId(item.id);
    setCategories(item.categories ? item.categories.split(",").filter((c) => c) : []);
    setUsabilityMake(item.usabilityMake || false);
    setUsabilityBuy(item.usabilityBuy || false);
    setUsabilitySell(item.usabilitySell || false);
    setOpen(true);
  };

const handleCreateItem = async () => {
  // 1️⃣ Frontend validation
  if (!itemType || !itemName || !sku || !location || !initialStockQty) {
    toast({ 
      title: "Validation Error", 
      description: "Please fill in all required fields", 
      variant: "destructive" 
    });
    return;
  }

  if (itemType === "Component" && (!purchasePrice || !defaultSupplier)) {
    toast({ 
      title: "Validation Error", 
      description: "Purchase price and default supplier are required for Component", 
      variant: "destructive" 
    });
    return;
  }

  if (itemType === "Component" && parseFloat(purchasePrice) < 0) {
    toast({ 
      title: "Validation Error", 
      description: "Purchase price cannot be negative", 
      variant: "destructive" 
    });
    return;
  }

  if (parseFloat(initialStockQty) < 0) {
    toast({ 
      title: "Validation Error", 
      description: "Initial stock quantity cannot be negative", 
      variant: "destructive" 
    });
    return;
  }

  try {
    
    // 2️⃣ Payload matching DB
   const payload: any = {
  item_code: itemCode?.trim() || null,
  item_name: itemName?.trim() || null,
  item_type: itemType || null,
  sku: sku?.trim() || 'AUTO-SKU',
  description: itemDescription?.trim() || null,
  quantity_on_hand: initialStockQty ? parseFloat(initialStockQty) : 0,
  available_quantity: initialStockQty ? parseFloat(initialStockQty) : 0, 
  allocated_quantity: 0,
  committed_quantity: 0,
  unit_cost: purchasePrice ? parseFloat(purchasePrice) : 0,
  selling_price: sellingPrice ? parseFloat(sellingPrice) : 0,
  location: location?.trim() || null,
  barcode: barcode ? barcode.trim() : null,
  item_mode: itemMode || null,
  variant_name: itemMode === "variant" ? variantName?.trim() || null : null,
  variant_attributes: itemMode === "variant" ? variantAttributes?.trim() || null : null,
  default_supplier: itemType === "Component" ? defaultSupplier?.trim() || null : null,
  categories: categories.length ? categories.join(",") : null,
  usability_make: !!usabilityMake,
  usability_buy: !!usabilityBuy,
  usability_sell: !!usabilitySell,
  auto_reorder: false,
  lead_time_days: 0,
  safety_stock: 0,
  grn_required: !!grnRequired,
  location_tracking: !!locationTracking,
  auto_generate_serial: !!autoGenerateSerial,
  serial_number_format: serialNumberFormat || null,
  hsn_code: hsnCode || null,
  tax_rate: taxRate ? parseFloat(taxRate) : 0,
  last_transaction_date: null,
};

    // 3️⃣ API call
    if (editMode && editingItemId) {
      await axios.put(`/api/inventory-stock/${editingItemId}`, payload);
      toast({ title: "Success", description: `Item ${itemName} updated successfully` });
    } else {
      await axios.post("/api/inventory-stock", payload);
      toast({ title: "Success", description: `Item ${itemName} created successfully` });
    }

    // 4️⃣ Reset form
    resetForm();
    setOpen(false);

    // Optional: redirect to BOM page if Product
    if (itemType === "Product") {
      window.location.href = `/bom?itemCode=${itemCode}&itemName=${encodeURIComponent(itemName)}&itemType=${itemType}`;
    }

  } catch (error: any) {
    console.error("Inventory save error:", error);
    console.error("Backend error:", error.response?.data);

    if (error.response?.status === 422 && error.response.data?.errors) {
      const errorMessages = Object.values(error.response.data.errors).flat().join(" | ");
      toast({ title: "Validation Error", description: errorMessages, variant: "destructive" });
    } else {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || `Failed to ${editMode ? "update" : "create"} item`, 
        variant: "destructive" 
      });
    }
  }
};


// Fetch all inventory items
const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/inventory-stock");
      const items = response.data.items || [];
      setInventory(items); // store items in state
      console.log("Fetched inventory items:", items);
    } catch (error: any) {
      console.error("Inventory fetch error:", error);
      console.error("Backend response:", error.response?.data);
      toast({
        title: "Error Fetching Inventory",
        description: error.response?.data?.message || "Failed to fetch inventory items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

 
useEffect(() => {
  loadInventory();
}, []);

const loadInventory = async () => {
  try {
    setLoading(true);

    // 1️⃣ Fetch base inventory
    const { data } = await axios.get("/api/inventory-stock");
    console.log("Inventory API response:", data);

    const inventoryData = Array.isArray(data.items) ? data.items : [];
    if (inventoryData.length === 0) {
      console.warn("No inventory items found.");
    }

    // 2️⃣ Fetch open purchase orders
    const { data: purchaseOrders } = await axios.get("/api/purchase-orders", {
      params: {
        status: ["Draft", "Sent", "Approved", "Partially Received"],
      },
    });
    const openPOs = Array.isArray(purchaseOrders) ? purchaseOrders : [];

    let poItems: any[] = [];
    if (openPOs.length > 0) {
      const poIds = openPOs.map((po: any) => po.id);
      const { data: poItemsData } = await axios.get("/api/purchase-order-items", {
        params: { po_ids: poIds },
      });
      poItems = Array.isArray(poItemsData) ? poItemsData : [];
    }

    // 3️⃣ Get local jobs (manufacturing)
    let jobs: any[] = [];
    const savedJobs = localStorage.getItem("jobs");
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        if (Array.isArray(parsed)) jobs = parsed;
      } catch (e) {
        console.error("Failed to parse jobs:", e);
      }
    }

    // 4️⃣ Process and map inventory items
    const processedItems = inventoryData.map((item: any) => {
      const quantityOnHand = Number(item.quantity_on_hand ?? item.quantityOnHand ?? 0);
      const committedQuantity = Number(item.committed_quantity || 0);
      const purchasePrice = parseFloat(item.unit_cost ?? item.purchasePrice ?? "0");

      // Expected from Purchase Orders
      const expectedFromPO = poItems
        .filter((poItem) => poItem.item_code === item.item_code)
        .reduce((sum, poItem) => {
          const pending = Number(poItem.quantity || 0) - Number(poItem.received_quantity || 0);
          return sum + Math.max(0, pending);
        }, 0);

      // Expected from Jobs
      const expectedFromJobs = jobs
        .filter(
          (job) =>
            job.item_code === item.item_code &&
            (job.status === "In Progress" || job.status === "Created")
        )
        .reduce((sum, job) => sum + Number(job.quantity || 0), 0);

      const expectedQuantity = expectedFromPO + expectedFromJobs;
      const availableQuantity = quantityOnHand + expectedQuantity - committedQuantity;

      // ✅ Map all columns
      const mappedItem = {
        ...item,
        itemCode: item.itemCode || "-",
        itemName: item.itemName || "-",
        item_type: item.item_type || "-",
        defaultSupplier: item.defaultSupplier || "-",
        location: item.location || "-",
        purchasePrice: purchasePrice,                           // Avg cost
        value: quantityOnHand * purchasePrice,   // Value
        quantityOnHand,                           // In stock
        expectedQuantity,                         // Expected
        committedQuantity,                        // Committed
        availableQuantity,                        // Potential
        usability: [
          item.usability_buy ? "Buy" : null,
          item.usability_make ? "Make" : null,
          item.usability_sell ? "Sell" : null,
        ].filter(Boolean).join(", ") || "-",     // Usability
      };

      console.log("Mapped inventory item:", mappedItem); // Debug each item
      return mappedItem;
    });

    setItems(processedItems);
  } catch (error) {
    console.error("Failed to load inventory:", error);
    setItems([]);
  } finally {
    setLoading(false);
  }
};
 
  // Migrate existing items to set usability based on item type


/* const migrateUsabilityData = async () => {
  try {
    console.log("Starting usability data migration...");

    // 1️⃣ Fetch all items
    const itemsRes = await axios.get("/api/inventory-stock");
    const allItems: any[] = Array.isArray(itemsRes.data)
      ? itemsRes.data
      : Array.isArray(itemsRes.data?.data)
      ? itemsRes.data.data
      : []; // default to empty array

    if (allItems.length === 0) {
      console.log("No items to migrate");
      return;
    }

    let updatedCount = 0;

    // 2️⃣ Update missing usability flags
    for (const item of allItems) {
      const needsUpdate =
        !item.usability_make &&
        !item.usability_buy &&
        !item.usability_sell;

      if (needsUpdate) {
        const updates: any =
          item.item_type === "Product"
            ? { usability_make: true, usability_buy: true, usability_sell: true }
            : item.item_type === "Component"
            ? { usability_make: false, usability_buy: false, usability_sell: true }
            : {};

        try {
          await axios.put(`/api/inventory-stock/${item.id}`, updates);
          updatedCount++;
        } catch (err) {
          console.error(`Error updating ${item.item_code}`, err);
        }
      }
    }

    if (updatedCount > 0) {
      toast({
        title: "Data Migration Complete",
        description: `Updated usability for ${updatedCount} items`,
      });
    }

    // 3️⃣ Reload items sorted
    const updatedRes = await axios.get("/api/inventory-stock", {
      params: { sort: "created_at_desc" },
    });
    const data: any[] = Array.isArray(updatedRes.data)
      ? updatedRes.data
      : Array.isArray(updatedRes.data?.data)
      ? updatedRes.data.data
      : [];

    // 4️⃣ Fetch allocated jobs
    const jobAllocRes = await axios.get("/api/job-allocations", {
      params: { status: "allocated" },
    });
    const jobAllocations: any[] = Array.isArray(jobAllocRes.data)
      ? jobAllocRes.data
      : Array.isArray(jobAllocRes.data?.data)
      ? jobAllocRes.data.data
      : [];

    // 5️⃣ Fetch open Purchase Orders
    const poRes = await axios.get("/api/purchase-orders", {
      params: {
        status: ["Draft", "Sent", "Approved", "Partially Received"],
      },
    });
    const openPOs: any[] = Array.isArray(poRes.data)
      ? poRes.data
      : Array.isArray(poRes.data?.data)
      ? poRes.data.data
      : [];

    const expectedByItem: { [key: string]: number } = {};

    if (openPOs.length > 0) {
      const poIds = openPOs.map(po => po.id);

      const poItemsRes = await axios.get("/api/purchase-order-items", {
        params: { po_ids: poIds },
      });
      const poItems: any[] = Array.isArray(poItemsRes.data)
        ? poItemsRes.data
        : Array.isArray(poItemsRes.data?.data)
        ? poItemsRes.data.data
        : [];

      poItems.forEach(item => {
        const pendingQty = Math.max(
          0,
          (item.quantity || 0) - (item.received_quantity || 0)
        );
        if (pendingQty > 0 && item.item_code) {
          expectedByItem[item.item_code] =
            (expectedByItem[item.item_code] || 0) + pendingQty;
        }
      });
    }

    // 6️⃣ Add jobs from localStorage
    let jobs: any[] = [];
    const savedJobs = localStorage.getItem("jobs");
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        jobs = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Failed parsing jobs:", e);
      }
    }

    jobs.forEach(job => {
      if (
        (job.status === "In Progress" || job.status === "Created") &&
        job.item_code &&
        job.quantity > 0
      ) {
        expectedByItem[job.item_code] =
          (expectedByItem[job.item_code] || 0) + job.quantity;
      }
    });

    // 7️⃣ Load Orders from localStorage
    let orders: any[] = [];
    const savedOrders = localStorage.getItem("orders");
    if (savedOrders) {
      try {
        const parsed = JSON.parse(savedOrders);
        orders = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Failed parsing orders:", e);
      }
    }

    const commitmentsByItem: { [key: string]: number } = {};

    orders.forEach(order => {
      if (order.status === "Processing" || order.status === "Awaiting Confirmation") {
        (order.items || []).forEach((lineItem: any) => {
          if (lineItem.itemCode && lineItem.quantityOrdered > 0) {
            commitmentsByItem[lineItem.itemCode] =
              (commitmentsByItem[lineItem.itemCode] || 0) +
              lineItem.quantityOrdered;
          }
        });
      }
    });

    jobAllocations.forEach(ja => {
      if (ja.item_code) {
        commitmentsByItem[ja.item_code] =
          (commitmentsByItem[ja.item_code] || 0) + (ja.allocated_quantity || 0);
      }
    });

    // 8️⃣ Build final item list
    const loadedItems: Item[] = data.map(item => {
      const qtyOnHand = item.quantity_on_hand || 0;
      const expected = expectedByItem[item.item_code] || 0;
      const committed = commitmentsByItem[item.item_code] || 0;
      const available = qtyOnHand - committed;

      return {
        id: item.id,
        code: item.item_code,
        type: item.item_type || "",
        name: item.item_name,
        description: item.description || "",
        sku: item.sku || "",
        purchasePrice: item.unit_cost?.toString() || "0",
        sellingPrice: item.selling_price?.toString() || "0",
        location: item.location || "",
        locationTracking: false,
        grnRequired: true,
        hsnCode: "",
        taxRate: "",
        reorderPoint: item.reorder_point?.toString() || "",
        reorderQty: "",
        quantityOnHand: qtyOnHand,
        availableQuantity: available,
        expectedQuantity: expected,
        committedQuantity: committed,
        autoReorder: item.auto_reorder || false,
        barcode: item.barcode,
        itemMode: item.item_mode || "batch",
        variantName: item.variant_name || "",
        variantAttributes: item.variant_attributes || "",
        categories: item.categories || "",
        usabilityMake: !!item.usability_make,
        usabilityBuy: !!item.usability_buy,
        usabilitySell: !!item.usability_sell,
      };
    });

    setItems(loadedItems);

  } catch (error: any) {
    console.error("Migration error full:", error);
    toast({
      title: "Migration Failed",
      description: error.response?.data?.message || "Unexpected error occurred",
      variant: "destructive",
    });
  }
};  */


  // Load items from database on mount and listen for realtime updates

useEffect(() => {
  const loadItems = async () => {
    try {
      // 1️⃣ Run migration first
   //   await migrateUsabilityData();

      // 2️⃣ Fetch inventory items
      const itemsRes = await axios.get("/api/inventory-stock", {
        params: { sort: "created_at_desc" },
      });

      const data = Array.isArray(itemsRes.data) ? itemsRes.data : [];


      // 3️⃣ Fetch allocated jobs
      const jobAllocRes = await axios.get("/api/job-allocations", {
        params: { status: "allocated" },
      });

      const jobAllocations = jobAllocRes.data || [];

      // 4️⃣ Fetch open POs
      const poRes = await axios.get("/api/purchase-orders", {
        params: {
          status: ["Draft", "Sent", "Approved", "Partially Received"],
        },
      });

     const openPOs = Array.isArray(poRes.data) ? poRes.data : [];

      let expectedByItem: { [key: string]: number } = {};

      if (openPOs.length > 0) {
        const poIds = openPOs.map((po: any) => po.id);

        const poItemsRes = await axios.get("/api/purchase-order-items", {
          params: { po_ids: poIds },
        });

        const poItems = Array.isArray(poItemsRes.data)
  ? poItemsRes.data
  : (poItemsRes.data?.data ?? []);

        poItems.forEach((poItem: any) => {
          const pendingQty = Math.max(
            0,
            (poItem.quantity || 0) - (poItem.received_quantity || 0)
          );

          if (pendingQty > 0) {
            expectedByItem[poItem.item_code] =
              (expectedByItem[poItem.item_code] || 0) + pendingQty;
          }
        });
      }

      // 5️⃣ Add Jobs (localStorage - Finished Goods Production)
      const savedJobs = localStorage.getItem("jobs");
      let jobs: any[] = [];

      if (savedJobs) {
        try {
          const parsed = JSON.parse(savedJobs);
          jobs = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error("Failed parsing jobs:", e);
        }
      }

      jobs.forEach((job: any) => {
        if (job.status === "In Progress" || job.status === "Created") {
          if (job.item_code && job.quantity > 0) {
            expectedByItem[job.item_code] =
              (expectedByItem[job.item_code] || 0) + job.quantity;
          }
        }
      });

      // 6️⃣ Load Orders (Commitments)
      const savedOrders = localStorage.getItem("orders");
      let orders: any[] = [];

      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          orders = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error("Failed parsing orders:", e);
        }
      }

      const commitmentsByItem: { [key: string]: number } = {};

      // Order commitments
      orders.forEach((order: any) => {
        if (
          order.status === "Processing" ||
          order.status === "Awaiting Confirmation"
        ) {
          (order.items || []).forEach((lineItem: any) => {
            if (lineItem.itemCode && lineItem.quantityOrdered > 0) {
              commitmentsByItem[lineItem.itemCode] =
                (commitmentsByItem[lineItem.itemCode] || 0) +
                lineItem.quantityOrdered;
            }
          });
        }
      });

      // Job commitments from backend
      jobAllocations.forEach((ja: any) => {
        commitmentsByItem[ja.item_code] =
          (commitmentsByItem[ja.item_code] || 0) +
          (ja.allocated_quantity || 0);
      });

      // 7️⃣ Build final items list
      const loadedItems: Item[] = data.map((item: any) => {
        const qtyOnHand = item.quantity_on_hand || 0;
        const expected = expectedByItem[item.item_code] || 0;
        const committed = commitmentsByItem[item.item_code] || 0;
        const available = qtyOnHand - committed;
        const reorderPt = Number(item.reorder_point) || 0;

        // Low stock alert
        if (available < reorderPt && reorderPt > 0) {
          toast({
            title: "Low Stock Alert",
            description: `${item.item_name} (${item.item_code}) is below reorder point. Available: ${available}, Reorder Point: ${reorderPt}`,
            variant: "destructive",
          });
        }
        const availableQuantity = qtyOnHand + expected - committed;

        return {
          id: item.id,
          code: item.item_code,
          type: item.item_type || "",
          name: item.item_name,
          description: item.description || "",
          sku: item.sku,
          purchasePrice: item.unit_cost?.toString() || "0",
          sellingPrice: item.selling_price?.toString() || "0",
          location: item.location || "",
          locationTracking: false,
          grnRequired: true,
          hsnCode: "",
          taxRate: "",
          reorderPoint: item.reorder_point?.toString() || "",
          reorderQty: "",
          quantityOnHand: qtyOnHand,
          availableQuantity: Math.max(0, availableQuantity),
          expectedQuantity: expected,
          committedQuantity: committed,
          autoReorder: item.auto_reorder || false,
          barcode: item.barcode || "",
          itemMode: item.item_mode || "batch",
          variantName: item.variant_name || "",
          variantAttributes: item.variant_attributes || "",
          categories: item.categories || "",
          usabilityMake: !!item.usability_make,
          usabilityBuy: !!item.usability_buy,
          usabilitySell: !!item.usability_sell,
        };
      });

      setItems(loadedItems);
      setCurrentPage(1);

      // 8️⃣ Auto Reorder Trigger
      const autoReorderItems = loadedItems.filter((item) => {
        const available = item.availableQuantity || 0;
        const reorder = parseFloat(item.reorderPoint || "0");
        return item.autoReorder && available < reorder && reorder > 0;
      });

      if (autoReorderItems.length > 0) {
        triggerAutoRFQGeneration();
      }

    } catch (error: any) {
      console.error("Error loading items:", error);
    }
  };

  loadItems();
  loadCategories();

  // Reload when orders change in other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === "orders") {
      loadItems();
    }
  };

  const handleFocus = () => {
    loadItems();
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("focus", handleFocus);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener("focus", handleFocus);
  };
}, []);



const handleDeleteItem = async (id: string) => {
  try {
    await axios.delete(`/api/inventory-stock/${id}`);

    // Update UI after successful delete
    setItems((prevItems) =>
      prevItems.filter((item) => item.id !== id)
    );

    toast({
      title: "Deleted",
      description: "Item removed successfully",
    });

  } catch (error: any) {
    console.error("Delete error:", error);

    toast({
      title: "Error",
      description:
        error.response?.data?.message ||
        "Failed to delete item",
      variant: "destructive",
    });
  }
};



const handleAIInsights = async () => {
  if (filteredItems.length === 0) {
    toast({
      title: "No Data",
      description: "No inventory items available for analysis",
      variant: "destructive",
    });
    return;
  }

  setIsLoadingInsights(true);
  setShowInsights(true);

  try {
    // 1️⃣ Fetch latest inventory from backend
    const inventoryRes = await axios.get("/api/inventory-stock", {
      params: { sort: "item_code_asc" },
    });

    // ✅ Use the "items" array from the API response
    const inventory = inventoryRes.data.items || [];

    if (inventory.length === 0) {
      toast({
        title: "No Inventory",
        description: "No inventory data returned from server",
        variant: "destructive",
      });
      setShowInsights(false);
      return;
    }

    // 2️⃣ Call Laravel AI insights endpoint
    const insightsRes = await axios.post("/api/inventory-insights", { inventory });

    const data = insightsRes.data;

    // ✅ Save only the array to state
    if (Array.isArray(data.insights)) {
      setInsights(data.insights);
      toast({
        title: "Insights Generated",
        description: "AI analysis complete",
      });
    } else {
      throw new Error("No insights received");
    }

  } catch (error: any) {
    console.error("Error generating insights:", error);

    toast({
      title: "AI Insights Failed",
      description:
        error.response?.data?.message || "Failed to generate insights. Please try again.",
      variant: "destructive",
    });

    setShowInsights(false);
  } finally {
    setIsLoadingInsights(false);
  }
};

  // Column resize handlers
  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    setResizing(columnKey);
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[columnKey];
    document.body.classList.add("resizing-column");
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;
    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(50, startWidthRef.current + diff);
    setColumnWidths((prev) => ({
      ...prev,
      [resizing]: newWidth,
    }));
  };

  const handleMouseUp = () => {
    setResizing(null);
    document.body.classList.remove("resizing-column");
  };

  // Add event listeners for resizing
  useEffect(() => {
    if (resizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizing]);

  const inventoryData = [
    {
      itemCode: "ITM-1234",
      name: "Widget Pro Max",
      category: "Electronics",
      onHand: 125,
      allocated: 45,
      available: 80,
      reorderPoint: 50,
      warehouse: "WH-01",
      location: "A-12-03",
      status: "In Stock",
      cost: 45.5,
      value: 5687.5,
      lastTransaction: "2024-10-03",
      makeOrBuy: "Buy",
    },
    {
      itemCode: "ITM-5678",
      name: "Gadget Ultra",
      category: "Electronics",
      onHand: 35,
      allocated: 20,
      available: 15,
      reorderPoint: 40,
      warehouse: "WH-01",
      location: "B-05-12",
      status: "Below Reorder",
      cost: 78.25,
      value: 2738.75,
      lastTransaction: "2024-10-04",
      makeOrBuy: "Make",
    },
    {
      itemCode: "ITM-9012",
      name: "Tool Master Pro",
      category: "Hardware",
      onHand: 200,
      allocated: 50,
      available: 150,
      reorderPoint: 75,
      warehouse: "WH-02",
      location: "C-18-07",
      status: "In Stock",
      cost: 32.0,
      value: 6400.0,
      lastTransaction: "2024-10-02",
      makeOrBuy: "Buy",
    },
    {
      itemCode: "ITM-3456",
      name: "Component X-Series",
      category: "Parts",
      onHand: 8,
      allocated: 5,
      available: 3,
      reorderPoint: 25,
      warehouse: "WH-01",
      location: "D-22-01",
      status: "Critical",
      cost: 125.0,
      value: 1000.0,
      lastTransaction: "2024-10-05",
      makeOrBuy: "Make",
    },
    {
      itemCode: "ITM-7890",
      name: "Component Y Premium",
      category: "Component",
      onHand: 450,
      allocated: 100,
      available: 350,
      reorderPoint: 200,
      warehouse: "WH-03",
      location: "E-03-15",
      status: "In Stock",
      cost: 15.75,
      value: 7087.5,
      lastTransaction: "2024-10-01",
      makeOrBuy: "Buy",
    },
    {
      itemCode: "ITM-2345",
      name: "Assembly Z Complete",
      category: "Finished Goods",
      onHand: 89,
      allocated: 30,
      available: 59,
      reorderPoint: 60,
      warehouse: "WH-02",
      location: "F-14-22",
      status: "Near Reorder",
      cost: 185.5,
      value: 16509.5,
      lastTransaction: "2024-10-04",
      makeOrBuy: "Make",
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      "In Stock": "default",
      "Below Reorder": "secondary",
      "Near Reorder": "secondary",
      Critical: "destructive",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  // Filter items based on active filter tab
  const filteredItems = items.filter((item) => {
    // Apply type filter
    if (filterTab === "products" && item.item_type !== "Product") return false;
    if (filterTab === "Component" && item.item_type !== "Component") return false;

    // Apply expected filter
    if (showOnlyExpected && (!item.expectedQuantity || item.expectedQuantity === 0)) return false;

    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Trigger auto RFQ generation

// 🔹 Trigger Auto RFQ Generation
const triggerAutoRFQGeneration = async () => {
  try {
    console.log("Triggering auto RFQ generation...");

    const response = await axios.post("/api/auto-generate-rfq");
    const data = response.data;

    if (data?.created_rfqs && data.created_rfqs.length > 0) {
      toast({
        title: "Auto RFQ Generated",
        description: `Created ${data.created_rfqs.length} RFQ(s) for items below reorder point`,
      });
    } else {
      console.log("No RFQs created.");
    }

  } catch (error: any) {
    console.error("Error generating auto RFQs:", error);

    toast({
      title: "Error",
      description:
        error.response?.data?.message ||
        "Failed to generate auto RFQs",
      variant: "destructive",
    });
  }
};


// 🔹 Trigger Auto Demand Generation
const triggerAutoDemandGeneration = async () => {
  try {
    console.log("Triggering auto demand generation...");

    toast({
      title: "Processing",
      description:
        "Checking inventory levels and generating item demands...",
    });

    const response = await axios.post("/api/auto-generate-demands");
    const data = response.data;

    toast({
      title: "Success",
      description:
        data?.message || "Auto-demand check completed",
    });

    if (data?.created_demands && data.created_demands.length > 0) {
      console.log("Created demands:", data.created_demands);
    }

  } catch (error: any) {
    console.error("Error generating auto demands:", error);

    toast({
      title: "Error",
      description:
        error.response?.data?.message ||
        "Failed to check inventory levels",
      variant: "destructive",
    });
  }
};

  const totalValue = filteredItems.reduce((sum, item) => {
    const qty = item.quantityOnHand || 0;
    const cost = parseFloat(item.purchasePrice) || 0;
    return sum + qty * cost;
  }, 0);

  const criticalItems = filteredItems.filter((item) => {
    const available = item.availableQuantity || 0;
    const reorder = parseFloat(item.reorderPoint || "0");
    return available < reorder * 0.25; // Critical if below 25% of reorder point
  }).length;

  const belowReorder = filteredItems.filter((item) => {
    const available = item.availableQuantity || 0;
    const reorder = parseFloat(item.reorderPoint || "0");
    return available > 0 && available <= reorder;
  }).length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allItemIds = paginatedItems.map((item) => item.id);
      setSelectedItems(new Set(allItemIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };



const handleBulkDeallocate = async () => {
  const selectedItemsList = paginatedItems.filter((item) =>
    selectedItems.has(item.id)
  );

  const itemsWithAllocations = selectedItemsList.filter(
    (item) => (item.expectedQuantity || 0) > 0
  );

  if (itemsWithAllocations.length === 0) {
    toast({
      title: "No Allocations",
      description: "Selected items have no allocations to release",
      variant: "destructive",
    });
    return;
  }

  try {
    let successCount = 0;

    // 🔹 Deallocate per item
    for (const item of itemsWithAllocations) {
      try {
        // Fetch job allocations for item
        const allocRes = await axios.get("/api/job-allocations", {
          params: {
            item_code: item.code,
            status: "allocated",
          },
        });

        const jobAllocations = allocRes.data || [];

        if (!jobAllocations.length) continue;

        const uniqueJobs = [
          ...new Set(jobAllocations.map((j: any) => j.job_number)),
        ];

        // Deallocate each job
        await Promise.all(
          uniqueJobs.map(async (jobNumber) => {
            await axios.post(`/api/jobs/${jobNumber}/deallocate`);
            successCount++;
          })
        );
      } catch (err) {
        console.error(`Error processing item ${item.code}`, err);
      }
    }

    // 🔹 Reload inventory
    const reloadRes = await axios.get("/api/inventory-stock", {
      params: { sort: "created_at_desc" },
    });

    const reloadData = reloadRes.data || [];

    // Fetch updated job allocations
    const jobAllocRes = await axios.get("/api/job-allocations", {
      params: { status: "allocated" },
    });

    const jobAllocations = jobAllocRes.data || [];

    // Load orders from localStorage
    const savedOrders = localStorage.getItem("orders");
    let orders: any[] = [];

    if (savedOrders) {
      try {
        const parsed = JSON.parse(savedOrders);
        orders = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Failed parsing orders:", e);
      }
    }

    const allocationsByItem: { [key: string]: number } = {};
    const commitmentsByItem: { [key: string]: number } = {};

    // Orders logic
    orders.forEach((order: any) => {
      if (order.status === "Awaiting Confirmation") {
        (order.items || []).forEach((lineItem: any) => {
          if (lineItem.itemCode && lineItem.quantityOrdered > 0) {
            allocationsByItem[lineItem.itemCode] =
              (allocationsByItem[lineItem.itemCode] || 0) +
              lineItem.quantityOrdered;
          }
        });
      } else if (order.status === "Processing") {
        (order.items || []).forEach((lineItem: any) => {
          if (lineItem.itemCode && lineItem.quantityOrdered > 0) {
            commitmentsByItem[lineItem.itemCode] =
              (commitmentsByItem[lineItem.itemCode] || 0) +
              lineItem.quantityOrdered;
          }
        });
      }
    });

    // Job commitments
    jobAllocations.forEach((ja: any) => {
      commitmentsByItem[ja.item_code] =
        (commitmentsByItem[ja.item_code] || 0) +
        (ja.allocated_quantity || 0);
    });

    // 🔹 Rebuild items list
    const loadedItems: Item[] = reloadData.map((item: any) => {
      const qtyOnHand = item.quantity_on_hand || 0;
      const allocated = allocationsByItem[item.item_code] || 0;
      const committed = commitmentsByItem[item.item_code] || 0;
      const available = qtyOnHand - allocated - committed;

      return {
        id: item.id,
        code: item.item_code,
        type: item.item_type || "",
        name: item.item_name,
        description: item.description || "",
        sku: item.sku,
        purchasePrice: item.unit_cost?.toString() || "0",
        sellingPrice: item.selling_price?.toString() || "0",
        location: item.location || "",
        locationTracking: false,
        grnRequired: true,
        hsnCode: "",
        taxRate: "",
        reorderPoint: item.reorder_point?.toString() || "",
        reorderQty: "",
        quantityOnHand: qtyOnHand,
        availableQuantity: available,
        allocatedQuantity: allocated,
        committedQuantity: committed,
        autoReorder: item.auto_reorder || false,
        barcode: item.barcode || "",
        itemMode: item.item_mode || "batch",
        variantName: item.variant_name || "",
        variantAttributes: item.variant_attributes || "",
      };
    });

    setItems(loadedItems);

    toast({
      title: "Success",
      description: `Released allocations for ${successCount} job(s)`,
    });

    setSelectedItems(new Set());

  } catch (error: any) {
    console.error("Bulk deallocation error:", error);

    toast({
      title: "Error",
      description:
        error.response?.data?.message ||
        "Failed to release allocations",
      variant: "destructive",
    });
  }
};

  const isAllSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedItems.has(item.id));
  const isSomeSelected = selectedItems.size > 0 && !isAllSelected;

 

  return (
    <Layout>
      <div className="p-6 space-y-4">
        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/50 w-full justify-start rounded-none border-b h-12">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-background">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="batches" className="data-[state=active]:bg-background">
              Batches
            </TabsTrigger>
            <TabsTrigger value="serial-numbers" className="data-[state=active]:bg-background">
              Serial numbers
            </TabsTrigger>
            <TabsTrigger value="stock-adjustments" className="data-[state=active]:bg-background">
              Stock adjustments
            </TabsTrigger>
            <TabsTrigger value="stocktakes" className="data-[state=active]:bg-background">
              Stocktakes
            </TabsTrigger>
            <TabsTrigger value="issues" className="data-[state=active]:bg-background">
              Issues
            </TabsTrigger>
          </TabsList>

           <TabsContent value="inventory" className="mt-0 p-6">
            <MRPPlannerTab />
          </TabsContent>

          {/* Batches Tab */}
          <TabsContent value="batches" className="mt-4">
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <StatCard title="Total Batches" value="1" icon={PackageIcon} />
              <StatCard title="Active Batches" value="1" icon={PackageIcon} />
              <StatCard title="Expiring Soon" value="0" icon={AlertTriangle} />
              <StatCard title="Total Stock" value="1055 kg" icon={TrendingDown} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant={filterTab === "all" ? "default" : "outline"} onClick={() => setFilterTab("all")}>
                    All
                  </Button>
                  <Button
                    variant={filterTab === "products" ? "default" : "outline"}
                    onClick={() => setFilterTab("products")}
                  >
                    Products
                  </Button>
                  <Button
                    variant={filterTab === "Component" ? "default" : "outline"}
                    onClick={() => setFilterTab("Component")}
                  >
                    Component
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch id="show-empty" />
                    <Label htmlFor="show-empty" className="text-sm">
                      Show empty batches
                    </Label>
                  </div>
                  <Select defaultValue="main">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main location</SelectItem>
                      <SelectItem value="warehouse1">Warehouse 1</SelectItem>
                      <SelectItem value="warehouse2">Warehouse 2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                  <span className="text-sm font-medium">1 batch</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>
                          <Checkbox />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Name</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Item code</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Batch number</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead className="text-right">
                          <div className="flex items-center justify-between">
                            <span>In stock</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Expiration date</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="All dates" type="date" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Created date</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="All dates" type="date" className="h-7 mt-1 text-xs" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                        <TableCell>
                          <span className="text-primary hover:underline cursor-pointer">Spur gear 75T</span>
                        </TableCell>
                        <TableCell>W</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Unbatched</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-primary hover:underline cursor-pointer">1055 kg</span>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="serial-numbers" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <Select defaultValue="main">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main location</SelectItem>
                    <SelectItem value="warehouse1">Warehouse 1</SelectItem>
                    <SelectItem value="warehouse2">Warehouse 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                  <span className="text-sm font-medium">2 serial numbers</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12">
                          <Checkbox />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Serial number</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Item name</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Item code / SKU</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>In stock</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Added</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="All dates" type="date" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>PO</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>MO</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>SO</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center justify-between">
                            <span>Stock documents</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                          <Input placeholder="Filter" className="h-7 mt-1 text-xs" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                        <TableCell>4</TableCell>
                        <TableCell>
                          <span className="text-primary hover:underline cursor-pointer">
                            coublings / Radius 280 / 1
                          </span>
                        </TableCell>
                        <TableCell>1211</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>2025-11-04</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>
                          <span className="text-primary hover:underline cursor-pointer">SA-3</span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                        <TableCell>5</TableCell>
                        <TableCell>
                          <span className="text-primary hover:underline cursor-pointer">
                            coublings / Radius 280 / 1
                          </span>
                        </TableCell>
                        <TableCell>1211</TableCell>
                        <TableCell>Yes</TableCell>
                        <TableCell>2025-11-04</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>
                          <span className="text-primary hover:underline cursor-pointer">SA-3</span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stock-adjustments" className="mt-4">
            <StockAdjustmentsTab />
          </TabsContent>

          <TabsContent value="stocktakes" className="mt-4">
            <StocktakesTab />
          </TabsContent>

          <TabsContent value="issues" className="mt-4">
            <IssuesTab />
          </TabsContent>

        </Tabs>

        {/* Item Details Dialog */}
        <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Item Details - {selectedItem?.itemCode}</DialogTitle>
              <DialogDescription>{selectedItem?.name}</DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Item Code</label>
                        <p className="text-base font-mono">{selectedItem.itemCode}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Item Type</label>
                        <Badge variant="outline">{selectedItem.item_type}</Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">SKU</label>
                        <p className="text-base font-mono">{selectedItem.sku}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Location</label>
                        <p className="text-base font-mono">{selectedItem.location}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Location Tracking</label>
                        <p className="text-base">{selectedItem.locationTracking ? "Enabled" : "Disabled"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">GRN Required</label>
                        <p className="text-base">{selectedItem.grnRequired ? "Yes" : "No"}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">On Hand Quantity</label>
                        <p className="text-2xl font-bold">{selectedItem.quantityOnHand || 0}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Expected</label>
                          <p className="text-base">{selectedItem.expectedQuantity || 0}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Available</label>
                          <p className="text-base font-semibold">{selectedItem.availableQuantity || 0}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Reorder Point</label>
                        <p className="text-base">{selectedItem.reorderPoint || "Not set"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Reorder Qty</label>
                        <p className="text-base">{selectedItem.reorderQty || "Not set"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Pricing</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Purchase Price</label>
                        <p className="text-lg font-medium">₹{parseFloat(selectedItem.purchasePrice || "0").toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Selling Price</label>
                        <p className="text-lg font-medium">₹{parseFloat(selectedItem.sellingPrice || "0").toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Total Value</label>
                        <p className="text-lg font-bold">
                          ₹
                          {(
                            (selectedItem.quantityOnHand || 0) * parseFloat(selectedItem.purchasePrice || "0")
                          ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedItem.hsnCode && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Tax Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">HSN Code</label>
                          <p className="text-base font-mono">{selectedItem.hsnCode}</p>
                        </div>
                        {selectedItem.taxRate && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Tax Rate</label>
                            <p className="text-base">{selectedItem.taxRate}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedItem.description && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="transactions">
                  <ItemTransactionsTab itemCode={selectedItem.code} />
                </TabsContent>

                <TabsContent value="history" className="py-8 text-center text-muted-foreground">
                  Item history coming soon...
                </TabsContent>

                <div className="flex justify-end pt-4 border-t mt-4">
                  <Button onClick={() => setViewDetailsOpen(false)}>Close</Button>
                </div>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Expected Stock Breakdown Dialog */}
        <Dialog open={allocationDialogOpen} onOpenChange={setAllocationDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Expected Stock Breakdown</DialogTitle>
              <DialogDescription>
                {selectedItemForAllocation && (
                  <>
                    Incoming stock for <span className="font-semibold">{selectedItemForAllocation.name}</span> (
                    {selectedItemForAllocation.code})
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {allocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <PackageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No expected incoming stock found for this item</p>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Source</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Vendor / Details</TableHead>
                          <TableHead className="text-right">Expected Qty</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expected Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocations.map((allocation) => (
                          <TableRow key={allocation.id}>
                            <TableCell>
                              <Badge variant={allocation.type === "purchase_order" ? "default" : "secondary"}>
                                {allocation.type === "purchase_order" ? "Purchase Order" : "Production Job"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {allocation.reference}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {allocation.type === "purchase_order" ? allocation.vendor : "Manufacturing"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{allocation.expected_quantity}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  allocation.status === "Approved" || allocation.status === "In Progress"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {allocation.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {allocation.date
                                ? new Date(allocation.date).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <span className="font-medium">Total Expected:</span>
                    <span className="text-xl font-bold">
                      {allocations.reduce((sum, a) => sum + (a.expected_quantity || 0), 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setAllocationDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        <InventoryChat open={showChat} onOpenChange={setShowChat} inventoryData={filteredItems} />
      </div>
    </Layout>
  );
};

export default Inventory;
