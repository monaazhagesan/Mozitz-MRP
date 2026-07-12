import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { Plus, Send, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";

const rfqSchema = z.object({
  title: z.string().min(1, "Title is required"),
  payment_terms: z.string().optional(),
  delivery_location: z.string().optional(),
  notes: z.string().optional(),
});

type RFQFormValues = z.infer<typeof rfqSchema>;

interface RFQ {
  id: string;
  rfq_number: string;
  title: string;
  status: string;
  created_at: string;
  sent_at: string | null;
}

export default function RFQManagement() {
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRFQ, setSelectedRFQ] = useState<any>(null);
  const [vendors, setVendors] = useState([{ vendor_name: "", vendor_email: "", vendor_contact: "" }]);
  const [items, setItems] = useState([{ item_code: "", item_name: "", description: "", quantity: "", required_date: "" }]);
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

  useEffect(() => {
    fetchRFQs();
    // Check if coming from MRP's "Create RFQ (Manual)" action: ?items=CODE:QTY,CODE2:QTY2
    const urlParams = new URLSearchParams(window.location.search);
    const itemsParam = urlParams.get('items');
    if (itemsParam) {
      loadShortageItemsAndCreateRFQ(itemsParam.split(','));
    }
  }, []);

  const loadShortageItemsAndCreateRFQ = async (itemParams: string[]) => {
    try {
      const parsed = itemParams
        .map((entry) => {
          const [item_code, qty] = entry.split(':');
          return { item_code, quantity: qty };
        })
        .filter((p) => p.item_code);

      const invRes = await axios.get("/api/inventory-stock");
      const inventoryItems: any[] = invRes.data?.items || [];
      const nameByCode = new Map<string, string>(
        inventoryItems.map((i: any) => [i.itemCode ?? i.item_code, i.itemName ?? i.item_name])
      );

      const prefillItems = parsed.map((p) => ({
        item_code: p.item_code,
        item_name: nameByCode.get(p.item_code) || p.item_code,
        description: "",
        quantity: p.quantity || "1",
        required_date: "",
      }));

      if (prefillItems.length > 0) {
        form.setValue("title", `RFQ for ${prefillItems.map((i) => i.item_name).join(", ")}`);
        setItems(prefillItems);
        setOpen(true);

        toast({
          title: "Shortage Items Loaded",
          description: `${prefillItems.length} item(s) loaded from MRP. Complete RFQ details and add vendors.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchRFQs = async () => {
    try {
      const res = await axios.get("/api/rfqs");
      setRfqs(res.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRFQNumber = () => {
    const timestamp = Date.now();
    return `RFQ-${timestamp}`;
  };

  const onSubmit = async (values: RFQFormValues) => {
    try {
      const rfqItems = items
        .filter(item => item.item_code && item.item_name && item.quantity)
        .map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description || null,
          quantity: parseFloat(item.quantity),
          required_date: item.required_date || new Date().toISOString().split("T")[0],
        }));

      const vendorData = vendors
        .filter(v => v.vendor_name)
        .map(v => ({
          vendor_name: v.vendor_name,
          vendor_email: v.vendor_email || null,
          vendor_contact: v.vendor_contact || null,
          status: "pending",
        }));

      await axios.post("/api/rfqs", {
        rfq_number: generateRFQNumber(),
        title: values.title,
        status: "draft",
        payment_terms: values.payment_terms || null,
        delivery_location: values.delivery_location || null,
        notes: values.notes || null,
        items: rfqItems,
        vendors: vendorData,
      });

      toast({
        title: "Success",
        description: "RFQ created successfully",
      });

      form.reset();
      setVendors([{ vendor_name: "", vendor_email: "", vendor_contact: "" }]);
      setItems([{ item_code: "", item_name: "", description: "", quantity: "", required_date: "" }]);
      setOpen(false);
      fetchRFQs();
      // Clear URL params
      window.history.replaceState({}, '', '/purchase/rfq-management');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendRFQ = async (id: string) => {
    try {
      await axios.post(`/api/rfq/send/${id}`);

      toast({
        title: "Success",
        description: "RFQ sent to vendors successfully",
      });

      fetchRFQs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "default",
      viewed: "outline",
      quoted: "outline",
      closed: "default",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      viewed: "Viewed",
      quoted: "Quoted",
      closed: "Closed",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const viewRFQ = async (rfqId: string) => {
    try {
      const res = await axios.get(`/api/rfqs/${rfqId}`);
      const rfqData = res.data || {};

      setSelectedRFQ({
        ...rfqData,
        items: rfqData.items || [],
        vendors: rfqData.vendors || [],
      });
      setViewOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
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
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">RFQ Management</h1>
            <p className="text-muted-foreground mt-1">Create and manage Request for Quotations</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create RFQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create RFQ</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RFQ Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Raw Materials for Q1 2025" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                    <FormField
                      control={form.control}
                      name="delivery_location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Location</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel>RFQ Items</FormLabel>
                      <Button type="button" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-2">
                          <Input
                            placeholder="Item Code"
                            value={item.item_code}
                            onChange={(e) => updateItem(index, "item_code", e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder="Item Name"
                            value={item.item_name}
                            onChange={(e) => updateItem(index, "item_name", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Quantity"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="date"
                            placeholder="Required Date"
                            value={item.required_date}
                            onChange={(e) => updateItem(index, "required_date", e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          {items.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel>Vendors</FormLabel>
                      <Button type="button" size="sm" onClick={addVendor}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Vendor
                      </Button>
                    </div>
                    {vendors.map((vendor, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <Input
                            placeholder="Vendor Name"
                            value={vendor.vendor_name}
                            onChange={(e) => updateVendor(index, "vendor_name", e.target.value)}
                          />
                        </div>
                        <div className="col-span-4">
                          <Input
                            placeholder="Email"
                            value={vendor.vendor_email}
                            onChange={(e) => updateVendor(index, "vendor_email", e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder="Contact"
                            value={vendor.vendor_contact}
                            onChange={(e) => updateVendor(index, "vendor_contact", e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          {vendors.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => removeVendor(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create RFQ</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : rfqs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No RFQs found</TableCell>
                </TableRow>
              ) : (
                rfqs.map((rfq) => (
                  <TableRow key={rfq.id}>
                    <TableCell className="font-medium">{rfq.rfq_number}</TableCell>
                    <TableCell>{rfq.title}</TableCell>
                    <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                    <TableCell>{format(new Date(rfq.created_at), "PP")}</TableCell>
                    <TableCell>{rfq.sent_at ? format(new Date(rfq.sent_at), "PP") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {rfq.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => sendRFQ(rfq.id)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewRFQ(rfq.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* View RFQ Dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>RFQ Details</DialogTitle>
            </DialogHeader>
            {selectedRFQ && (
              <div className="space-y-6">
                {/* RFQ Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">RFQ Number</p>
                    <p className="font-medium">{selectedRFQ.rfq_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium">{selectedRFQ.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div>{getStatusBadge(selectedRFQ.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="font-medium">{format(new Date(selectedRFQ.created_at), "PP")}</p>
                  </div>
                  {selectedRFQ.payment_terms && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Terms</p>
                      <p className="font-medium">{selectedRFQ.payment_terms}</p>
                    </div>
                  )}
                  {selectedRFQ.delivery_location && (
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Location</p>
                      <p className="font-medium">{selectedRFQ.delivery_location}</p>
                    </div>
                  )}
                </div>

                {selectedRFQ.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium">{selectedRFQ.notes}</p>
                  </div>
                )}

                {/* Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Required Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRFQ.items && selectedRFQ.items.length > 0 ? (
                        selectedRFQ.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.item_code}</TableCell>
                            <TableCell>{item.item_name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{format(new Date(item.required_date), "PP")}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No items found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Vendors */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Vendors</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRFQ.vendors && selectedRFQ.vendors.length > 0 ? (
                        selectedRFQ.vendors.map((vendor: any) => (
                          <TableRow key={vendor.id}>
                            <TableCell>{vendor.vendor_name}</TableCell>
                            <TableCell>{vendor.vendor_email || "-"}</TableCell>
                            <TableCell>{vendor.vendor_contact || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={vendor.status === "sent" ? "default" : "secondary"}>
                                {vendor.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No vendors found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = `/purchase/vendor-quotations?rfq=${selectedRFQ.id}`}
                  >
                    View Quotations
                  </Button>
                  <Button onClick={() => setViewOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
