import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  RotateCcw,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Search,
  Eye,
} from "lucide-react";

interface RefundItem {
  itemCode: string;
  itemName: string;
  quantityOrdered: number;
  quantityRefunded: number;
  unitPrice: number;
  refundAmount: number;
  restoreInventory: boolean;
}

interface Refund {
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

interface RefundsTabProps {
  refunds: Refund[];
  onUpdateRefund: (refundId: string, updates: Partial<Refund>) => void;
  onRestoreInventory: (refund: Refund) => Promise<void>;
}

export const RefundsTab = ({ refunds, onUpdateRefund, onRestoreInventory }: RefundsTabProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredRefunds = refunds.filter((refund) => {
    const matchesSearch =
      refund.refundNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || refund.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500 text-white"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500 text-white"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "processed":
        return <Badge className="bg-green-600 text-white"><PackageCheck className="h-3 w-3 mr-1" />Processed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprovalAction = (refund: Refund, action: "approve" | "reject") => {
    setSelectedRefund(refund);
    setApprovalAction(action);
    setApprovalNotes("");
    setApprovalDialogOpen(true);
  };

  const submitApproval = () => {
    if (!selectedRefund) return;

    const updates: Partial<Refund> = {
      status: approvalAction === "approve" ? "approved" : "rejected",
      approvedBy: "Current User", // Would be replaced with actual user
      approvedAt: new Date().toISOString(),
      notes: selectedRefund.notes 
        ? `${selectedRefund.notes}\n\nApproval Notes: ${approvalNotes}`
        : `Approval Notes: ${approvalNotes}`,
    };

    onUpdateRefund(selectedRefund.id, updates);
    setApprovalDialogOpen(false);

    toast({
      title: approvalAction === "approve" ? "Refund Approved" : "Refund Rejected",
      description: `Refund ${selectedRefund.refundNumber} has been ${approvalAction === "approve" ? "approved" : "rejected"}.`,
    });
  };

  const handleProcessRefund = async (refund: Refund) => {
    setIsProcessing(true);
    try {
      // Restore inventory for items marked for restoration
      await onRestoreInventory(refund);

      // Update refund status to processed
      onUpdateRefund(refund.id, {
        status: "processed",
        processedAt: new Date().toISOString(),
      });

      toast({
        title: "Refund Processed",
        description: `Refund ${refund.refundNumber} has been processed and inventory has been restored.`,
      });
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process refund. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = {
    total: refunds.length,
    pending: refunds.filter((r) => r.status === "pending").length,
    approved: refunds.filter((r) => r.status === "approved").length,
    processed: refunds.filter((r) => r.status === "processed").length,
    totalAmount: refunds.filter((r) => r.status === "processed").reduce((sum, r) => sum + r.refundAmount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Refunds</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="text-2xl font-bold text-green-600">{stats.processed}</p>
              </div>
              <PackageCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Refunded Amount</p>
                <p className="text-2xl font-bold text-orange-600">₹{stats.totalAmount.toFixed(2)}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by refund #, order #, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Refunds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Refund Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Refund #</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRefunds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No refunds found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRefunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="font-mono font-medium">{refund.refundNumber}</TableCell>
                      <TableCell className="text-blue-600">{refund.orderId}</TableCell>
                      <TableCell>{refund.customerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {refund.refundType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{refund.reason}</TableCell>
                      <TableCell className="text-right font-medium">₹{refund.refundAmount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(refund.status)}</TableCell>
                      <TableCell>{new Date(refund.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRefund(refund);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {refund.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApprovalAction(refund, "approve")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleApprovalAction(refund, "reject")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {refund.status === "approved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleProcessRefund(refund)}
                              disabled={isProcessing}
                            >
                              Process
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Refund Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refund Details - {selectedRefund?.refundNumber}</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-muted-foreground text-sm">Order ID</Label>
                  <p className="font-medium">{selectedRefund.orderId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Customer</Label>
                  <p className="font-medium">{selectedRefund.customerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Refund Type</Label>
                  <Badge variant="outline" className="capitalize mt-1">{selectedRefund.refundType}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRefund.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Reason</Label>
                  <p className="font-medium">{selectedRefund.reason}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Refund Amount</Label>
                  <p className="font-medium text-lg text-orange-600">₹{selectedRefund.refundAmount.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Refund Items</Label>
                <div className="border rounded-lg mt-2 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Qty Refunded</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Restore Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRefund.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell className="text-right">{item.quantityRefunded}</TableCell>
                          <TableCell className="text-right">₹{item.refundAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            {item.restoreInventory ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedRefund.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{selectedRefund.notes}</p>
                </div>
              )}

              {selectedRefund.approvedBy && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Approved by:</span> {selectedRefund.approvedBy}
                    {selectedRefund.approvedAt && (
                      <span className="text-muted-foreground"> on {new Date(selectedRefund.approvedAt).toLocaleString()}</span>
                    )}
                  </p>
                </div>
              )}

              {selectedRefund.processedAt && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Processed on:</span> {new Date(selectedRefund.processedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve" : "Reject"} Refund - {selectedRefund?.refundNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Refund Amount</p>
              <p className="text-2xl font-bold text-orange-600">₹{selectedRefund?.refundAmount.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={`Add notes for ${approvalAction === "approve" ? "approval" : "rejection"}...`}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitApproval}
              className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {approvalAction === "approve" ? "Approve Refund" : "Reject Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
