import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { DollarSign, ShoppingCart, Clock, CreditCard, FileText, RotateCcw } from "lucide-react";

interface Customer {
  id: string;
  customer_name: string;
  customer_code: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  country: string | null;
  currency: string | null;
  tier: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CustomerDetailDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrderData {
  id: string;
  orderDate: string;
  status: string;
  items: { totalAmount: number }[];
  paymentType: string;
  referenceNo: string;
}

const CustomerDetailDialog = ({ customer, open, onOpenChange }: CustomerDetailDialogProps) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  if (!open || !customer?.id) return;

  loadCustomerData(customer.id);
}, [open, customer?.id]);

const loadCustomerData = async (customerId: string) => {
  if (!customerId) return;

  setLoading(true);

  const safeFetch = async (url: string) => {
    try {
      const res = await fetch(url);
      const text = await res.text();

      if (!res.ok || text.trim().startsWith("<!DOCTYPE")) {
        console.error("API Error:", text);
        return [];
      }

      const json = JSON.parse(text);

      return (
        json?.data ??
        json?.invoices ??
        json?.orders ??
        json?.credit_notes ??
        json ??
        []
      );
    } catch (err) {
      console.error("Fetch error:", err);
      return [];
    }
  };

  try {
    const [invoices, credits, orders] = await Promise.all([
      safeFetch(`/api/invoices?customer_id=${customerId}`),
      safeFetch(`/api/credit_notes?customer_id=${customerId}`),
      safeFetch(`/api/orders?customer_id=${customerId}`),
    ]);

    setInvoices(Array.isArray(invoices) ? invoices : []);
    setCreditNotes(Array.isArray(credits) ? credits : []);

    // Group orders properly
    const groupedOrders = Object.values(
      (Array.isArray(orders) ? orders : []).reduce(
        (acc: Record<string, any>, row: any) => {
          const key = row.order_no;

          if (!acc[key]) {
            acc[key] = {
              id: row.order_no,
              orderDate: row.order_date,
              status: row.status,
              paymentType: row.payment_type,
              items: [],
            };
          }

          acc[key].items.push({
            totalAmount: Number(row.total_amount) || 0,
          });

          return acc;
        },
        {}
      )
    );

    setOrders(groupedOrders);
  } catch (error) {
    console.error("Error loading customer data:", error);
    setInvoices([]);
    setCreditNotes([]);
    setOrders([]);
  } finally {
    setLoading(false);
  }
};

  if (!customer) return null;

 const totalSales = invoices.reduce(
  (sum, inv) => sum + (Number(inv.total_amount) || 0),
  0
);

const totalPaid = invoices.reduce(
  (sum, inv) => sum + (Number(inv.amount_paid) || 0),
  0
);

const pendingPayments =
  (Number(totalSales) || 0) - (Number(totalPaid) || 0);

const inProgressOrders = orders.filter(
  (o) => o.status !== "Done" && o.status !== "Cancelled"
);

const totalCreditNotes = creditNotes.reduce(
  (sum, cn) => sum + (Number(cn.total_amount) || 0),
  0
);

  const orderTotal = (order: OrderData) =>
    order.items?.reduce((s, i) => s + (i.totalAmount || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {customer.customer_name}{" "}
            <Badge variant="outline" className="ml-2 text-xs">{customer.customer_code}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-lg font-bold">₹{totalSales.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Payments</p>
                <p className="text-lg font-bold">₹{pendingPayments.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In-Progress Orders</p>
                <p className="text-lg font-bold">{inProgressOrders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <RotateCcw className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Credit Notes</p>
                <p className="text-lg font-bold">₹{totalCreditNotes.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Info */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Contact Person</p>
                <p className="font-medium">{customer.contact_person || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{customer.email || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{customer.mobile || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Country</p>
                <p className="font-medium">{customer.country || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Currency</p>
                <p className="font-medium">{customer.currency || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={customer.status === "Active" ? "default" : "outline"}>{customer.status}</Badge>
              </div>
              {customer.billing_address && (
                <div className="col-span-full">
                  <p className="text-muted-foreground">Billing Address</p>
                  <p className="font-medium">{customer.billing_address}</p>
                </div>
              )}
              {customer.shipping_address && (
                <div className="col-span-full">
                  <p className="text-muted-foreground">Shipping Address</p>
                  <p className="font-medium">{customer.shipping_address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for history */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">
              Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="invoices">
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="credits">
              Credit Notes ({creditNotes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {loading ? (
              <p className="text-center py-6 text-muted-foreground">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">No orders found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{String(order.id ?? "")}</TableCell>
                      <TableCell>{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "Done" ? "default" :
                            order.status === "Cancelled" ? "destructive" : "secondary"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.paymentType || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{orderTotal(order).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="invoices">
            {loading ? (
              <p className="text-center py-6 text-muted-foreground">Loading...</p>
            ) : invoices.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">No invoices found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">₹{(inv.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{(inv.amount_paid || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        ₹{((inv.total_amount || 0) - (inv.amount_paid || 0)).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="credits">
            {loading ? (
              <p className="text-center py-6 text-muted-foreground">Loading...</p>
            ) : creditNotes.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">No credit notes found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map((cn) => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
                      <TableCell>{new Date(cn.credit_date).toLocaleDateString()}</TableCell>
                      <TableCell>{cn.reason}</TableCell>
                      <TableCell>
                        <Badge variant={cn.status === "applied" ? "default" : "secondary"}>
                          {cn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{(cn.total_amount || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailDialog;