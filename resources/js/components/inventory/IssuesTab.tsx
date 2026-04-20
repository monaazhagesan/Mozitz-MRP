import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, FileText, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
   import axios from "axios";

 interface Issue {
  id: string;
  issueNo: string;
  issueDate: string;
  issueType: "job" | "order";
  referenceNo: string;
  referenceName: string;
  warehouse: string;
  issuedBy: string;
  remarks: string;
  status: string;
  items: IssueItem[];
  createdAt: string;
}

interface IssueItem {
  id: string;
  itemCode: string;
  itemName: string;
  requiredQty: number;
  previouslyIssued: number;
  pendingQty: number;
  issuedQty: number;
  uom: string;
  availableStock?: number;
  balanceQty?: number;
  error?: string;
}

interface Job {
  id: string;
  jobNumber: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  status: string;
  bomComponents?: any[];
}

interface Order {
  id: string;
  // Support both legacy shape (orderNumber/customerName) and Orders page shape (id/customer)
  orderNumber?: string;
  orderNo?: string;
  customerName?: string;
  customer?: string;
  items: any[];
}

const getJobNumber = (job: any): string =>
  (job?.jobNumber || job?.job_no || job?.job_number || job?.id || "").toString();

const getJobItemCode = (job: any): string =>
  (job?.itemCode || job?.item_code || "").toString();

const getJobItemName = (job: any): string =>
  (job?.itemName || job?.productName || job?.item_name || job?.product_name || "").toString();

