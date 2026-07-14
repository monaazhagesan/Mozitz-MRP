import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import axios from "axios";
import {
  Plus,
  Calendar,
  TrendingUp,
  Clock,
  AlertTriangle,
  Eye,
  Trash2,
  Info,
  Package,
  Settings,
  History,
  FolderKanban,
  Calendar as CalendarIcon,
  Search,
  Check,
  LayoutGrid,
  Rows3,
} from "lucide-react";
import { FindJobsDialog, JobFilters } from "@/components/planning/FindJobsDialog";
import { JobSearchResultsDialog } from "@/components/planning/JobSearchResultsDialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JobCardDialog } from "@/components/planning/JobCardDialog";
import { ViewJobDialog } from "@/components/planning/ViewJobDialog";


type ItemSuggestion = {
  item_code: string;
  item_name: string;
  description: string | null;
};

interface Job {
  id: string;
  orderId: string;
  quantity: number | string;
  status: string;
}


const generateJobNumber = (jobs: any[]) => {
  const numbers = jobs
    .map((j) => j.job_number || j.jobNumber)
    .filter(
      (jobNumber: string) =>
        typeof jobNumber === "string" &&
        /^JOB-\d{6}$/.test(jobNumber)
    )
    .map((jobNumber: string) =>
      parseInt(jobNumber.replace("JOB-", ""), 10)
    )
    .filter((n: number) => !isNaN(n));

  const maxNumber =
    numbers.length > 0
      ? Math.max(...numbers)
      : 0;

  return `JOB-${String(maxNumber + 1).padStart(6, "0")}`;
};

const Planning = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Pre-fill data for a rework job, handed off from the Orders dashboard's
  // "Create Rework Job" action (navigate state, not URL params, since it
  // includes a free-text notes string).
  const [jobPrefill, setJobPrefill] = useState<{
    itemCode: string;
    itemName: string;
    quantity: number;
    salesOrderNum: string;
    notes?: string;
  } | null>(null);

  useEffect(() => {
    const rework = (location.state as any)?.reworkJob;
    if (rework) {
      setJobPrefill(rework);
      setIsDialogOpen(true);
      // Clear the navigation state so refreshing/revisiting this page
      // doesn't keep re-opening the dialog with the same prefill.
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isFindJobsDialogOpen, setIsFindJobsDialogOpen] = useState(false);
  const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isItemKnown, setIsItemKnown] = useState(false);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);

  // Item Code autocomplete state
  const [itemCodeOpen, setItemCodeOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState<Array<{
    item_code: string;
    item_name: string;
    description: string | null;
  }>>([]);
  const [isSearchingItems, setIsSearchingItems] = useState(false);
  const [moveQuantities, setMoveQuantities] = useState<Record<number, any>>({});
  const [nextJobNumber, setNextJobNumber] = useState("");
  const [jobsLoaded, setJobsLoaded] = useState(false);


const fetchJobs = async () => {
  try {
    const res = await axios.get("/api/jobs");

    const apiJobs = res.data?.data || res.data || [];

    const normalizedJobs = apiJobs.map((job: any) => ({
  ...job,
  bomItems: job.bomItems || job.components || job.components_list || [],
  jobType: job.jobType || job.type || "Standard",
  jobClass: job.jobClass || job.class || "STANDARD",
}));
setJobs(normalizedJobs);

    setJobsLoaded(true);

    console.log("LOADED JOBS:", apiJobs);
  } catch (err) {
    console.error("Failed to fetch jobs", err);
  }
};

useEffect(() => {
  fetchJobs();
}, []);

  // Search items when query changes (min 2 characters)
useEffect(() => {
  let isActive = true;

  const searchItems = async () => {
    if (itemSearchQuery.length < 2) {
      setItemSuggestions([]);
      return;
    }

    setIsSearchingItems(true);

    try {
      const [bomResponse, inventoryResponse] = await Promise.all([
        axios.get("/api/bom-headers", {
          params: {
            item_code: itemSearchQuery,
            status: "Active",
            limit: 10,
          },
        }),
        axios.get("/api/inventory-stock", {
          params: {
            item_code: itemSearchQuery,
            limit: 10,
          },
        }),
      ]);

      const bomItems = bomResponse.data?.data || bomResponse.data || [];
      const inventoryItems = inventoryResponse.data?.data || inventoryResponse.data || [];

      const combined: any[] = [];
      const seen = new Set<string>();

      // BOM items
      bomItems.forEach((item: any) => {
        if (item?.item_code && !seen.has(item.item_code)) {
          seen.add(item.item_code);
          combined.push({
            item_code: item.item_code,
            item_name: item.item_name || "",
            description: null,
          });
        }
      });

      // Inventory items
      inventoryItems.forEach((item: any) => {
        if (item?.item_code && !seen.has(item.item_code)) {
          seen.add(item.item_code);
          combined.push({
            item_code: item.item_code,
            item_name: item.item_name || "",
            description: item.description || null,
          });
        }
      });

      // FINAL FILTER (important)
      const filtered = combined.filter((item) =>
        item.item_code?.toLowerCase().includes(itemSearchQuery.toLowerCase())
      );

      if (isActive) {
        setItemSuggestions(filtered);
      }

    } catch (error) {
      console.error("Error searching items:", error);
      if (isActive) setItemSuggestions([]);
    } finally {
      if (isActive) setIsSearchingItems(false);
    }
  };

  const debounceTimer = setTimeout(searchItems, 300);

  return () => {
    isActive = false;
    clearTimeout(debounceTimer);
  };
}, [itemSearchQuery]);


  // Load orders, jobs, and item master from localStorage
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem("orders");
    return saved ? JSON.parse(saved) : [];
  });

  const [jobs, setJobs] = useState<any[]>([]);

  // Created Jobs display: card grid (existing) vs. compact list (new).
  // Persisted so the choice sticks across visits.
  const [jobViewMode, setJobViewMode] = useState<"cards" | "list">(() => {
    const saved = localStorage.getItem("planningJobViewMode");
    return saved === "list" ? "list" : "cards";
  });

  useEffect(() => {
    localStorage.setItem("planningJobViewMode", jobViewMode);
  }, [jobViewMode]);

  // Item Master: stores operations and components for each item
  const [itemMaster, setItemMaster] = useState(() => {
    const saved = localStorage.getItem("itemMaster");
    return saved ? JSON.parse(saved) : {};
  });
  // Helper function to calculate in-progress job quantity for an order
 const calculateInProgressJobQty = (orderId: string): number => {
  return jobs
    .filter(
      (job: any) =>
        job.orderId === orderId &&
        job.status !== "Cancelled" &&
        job.status !== "Completed"
    )
    .reduce(
      (sum: number, job: any) =>
        sum + Number(job.quantity || 0),
      0
    );
};

  const fetchNextJobNumber = async () => {
  try {
    const res = await axios.get("/api/jobs/next-number");
    setNextJobNumber(res.data.jobNumber);
  } catch (err) {
    console.error("Failed to fetch job number", err);
  }
};

