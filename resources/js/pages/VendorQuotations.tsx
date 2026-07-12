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
import { Plus, CheckCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const quotationSchema = z.object({
  vendor_name: z.string().min(1, "Vendor name is required"),
  item_code: z.string().min(1, "Item code is required"),
  item_name: z.string().min(1, "Item name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  quoted_price: z.string().min(1, "Price is required"),
  tax_percent: z.string().optional(),
  delivery_days: z.string().optional(),
  warranty: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

type QuotationFormValues = z.infer<typeof quotationSchema>;

interface Quotation {
  id: string;
  rfq_id: string;
  vendor_name: string;
  item_code: string;
  item_name: string;
  quantity: number;
  quoted_price: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  delivery_days: number;
  warranty: string;
  terms: string;
  status: string;
  is_selected: boolean;
  received_at: string;
}

interface RFQ {
  id: string;
  rfq_number: string;
  title: string;
}

export default function VendorQuotations() {
  const [open, setOpen] = useState(false);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [selectedRFQ, setSelectedRFQ] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      vendor_name: "",
      item_code: "",
      item_name: "",
      quantity: "",
      quoted_price: "",
      tax_percent: "0",
      delivery_days: "",
      warranty: "",
      terms: "",
      notes: "",
    },
  });

  useEffect(() => {
    fetchRFQs();
    // Check if coming from RFQ Management with rfq parameter
    const urlParams = new URLSearchParams(window.location.search);
    const rfqId = urlParams.get('rfq');
    if (rfqId) {
      setSelectedRFQ(rfqId);
    }
  }, []);

  useEffect(() => {
    if (selectedRFQ) {
      fetchQuotations();
    }
  }, [selectedRFQ]);

  const fetchRFQs = async () => {
    try {
      const res = await axios.get("/api/rfqs");
      const data = (res.data || []).filter((r: any) => r.status === "sent");
      setRfqs(data);
      if (data.length > 0) {
        setSelectedRFQ(data[0].id);
      }
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

  const fetchQuotations = async () => {
    try {
      const res = await axios.get("/api/vendor-quotations", {
        params: { rfq_id: selectedRFQ },
      });
      setQuotations(res.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: QuotationFormValues) => {
    try {
      const quantity = parseFloat(values.quantity);
      const quotedPrice = parseFloat(values.quoted_price);
      const taxPercent = parseFloat(values.tax_percent || "0");
      const taxAmount = (quotedPrice * quantity * taxPercent) / 100;
      const totalAmount = (quotedPrice * quantity) + taxAmount;

      const quotationData = {
        rfq_id: selectedRFQ,
        vendor_name: values.vendor_name,
        item_code: values.item_code,
        item_name: values.item_name,
        quantity,
        quoted_price: quotedPrice,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        delivery_days: values.delivery_days ? parseInt(values.delivery_days) : null,
        warranty: values.warranty || null,
        terms: values.terms || null,
        status: "Received",
        notes: values.notes || null,
      };

      await axios.post("/api/vendor-quotations", quotationData);

      toast({
        title: "Success",
        description: "Quotation added successfully",
      });

      form.reset();
      setOpen(false);
      fetchQuotations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectQuotation = async (id: string) => {
    try {
      // Backend deselects other quotations for the same RFQ and selects this one atomically
      await axios.post(`/api/vendor-quotations/${id}/select`);

      toast({
        title: "Success",
        description: "Quotation selected successfully",
      });

      fetchQuotations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, isSelected: boolean) => {
    if (isSelected) {
      return <Badge variant="default">Selected</Badge>;
    }
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      Received: "secondary",
      Selected: "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const groupedQuotations = quotations.reduce((acc, quote) => {
    const key = quote.item_code;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(quote);
    return acc;
  }, {} as Record<string, Quotation[]>);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vendor Quotations</h1>
            <p className="text-muted-foreground mt-1">Compare and select vendor quotations</p>
          </div>
          <div className="flex space-x-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedRFQ}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Quotation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Vendor Quotation</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="vendor_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="item_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="item_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="quoted_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_percent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax %</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="delivery_days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Days</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="warranty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warranty</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 1 Year" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Terms & Conditions</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Add Quotation</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <label className="font-medium">Select RFQ:</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedRFQ}
              onChange={(e) => setSelectedRFQ(e.target.value)}
            >
              {rfqs.map((rfq) => (
                <option key={rfq.id} value={rfq.id}>
                  {rfq.rfq_number} - {rfq.title}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {Object.entries(groupedQuotations).map(([itemCode, quotes]) => (
          <Card key={itemCode} className="p-4">
            <h3 className="text-lg font-semibold mb-4">
              {quotes[0].item_name} ({itemCode})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id} className={quote.is_selected ? "bg-accent" : ""}>
                    <TableCell className="font-medium">{quote.vendor_name}</TableCell>
                    <TableCell>{quote.quantity}</TableCell>
                    <TableCell>₹{quote.quoted_price.toFixed(2)}</TableCell>
                    <TableCell>
                      {quote.tax_percent}% (₹{quote.tax_amount.toFixed(2)})
                    </TableCell>
                    <TableCell className="font-semibold">₹{quote.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{quote.delivery_days} days</TableCell>
                    <TableCell>{quote.warranty || "-"}</TableCell>
                    <TableCell>{getStatusBadge(quote.status, quote.is_selected)}</TableCell>
                    <TableCell>
                      {!quote.is_selected && (
                        <Button size="sm" onClick={() => selectQuotation(quote.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Select
                        </Button>
                      )}
                      {quote.is_selected && (
                        <Button
                          size="sm"
                          onClick={() => window.location.href = `/purchase/purchase-orders?quote=${quote.id}`}
                        >
                          Create PO
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}

        {quotations.length === 0 && !loading && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No quotations received yet</p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