const getJobQty = (job: any): number => {
  const raw = job?.quantity ?? job?.qty ?? job?.jobQty ?? 0;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

const getJobStatus = (job: any): string => (job?.status || "").toString();

const normalizeJob = (job: any): Job => {
  const jobNumber = getJobNumber(job);
  return {
    id: jobNumber || job?.id || crypto.randomUUID(),
    jobNumber,
    itemCode: getJobItemCode(job),
    itemName: getJobItemName(job),
    quantity: getJobQty(job),
    status: getJobStatus(job),
    bomComponents: job?.bomComponents || job?.bomItems || job?.bom_components || [],
  };
};

const getOrderNumber = (order: any): string =>
  (order?.orderNumber || order?.orderNo || order?.id || "").toString();

const getOrderCustomerName = (order: any): string =>
  (order?.customerName || order?.customer || order?.customer_name || "").toString();

const IssuesTab = () => {
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>(() => {
    const saved = localStorage.getItem("material_issues");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchType, setSearchType] = useState<"job" | "order">("job");
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [issueType, setIssueType] = useState<"job" | "order">("job");
  const [selectedReference, setSelectedReference] = useState<Job | Order | null>(null);
  const [warehouse, setWarehouse] = useState("Main Warehouse");
  const [remarks, setRemarks] = useState("");
  const [issueItems, setIssueItems] = useState<IssueItem[]>([]);
  const [jobNoInput, setJobNoInput] = useState("");
  const [orderNoInput, setOrderNoInput] = useState("");
  const [referenceError, setReferenceError] = useState("");

  // Search results
  const [jobs, setJobs] = useState<Job[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchResults, setSearchResults] = useState<(Job | Order)[]>([]);
  const [locations, setLocations] = useState<{ id: string; location_name: string }[]>([]);

  // Load jobs and orders
 useEffect(() => {
  const savedJobs = localStorage.getItem("jobs");

  if (savedJobs) {
    try {
      const parsed = JSON.parse(savedJobs);
      if (Array.isArray(parsed)) {
        setJobs(parsed.map(normalizeJob));
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error("Failed to parse jobs from localStorage:", error);
      setJobs([]);
    }
  } else {
    setJobs([]);
  }
}, []);

    const savedOrders = localStorage.getItem("orders");
    if (savedOrders) {
      try {
        const parsed = JSON.parse(savedOrders);
        setOrders(Array.isArray(parsed) ? parsed : []);
      } catch {
        setOrders([]);
      }
    }

    // Load locations

useEffect(() => {
  const fetchLocations = async () => {
    try {
      const response = await axios.get("/api/locations"); // Replace with your API endpoint
      if (response.data) {
        setLocations(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load locations",
        variant: "destructive",
      });
    }
  };

  fetchLocations();
}, []);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const savedJobs = localStorage.getItem("jobs");
      if (savedJobs) {
        try {
          const parsed = JSON.parse(savedJobs);
          setJobs(Array.isArray(parsed) ? parsed.map(normalizeJob) : []);
        } catch {
          setJobs([]);
        }
      }

      const savedOrders = localStorage.getItem("orders");
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          setOrders(Array.isArray(parsed) ? parsed : []);
        } catch {
          setOrders([]);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const generateIssueNo = () => {
    const prefix = "ISS";
    const existingNumbers = issues.map((i) => {
      const match = i.issueNo.match(/ISS-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = Math.max(0, ...existingNumbers) + 1;
    return `${prefix}-${String(nextNumber).padStart(5, "0")}`;
  };

  const handleSearch = () => {
    const term = searchTerm.toLowerCase();

    if (searchType === "job") {
      const filtered = jobs.filter((job) =>
        getJobNumber(job).toLowerCase().includes(term) ||
        (job.itemCode || "").toLowerCase().includes(term) ||
        (job.itemName || "").toLowerCase().includes(term)
      );
      setSearchResults(filtered);
    } else {
      const filtered = orders.filter((order) => {
        const orderNo = getOrderNumber(order).toLowerCase();
        const customer = getOrderCustomerName(order).toLowerCase();
        return orderNo.includes(term) || customer.includes(term);
      });
      setSearchResults(filtered);
    }
  };

  // Fetch available stock for items (floored at 0; negative = over-allocated)

const fetchAvailableStock = async (items: IssueItem[]): Promise<IssueItem[]> => {
  const itemsWithStock = await Promise.all(
    items.map(async (item) => {
      try {
        const response = await axios.get("/api/inventory_stock", {
          params: { item_code: item.itemCode },
        });

        const stockItem = response.data;

        const onHand = Number(stockItem?.quantity_on_hand ?? 0);
        const avail =
          stockItem?.available_quantity != null
            ? Number(stockItem.available_quantity)
            : onHand;

        // Issuance is constrained by physical on-hand stock, not by allocations.
        // Floor at 0 so over-allocated items don't show negative numbers.
        const issuableStock = Math.max(
          0,
          Math.min(onHand, Number.isFinite(avail) ? avail : onHand)
        );

        return {
          ...item,
          availableStock: Math.max(0, onHand),
          balanceQty: item.requiredQty,
        };
      } catch (error) {
        console.error(`Error fetching stock for ${item.itemCode}`, error);

        return {
          ...item,
          availableStock: 0,
          balanceQty: item.requiredQty,
        };
      }
    })
  );

  return itemsWithStock;
};

  // Lookup Job by Job No (text input)
  const handleLookupJob = async () => {
    if (!jobNoInput.trim()) {
      setReferenceError("Please enter a Job No");
      return;
    }
    setReferenceError("");

    const jobNumberInput = jobNoInput.trim();

    // Always read latest jobs from localStorage (state can be stale within the same tab)
    let latestJobs: Job[] = jobs;
    const savedJobs = localStorage.getItem("jobs");
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        latestJobs = Array.isArray(parsed) ? parsed.map(normalizeJob) : [];
        setJobs(latestJobs);
      } catch {
        // ignore parse errors; fall back to current state
      }
    }

    // First try to find in localStorage (supports both {jobNumber} and {id} shapes)
   const handleJobReference = async () => {
  // First, try to find job in latestJobs
  const job = latestJobs.find(
    (j) => getJobNumber(j).toLowerCase() === jobNumberInput.toLowerCase()
  );

  if (job) {
    const status = (job.status || "").toLowerCase();
    if (status === "completed" || status === "cancelled" || status === "canceled") {
      setReferenceError(`Cannot issue to ${job.status} job`);
      return;
    }

    setSelectedReference(job);
    await loadJobMaterials(job);
    return;
  }

  // Fallback: fetch job allocations from backend API
  try {
    const response = await axios.get("/api/job_allocations", {
      params: { job_number: jobNumberInput },
    });

    const allocations = response.data; // Expected: [{ status: "allocated" | "consumed" | ... }, ...]

    if (allocations && allocations.length > 0) {
      const allConsumed = allocations.every((a: any) => a.status === "consumed");
      if (allConsumed) {
        setReferenceError("Cannot issue to Completed job");
        return;
      }

      // Minimal job object for db-only jobs
      const dbJob: Job = {
        id: jobNumberInput,
        jobNumber: jobNumberInput,
        itemCode: "",
        itemName: "",
        quantity: 1,
        status: "Pending",
        bomComponents: [],
      };

      setSelectedReference(dbJob);
      await loadJobMaterials(dbJob);
      return;
    }

    setReferenceError("Job not found");
  } catch (error: any) {
    console.error("Error fetching job allocations:", error);
    setReferenceError("Failed to verify job allocations");
  }
};

  // Lookup Order by Order No (text input)
  const handleLookupOrder = async () => {
    if (!orderNoInput.trim()) {
      setReferenceError("Please enter an Order No");
      return;
    }
    setReferenceError("");

    const orderNumberInput = orderNoInput.trim();

    const order = orders.find(
      (o) => getOrderNumber(o).toLowerCase() === orderNumberInput.toLowerCase()
    );

    if (!order) {
      setReferenceError("Order not found");
      return;
    }

    setSelectedReference(order);
    await loadOrderItems(order);
  };

  // Build map of previously-issued qty per item for a given reference (job/order)
  const buildPreviouslyIssuedMap = (refNo: string, type: "job" | "order"): Record<string, number> => {
    const map: Record<string, number> = {};
    issues
      .filter((iss) => iss.issueType === type && iss.referenceNo === refNo && iss.status !== "Cancelled")
      .forEach((iss) => {
        iss.items.forEach((it) => {
          map[it.itemCode] = (map[it.itemCode] || 0) + (Number(it.issuedQty) || 0);
        });
      });
    return map;
  };

 // Load job materials. Priority:
  // 1) BOM from bom_headers using job.itemCode (qty × jobQty) — source of truth
  // 2) Local job.bomComponents (saved on the job)
  // 3) job_allocations (legacy fallback)


const loadJobMaterials = async (job: Job) => {
  let items: IssueItem[] = [];

  const jobNumber = job.jobNumber || job.id;
  const jobQty = Number(job.quantity) || 1;
  const prevIssued = buildPreviouslyIssuedMap(jobNumber, "job");

  console.log("loadJobMaterials - jobNumber:", jobNumber, "itemCode:", job.itemCode, "qty:", jobQty);

  try {
    // 1) BOM from backend using job itemCode
    if (job.itemCode) {
      const bomRes = await axios.get("/api/bom/header", {
        params: {
          item_code: job.itemCode,
          status: "Active",
        },
      });

      const bomData = bomRes.data;

      if (bomData?.length > 0) {
        const latestBom = bomData[0];

        const compRes = await axios.get("/api/bom/components", {
          params: { bom_id: latestBom.id },
        });

        const components = compRes.data;

        if (components?.length > 0) {
          items = components.map((comp: any, index: number) => {
            const required = (Number(comp.quantity) || 0) * jobQty;
            const prev = prevIssued[comp.component] || 0;

            return {
              id: `item-${index}`,
              itemCode: comp.component,
              itemName: comp.description,
              requiredQty: required,
              previouslyIssued: prev,
              pendingQty: Math.max(0, required - prev),
              issuedQty: 0,
              uom: comp.uom,
            };
          });
        }
      }
    }

    // 2) Fallback to local BOM
    if (items.length === 0) {
      const bomComponents = job.bomComponents || [];

      if (bomComponents.length > 0) {
        items = bomComponents.map((comp: any, index: number) => {
          const itemCode =
            comp.component || comp.itemCode || comp.item_code || "";

          const perUnit =
            parseFloat(comp.quantity ?? comp.qty ?? 1) || 1;

          const required = perUnit * jobQty;
          const prev = prevIssued[itemCode] || 0;

          return {
            id: `item-${index}`,
            itemCode,
            itemName:
              comp.description ||
              comp.itemName ||
              comp.item_name ||
              "",
            requiredQty: required,
            previouslyIssued: prev,
            pendingQty: Math.max(0, required - prev),
            issuedQty: 0,
            uom: comp.uom || "EA",
          };
        });
      }
    }

    // 3) Final fallback: job allocations
    if (items.length === 0) {
      const allocRes = await axios.get("/api/job-allocations", {
        params: {
          job_number: jobNumber,
          status: ["allocated", "released"],
        },
      });

      const jobAllocations = allocRes.data;

      if (jobAllocations?.length > 0) {
        const aggregated: Record<string, number> = {};

        jobAllocations.forEach((alloc: any) => {
          aggregated[alloc.item_code] =
            (aggregated[alloc.item_code] || 0) +
            (alloc.allocated_quantity || 0);
        });

        const itemCodes = Object.keys(aggregated);

        // fetch item names
        const invRes = await axios.get("/api/inventory-items", {
          params: { item_codes: itemCodes },
        });

        const inventoryItems = invRes.data;

        const itemNameMap = new Map(
          inventoryItems?.map((i: any) => [i.item_code, i.item_name]) || []
        );

        items = itemCodes.map((itemCode, index) => {
          const required = aggregated[itemCode];
          const prev = prevIssued[itemCode] || 0;

          return {
            id: `item-${index}`,
            itemCode,
            itemName: itemNameMap.get(itemCode) || itemCode,
            requiredQty: required,
            previouslyIssued: prev,
            pendingQty: Math.max(0, required - prev),
            issuedQty: 0,
            uom: "EA",
          };
        });
      }
    }

    // No data found
    if (items.length === 0) {
      toast({
        title: "No BOM found",
        description: `No active BOM or allocations found for ${
          job.itemCode || jobNumber
        }. Please verify the job has a BOM.`,
        variant: "destructive",
      });
    }

    // Attach stock
    const itemsWithStock = await fetchAvailableStock(items);

    console.log("loadJobMaterials - final items:", itemsWithStock);
    setIssueItems(itemsWithStock);

  } catch (error) {
    console.error("Error loading job materials:", error);

    toast({
      title: "Error",
      description: "Failed to load job materials.",
      variant: "destructive",
    });
  }
};

  const loadOrderItems = async (order: Order) => {
    let items: IssueItem[] = [];
    
    const orderItems = Array.isArray((order as any).items) ? (order as any).items : [];
    const orderNo = getOrderNumber(order);
    const prevIssued = buildPreviouslyIssuedMap(orderNo, "order");

    if (orderItems.length > 0) {
      items = orderItems.map((item: any, index: number) => {
        const qtyRaw = item.quantityOrdered ?? item.quantity ?? item.qty ?? 0;
        const requiredQty = typeof qtyRaw === "number" ? qtyRaw : parseFloat(qtyRaw) || 0;
        const itemCode = item.itemCode || item.item_code || item.code || "";
        const prev = prevIssued[itemCode] || 0;

        return {
          id: `item-${index}`,
          itemCode,
          itemName: item.itemName || item.item_name || item.name || "",
          requiredQty,
          previouslyIssued: prev,
          pendingQty: Math.max(0, requiredQty - prev),
          issuedQty: 0,
          uom: item.uom || item.unit || "EA",
        };
      });
    }

    // Fetch available stock for all items
    const itemsWithStock = await fetchAvailableStock(items);
    setIssueItems(itemsWithStock);
  };

  const handleSelectReference = async (ref: Job | Order) => {
    setIsSearchDialogOpen(false);
    setReferenceError("");

    if (issueType === "job") {
      const job = normalizeJob(ref);

      const status = (job.status || "").toLowerCase();
      if (status === "completed" || status === "cancelled" || status === "canceled") {
        setReferenceError(`Cannot issue to ${job.status} job`);
        setSelectedReference(null);
        return;
      }

      setSelectedReference(job);
      setJobNoInput(job.jobNumber);
      await loadJobMaterials(job);
    } else {
      const order = ref as Order;
      setSelectedReference(order);
      setOrderNoInput(getOrderNumber(order));
      await loadOrderItems(order);
    }
  };

  const handleIssueQtyChange = (itemId: string, qty: number) => {
    setIssueItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        
        const availableStock = item.availableStock ?? 0;
        const pendingQty = item.pendingQty ?? item.requiredQty;
        let error = "";
        
       if (qty < 0) {
          error = "Quantity cannot be negative";
        } else if (availableStock <= 0 && qty > 0) {
          error = "Insufficient stock — cannot issue";
        } else if (qty > availableStock) {
          error = `Exceeds available stock (${availableStock})`;
        
         } else if (qty > pendingQty) {
          error = `Exceeds pending qty (${pendingQty})`;
        }
        
        return { 
          ...item, 
          issuedQty: qty,
          error 
        };
      })
    );
  };

  const handleCreateIssue = async () => {
    if (!selectedReference) {
      const hasRefInput = issueType === "job" ? jobNoInput.trim() : orderNoInput.trim();
      toast({
        title: "Error",
        description: hasRefInput
          ? `Please click the search icon to load the ${issueType === "job" ? "Job" : "Order"} details`
          : "Please select a Job or Order",
        variant: "destructive",
      });
      return;
    }

    // Validate job status again before creating
    if (issueType === "job") {
      const job = selectedReference as Job;
      if (job.status === "Completed" || job.status === "Cancelled") {
        toast({
          title: "Error",
          description: `Cannot issue to ${job.status} job`,
          variant: "destructive",
        });
        return;
      }
    }

    const itemsToIssue = issueItems.filter((item) => item.issuedQty > 0);
    if (itemsToIssue.length === 0) {
      toast({
        title: "Error",
        description: "Please enter issue quantities for at least one item",
        variant: "destructive",
      });
      return;
    }

    // Check for validation errors
  // Step 1: Check for items with validation errors
const itemsWithErrors = itemsToIssue.filter((item) => item.error);

if (itemsWithErrors.length > 0) {
  toast({
    title: "Validation Error",
    description: "Please fix the quantity errors before proceeding",
    variant: "destructive",
  });
  return;
}

// Step 1: Re-validate stock availability
for (const item of itemsToIssue) {
  try {
    const res = await axios.get(
      `/api/inventory-stock/${item.itemCode}`
    );

    const stockItem = res.data;

    const onHand = Math.max(
      0,
      Number(stockItem?.quantity_on_hand ?? 0)
    );

    if (item.issuedQty > onHand) {
      toast({
        title: "Stock Error",
        description: `Insufficient stock for ${item.itemCode}. Available: ${onHand}`,
        variant: "destructive",
      });
      return;
    }
  } catch (error: any) {
    toast({
      title: "Stock Fetch Error",
      description: `Failed to fetch stock for ${item.itemCode}: ${error.message}`,
      variant: "destructive",
    });
    return;
  }
}

// Step 2: Get current user (IMPORTANT FIX)
const getCurrentUser = async () => {
  try {
    const res = await axios.get("/api/user", {
      withCredentials: true,
    });

    return {
      userEmail: res.data?.email || "Unknown User",
      userId: res.data?.id || null,
    };
  } catch (error) {
    console.error("Error fetching user:", error);

    return {
      userEmail: "Unknown User",
      userId: null,
    };
  }
};

const { userEmail, userId } = await getCurrentUser();

// Step 3: Prepare Issue record
const newIssue: Issue = {
  id: crypto.randomUUID(),
  issueNo: generateIssueNo(),
  issueDate: format(new Date(), "yyyy-MM-dd"),
  issueType,
  referenceNo:
    issueType === "job"
      ? (selectedReference as Job).jobNumber
      : getOrderNumber(selectedReference as Order),
  referenceName:
    issueType === "job"
      ? (selectedReference as Job).itemName
      : getOrderCustomerName(selectedReference as Order),

  issuedBy: userEmail,
  warehouse,
  remarks,
  status: "Issued",
  items: itemsToIssue,
  createdAt: new Date().toISOString(),
};

// Step 4: Update stock + transactions
for (const item of itemsToIssue) {
  try {
    const res = await axios.get(
      `/api/inventory-stock/${item.itemCode}`
    );

    const stockItem = res.data;
    if (!stockItem) continue;

    const onHand = Number(stockItem.quantity_on_hand || 0);
    const allocated = Number(stockItem.allocated_quantity || 0);
    const committed = Number(stockItem.committed_quantity || 0);

    const newOnHand = Math.max(0, onHand - item.issuedQty);

    const newAllocated =
      issueType === "job"
        ? Math.max(0, allocated - item.issuedQty)
        : allocated;

    const newAvailable = Math.max(
      0,
      newOnHand - newAllocated - committed
    );

    // Update stock
    await axios.patch(
      `/api/inventory-stock/${item.itemCode}`,
      {
        quantity_on_hand: newOnHand,
        allocated_quantity: newAllocated,
        available_quantity: newAvailable,
        last_transaction_date: new Date().toISOString(),
      }
    );

    // Stock transaction log
    await axios.post("/api/stock-transactions", {
      item_code: item.itemCode,
      transaction_type: "Issue",
      quantity: -item.issuedQty,
      reference_type:
        issueType === "job" ? "Job Issue" : "Order Issue",
      reference_number: newIssue.referenceNo,
      notes: `Issued ${item.issuedQty} ${item.uom} to ${issueType} ${
        newIssue.referenceNo
      } by ${userEmail}${
        userId ? ` (${userId})` : ""
      }. Issue#: ${newIssue.issueNo}`,
      unit_cost: stockItem.unit_cost ?? 0,
    });
  } catch (error: any) {
    toast({
      title: "Stock Update Error",
      description: `Failed to update stock for ${item.itemCode}: ${error.message}`,
      variant: "destructive",
    });
    return;
  }
}

// Sync issued quantities back to job card (localStorage jobs)
    if (issueType === "job") {
      try {
        const savedJobs = localStorage.getItem("jobs");
        if (savedJobs) {
          const parsedJobs = JSON.parse(savedJobs);
          if (Array.isArray(parsedJobs)) {
            const refNo = newIssue.referenceNo;
            const updated = parsedJobs.map((j: any) => {
              const jNo = getJobNumber(j);
              if (jNo !== refNo) return j;
              const issuedMap: Record<string, number> = { ...(j.issuedQuantities || {}) };
              itemsToIssue.forEach((it) => {
                issuedMap[it.itemCode] = (issuedMap[it.itemCode] || 0) + it.issuedQty;
              });
              return { ...j, issuedQuantities: issuedMap, lastIssueAt: new Date().toISOString() };
            });
            localStorage.setItem("jobs", JSON.stringify(updated));
            setJobs(updated.map(normalizeJob));
            window.dispatchEvent(new Event("storage"));
          }
        }
      } catch (e) {
        console.warn("Failed to sync issued qty to job card", e);
      }
    }

    // Save issue to localStorage
    const updatedIssues = [...issues, newIssue];
    localStorage.setItem("material_issues", JSON.stringify(updatedIssues));
    setIssues(updatedIssues);

    toast({
      title: "Issue Created",
      description: `Material issue ${newIssue.issueNo} created successfully`,
    });

    // Reset form
    resetForm();
    setIsCreateDialogOpen(false);
  };

  const resetForm = () => {
    setIssueType("job");
    setSelectedReference(null);
    setWarehouse("Main Warehouse");
    setRemarks("");
    setIssueItems([]);
    setSearchTerm("");
    setSearchResults([]);
    setJobNoInput("");
    setOrderNoInput("");
    setReferenceError("");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Issued: "default",
      Partial: "secondary",
      Cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Material Issues</h3>
          <p className="text-sm text-muted-foreground">Issue materials against Jobs or Orders</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Issue
        </Button>
      </div>

      {/* Issues List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Issued By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No material issues found. Click "New Issue" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-mono">{issue.issueNo}</TableCell>
                    <TableCell>{issue.issueDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.issueType === "job" ? "Job Issue" : "Order Issue"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{issue.referenceNo}</span>
                        <p className="text-sm text-muted-foreground">{issue.referenceName}</p>
                      </div>
                    </TableCell>
                    <TableCell>{issue.warehouse}</TableCell>
                    <TableCell>{issue.issuedBy}</TableCell>
                    <TableCell>{getStatusBadge(issue.status)}</TableCell>
                    <TableCell>{issue.items.length} items</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Issue Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">Create Material Issue</DialogTitle>
            <DialogDescription className="text-muted-foreground">Issue materials from inventory against a Job or Order</DialogDescription>
          </DialogHeader>

          <ScrollArea type="always" className="flex-1 min-h-0">
            <div className="py-6 space-y-6 pr-4">
              {/* Issue Details Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">Issue Details</h3>
                <div className="border rounded-lg p-4 bg-card">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Issue No</Label>
                      <Input 
                        value={generateIssueNo()} 
                        disabled 
                        className="bg-muted/50 border-muted text-muted-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Issue Date</Label>
                      <Input 
                        type="text" 
                        value={format(new Date(), "MM/dd/yyyy")} 
                        disabled 
                        className="bg-muted/50 border-muted text-muted-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Issue Type</Label>
                      <Select
                        value={issueType}
                        onValueChange={(value: "job" | "order") => {
                          setIssueType(value);
                          setSelectedReference(null);
                          setIssueItems([]);
                        }}
                      >
                        <SelectTrigger className="bg-primary text-primary-foreground border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="job">Job Issue</SelectItem>
                          <SelectItem value="order">Order Issue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Warehouse / Store</Label>
                      <Select value={warehouse} onValueChange={setWarehouse}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Main Warehouse">Main Warehouse</SelectItem>
                          {locations.filter(loc => loc.location_name).map((loc) => (
                            <SelectItem key={loc.id} value={loc.location_name}>
                              {loc.location_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{issueType === "job" ? "Job No" : "Order No"}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={issueType === "job" ? jobNoInput : orderNoInput}
                          onChange={(e) => {
                            if (issueType === "job") {
                              setJobNoInput(e.target.value);
                              setSelectedReference(null);
                              setIssueItems([]);
                            } else {
                              setOrderNoInput(e.target.value);
                              setSelectedReference(null);
                              setIssueItems([]);
                            }
                            setReferenceError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (issueType === "job") handleLookupJob();
                              else handleLookupOrder();
                            }
                          }}
                          placeholder={`Enter ${issueType === "job" ? "Job" : "Order"} No...`}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (issueType === "job") handleLookupJob();
                            else handleLookupOrder();
                          }}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      {referenceError && (
                        <p className="text-sm text-destructive">{referenceError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Issued By</Label>
                      <Input 
                        value="Current User" 
                        disabled 
                        className="bg-muted/50 border-muted text-muted-foreground" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-fetched Info */}
              {selectedReference && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-foreground">
                    {issueType === "job" ? "Job Details" : "Order Details"}
                  </h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {issueType === "job" ? (
                        <>
                          <div>
                            <Label className="text-muted-foreground text-xs">Job Item</Label>
                            <p className="font-medium">{(selectedReference as Job).itemName}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Item Code</Label>
                            <p className="font-mono">{(selectedReference as Job).itemCode}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Job Qty</Label>
                            <p className="font-medium">{(selectedReference as Job).quantity}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label className="text-muted-foreground text-xs">Customer</Label>
                            <p className="font-medium">{getOrderCustomerName(selectedReference as Order)}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Order No</Label>
                            <p className="font-mono">{getOrderNumber(selectedReference as Order)}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Items</Label>
                            <p className="font-medium">{(selectedReference as any)?.items?.length || 0} items</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Items to Issue */}
              {issueItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-foreground">
                    {issueType === "job" ? "BOM Components" : "Order Items"}
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <ScrollArea className="max-h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Item Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead className="text-right">Available</TableHead>
                            <TableHead className="text-right">Required</TableHead>
                            <TableHead className="text-right">Issued</TableHead>
                            <TableHead className="text-right">Pending</TableHead>
                            <TableHead className="text-right">Issue Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                         {issueItems.map((item) => {
                            const insufficient = (item.availableStock ?? 0) <= 0;
                            const fullyIssued = (item.pendingQty ?? 0) <= 0;
                            return (
                              <TableRow key={item.id} className={item.error ? "bg-destructive/10" : ""}>
                                <TableCell className="font-mono">{item.itemCode}</TableCell>
                                <TableCell>{item.itemName}</TableCell>
                                <TableCell>{item.uom}</TableCell>
                                <TableCell className="text-right">
                                  <span className={insufficient ? "text-destructive font-medium" : ""}>
                                    {item.availableStock ?? 0}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">{item.requiredQty}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {item.previouslyIssued ?? 0}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {item.pendingQty ?? 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end gap-1">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={Math.min(item.pendingQty ?? 0, item.availableStock ?? 0)}
                                      value={item.issuedQty}
                                      disabled={fullyIssued || insufficient}
                                      onChange={(e) => handleIssueQtyChange(item.id, parseFloat(e.target.value) || 0)}
                                      className={`w-24 text-right ${item.error ? "border-destructive" : ""}`}
                                    />
                                    {item.error && (
                                      <span className="text-xs text-destructive">{item.error}</span>
                                    )}
                                    {fullyIssued && !item.error && (
                                      <span className="text-xs text-muted-foreground">Fully issued</span>
                                    )}
                                    {insufficient && !fullyIssued && !item.error && (
                                      <span className="text-xs text-destructive">No stock</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">Remarks / Reference</h3>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any additional notes..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIssue} className="bg-primary">
              <FileText className="h-4 w-4 mr-2" />
              Create Issue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {searchType === "job" ? "Find Job" : "Find Order"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={searchType === "job" ? "Search by Job No, Item Code..." : "Search by Order No, Customer..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {searchType === "job" ? (
                      <>
                        <TableHead>Job No</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Order No</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={searchType === "job" ? 5 : 3} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "No results found" : "Enter search term and click Search"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults.map((result) => (
                      <TableRow
                        key={result.id}
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSelectReference(result)}
                      >
                        {searchType === "job" ? (
                          <>
                            <TableCell className="font-mono">{getJobNumber(result as Job)}</TableCell>
                            <TableCell className="font-mono">{(result as Job).itemCode}</TableCell>
                            <TableCell>{(result as Job).itemName}</TableCell>
                            <TableCell>{(result as Job).quantity}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{(result as Job).status}</Badge>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-mono">{getOrderNumber(result as Order)}</TableCell>
                            <TableCell>{getOrderCustomerName(result as Order)}</TableCell>
                            <TableCell>{(result as any)?.items?.length || 0} items</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; }

export default IssuesTab;