const handleOpenJobDialog = async () => {
  await fetchNextJobNumber();
  setIsDialogOpen(true);
};

  // Helper function to calculate pending job quantity for an order
  const calculatePendingJobQty = (order: any) => {
    const productItems = Array.isArray(order.items)
      ? order.items.filter((item: any) => item.itemType === "Product")
      : [];
    const orderQty = productItems.reduce((sum: number, item: any) =>
      sum + (parseFloat(item.quantityOrdered) || 0), 0
    );
    const inProgressQty = calculateInProgressJobQty(order.id);
    return Math.max(0, orderQty - inProgressQty);
  };

  // Filter for Product Orders only (Manufacturing type) with pending status
  const pendingOrders = orders.filter(
    (order: any) =>
      (order.status === "Pending" || order.status === "Awaiting Confirmation") &&
      order.orderType === "Manufacturing"
  );

  const [jobData, setJobData] = useState({
    orderId: "",
    jobNumber: "",
    productName: "",
    itemCode: "",
    salesOrderNum: "",
    itemDescription: "",
    uom: "Ea",
    quantity: "",
    dueDate: "",
    priority: "Medium",
    notes: "",
    routingAvailable: false,
  });

  // State for multiple job splits
  const [jobSplits, setJobSplits] = useState<Array<{
    id: string;
    jobNumber: string;
    quantity: string;
    dueDate: string;
    priority: string;
    notes: string;
  }>>([]);

  // State for order line items selection (multi-line job creation)
  const [orderLineItems, setOrderLineItems] = useState<Array<{
    id: string;
    itemCode: string;
    itemName: string;
    itemType: string;
    quantityOrdered: number;
    inProgressQty: number;
    pendingQty: number;
    selected: boolean;
    jobQuantity: string;
  }>>([]);

  // Get selected order details
  const selectedOrder = orders.find((o: any) => o.id === jobData.orderId);

  const [operations, setOperations] = useState([
    { id: 1, sequence: 10, name: "Cut Material", duration: "30", status: "pending", machine: "" },
    { id: 2, sequence: 20, name: "Weld Parts", duration: "45", status: "pending", machine: "" },
    { id: 3, sequence: 30, name: "Quality Check", duration: "15", status: "pending", machine: "" },
  ]);

  const [bomItems, setBomItems] = useState([
    {
      id: 1,
      itemSeq: 10,
      operationSeq: 10,
      component: "Steel Plate",
      description: "Raw material",
      quantity: 5,
      uom: "pcs",
      status: "available",
    },
    {
      id: 2,
      itemSeq: 20,
      operationSeq: 10,
      component: "Welding Wire",
      description: "Consumable",
      quantity: 2,
      uom: "kg",
      status: "available",
    },
    {
      id: 3,
      itemSeq: 30,
      operationSeq: 20,
      component: "Bolts M8",
      description: "Fasteners",
      quantity: 20,
      uom: "pcs",
      status: "low",
    },
  ]);

  // Reload orders from localStorage when component mounts or becomes visible
  useEffect(() => {
    const loadOrders = () => {
      const savedOrders = localStorage.getItem("orders");
      const savedJobs = localStorage.getItem("jobs");
      if (savedOrders) {
        try {
          setOrders(JSON.parse(savedOrders));
        } catch (e) {
          console.error("Failed to parse orders:", e);
        }
      }
      if (savedJobs) {
        try {
          setJobs(JSON.parse(savedJobs));
        } catch (e) {
          console.error("Failed to parse jobs:", e);
        }
      }
    };

    // Load on mount
    loadOrders();

    // Also handle storage events from other tabs
    const handleStorageChange = () => {
      loadOrders();
    };

    window.addEventListener("storage", handleStorageChange);

    // Listen for focus to reload when user returns to tab
       window.addEventListener("focus", fetchJobs);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", fetchJobs);
    };
  }, []);

  // Check if item exists in BOM and load its data from database
 const loadItemData = async (
  itemCode: string,
  requiredQuantity: number = 1
) => {
  try {
    console.log(
      `Loading BOM data for item: ${itemCode}, quantity: ${requiredQuantity}`
    );

    // 1. Fetch BOM Header (latest active BOM)
    const bomHeaderRes = await axios.get("/api/bom-headers", {
      params: {
        item_code: itemCode,
        status: "Active",
        limit: 1,
        sort: "created_at:desc",
      },
    });

    const bomHeader =
      bomHeaderRes.data?.data?.[0] || bomHeaderRes.data?.[0] || null;

    if (!bomHeader) {
      console.log("No BOM found for item:", itemCode);
      setIsItemKnown(false);

      // fallback: inventory item
      const inventoryRes = await axios.get("/api/inventory-stock", {
        params: { item_code: itemCode },
      });

      const inventoryItem =
        inventoryRes.data?.data?.[0] || inventoryRes.data?.[0];

      if (inventoryItem) {
        setJobData((prev) => ({
          ...prev,
          itemDescription: inventoryItem.description || "",
          productName: inventoryItem.item_name || prev.productName,
          uom: "Ea",
          routingAvailable: false,
        }));
      }

      setOperations([]);
      setBomItems([]);

      toast({
        title: "New Item Detected",
        description:
          "No BOM found. Please add operations and components for this item",
      });

      return;
    }

    console.log("BOM header found:", bomHeader);

    setJobData((prev) => ({
      ...prev,
      itemDescription: bomHeader.item_name || "",
      productName: bomHeader.item_name || prev.productName,
      uom: bomHeader.uom || "Ea",
    }));

    // 2. Fetch BOM Operations
    const opsRes = await axios.get("/api/bom-operations", {
      params: {
        bom_id: bomHeader.id,
        sort: "operation_seq:asc",
      },
    });

    const bomOperations = opsRes.data?.data || opsRes.data || [];

    // 3. Fetch BOM Components
    const compsRes = await axios.get("/api/bom-components", {
      params: {
        bom_id: bomHeader.id,
        sort: "item_seq:asc",
      },
    });

    const bomComponents = compsRes.data?.data || compsRes.data || [];

    // 4. Routing flag
    const hasRouting = bomOperations.length > 0;

    setJobData((prev) => ({
      ...prev,
      routingAvailable: hasRouting,
    }));

    // 5. Map Operations
    if (hasRouting) {
      const mappedOperations = bomOperations.map((op: any, idx: number) => {
        const bomRunTime = parseFloat(op.run_time) || 30;

        return {
          id: idx + 1,
          sequence: op.operation_seq,
          name: op.description,
          duration: (bomRunTime * requiredQuantity).toString(),
          status: "pending",
          machine: op.work_center || "",
        };
      });

      setOperations(mappedOperations);
    } else {
      setOperations([]);
    }

    // 6. Map Components
    if (bomComponents.length > 0) {
      const mappedComponents = bomComponents.map(
        (comp: any, idx: number) => {
          const bomQty = parseFloat(comp.quantity) || 1;

          return {
            id: idx + 1,
            itemSeq: comp.item_seq,
            operationSeq: comp.operation_seq,
            component: comp.component,
            description: comp.description,
            quantity: bomQty * requiredQuantity,
            uom: comp.uom,
            status: "available",
          };
        }
      );

      setBomItems(mappedComponents);
    } else {
      setBomItems([]);
    }

    setIsItemKnown(true);

    toast({
      title: "BOM Data Loaded",
      description: `${bomOperations.length} operations and ${bomComponents.length} components loaded for ${itemCode}`,
    });
  } catch (error: any) {
    console.error("Error loading BOM data:", error);

    setIsItemKnown(false);

    toast({
      title: "Error Loading BOM",
      description: error.message || "Failed to load BOM data from API",
      variant: "destructive",
    });
  }
};

  const handleSelectOrder = (order: any) => {
    // Filter for product items only (not materials or components)
    const productItems = Array.isArray(order.items)
      ? order.items.filter((item: any) => item.itemType === "Product")
      : [];

    if (productItems.length === 0) {
      toast({
        title: "No Product Items",
        description: "This order does not contain any product items suitable for job creation.",
        variant: "destructive",
      });
      return;
    }

    // Get fresh jobs data from localStorage to ensure we have the latest state
    const currentJobs = JSON.parse(localStorage.getItem("jobs") || "[]");

    // Calculate in-progress quantities per item using fresh data
    const lineItemsWithQty = productItems.map((item: any, index: number) => {
      const itemOrderQty = parseFloat(item.quantityOrdered) || 0;
      // Calculate in-progress jobs for this specific item
      const inProgressQty = currentJobs
        .filter((job: any) =>
          job.orderId === order.id &&
          job.itemCode === item.itemCode &&
          job.status !== "Cancelled" &&
          job.status !== "Completed"
        )
        .reduce((sum: number, job: any) => sum + (parseFloat(job.quantity) || 0), 0);
      const pendingQty = Math.max(0, itemOrderQty - inProgressQty);

      return {
        id: `${order.id}-${item.itemCode}-${index}`,
        itemCode: item.itemCode || "",
        itemName: item.itemName || "",
        itemType: item.itemType || "Product",
        quantityOrdered: itemOrderQty,
        inProgressQty,
        pendingQty,
        selected: false,
        jobQuantity: pendingQty.toString(),
      };
    });

    setOrderLineItems(lineItemsWithQty);

    setJobData((prev) => ({
      ...prev,
      orderId: order.id,
      productName: "",
      itemCode: "",
      quantity: "",
      salesOrderNum: "",
      dueDate: order.expectedDispatchDate || "",
      priority: order.priority || "Medium",
      notes: `Job for order ${order.id}`,
    }));

    // Reset job splits when order changes
    setJobSplits([]);
    setBomItems([]);
    setOperations([]);
    setIsItemKnown(false);
  };

  // Toggle selection of a line item
  const toggleLineItemSelection = (itemId: string) => {
    setOrderLineItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, selected: !item.selected } : item
    ));
  };

  // Select all line items
  const selectAllLineItems = (selected: boolean) => {
    setOrderLineItems(prev => prev.map(item => ({
      ...item,
      selected: item.pendingQty > 0 ? selected : false
    })));
  };

  // Update job quantity for a line item
  const updateLineItemJobQty = (itemId: string, quantity: string) => {
    setOrderLineItems(prev => prev.map(item =>
      item.id === itemId? { ...item, jobQuantity: quantity } : item
    ));
  };

  // Get selected line items count
  const selectedLineItemsCount = orderLineItems.filter(item => item.selected).length;
  const allSelectableSelected = orderLineItems.filter(item => item.pendingQty > 0).every(item => item.selected);

  // Add a new job split
  const addJobSplit = () => {
    const order = orders.find((o: any) => o.id === jobData.orderId);
    if (!order) {
      toast({
        title: "Error",
        description: "Please select an order first",
        variant: "destructive",
      });
      return;
    }

    const pendingQty = calculatePendingJobQty(order);
    const currentTotal = jobSplits.reduce((sum, split) => sum + (parseFloat(split.quantity) || 0), 0);
    const remainingQty = pendingQty - currentTotal;

    if (remainingQty <= 0) {
      toast({
        title: "No Remaining Quantity",
        description: "All pending quantity has been allocated to job splits",
        variant: "destructive",
      });
      return;
    }

    const newJobNumber = generateJobNumber(jobs);
    setJobSplits([
      ...jobSplits,
      {
        id: Date.now().toString(),
        jobNumber: newJobNumber,
        quantity: "",
        dueDate: jobData.dueDate,
        priority: jobData.priority,
        notes: "",
      },
    ]);
  };

  // Update a job split
  const updateJobSplit = (id: string, field: string, value: string) => {
    setJobSplits(jobSplits.map((split) => (split.id === id ? { ...split, [field]: value } : split)));
  };

  // Remove a job split
  const removeJobSplit = (id: string) => {
    setJobSplits(jobSplits.filter((split) => split.id !== id));
  };

  // Calculate total quantity of job splits
  const calculateTotalSplitQuantity = () => {
    return jobSplits.reduce((sum, split) => sum + (parseFloat(split.quantity) || 0), 0);
  };

  // Add/Update operation
  const addOperation = () => {
    const lastSeq = operations.length > 0 ? Math.max(...operations.map((o) => o.sequence)) : 0;
    setOperations([
      ...operations,
      {
        id: operations.length + 1,
        sequence: lastSeq + 10,
        name: "",
        duration: "30",
        status: "pending",
        machine: "",
      },
    ]);
  };

  const updateOperation = (id: number, field: string, value: any) => {
    setOperations(operations.map((op) => (op.id === id ? { ...op, [field]: value } : op)));
  };

  const removeOperation = (id: number) => {
    if (operations.length > 1) {
      setOperations(operations.filter((op) => op.id !== id));
    }
  };

  // Add/Update BOM component
  const addBomItem = () => {
    const lastItemSeq = bomItems.length > 0 ? Math.max(...bomItems.map((b) => b.itemSeq)) : 0;
    setBomItems([
      ...bomItems,
      {
        id: bomItems.length + 1,
        itemSeq: lastItemSeq + 10,
        operationSeq: 10,
        component: "",
        description: "",
        quantity: 1,
        uom: "pcs",
        status: "available",
      },
    ]);
  };

  const updateBomItem = (id: number, field: string, value: any) => {
    setBomItems(bomItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeBomItem = (id: number) => {
    if (bomItems.length > 1) {
      setBomItems(bomItems.filter((item) => item.id !== id));
    }
  };

  // Create jobs for multiple selected line items
 const handleCreateMultipleJobs = async () => {
  const selectedItems = orderLineItems.filter(
    (item) => item.selected && item.pendingQty > 0
  );

  if (selectedItems.length === 0) {
    toast({
      title: "No Items Selected",
      description: "Please select at least one line item to create job cards.",
      variant: "destructive",
    });
    return;
  }

  const invalidItems = selectedItems.filter((item) => {
    const qty = parseFloat(item.jobQuantity);
    return isNaN(qty) || qty <= 0 || qty > item.pendingQty;
  });

  if (invalidItems.length > 0) {
    toast({
      title: "Invalid Quantities",
      description:
        "Job quantities must be valid and not exceed pending quantity.",
      variant: "destructive",
    });
    return;
  }

  try {
    const createdJobs: any[] = [];

    for (const lineItem of selectedItems) {
      const jobNumber = generateJobNumber(jobs);
      const jobQty = parseFloat(lineItem.jobQuantity);

      // 1. Get BOM header (API)
      const bomHeaderRes = await axios.get("/api/bom-headers", {
        params: {
          item_code: lineItem.itemCode,
          status: "Active",
          limit: 1,
          sort: "created_at:desc",
        },
      });

      const bomHeader =
        bomHeaderRes.data?.data?.[0] || bomHeaderRes.data?.[0] || null;

      let itemBomItems: any[] = [];
      let itemOperations: any[] = [];

      if (bomHeader) {
        // 2. Fetch BOM components + operations in parallel
        const [componentsRes, operationsRes] = await Promise.all([
          axios.get("/api/bom-components", {
            params: { bom_id: bomHeader.id, sort: "item_seq:asc" },
          }),
          axios.get("/api/bom-operations", {
            params: { bom_id: bomHeader.id, sort: "operation_seq:asc" },
          }),
        ]);

        const bomComponents = componentsRes.data?.data || componentsRes.data || [];
        const bomOps = operationsRes.data?.data || operationsRes.data || [];

        // Map components
        itemBomItems = bomComponents.map((comp: any, idx: number) => ({
          id: idx + 1,
          itemSeq: comp.item_seq,
          operationSeq: comp.operation_seq,
          component: comp.component,
          description: comp.description,
          quantity: (parseFloat(comp.quantity) || 1) * jobQty,
          uom: comp.uom,
          status: "available",
        }));

        // Map operations
        itemOperations = bomOps.map((op: any, idx: number) => ({
          id: idx + 1,
          sequence: op.operation_seq,
          name: op.description,
          duration: (
            (parseFloat(op.run_time) || 30) * jobQty
          ).toString(),
          status: "pending",
          machine: op.work_center || "",
        }));

        // 3. Commit materials via API
        for (const bomItem of itemBomItems) {
          const requiredQty = parseFloat(bomItem.quantity.toString());

          const stockRes = await axios.get("/api/inventory-stock", {
            params: { item_code: bomItem.component },
          });

          const currentStock =
            stockRes.data?.data?.[0] || stockRes.data?.[0];

          if (currentStock) {
            const currentQtyOnHand =
              currentStock.quantity_on_hand || 0;
            const currentCommitted =
              currentStock.committed_quantity || 0;

            if (currentQtyOnHand >= requiredQty) {
              // update stock
              await axios.patch("/api/inventory-stock", {
                item_code: bomItem.component,
                committed_quantity: currentCommitted + requiredQty,
              });

              // job allocation
              await axios.post("/api/job-allocations", {
                job_number: jobNumber,
                item_code: bomItem.component,
                allocated_quantity: requiredQty,
                status: "allocated",
              });

              // stock transaction
              await axios.post("/api/stock-transactions", {
                item_code: bomItem.component,
                transaction_type: "Commit",
                quantity: requiredQty,
                reference_type: "Job",
                reference_number: jobNumber,
                notes: `Material committed for job ${jobNumber}`,
              });
            }
          }
        }
      }

      // 4. Create job object
      const newJob = {
        id: jobNumber,
        orderId: jobData.orderId,
        productName: lineItem.itemName,
        itemCode: lineItem.itemCode,
        quantity: jobQty.toString(),
        dueDate: jobData.dueDate,
        priority: jobData.priority,
        status: "Pending",
        notes: `Job for order ${jobData.orderId} - ${lineItem.itemName}`,
        operations: itemOperations,
        bomItems: itemBomItems,
        createdAt: new Date().toISOString(),
      };

      createdJobs.push(newJob);
    }

    // 5. Save jobs locally
    const updatedJobs = [...jobs, ...createdJobs];
    localStorage.setItem("jobs", JSON.stringify(updatedJobs));
    setJobs(updatedJobs);

    // 6. Update order status
    const updatedOrders = orders.map((order: any) =>
      order.id === jobData.orderId
        ? { ...order, status: "Processing" }
        : order
    );

    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    setOrders(updatedOrders);

    toast({
      title: "Job Cards Created",
      description: `${createdJobs.length} job card(s) created successfully.`,
    });

    // 7. Reset UI
    setOrderLineItems([]);
    setJobData({
      orderId: "",
      jobNumber: "",
      productName: "",
      itemCode: "",
      salesOrderNum: "",
      itemDescription: "",
      uom: "Ea",
      quantity: "",
      dueDate: "",
      priority: "Medium",
      notes: "",
      routingAvailable: false,
    });

    setIsDialogOpen(false);
  } catch (error: any) {
    console.error(error);

    toast({
      title: "Error Creating Jobs",
      description:
        error.message || "Failed to create job cards",
      variant: "destructive",
    });
  }
};

 const handleCreateJob = async () => {
  if (!jobData.orderId || !jobData.productName) {
    toast({
      title: "Validation Error",
      description: "Please fill in all required fields.",
      variant: "destructive",
    });
    return;
  }

  const isUsingSplits = jobSplits.length > 0;

  const order = orders.find((o: any) => o.id === jobData.orderId);

  if (!order) {
    toast({
      title: "Error",
      description: "Order not found",
      variant: "destructive",
    });
    return;
  }

  const pendingQty = calculatePendingJobQty(order);

  if (pendingQty <= 0) {
    toast({
      title: "No Pending Quantity",
      description: "No pending quantity available for new jobs.",
      variant: "destructive",
    });
    return;
  }

  try {
    const jobsToCreate = isUsingSplits
      ? jobSplits.map((split) => ({
          jobNumber: split.jobNumber,
          quantity: split.quantity,
          dueDate: split.dueDate,
          priority: split.priority,
          notes: split.notes,
        }))
      : [
          {
            jobNumber: jobData.jobNumber,
            quantity: jobData.quantity,
            dueDate: jobData.dueDate,
            priority: jobData.priority,
            notes: jobData.notes,
          },
        ];

    const createdJobs: any[] = [];

    for (const jobInfo of jobsToCreate) {
      const insufficientItems: any[] = [];
      const warnings: any[] = [];

      // 1. Get BOM (API)
      const bomHeaderRes = await axios.get("/api/bom-headers", {
        params: {
          item_code: jobData.itemCode,
          status: "Active",
          limit: 1,
          sort: "created_at:desc",
        },
      });

      const bomHeader =
        bomHeaderRes.data?.data?.[0] || bomHeaderRes.data?.[0];

      let bomItemsToUse: any[] = [];

      if (bomHeader) {
        const compsRes = await axios.get("/api/bom-components", {
          params: { bom_id: bomHeader.id },
        });

        const bomComponents = compsRes.data?.data || compsRes.data || [];

        bomItemsToUse = bomComponents.map((item: any, idx: number) => ({
          ...item,
          quantity:
            (parseFloat(item.quantity) || 1) *
            parseFloat(jobInfo.quantity),
        }));
      }

      // 2. Check & commit inventory
      for (const bomItem of bomItemsToUse) {
        const requiredQty = parseFloat(bomItem.quantity);

        const stockRes = await axios.get("/api/inventory-stock", {
          params: { item_code: bomItem.component },
        });

        const stock = stockRes.data?.data?.[0] || stockRes.data?.[0];

        if (!stock) {
          insufficientItems.push({
            item_code: bomItem.component,
            required: requiredQty,
            available: 0,
          });
          continue;
        }

        const onHand = stock.quantity_on_hand || 0;
        const committed = stock.committed_quantity || 0;

        if (onHand < requiredQty) {
          insufficientItems.push({
            item_code: bomItem.component,
            required: requiredQty,
            available: onHand,
          });
          continue;
        }

        // commit stock
        await axios.patch("/api/inventory-stock", {
          item_code: bomItem.component,
          committed_quantity: committed + requiredQty,
        });

        // allocation
        await axios.post("/api/job-allocations", {
          job_number: jobInfo.jobNumber,
          item_code: bomItem.component,
          allocated_quantity: requiredQty,
          status: "allocated",
        });

        // transaction
        await axios.post("/api/stock-transactions", {
          item_code: bomItem.component,
          transaction_type: "Commit",
          quantity: requiredQty,
          reference_type: "Job",
          reference_number: jobInfo.jobNumber,
          notes: `Material committed for job ${jobInfo.jobNumber}`,
        });

        // reorder warning
        if (stock.reorder_point && onHand < stock.reorder_point) {
          warnings.push({
            message: `${bomItem.component} below reorder level`,
          });
        }
      }

      // ❌ stop if insufficient stock
      if (insufficientItems.length > 0) {
        toast({
          title: "Insufficient Stock",
          description: `Job ${jobInfo.jobNumber} cannot be created`,
          variant: "destructive",
        });
        return;
      }

      // 3. Save item master (local only)
      if (jobData.itemCode && !itemMaster[jobData.itemCode]) {
        const updatedMaster = {
          ...itemMaster,
          [jobData.itemCode]: {
            itemName: jobData.productName,
            operations,
            components: bomItems,
            lastUpdated: new Date().toISOString(),
          },
        };

        localStorage.setItem("itemMaster", JSON.stringify(updatedMaster));
        setItemMaster(updatedMaster);
      }

      // 4. Create job object
      const newJob = {
        id: jobInfo.jobNumber,
        orderId: jobData.orderId,
        productName: jobData.productName,
        itemCode: jobData.itemCode,
        quantity: jobInfo.quantity,
        dueDate: jobInfo.dueDate,
        priority: jobInfo.priority,
        status: "Pending",
        notes: jobInfo.notes,
        operations,
        bomItems,
        consumptionStatus: {
          insufficient: insufficientItems,
          warnings,
        },
        createdAt: new Date().toISOString(),
      };

      createdJobs.push(newJob);
    }

    // 5. Save jobs
    const updatedJobs = [...jobs, ...createdJobs];
    localStorage.setItem("jobs", JSON.stringify(updatedJobs));
    setJobs(updatedJobs);

    // 6. Update order
    const updatedOrders = orders.map((o: any) =>
      o.id === jobData.orderId ? { ...o, status: "Processing" } : o
    );

    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    setOrders(updatedOrders);

    toast({
      title: isUsingSplits ? "Jobs Created" : "Job Created",
      description: `${createdJobs.length} job(s) created successfully`,
    });

    // 7. Reset form
    setJobData({
      orderId: "",
      jobNumber: "",
      productName: "",
      itemCode: "",
      salesOrderNum: "",
      itemDescription: "",
      uom: "Ea",
      quantity: "",
      dueDate: "",
      priority: "Medium",
      notes: "",
      routingAvailable: false,
    });

    setJobSplits([]);
    setIsDialogOpen(false);
  } catch (error: any) {
    console.error(error);
    toast({
      title: "Error Creating Job",
      description: error.message || "Failed to create job",
      variant: "destructive",
    });
  }
};

const handleJobStatusChange = async (jobId: string, newStatus: string) => {
  console.log("========== JOB STATUS CHANGE START ==========");
  console.log("Job ID:", jobId);
  console.log("New Status:", newStatus);

  const job = jobs.find((j: any) => j.id === jobId);

  console.log("Matched Job:", job);

  if (!job) {
    console.log("Job not found");
    return;
  }

  const previousStatus = job.status;

  if (previousStatus === "Completed") {
    toast({
      title: "Job is Completed",
      description: "Completed jobs are locked and can no longer be modified.",
      variant: "destructive",
    });
    return;
  }

  // Note: releasing reserved stock on Cancelled/Closed/Completed is now
  // handled server-side by JobController::update() whenever the status
  // PUT below lands on a terminal status — see the reservation-lifecycle
  // logic added there. No client-side release call needed here.

  console.log("Previous Status:", previousStatus);

  // Only trigger inventory update when status changes
  if (
    (newStatus === "Completed" || newStatus === "Ready for Dispatch") &&
    previousStatus !== "Completed" &&
    previousStatus !== "Ready for Dispatch"
  ) {
    try {
      const quantity = parseFloat(job.quantity) || 1;
      const itemCode = job.assembly;
      const itemName = job.product_name;

      console.log("Quantity:", quantity);
      console.log("Item Code:", itemCode);
      console.log("Item Name:", itemName);

      if (!itemCode) {
        console.log("Missing item code");

        toast({
          title: "Error",
          description: "Job does not have an item code. Cannot add to inventory.",
          variant: "destructive",
        });

        return;
      }

      // Note: releasing the job's remaining reserved material is now
      // handled server-side by JobController::update() (called by the
      // status PUT at the end of this function) — it releases any unissued
      // reserved qty without touching quantity_on_hand, per the SRS. This
      // used to be duplicated here client-side, and incorrectly subtracted
      // unissued qty from quantity_on_hand as if it had been consumed.

      // =========================
      // CHECK FINISHED PRODUCT STOCK
      // =========================
      console.log("Checking finished product stock...");

      const stockSearchRes = await axios.get(
        `/api/inventory-stock?search=${encodeURIComponent(itemCode)}`
      );
      const existingStock = (stockSearchRes.data?.items || []).find(
        (i: any) => i.itemCode === itemCode
      );

      console.log("Existing Finished Product Stock:", existingStock);

      if (existingStock) {
        console.log("Updating existing finished product stock...");

        await axios.put(`/api/inventory-stock/${existingStock.id}`, {
          quantity_on_hand: (existingStock.quantityOnHand || 0) + quantity,
        });
      } else {
        console.log("Creating new finished product stock...");

        await axios.post(`/api/inventory-stock`, {
          item_code: itemCode,
          item_name: itemName,
          item_type: "Product",
          quantity_on_hand: quantity,
          unit_cost: 0,
        });
      }

      // =========================
      // CREATE PRODUCTION TRANSACTION
      // =========================
      console.log("Creating production transaction...");

      await axios.post(`/api/stock-transactions`, {
        item_code: itemCode,
        transaction_type: "Production",
        quantity: quantity,
        reference_type: "Job",
        reference_number: jobId,
        notes: `Finished product added from ${newStatus.toLowerCase()} job ${jobId}`,
      });

      toast({
        title: "Job Completed",
        description: `Job ${job.job_number} marked as ${newStatus}. Materials consumed and ${quantity} units of ${itemName} added to inventory.`,
      });
    } catch (error: any) {
      console.error("Inventory Update Error:", error);

      toast({
        title: "Error Updating Inventory",
        description: error.message,
        variant: "destructive",
      });

      return;
    }
  }

  // =========================
  // UPDATE JOB STATUS
  // =========================
  try {
    console.log("Updating job status in database...");

    const response = await axios.put(`/api/jobs/${jobId}`, {
      status: newStatus,
    });

    // Backend returns { success, message, data: job } — unwrap to the job itself.
    const updatedJob = response.data?.data;

    console.log("Updated Job:", updatedJob);

    const updatedJobs = jobs.map((j: any) =>
      j.id === jobId ? { ...j, ...updatedJob } : j
    );

    setJobs(updatedJobs);

    toast({
      title: "Success",
      description: `Job status updated to ${newStatus}`,
    });

    console.log("========== JOB STATUS CHANGE END ==========");
  } catch (error: any) {
    console.error("Job Status Update Error:", error);

    toast({
      title: "Error",
      description:
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update job status",
      variant: "destructive",
    });
  }
};

const handleDeleteJob = async (job: any) => {
  try {

    await axios.delete(`/api/jobs/${job.id}`);

    setJobs((prevJobs: any[]) =>
      prevJobs.filter((j: any) => j.id !== job.id)
    );

    toast({
      title: "Job Deleted",
      description: `Job ${job.job_number} deleted successfully.`,
    });

  } catch (error: any) {

    toast({
      title: "Error",
      description:
        error?.response?.data?.message ||
        "Failed to delete job",
      variant: "destructive",
    });
  }
};

  // Handler for creating job from new JobCardDialog
 const handleCreateJobFromDialog = useCallback(
  async (
    newJobData: any,
    newOperations: any[],
    newBomItems: any[],
    newJobSplits: any[],
    moveQuantities: any,

  ) => {

    if (!newJobData.itemCode) {
  toast({
    title: "Validation Error",
    description: "Assembly (Item Code) is required",
    variant: "destructive",
  });
  return;
}

if (!newJobData.quantity || Number(newJobData.quantity) <= 0) {
  toast({
    title: "Validation Error",
    description: "Start quantity is required and must be greater than 0",
    variant: "destructive",
  });
  return;
}

if (!newJobData.startDate) {
  toast({
    title: "Validation Error",
    description: "Start date is required",
    variant: "destructive",
  });
  return;
}

if (!newJobData.completionDate) {
  toast({
    title: "Validation Error",
    description: "Completion date is required",
    variant: "destructive",
  });
  return;
}
    try {
      const payload = {
        job_number: newJobData.jobNumber,
        assembly: newJobData.itemCode,
        product_name: newJobData.productName,
        sales_order_number: newJobData.salesOrderNum || "",
        customer_id: newJobData.customerId || null,
        customer_name: newJobData.customerName || "",
        class: newJobData.jobClass || "Standard",
        type: newJobData.jobType || "Standard",
        uom: newJobData.uom || "Ea",
        status: "Pending",
        priority: newJobData.priority || "Medium",
        start: newJobData.quantity,
        alternate: newJobData.alternate || "",
        revision: newJobData.revision || "",
          mrp_net: Number(newJobData.mrpNet || 0),   // ✅ FIXED KEY
  is_firm: Boolean(newJobData.firm),


        start_date: newJobData.startDate || null,
        completion_date: newJobData.completionDate || newJobData.dueDate || null,

        notes: newJobData.notes || "",
        bom_id: newJobData.bomId || null,

        // COMPONENTS — qty here is the per-assembly BOM quantity (matches the
        // live BOM), NOT multiplied by job quantity. The backend multiplies
        // by the job's own quantity when reserving (JobController::store),
        // and the total "required" figure lives in `quantities` below.
        components: newBomItems?.map((item: any) => ({
          seq: item.itemSeq ?? 10,
          component: item.component ?? "",
          description: item.description ?? "",
          qty: Number(item.quantity ?? 0),
          uom: item.uom ?? "pcs",
          status: "Available",
        })) || [],

        // ❗ FIXED OPERATIONS KEY (VERY IMPORTANT)
  operations: newOperations?.map((op: any) => ({
  sequence: op.sequence,
  operation_code: op.operation_code || op.code || op.name || `OP-${op.sequence}`,
  description: op.description || op.name || "",
  work_center: op.workCenter || "",
  department: op.department || "",
  run_time: Number(op.duration || op.runTime || 0),
  status: "Pending",
})) || [],

  // ✅ FIXED MAPPINGS BELOW
   quantities: newBomItems?.map((q: any) => {
    const perAssembly = q.quantity || 0;
  const jobQty = Number(newJobData.quantity) || 0;
    const onHand =
    q.onHand ??
    q.quantityOnHand ??
    q.availableQuantity ??
    0;


  const required = perAssembly * jobQty;

  return {

  component: q.component,
  uom: q.uom,
  basis: q.basisType || "",
  per_assembly: q.quantity || 0,
  inverse_usage: q.inverseUsage || (perAssembly ? 1 / perAssembly : 0),
  yield: q.yield || "",
  required: required,
  issued: 0,
  open: required,
  on_hand: onHand,
  };
}) || [],

 moves: moveQuantities
  ? Object.entries(moveQuantities).map(([seq, v]: any) => ({
      seq: Number(seq),
      in_queue: v?.inQueue || 0,
      running: v?.running || 0,
      to_move: v?.toMove || 0,
      rejected: v?.rejected || 0,
      scrapped: v?.scrapped || 0,
      completed: v?.completed || 0,
    }))
  : [],


   lots:
          newJobData.lotNum || newJobData.buildSeq || newJobData.task
            ? [
                {
                  lot_number: newJobData.lotNum ?? "",
                  build_seq: newJobData.buildSeq ?? "",
                  task: newJobData.task ?? "",
                },
              ]
            : [],
      };

      console.log("JOB PAYLOAD ", payload);
      console.log("moveQuantities:", moveQuantities);
        console.log("lots:", {
        lotNum: newJobData.lotNum,
        buildSeq: newJobData.buildSeq,
        task: newJobData.task,
      });


      const response = await axios.post("/api/jobs", payload);

      const createdJob = response.data?.data;

      if (!createdJob) {
        throw new Error("Job creation failed - no response data");
      }

      // ✅ NO localStorage
      setJobs((prev: any[]) => [...prev, createdJob]);

      const order = orders.find((o: any) => o.id === newJobData.orderId);

      if (order) {
        const updatedOrders = orders.map((o: any) =>
          o.id === newJobData.orderId
            ? { ...o, status: "Processing" }
            : o
        );

        setOrders(updatedOrders);
      }


      await fetchJobs();

      toast({
        title: "Job Created",
        description: `Job ${newJobData.jobNumber} created successfully.`,
      });

      setIsDialogOpen(false);

    } catch (error: any) {
      toast({
        title: "Error Creating Job",
        description: error.message || "Failed to create job",
        variant: "destructive",
      });
    }
  },
  [jobs, orders, toast,]
);

  // Memoize generateJobNumber for JobCardDialog
  const memoizedGenerateJobNumber = useCallback(() => {
  console.log("JOBS11:", jobs);
  return generateJobNumber(jobs);
}, [jobs]);

  // Handler for finding jobs with filters
const handleFindJobs = useCallback(
  (filters: JobFilters) => {

    let filtered = [...jobs];

    // ----------------------------
    // helper: extract JOB NUMBER safely
    // JOB-000001 → 1
    // ----------------------------
    const getJobNum = (job: any) => {
      const raw = job.job_number || job.jobNumber || job.id || "";
      const num = String(raw).match(/\d+/g)?.join("");
      return num ? Number(num) : null;
    };

    // ----------------------------
    // 1. TEXT SEARCH (JOB NUMBER LIKE JOB-000001)
    // ----------------------------
    if (filters.jobFrom || filters.jobTo) {
      const searchTextFrom = filters.jobFrom?.toLowerCase();
      const searchTextTo = filters.jobTo?.toLowerCase();

      if (searchTextFrom && searchTextTo) {
        // if both entered → treat as RANGE text fallback
        filtered = filtered.filter((job) => {
          const jobNo = String(job.job_number || "").toLowerCase();
          return (
            jobNo >= searchTextFrom && jobNo <= searchTextTo
          );
        });
      } else if (searchTextFrom) {
        filtered = filtered.filter((job) =>
          String(job.job_number || "")
            .toLowerCase()
            .includes(searchTextFrom)
        );
      }
    }

    // ----------------------------
    // 2. NUMERIC RANGE FILTER (CORRECT FIX)
    // ----------------------------
    const fromNum = filters.jobFrom ? Number(filters.jobFrom.replace(/\D/g, "")) : null;
    const toNum = filters.jobTo ? Number(filters.jobTo.replace(/\D/g, "")) : null;

    if (fromNum !== null || toNum !== null) {
      filtered = filtered.filter((job) => {
        const jobNum = getJobNum(job);

        console.log("➡️ CHECK:", job.job_number, jobNum);

        if (jobNum === null) return false;

        if (fromNum !== null && jobNum < fromNum) return false;
        if (toNum !== null && jobNum > toNum) return false;

        return true;
      });
    }

    // ----------------------------
    // 3. TYPE FILTER
    // ----------------------------
    if (filters.type) {
      filtered = filtered.filter(
        (job) =>
          (job.type || job.jobType || "Standard") === filters.type
      );
    }

    // ----------------------------
    // 4. ASSEMBLY FILTER
    // ----------------------------
    if (filters.assembly) {
  const search = filters.assembly.toLowerCase();

  filtered = filtered.filter((job) => {
    const itemCode = job.item_code || "";
    const assembly = job.assembly || "";
    const productName = job.product_name || "";

    const match =
      itemCode.toLowerCase().includes(search) ||
      assembly.toLowerCase().includes(search) ||
      productName.toLowerCase().includes(search);

    return match;
  });

}

    // ----------------------------
    // 5. CLASS FILTER
    // ----------------------------
    if (filters.class) {
      const search = filters.class.toLowerCase();

      filtered = filtered.filter((job) =>
        (job.class || job.jobClass || "")
          .toLowerCase()
          .includes(search)
      );
    }

    // ----------------------------
    // 6. STATUS FILTER
    // ----------------------------
    const selectedStatuses: string[] = [
      ...(filters.statusUnreleased
        ? ["Pending", "Created", "Unreleased"]
        : []),
      ...(filters.statusReleased
        ? ["In Progress", "Released"]
        : []),
      ...(filters.statusComplete
        ? ["Completed", "Complete", "Ready for Dispatch"]
        : []),
      ...(filters.statusOnHold ? ["On Hold"] : []),
    ];

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((job) =>
        selectedStatuses.includes(job.status)
      );
    }

    // ----------------------------
    // FINAL RESULT
    // ----------------------------
    console.log("✅ FINAL FILTERED JOBS:", filtered);

    setFilteredJobs(filtered);
    setIsSearchResultsOpen(true);

    toast({
      title: "Jobs Found",
      description: `Found ${filtered.length} job(s)`,
    });
  },
  [jobs, toast]
);
  // Handler for opening a job from search results
  const handleOpenJobFromSearch = useCallback((job: any) => {
    setSelectedJob(job);
    setIsSearchResultsOpen(false);
    setIsViewDialogOpen(true);
  }, []);

  // Handler for viewing operations from search results
  const handleViewOperationsFromSearch = useCallback((job: any) => {
    setSelectedJob(job);
    setIsSearchResultsOpen(false);
    setIsViewDialogOpen(true);
  }, []);

  // Handler for viewing components from search results
  const handleViewComponentsFromSearch = useCallback((job: any) => {
    setSelectedJob(job);
    setIsSearchResultsOpen(false);
    setIsViewDialogOpen(true);
  }, []);

  // Handler for viewing genealogy from search results
  const handleViewGenealogyFromSearch = useCallback((job: any) => {
    setSelectedJob(job);
    setIsSearchResultsOpen(false);
    setIsViewDialogOpen(true);
  }, []);

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Production Jobs</h1>
            <p className="text-muted-foreground mt-1">Manage and track production jobs</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsFindJobsDialogOpen(true)}>
              <Search className="h-4 w-4 mr-2" />
              Find Jobs
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </div>
        </div>

        {/* Find Jobs Dialog */}
        <FindJobsDialog
          open={isFindJobsDialogOpen}
          onOpenChange={setIsFindJobsDialogOpen}
          onFind={handleFindJobs}
          onNew={() => setIsDialogOpen(true)}
        />

        {/* New ERP-Style Job Card Dialog */}
        <JobCardDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setJobPrefill(null);
          }}
          pendingOrders={pendingOrders}
          orders={orders}
          nextJobNumber={nextJobNumber}
          initialData={jobPrefill}
          onCreateJob={handleCreateJobFromDialog}
          generateJobNumber={memoizedGenerateJobNumber}
          calculateInProgressJobQty={calculateInProgressJobQty}
          calculatePendingJobQty={calculatePendingJobQty}
        />

        {/* Main Jobs List Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {filteredJobs.length > 0 ? "Search Results" : "Created Jobs"}
                </CardTitle>
                <CardDescription>
                  {filteredJobs.length > 0
                    ? `Showing ${filteredJobs.length} filtered job(s)`
                    : "All jobs created from orders"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {filteredJobs.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilteredJobs([])}
                  >
                    Clear Filter
                  </Button>
                )}
                {jobs.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {jobs.length} job(s) • {jobs.filter((j: any) => j.status === "Pending").length} pending •{" "}
                    {jobs.filter((j: any) => j.priority === "High").length} high priority
                  </p>
                )}
                <div className="flex items-center gap-1 rounded-md border p-0.5">
                  <Button
                    variant={jobViewMode === "cards" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => setJobViewMode("cards")}
                    title="Card view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={jobViewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => setJobViewMode("list")}
                    title="List view"
                  >
                    <Rows3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="border border-dashed rounded-lg py-10 text-center text-muted-foreground text-sm">
                No jobs created yet. Click <span className="font-medium">Create Job</span> to get started.
              </div>
            ) : jobViewMode === "list" ? (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Number</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ops</TableHead>
                      <TableHead className="text-right">Comp.</TableHead>
                      <TableHead className="w-[190px]">Update Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(filteredJobs.length > 0 ? filteredJobs : jobs).map((job: any) => {
                      const rejectedQty = Array.isArray(job.moves)
                        ? job.moves.reduce((sum: number, m: any) => sum + Number(m.rejected || 0), 0)
                        : 0;
                      // A rework job's notes always end with "from <origin job number>"
                      // (see the Create Rework Job handler below) — that's the only
                      // link back to the job it was reworked from, so it doubles as
                      // the check for "has this rejection already been reworked?".
                      const hasReworkJob = jobs.some(
                        (j: any) => typeof j.notes === "string" && j.notes.endsWith(`from ${job.job_number}`)
                      );
                      return (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium text-primary whitespace-nowrap">{job.job_number}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{job.product_name}</TableCell>
                        <TableCell className="whitespace-nowrap">{job.assembly || "N/A"}</TableCell>
                        <TableCell className="text-right">{job.start}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {job.completion_date || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={job.priority === "High" ? "destructive" : "secondary"}
                            className="text-[11px] px-2"
                          >
                            {job.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              job.status === "Completed"
                                ? "secondary"
                                : job.status === "Ready for Dispatch"
                                  ? "outline"
                                  : job.status === "In Progress"
                                    ? "default"
                                    : "outline"
                            }
                            className="text-[11px] whitespace-nowrap"
                          >
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {job.operations?.length || 0}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {job.bomItems?.length || 0}
                        </TableCell>
                        <TableCell>
                          {job.jobType?.toLowerCase() !== "discrete" && job.status !== "Completed" ? (
                            <Select value={job.status} onValueChange={(value) => handleJobStatusChange(job.id, value)}>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Ready for Dispatch">Ready for Dispatch</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">View only</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View"
                              onClick={() => {
                                setSelectedJob(job);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {rejectedQty > 0 && (
                              hasReworkJob ? (
                                <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                                  Rework Created
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  title="Create Rework Job"
                                  onClick={() => {
                                    setJobPrefill({
                                      itemCode: job.assembly || "",
                                      itemName: job.product_name || job.assembly || "",
                                      quantity: rejectedQty,
                                      salesOrderNum: job.sales_order_number || "",
                                      notes: `Rework for ${rejectedQty} rejected unit(s) from ${job.job_number}`,
                                    });
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  Create Rework Job
                                </Button>
                              )
                            )}
                            {job.jobType?.toLowerCase() !== "discrete" && job.status !== "Completed" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete"
                                onClick={() => handleDeleteJob(job)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {(filteredJobs.length > 0 ? filteredJobs : jobs).map((job: any) => (
                  <Card key={job.id} className="flex flex-col border border-border/60 shadow-sm h-full">
                    <CardHeader className="pb-3">
                      <div className="text-xs font-semibold text-primary mb-1">{job.job_number}</div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{job.product_name}</CardTitle>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {job.orderId && <>ORDER {job.orderId}</>}
                          </p>
                        </div>
                        <Badge
                          variant={
                            job.status === "Completed"
                              ? "secondary"
                              : job.status === "Ready for Dispatch"
                                ? "outline"
                                : job.status === "In Progress"
                                  ? "default"
                                  : "outline"
                          }
                          className="text-[11px] shrink-0"
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 pb-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Item Code</span>
                          <span className="font-medium">{job.assembly || "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Job Quantity</span>
                          <span className="font-medium">{job.start}</span>
                        </div>
                        {job.orderId && (() => {
                          const order = orders.find((o: any) => o.id === job.orderId);
                          if (order) {
                            const productItems = Array.isArray(order.items)
                              ? order.items.filter((item: any) => item.itemType === "Product")
                              : [];
                            const orderQty = productItems.reduce((sum: number, item: any) =>
                              sum + (parseFloat(item.quantityOrdered) || 0), 0
                            );
                            const inProgressQty = calculateInProgressJobQty(job.orderId);
                            const pendingQty = Math.max(0, orderQty - inProgressQty);

                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Order Qty</span>
                                  <span className="font-medium">{orderQty}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">In-Progress Qty</span>
                                  <span className="font-medium">{inProgressQty}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Pending Qty</span>
                                  <span className={`font-medium ${pendingQty === 0 ? "text-muted-foreground" : "text-foreground"}`}>
                                    {pendingQty}
                                  </span>
                                </div>
                              </>
                            );
                          }
                          return null;
                        })()}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Quantity</span>
                          <span className="font-medium">{job.start}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Due Date</span>
                          <span className="font-medium">{job.completion_date || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Priority</span>
                          <Badge
                            variant={job.priority === "High" ? "destructive" : "secondary"}
                            className="text-[11px] px-2"
                          >
                            {job.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          Created: {new Date(job.created_at).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-muted-foreground">
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Operations: {job.operations?.length || 0}
                        </span>
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-muted-foreground">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Components: {job.bomItems?.length || 0}
                        </span>
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 border-t pt-3 mt-auto">
                      {/* Discrete jobs and Completed jobs are view-only - no status update allowed */}
                      {job.jobType?.toLowerCase() !== "discrete" && job.status !== "Completed" && (
                        <div className="w-full">
                          <Label className="text-[11px] text-muted-foreground mb-1.5 block">Update Status</Label>
                          <Select value={job.status} onValueChange={(value) => handleJobStatusChange(job.id, value)}>
                            <SelectTrigger className="h-9 text-xs w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Ready for Dispatch">Ready for Dispatch</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Show view-only indicator for discrete jobs and Completed jobs */}
                      {(job.jobType?.toLowerCase() === "discrete" || job.status === "Completed") && (
                        <div className="w-full">
                          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted/50 rounded-md border border-dashed">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-medium">
                              {job.status === "Completed" ? "View Only - Job Completed" : "View Only - Discrete Job"}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 flex-1 text-xs"
                          onClick={() => {
                            setSelectedJob(job);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                        {/* Hide delete button for discrete jobs and Completed jobs */}
                        {job.jobType?.toLowerCase() !== "discrete" && job.status !== "Completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 flex-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteJob(job)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Job Dialog */}
        <ViewJobDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          job={selectedJob}
          linkedReworkJobs={
            selectedJob
              ? jobs.filter(
                  (j: any) => typeof j.notes === "string" && j.notes.endsWith(`from ${selectedJob.job_number}`)
                )
              : []
          }
        />

        {/* Job Search Results Dialog */}
        <JobSearchResultsDialog
          open={isSearchResultsOpen}
          onOpenChange={setIsSearchResultsOpen}
          jobs={filteredJobs}
          onOpen={handleOpenJobFromSearch}
          onViewOperations={handleViewOperationsFromSearch}
          onViewComponents={handleViewComponentsFromSearch}
          onViewGenealogy={handleViewGenealogyFromSearch}
        />
      </div>
    </Layout>
  );
};

export default Planning;
