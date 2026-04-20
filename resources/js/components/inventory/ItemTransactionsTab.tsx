import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from "axios";

interface ItemTransactionsTabProps {
  itemCode: string;
}

interface Transaction {
  id: string;
  date: string;
  reference: string;
  customerName: string;
  quantitySold: number;
  price: number;
  total: number;
  status: string;
  type: string;
}

const ItemTransactionsTab = ({ itemCode }: ItemTransactionsTabProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadTransactions();
  }, [itemCode]);

  const loadTransactions = async () => {
  setLoading(true);
  try {
    const allTransactions: Transaction[] = [];

    // 1. Stock transactions
    const stockRes = await axios.get("/api/stock-transactions", { params: { item_code: itemCode } });
    const stockTransactions = stockRes.data;

    if (Array.isArray(stockTransactions)) {
      stockTransactions.forEach((tx: any) => {
        allTransactions.push({
          id: tx.id,
          date: tx.transaction_date || tx.created_at || "",
          reference: tx.reference_number || "-",
          customerName: tx.notes || tx.reference_type || "-",
          quantitySold: Math.abs(Number(tx.quantity) || 0),
          price: Number(tx.unit_cost) || 0,
          total: Math.abs(Number(tx.quantity) || 0) * (Number(tx.unit_cost) || 0),
          status: getStatusFromTransactionType(tx.transaction_type),
          type: mapTransactionType(tx.transaction_type, tx.reference_type),
        });
      });
    }

    // 2. GRN items
    const grnRes = await axios.get("/api/grn-items", { params: { item_code: itemCode } });
    const grnItems = grnRes.data;

    if (Array.isArray(grnItems)) {
      grnItems.forEach((item: any) => {
        if (item.grn) {
          const exists = allTransactions.some((t) => t.reference === item.grn.grn_number);
          if (!exists) {
            allTransactions.push({
              id: item.id,
              date: item.grn.receipt_date || item.created_at,
              reference: item.grn.grn_number,
              customerName: item.grn.vendor_name || "Vendor",
              quantitySold: Number(item.received_quantity) || 0,
              price: Number(item.unit_price) || 0,
              total: Number(item.total_amount) || (Number(item.received_quantity) * Number(item.unit_price)),
              status: mapGRNStatus(item.grn.qc_status),
              type: "Purchase Receipt",
            });
          }
        }
      });
    }

    // 3. Local storage sales orders
    const savedOrders = localStorage.getItem("orders");
    if (savedOrders) {
      try {
        const orders = JSON.parse(savedOrders);
        if (Array.isArray(orders)) {
          orders.forEach((order: any) => {
            const items = Array.isArray(order.items) ? order.items : [];
            items.forEach((item: any) => {
              if (item.itemCode === itemCode) {
                allTransactions.push({
                  id: `order-${order.id}-${item.id}`,
                  date: order.orderDate || new Date().toISOString(),
                  reference: order.id,
                  customerName: order.customer || "Customer",
                  quantitySold: Number(item.quantityOrdered) || 0,
                  price: Number(item.rate) || 0,
                  total: Number(item.totalAmount) || (Number(item.quantityOrdered) * Number(item.rate)),
                  status: mapOrderStatus(order.status, order.deliveryStatus),
                  type: "Sales Order",
                });
              }
            });
          });
        }
      } catch (e) {
        console.error("Error parsing orders from localStorage:", e);
      }
    }

    // Sort descending by date
    allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setTransactions(allTransactions);
  } catch (error) {
    console.error("Error loading transactions:", error);
  } finally {
    setLoading(false);
  }
};

  const mapTransactionType = (transactionType: string, referenceType?: string): string => {
    if (referenceType === 'BOM') return 'BOM Consumption';
    if (referenceType === 'Sales Order') return 'Sales Order';
    if (referenceType === 'GRN') return 'Purchase Receipt';
    
    switch (transactionType?.toLowerCase()) {
      case 'consumption':
        return 'BOM Consumption';
      case 'receipt':
      case 'purchase':
        return 'Purchase Receipt';
      case 'sale':
      case 'sold':
        return 'Sales Order';
      case 'adjustment':
        return 'Stock Adjustment';
      case 'transfer':
        return 'Stock Transfer';
      default:
        return transactionType || 'Stock Transaction';
    }
  };

  const getStatusFromTransactionType = (type: string): string => {
    switch (type?.toLowerCase()) {
      case 'consumption':
        return 'Consumed';
      case 'receipt':
      case 'purchase':
        return 'Received';
      case 'adjustment':
        return 'Adjusted';
      case 'transfer':
        return 'Transferred';
      case 'sale':
      case 'sold':
        return 'Invoiced';
      default:
        return 'Confirmed';
    }
  };

  const mapGRNStatus = (qcStatus: string): string => {
    switch (qcStatus?.toLowerCase()) {
      case 'accepted':
        return 'Closed';
      case 'pending':
        return 'Pending';
      case 'partially accepted':
        return 'PartiallyInvoiced';
      case 'rejected':
        return 'Overdue';
      default:
        return 'Confirmed';
    }
  };

  const mapOrderStatus = (status: string, deliveryStatus: string): string => {
    if (deliveryStatus === 'Delivered') return 'Closed';
    if (deliveryStatus === 'Shipped') return 'Invoiced';
    if (deliveryStatus === 'Partial') return 'PartiallyInvoiced';
    
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'Closed';
      case 'processing':
        return 'Confirmed';
      case 'pending':
      case 'awaiting confirmation':
        return 'Pending';
      case 'cancelled':
        return 'Overdue';
      default:
        return 'Confirmed';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'Overdue': 'text-red-500',
      'Closed': 'text-blue-500',
      'Confirmed': 'text-green-500',
      'Invoiced': 'text-green-600',
      'PartiallyInvoiced': 'text-orange-500',
      'Received': 'text-teal-500',
      'Adjusted': 'text-purple-500',
      'Transferred': 'text-indigo-500',
      'Consumed': 'text-amber-600',
      'Pending': 'text-yellow-500',
    };

    return (
      <span className={`font-medium ${statusColors[status] || 'text-muted-foreground'}`}>
        {status}
      </span>
    );
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    return true;
  });

  const uniqueTypes = Array.from(new Set(transactions.map(tx => tx.type)));
  const uniqueStatuses = Array.from(new Set(transactions.map(tx => tx.status)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter By:</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
             {uniqueTypes.filter(type => type).map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
               {uniqueStatuses.filter(status => status).map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold text-foreground">DATE</TableHead>
              <TableHead className="font-semibold text-foreground">REFERENCE#</TableHead>
              <TableHead className="font-semibold text-foreground">CUSTOMER/VENDOR</TableHead>
              <TableHead className="font-semibold text-foreground text-right">QUANTITY</TableHead>
              <TableHead className="font-semibold text-foreground text-right">PRICE</TableHead>
              <TableHead className="font-semibold text-foreground text-right">TOTAL</TableHead>
              <TableHead className="font-semibold text-foreground">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No transactions found for this item
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    {new Date(tx.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="font-medium text-primary">{tx.reference}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{tx.customerName}</div>
                      <div className="text-xs text-muted-foreground">{tx.type}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{tx.quantitySold}</TableCell>
                  <TableCell className="text-right">₹{tx.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">₹{tx.total.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(tx.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {filteredTransactions.length > 0 && (
        <div className="flex justify-end text-sm text-muted-foreground">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      )}
    </div>
  );
};

export default ItemTransactionsTab;
