import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import axios from "axios";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


const rfqSchema = z.object({
  title: z.string().min(1, "Title is required"),
  payment_terms: z.string().optional(),
  delivery_location: z.string().optional(),
  notes: z.string().optional(),
});

type RFQFormValues = z.infer<typeof rfqSchema>;

interface RFQFormProps {
  initialItem?: {
    item_code: string;
    item_name: string;
    description?: string;
    quantity: number;
  };
  onSuccess?: () => void;
}

export default function RFQForm({ initialItem, onSuccess }: RFQFormProps) {
  const [vendors, setVendors] = useState([{ vendor_name: "", vendor_email: "", vendor_contact: "" }]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [vendorList, setVendorList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(
    initialItem
      ? [{
        item_code: initialItem.item_code,
        item_name: initialItem.item_name,
        description: initialItem.description || "",
        quantity: initialItem.quantity.toString(),
        required_date: "",
      }]
      : [{ item_code: "", item_name: "", description: "", quantity: "", required_date: "" }]
  );
  const { toast } = useToast();

  const form = useForm<RFQFormValues>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      title: "",
      payment_terms: "",
      delivery_location: "",
      notes: "",
    },
  });

  const generateRFQNumber = () => {
    const timestamp = Date.now();
    return `RFQ-${timestamp}`;
  };

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await axios.get("/api/inventory-stock");

        console.log("RAW inventory response:", res.data);

        const data = res.data?.items || [];

        console.log("CLEAN inventory:", data);

        setInventoryItems(data);
      } catch (err) {
        console.error("Failed to fetch inventory", err);
        setInventoryItems([]);
      }
    };

    fetchInventory();
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await axios.get("/api/vendors");

        const formatted = Array.isArray(res.data)
          ? res.data
          : res.data?.data ?? [];

        setVendorList(
          formatted.map((v: any) => ({
            vendor_name: v.vendor_name,
            email: v.email,        // ✅ from DB
            phone: v.phone         // ✅ from DB
          }))
        );
      } catch (err) {
        console.error("Failed to fetch vendors", err);
      }
    };

    fetchVendors();
  }, []);

  const onSubmit = async (values: RFQFormValues) => {


    // RFQ Title Validation
    if (!values.title || values.title.trim() === "") {
      toast({
        title: "Validation Error",
        description: "Please enter RFQ Title",
        variant: "destructive",
      });
      return;
    }

    if (!values.delivery_location || values.delivery_location.trim() === "") {
  toast({
    title: "Validation Error",
    description: "Please enter Delivery Location",
    variant: "destructive",
  });
  return;
}

   // Item Validation
const validItems = items.filter(item => {
  const qty = Number(item.quantity);

  return (
    item.item_code &&
    item.item_name &&
    item.quantity !== "" &&
    !isNaN(qty) &&
    qty > 0
  );
});

if (validItems.length === 0) {
  toast({
    title: "Validation Error",
    description: "Please select item with valid quantity (> 0)",
    variant: "destructive",
  });
  return;
}

const missingRequiredDateItems = items.filter(item => {
  const qty = Number(item.quantity);

  return (
    item.item_code &&
    item.item_name &&
    item.quantity !== "" &&
    !isNaN(qty) &&
    qty > 0 &&
    (!item.required_date || item.required_date.trim() === "")
  );
});

if (missingRequiredDateItems.length > 0) {
  toast({
    title: "Validation Error",
    description: "Please select Required Date for all items",
    variant: "destructive",
  });
  return;
}

    // Vendor Validation
    const validVendors = vendors.filter(
      vendor => vendor.vendor_name
    );

    if (validVendors.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select vendor",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    let loadingToast;

    try {
      loadingToast = toast({
        title: "Processing...",
        description: "Creating RFQ, please wait...",
      });

      const payload = {
        rfq_number: generateRFQNumber(),
        title: values.title,
        status: "Sent",
        payment_terms: values.payment_terms || null,
        delivery_location: values.delivery_location || null,
        notes: values.notes || null,
        items: items
          .filter(item => item.item_code && item.item_name && item.quantity)
          .map(item => ({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.description || null,
            quantity: parseInt(item.quantity),
            required_date: item.required_date || null,
          })),
        vendors: vendors
          .filter(v => v.vendor_name)
          .map(v => ({
            vendor_name: v.vendor_name,
            vendor_email: v.vendor_email || null,
            vendor_contact: v.vendor_contact || null,
            status: "Pending",
          })),
      };

      const response = await axios.post("/api/rfqs", payload);

      toast({
        title: "Success",
        description: "RFQ created successfully",
      });

      form.reset();
      setVendors([{ vendor_name: "", vendor_email: "", vendor_contact: "" }]);
      setItems([{ item_code: "", item_name: "", description: "", quantity: "", required_date: "" }]);

      if (onSuccess) onSuccess();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false); // 👈 always stop loading
    }
  };


  const addVendor = () => {
    setVendors([...vendors, { vendor_name: "", vendor_email: "", vendor_contact: "" }]);
  };

  const removeVendor = (index: number) => {
    setVendors(vendors.filter((_, i) => i !== index));
  };

  const updateVendor = (index: number, field: string, value: string) => {
    const updated = [...vendors];
    updated[index] = { ...updated[index], [field]: value };
    setVendors(updated);
  };

  const addItem = () => {
    setItems([...items, { item_code: "", item_name: "", description: "", quantity: "", required_date: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RFQ Title *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Raw Materials for Q1 2025" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <FormField
              control={form.control}
              name="payment_terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Net 30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="col-span-2">
            <FormField
              control={form.control}
              name="delivery_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Location</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter delivery address/location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={5}
                  className="min-h-[120px] resize-y"
                  placeholder="Additional instructions, requirements, or notes..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <FormLabel className="text-base font-semibold">
                RFQ Items
              </FormLabel>

              <p className="text-sm text-muted-foreground">
                Add items required for quotation
              </p>
            </div>

            <Button type="button" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
          </div>

          {/* Table Container */}
          <div className="border rounded-xl overflow-hidden">

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 bg-muted/50 px-3 py-3 text-sm font-medium">
              <div className="col-span-2">Item Code</div>
              <div className="col-span-3">Item Name</div>
              <div className="col-span-2">Description</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Required Date</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 p-3 items-center"
                >
                  {/* Item Code */}
                  <div className="col-span-2">
                    <select
                      value={item.item_code || ""}
                      onChange={(e) => {
                        const value = e.target.value;

                        const selected = inventoryItems.find(
                          (i: any) =>
                            String(i.itemCode) === String(value)
                        );

                        setItems(prev => {
                          const updated = [...prev];

                          updated[index] = {
                            ...updated[index],
                            item_code: selected?.itemCode || value,
                            item_name: selected?.itemName || "",
                            description: selected?.description || ""
                          };

                          return updated;
                        });
                      }}
                      className="w-full h-10 border rounded-md px-2 bg-background"
                    >
                      <option value="">Select</option>

                      {inventoryItems.map((i: any, idx: number) => (
                        <option
                          key={idx}
                          value={String(i.itemCode)}
                        >
                          {i.itemCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Item Name */}
                  <div className="col-span-3">
                    <Input
                      placeholder="Item Name"
                      value={item.item_name || ""}
                      onChange={(e) =>
                        updateItem(index, "item_name", e.target.value)
                      }
                    />
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                    />
                  </div>

                  {/* Required Date */}
                  <div className="col-span-2">
                    <Input
                      type="date"
                      value={item.required_date}
                      onChange={(e) =>
                        updateItem(index, "required_date", e.target.value)
                      }
                    />
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex justify-center">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <FormLabel className="text-base font-semibold">
                Vendors
              </FormLabel>

              <p className="text-sm text-muted-foreground">
                Add vendors for quotation request
              </p>
            </div>

            <Button type="button" size="sm" onClick={addVendor}>
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
          </div>

          {/* Table Container */}
          <div className="border rounded-xl overflow-hidden">

            {/* Header */}
            <div className="grid grid-cols-12 gap-3 bg-muted/50 px-3 py-3 text-sm font-medium">
              <div className="col-span-4">Vendor Name</div>
              <div className="col-span-4">Email</div>
              <div className="col-span-3">Contact Number</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {vendors.map((vendor, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 p-3 items-center"
                >
                  {/* Vendor Select */}
                  <div className="col-span-4">
                    <select
                      value={vendor.vendor_name || ""}
                      onChange={(e) => {
                        const value = e.target.value;

                        const selected = vendorList.find(
                          v => v.vendor_name === value
                        );

                        setVendors(prev => {
                          const updated = [...prev];

                          updated[index] = {
                            ...updated[index],
                            vendor_name: selected?.vendor_name || value,
                            vendor_email: selected?.email || "",
                            vendor_contact: selected?.phone || ""
                          };

                          return updated;
                        });
                      }}
                      className="w-full h-10 border rounded-md px-2 bg-background"
                    >
                      <option value="">Select Vendor</option>

                      {vendorList.map((v, i) => (
                        <option key={i} value={v.vendor_name}>
                          {v.vendor_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email */}
                  <div className="col-span-4">
                    <Input
                      placeholder="Email"
                      type="email"
                      value={vendor.vendor_email || ""}
                      onChange={(e) =>
                        updateVendor(index, "vendor_email", e.target.value)
                      }
                    />
                  </div>

                  {/* Contact */}
                  <div className="col-span-3">
                    <Input
                      placeholder="Contact Number"
                      value={vendor.vendor_contact || ""}
                      onChange={(e) =>
                        updateVendor(index, "vendor_contact", e.target.value)
                      }
                    />
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex justify-center">
                    {vendors.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeVendor(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit">Create RFQ</Button>
        </div>
      </form>
    </Form>
  );
}
