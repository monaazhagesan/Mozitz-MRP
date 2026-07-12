import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import axios from "axios";

interface MaterialIssueHistoryItem {
  id: string;
  issueNo: string;
  issueDate: string;
  referenceNo: string;
  warehouse: string;
  status: string;
  items: any[];
}

interface BomIssueRow {
  itemCode: string;
  itemName: string;
  uom: string;
  requiredQty: number;
  onHand: number;
  remainingToIssue: number;
  issueQty: string;
}

interface SelectedJob {
  jobNumber: string;
  itemName: string;
  qty: number;
  status: string;
}

const TERMINAL_JOB_STATUSES = ["Completed", "Closed", "Cancelled", "Ready for Dispatch"];

interface JobMaterialIssueTabProps {
  isActive?: boolean;
}

export default function JobMaterialIssueTab({ isActive }: JobMaterialIssueTabProps) {
  const { toast } = useToast();

  const [issues, setIssues] = useState<MaterialIssueHistoryItem[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobNoInput, setJobNoInput] = useState("");
  const [jobError, setJobError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [job, setJob] = useState<SelectedJob | null>(null);
  const [rows, setRows] = useState<BomIssueRow[]>([]);

  const [warehouse, setWarehouse] = useState("Main Warehouse");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchIssues = async () => {
    setLoadingIssues(true);
    try {
      const res = await axios.get("/api/material-issues");
      const jobIssues = (res.data || []).filter((i: any) => i.issue_type === "job");
      setIssues(
        jobIssues.map((i: any) => ({
          id: i.id,
          issueNo: i.issue_no,
          issueDate: i.issue_date,
          referenceNo: i.reference_no,
          warehouse: i.warehouse,
          status: i.status,
          items: i.items || [],
        }))
      );
    } catch (error) {
      toast({ title: "Error", description: "Failed to load material issues.", variant: "destructive" });
    } finally {
      setLoadingIssues(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // Radix Tabs keeps inactive tab content mounted rather than unmounting it,
  // so re-fetch whenever this tab becomes the active one (not just on first
  // mount) to make sure the list never goes stale while the user is away.
  useEffect(() => {
    if (isActive) {
      fetchIssues();
    }
  }, [isActive]);

  const generateIssueNo = () => {
    const nums = issues.map((i) => {
      const m = i.issueNo?.match(/ISS-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const next = Math.max(0, ...nums) + 1;
    return `ISS-${String(next).padStart(5, "0")}`;
  };

  const resetForm = () => {
    setJobNoInput("");
    setJobError("");
    setJob(null);
    setRows([]);
    setWarehouse("Main Warehouse");
    setRemarks("");
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleLookupJob = async () => {
    if (!jobNoInput.trim()) {
      setJobError("Please enter a Job No");
      return;
    }
    setJobError("");
    setLookingUp(true);
    setJob(null);
    setRows([]);

    try {
      const jobRes = await axios.get("/api/jobs", { params: { job_number: jobNoInput.trim() } });
      const foundJob = (jobRes.data?.data || jobRes.data || [])[0];

      if (!foundJob) {
        setJobError("Job not found");
        return;
      }

      if (TERMINAL_JOB_STATUSES.includes(foundJob.status)) {
        setJobError(`Cannot issue to a ${foundJob.status} job`);
        return;
      }

      const jobQty = Number(foundJob.start) || 1;
      const assembly = foundJob.assembly;

      let components: any[] = [];
      if (assembly) {
        const bomRes = await axios.get("/api/bom-headers/by-item-code", {
          params: { item_code: assembly },
        });
        const headers = bomRes.data?.data || [];
        const activeHeader =
          headers.find((h: any) => (h.status || "").toLowerCase() === "active") || headers[0];

        if (activeHeader) {
          const compRes = await axios.get("/api/bom-components", {
            params: { bom_id: activeHeader.id },
          });
          components = compRes.data || [];
        }
      }

      setJob({
        jobNumber: foundJob.job_number,
        itemName: foundJob.product_name || "",
        qty: jobQty,
        status: foundJob.status,
      });

      if (components.length === 0) {
        setJobError(`No active BOM found for ${assembly || foundJob.job_number}`);
        return;
      }

      const allocRes = await axios.get("/api/job-allocations", {
        params: { job_number: foundJob.job_number },
      });
      const allocations = (allocRes.data || []).filter((a: any) => a.status === "allocated");
      const remainingMap = new Map<string, number>();
      allocations.forEach((a: any) => {
        remainingMap.set(
          a.item_code,
          (remainingMap.get(a.item_code) || 0) + Number(a.allocated_quantity || 0)
        );
      });

      const invRes = await axios.get("/api/inventory-stock");
      const inventoryItems = invRes.data?.items || [];
      const onHandMap = new Map<string, number>();
      inventoryItems.forEach((i: any) => {
        onHandMap.set(i.itemCode ?? i.item_code, Number(i.quantityOnHand ?? i.quantity_on_hand ?? 0));
      });

      const newRows: BomIssueRow[] = components.map((c: any) => ({
        itemCode: c.component,
        itemName: c.description || c.component,
        uom: c.uom || "Nos",
        requiredQty: Number(c.quantity || 0) * jobQty,
        onHand: onHandMap.get(c.component) || 0,
        remainingToIssue: remainingMap.get(c.component) || 0,
        issueQty: "0",
      }));

      setRows(newRows);
    } catch (error: any) {
      console.error(error);
      setJobError("Failed to load job materials.");
    } finally {
      setLookingUp(false);
    }
  };

  const updateIssueQty = (itemCode: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.itemCode === itemCode ? { ...r, issueQty: value } : r)));
  };

  const rowError = (row: BomIssueRow): string | null => {
    if (row.issueQty === "") return null;
    const qty = Number(row.issueQty);
    if (Number.isNaN(qty)) return "Invalid quantity";
    if (qty < 0) return "Cannot be negative";
    if (qty === 0) return null;
    const max = Math.min(row.onHand, row.remainingToIssue);
    if (qty > max) {
      return qty > row.onHand ? "Exceeds on-hand stock" : "Exceeds reserved quantity";
    }
    return null;
  };

  const hasBlockingErrors = rows.some((r) => rowError(r) !== null);
  const hasAnyIssueQty = rows.some((r) => Number(r.issueQty) > 0);

  const handleSubmit = async () => {
    if (!job) return;

    if (hasBlockingErrors) {
      toast({
        title: "Fix errors before submitting",
        description: "One or more Issue Qty values are invalid.",
        variant: "destructive",
      });
      return;
    }

    if (!hasAnyIssueQty) {
      toast({
        title: "Nothing to issue",
        description: "Enter an Issue Qty for at least one material.",
        variant: "destructive",
      });
      return;
    }

    const items = rows
      .filter((r) => Number(r.issueQty) > 0)
      .map((r) => ({
        item_code: r.itemCode,
        item_name: r.itemName,
        uom: r.uom,
        issued_qty: Number(r.issueQty),
      }));

    setSubmitting(true);
    try {
      await axios.post("/api/material-issues", {
        job_number: job.jobNumber,
        warehouse,
        issued_by: "Current User",
        remarks,
        items,
        issue_no: generateIssueNo(),
        issue_date: new Date().toISOString().split("T")[0],
      });

      toast({ title: "Success", description: `Materials issued against job ${job.jobNumber}.` });
      setDialogOpen(false);
      resetForm();
      fetchIssues();
    } catch (error: any) {
      const errors = error.response?.data?.errors;
      if (errors?.length) {
        toast({
          title: "Issue quantity exceeds limit",
          description: errors
            .map((e: any) => `${e.item_code}: max ${e.max_issuable}`)
            .join(", "),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to submit material issue.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Job Material Issues</h2>
          <p className="text-sm text-muted-foreground">Issue BOM materials against a job</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" /> New Issue
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Job No</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingIssues ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No material issues yet.
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-mono">{issue.issueNo}</TableCell>
                    <TableCell>{issue.issueDate ? format(new Date(issue.issueDate), "PP") : "-"}</TableCell>
                    <TableCell>{issue.referenceNo}</TableCell>
                    <TableCell>{issue.warehouse || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{issue.items.length}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Job Material Issue</DialogTitle>
            <DialogDescription>Issue materials from inventory against a Job</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Issue No</Label>
                <Input value={generateIssueNo()} disabled className="bg-muted/50 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input value={format(new Date(), "MM/dd/yyyy")} disabled className="bg-muted/50 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Warehouse / Store</Label>
                <Select value={warehouse} onValueChange={setWarehouse}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Main Warehouse">Main Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Job No</Label>
              <div className="flex gap-2">
                <Input
                  value={jobNoInput}
                  onChange={(e) => setJobNoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookupJob()}
                  placeholder="e.g. JOB-000004"
                />
                <Button variant="outline" size="icon" onClick={handleLookupJob} disabled={lookingUp}>
                  {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {jobError && <p className="text-sm text-destructive">{jobError}</p>}
            </div>

            {job && (
              <div className="border rounded-lg p-4 bg-card">
                <h3 className="font-semibold text-sm mb-3">Job Details</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground text-xs">Product</Label>
                    <p className="font-medium">{job.itemName || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Job No</Label>
                    <p className="font-mono">{job.jobNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Job Qty</Label>
                    <p className="font-medium">{job.qty}</p>
                  </div>
                </div>
              </div>
            )}

            {rows.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-foreground">BOM Materials</h3>
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="max-h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Material</TableHead>
                          <TableHead>Item Code</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead className="text-right">Required Qty</TableHead>
                          <TableHead className="text-right">On-Hand Qty</TableHead>
                          <TableHead className="text-right">Remaining To Issue</TableHead>
                          <TableHead className="text-right">Issue Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const err = rowError(row);
                          return (
                            <TableRow key={row.itemCode} className={err ? "bg-destructive/10" : ""}>
                              <TableCell>{row.itemName}</TableCell>
                              <TableCell className="font-mono">{row.itemCode}</TableCell>
                              <TableCell>{row.uom}</TableCell>
                              <TableCell className="text-right">{row.requiredQty}</TableCell>
                              <TableCell className="text-right">{row.onHand}</TableCell>
                              <TableCell className="text-right">{row.remainingToIssue}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={Math.min(row.onHand, row.remainingToIssue)}
                                    value={row.issueQty}
                                    onChange={(e) => updateIssueQty(row.itemCode, e.target.value)}
                                    className="w-24 text-right"
                                  />
                                  {err && <span className="text-xs text-destructive">{err}</span>}
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

            <div className="space-y-2">
              <Label>Remarks / Reference</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!job || submitting || hasBlockingErrors}>
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Create Issue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
