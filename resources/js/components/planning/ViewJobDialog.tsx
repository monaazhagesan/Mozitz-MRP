import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ViewJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
}

// Portal-style input component (read-only)
const ErpDisplay = ({ value, className = "" }: { value: string | number | undefined; className?: string }) => (
  <div className={`h-7 px-2 text-sm bg-portal-input text-portal-input-foreground border border-portal-border flex items-center ${className}`}>
    {value || "-"}
  </div>
);

// Portal-style label
const ErpLabel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-xs font-medium text-portal-label whitespace-nowrap ${className}`}>{children}</span>
);

// Portal-style fieldset
const ErpFieldset = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="border border-portal-border p-3 bg-portal-fieldset">
    <legend className="px-1 text-xs font-medium text-portal-label">{title}</legend>
    {children}
  </fieldset>
);

export const ViewJobDialog = ({ open, onOpenChange, job }: ViewJobDialogProps) => {
  const [activeTab, setActiveTab] = useState("bill");

  // Get BOM items and operations from job data
  const bomItems = job?.bomItems || [];
  const operations = job?.operations || [];
  const moveQuantities = job?.moveQuantities || {};
  const rejectionTransactions = job?.rejectionTransactions || [];

  // Issued quantities map (synced from Material Issues module)
  const issuedQuantities: Record<string, number> = job?.issuedQuantities || {};

  // Calculate quantities data from BOM items
  const bomQuantities = bomItems.map((item: any) => {
    const itemCode = item.itemCode || item.item_code || item.component;
    const issued = issuedQuantities[itemCode] ?? item.issuedQty ?? 0;
    return {
      component: item.component,
      uom: item.uom || "EA",
      basisType: "Item",
      perAssembly: item.quantity / (parseFloat(job?.quantity) || 1),
      inverseUsage: ((parseFloat(job?.quantity) || 1) / item.quantity).toFixed(4),
      yield: 100,
      required: item.quantity,
      issued,
      open: Math.max(0, item.quantity - issued),
      onHand: item.onHand || 0,
    };
  });
  
  // Get operation sequences for move quantities display
  const operationSequences = operations.length > 0 
    ? operations.map((op: any) => op.sequence || op.operationSeq)
    : Object.keys(moveQuantities).map(Number).sort((a, b) => a - b);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "complete":
        return "bg-green-100 text-green-800";
      case "in progress":
      case "released":
        return "bg-blue-100 text-blue-800";
      case "on hold":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-portal-fieldset border-2 border-portal-border shadow-lg">
        {/* Header Bar - Portal Style */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-portal-header text-portal-header-foreground">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">View Job - {job.jobNumber || job.id}</span>
            <Badge className={`${getStatusColor(job.status)} text-[10px] ml-2`}>
              {job.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 text-portal-header-foreground hover:bg-portal-header/80"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Top Section - Job Details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {/* Left Column */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ErpLabel className="w-20 text-right">Job</ErpLabel>
                <ErpDisplay value={job.jobNumber || job.id} className="flex-1" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-20 text-right">Assembly</ErpLabel>
                <ErpDisplay value={job.itemCode} className="flex-1" />
                <ErpDisplay value={job.itemDescription || job.productName} className="flex-1" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-20 text-right">Class</ErpLabel>
                <ErpDisplay value={job.jobClass || "STANDARD"} className="flex-1" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-20 text-right">Status</ErpLabel>
                <div className="flex-1 h-7 px-2 text-sm bg-portal-input border border-portal-border flex items-center">
                  <Badge className={`${getStatusColor(job.status)} text-[10px]`}>
                    {job.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ErpLabel className="w-16 text-right">Type</ErpLabel>
                <ErpDisplay value={job.jobType || "Standard"} className="flex-1" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-16 text-right">UOM</ErpLabel>
                <ErpDisplay value={job.uom || "EA"} className="w-20" />
              </div>
              
              <div className="flex items-center gap-2">
                <ErpLabel className="w-16 text-right">Priority</ErpLabel>
                <ErpDisplay value={job.priority || "Medium"} className="flex-1" />
              </div>

              <div className="flex items-center gap-2">
                <ErpLabel className="w-16 text-right">Order</ErpLabel>
                <ErpDisplay value={job.orderId || "-"} className="flex-1" />
              </div>
            </div>
          </div>

          {/* Quantities and Dates Fieldsets */}
          <div className="grid grid-cols-2 gap-4">
            <ErpFieldset title="Quantities">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-20 text-right">Start</ErpLabel>
                  <ErpDisplay value={job.quantity} className="w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-20 text-right">Completed</ErpLabel>
                  <ErpDisplay value={job.completedQty || 0} className="w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-20 text-right">Scrapped</ErpLabel>
                  <ErpDisplay value={job.scrappedQty || 0} className="w-32" />
                </div>
              </div>
            </ErpFieldset>

            <ErpFieldset title="Dates">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-24 text-right">Start</ErpLabel>
                  <ErpDisplay 
                    value={job.startDate ? new Date(job.startDate).toLocaleString() : "-"} 
                    className="flex-1" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-24 text-right">Due Date</ErpLabel>
                  <ErpDisplay 
                    value={job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-"} 
                    className="flex-1" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ErpLabel className="w-24 text-right">Completion</ErpLabel>
                  <ErpDisplay 
                    value={job.completionDate ? new Date(job.completionDate).toLocaleString() : "-"} 
                    className="flex-1" 
                  />
                </div>
              </div>
            </ErpFieldset>
          </div>

          {/* Tabs Section - Portal Style */}
          <div className="border border-portal-border">
            {/* Tab Headers */}
            <div className="flex bg-portal-fieldset border-b border-portal-border">
              {["Genealogy", "Bill", "Quantities", "Routing", "Job Move", "History", "More"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase().replace(" ", "-"))}
                  className={`px-4 py-1.5 text-xs font-medium border-r border-portal-border transition-colors ${
                    activeTab === tab.toLowerCase().replace(" ", "-")
                      ? "bg-portal-tab-active text-portal-tab-active-foreground"
                      : "bg-portal-tab text-portal-label hover:bg-portal-tab-active/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 bg-portal-fieldset min-h-[200px]">
              {activeTab === "genealogy" && (
                <div className="space-y-4">
                  {/* Parent Job Section */}
                  <ErpFieldset title="Parent Job">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Parent Job</ErpLabel>
                        <ErpDisplay value={job.parentJobId || "N/A - This is a top-level job"} className="flex-1" />
                      </div>
                      {job.parentJobId && (
                        <>
                          <div className="flex items-center gap-2">
                            <ErpLabel className="w-20 text-right">Assembly</ErpLabel>
                            <ErpDisplay value={job.parentAssembly || "-"} className="flex-1" />
                          </div>
                        </>
                      )}
                    </div>
                  </ErpFieldset>

                  {/* Source Order Section */}
                  <ErpFieldset title="Source Order">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Order ID</ErpLabel>
                        <ErpDisplay value={job.orderId || "-"} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Order Type</ErpLabel>
                        <ErpDisplay value={job.orderType || "Manufacturing"} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Customer</ErpLabel>
                        <ErpDisplay value={job.customerName || "-"} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <ErpLabel className="w-20 text-right">Order Date</ErpLabel>
                        <ErpDisplay value={job.orderDate ? new Date(job.orderDate).toLocaleDateString() : "-"} className="flex-1" />
                      </div>
                    </div>
                  </ErpFieldset>

                  {/* Job Hierarchy Tree */}
                  <ErpFieldset title="Job Hierarchy">
                    <div className="bg-white border border-portal-border p-3 min-h-[120px]">
                      {/* Tree visualization */}
                      <div className="space-y-1">
                        {job.parentJobId && (
                          <div className="flex items-center gap-2 text-xs text-portal-label">
                            <span className="w-4 text-center">📁</span>
                            <span className="text-blue-600">{job.parentJobId}</span>
                            <span className="text-gray-400">(Parent)</span>
                          </div>
                        )}
                        <div className={`flex items-center gap-2 text-xs ${job.parentJobId ? "ml-6" : ""}`}>
                          {job.parentJobId && <span className="text-gray-300">└─</span>}
                          <span className="w-4 text-center">📋</span>
                          <span className="font-medium text-portal-input-foreground">{job.jobNumber || job.id}</span>
                          <Badge className={`${getStatusColor(job.status)} text-[9px] px-1`}>{job.status}</Badge>
                          <span className="text-gray-400">(Current)</span>
                        </div>
                        {/* Child Jobs */}
                        {(job.childJobs || []).length > 0 ? (
                          (job.childJobs || []).map((child: any, idx: number) => (
                            <div key={idx} className={`flex items-center gap-2 text-xs ${job.parentJobId ? "ml-12" : "ml-6"}`}>
                              <span className="text-gray-300">{idx === (job.childJobs || []).length - 1 ? "└─" : "├─"}</span>
                              <span className="w-4 text-center">📋</span>
                              <span className="text-blue-600">{child.jobNumber || child.id}</span>
                              <Badge variant="outline" className="text-[9px] px-1">{child.status}</Badge>
                              <span className="text-gray-400">(Child)</span>
                            </div>
                          ))
                        ) : (
                          <div className={`flex items-center gap-2 text-xs ${job.parentJobId ? "ml-12" : "ml-6"} text-gray-400`}>
                            <span className="text-gray-300">└─</span>
                            <span className="italic">No child jobs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </ErpFieldset>

                  {/* Production History */}
                  <ErpFieldset title="Production History">
                    <div className="border border-portal-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-portal-tab">
                            <TableHead className="text-xs py-1">Event</TableHead>
                            <TableHead className="text-xs py-1">Date/Time</TableHead>
                            <TableHead className="text-xs py-1">User</TableHead>
                            <TableHead className="text-xs py-1">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="bg-portal-input">
                            <TableCell className="text-xs py-1">Job Created</TableCell>
                            <TableCell className="text-xs py-1">{job.createdAt ? new Date(job.createdAt).toLocaleString() : "-"}</TableCell>
                            <TableCell className="text-xs py-1">{job.createdBy || "System"}</TableCell>
                            <TableCell className="text-xs py-1">Initial quantity: {job.quantity}</TableCell>
                          </TableRow>
                          {job.releasedAt && (
                            <TableRow className="bg-white">
                              <TableCell className="text-xs py-1">Job Released</TableCell>
                              <TableCell className="text-xs py-1">{new Date(job.releasedAt).toLocaleString()}</TableCell>
                              <TableCell className="text-xs py-1">{job.releasedBy || "System"}</TableCell>
                              <TableCell className="text-xs py-1">Released to production</TableCell>
                            </TableRow>
                          )}
                          {job.startDate && (
                            <TableRow className="bg-portal-input">
                              <TableCell className="text-xs py-1">Production Started</TableCell>
                              <TableCell className="text-xs py-1">{new Date(job.startDate).toLocaleString()}</TableCell>
                              <TableCell className="text-xs py-1">{job.startedBy || "Operator"}</TableCell>
                              <TableCell className="text-xs py-1">Work began on first operation</TableCell>
                            </TableRow>
                          )}
                          {job.completionDate && (
                            <TableRow className="bg-white">
                              <TableCell className="text-xs py-1">Job Completed</TableCell>
                              <TableCell className="text-xs py-1">{new Date(job.completionDate).toLocaleString()}</TableCell>
                              <TableCell className="text-xs py-1">{job.completedBy || "System"}</TableCell>
                              <TableCell className="text-xs py-1">Completed qty: {job.completedQty || job.quantity}</TableCell>
                            </TableRow>
                          )}
                          {(!job.releasedAt && !job.startDate && !job.completionDate) && (
                            <TableRow className="bg-white">
                              <TableCell colSpan={4} className="text-xs py-4 text-center text-gray-400">
                                No additional production events recorded yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </ErpFieldset>
                </div>
              )}

              {activeTab === "bill" && (
                <div className="space-y-3">
                  {bomItems.length > 0 ? (
                    <div className="border border-portal-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-portal-tab">
                            <TableHead className="text-xs py-1">Seq</TableHead>
                            <TableHead className="text-xs py-1">Component</TableHead>
                            <TableHead className="text-xs py-1">Description</TableHead>
                            <TableHead className="text-xs py-1">Qty</TableHead>
                            <TableHead className="text-xs py-1">UOM</TableHead>
                            <TableHead className="text-xs py-1">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bomItems.map((item: any, idx: number) => (
                            <TableRow key={idx} className="bg-portal-input">
                              <TableCell className="text-xs py-1">{item.itemSeq || idx + 1}</TableCell>
                              <TableCell className="text-xs py-1">{item.component}</TableCell>
                              <TableCell className="text-xs py-1">{item.description}</TableCell>
                              <TableCell className="text-xs py-1">{item.quantity}</TableCell>
                              <TableCell className="text-xs py-1">{item.uom}</TableCell>
                              <TableCell className="text-xs py-1">
                                <Badge variant="outline" className="text-[10px]">{item.status || "Available"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-portal-label py-8">
                      No BOM components available for this job.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "quantities" && (
                <div className="border border-portal-border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-portal-tab hover:bg-portal-tab">
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border">Component</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border">UOM</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Per Assembly</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Required</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Issued</TableHead>
                        <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground text-right">Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomQuantities.length > 0 ? (
                        bomQuantities.map((item: any, index: number) => (
                          <TableRow 
                            key={index} 
                            className={`${index % 2 === 0 ? "bg-white" : "bg-portal-input"} hover:bg-blue-50 border-b border-portal-border`}
                          >
                            <TableCell className="text-[11px] py-1 px-2 font-medium border-r border-portal-border">{item.component}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border">{item.uom}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right">{item.perAssembly.toFixed(2)}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right bg-yellow-100 font-medium">{item.required}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right">{item.issued}</TableCell>
                            <TableCell className="text-[11px] py-1 px-2 text-right">{item.open}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-portal-label py-4">
                            No component quantities available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {activeTab === "routing" && (
                <div>
                  {operations.length > 0 ? (
                    <div className="border border-portal-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-portal-tab">
                            <TableHead className="text-xs py-1">Seq</TableHead>
                            <TableHead className="text-xs py-1">Operation</TableHead>
                            <TableHead className="text-xs py-1">Description</TableHead>
                            <TableHead className="text-xs py-1">Duration</TableHead>
                            <TableHead className="text-xs py-1">Work Center</TableHead>
                            <TableHead className="text-xs py-1">Department</TableHead>
                            <TableHead className="text-xs py-1">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {operations.map((op: any, idx: number) => (
                            <TableRow key={idx} className="bg-portal-input">
                              <TableCell className="text-xs py-1">{op.sequence || op.operationSeq}</TableCell>
                              <TableCell className="text-xs py-1">{op.operationCode || op.name}</TableCell>
                              <TableCell className="text-xs py-1">{op.description || op.name}</TableCell>
                              <TableCell className="text-xs py-1">{op.duration || op.runTime || "-"}</TableCell>
                              <TableCell className="text-xs py-1">{op.workCenter || "-"}</TableCell>
                              <TableCell className="text-xs py-1">{op.department || "-"}</TableCell>
                              <TableCell className="text-xs py-1">
                                <Badge variant="outline" className="text-[10px]">{op.status || "Pending"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-portal-label py-8">
                      No routing operations available for this job.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "job-move" && (
                <div className="space-y-4">
                  <div className="border border-portal-border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-portal-tab hover:bg-portal-tab">
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border">Op Seq</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border">Operation</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">In Queue</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Running</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground border-r border-portal-border text-right">Rejected</TableHead>
                          <TableHead className="text-[10px] py-1 px-2 font-medium text-portal-input-foreground text-right">Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {operationSequences.length > 0 ? (
                          operationSequences.map((seq: number, idx: number) => {
                            const op = operations.find((o: any) => (o.sequence || o.operationSeq) === seq);
                            const qtyData = moveQuantities[seq] || { inQueue: 0, running: 0, rejected: 0, completed: 0 };
                            return (
                              <TableRow 
                                key={seq} 
                                className={`${idx % 2 === 0 ? "bg-white" : "bg-portal-input"} hover:bg-blue-50 border-b border-portal-border`}
                              >
                                <TableCell className="text-[11px] py-1 px-2 font-medium border-r border-portal-border">{seq}</TableCell>
                                <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border">{op?.name || op?.operationCode || "-"}</TableCell>
                                <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right">{qtyData.inQueue || 0}</TableCell>
                                <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right">{qtyData.running || 0}</TableCell>
                                <TableCell className="text-[11px] py-1 px-2 border-r border-portal-border text-right text-red-600 font-medium">{qtyData.rejected || 0}</TableCell>
                                <TableCell className="text-[11px] py-1 px-2 text-right text-green-600 font-medium">{qtyData.completed || 0}</TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-portal-label py-4">
                              No move transactions recorded.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-portal-label">Rejection Transactions</h4>
                  {rejectionTransactions.length > 0 ? (
                    <div className="border border-portal-border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-portal-tab">
                            <TableHead className="text-xs py-1">Op Seq</TableHead>
                            <TableHead className="text-xs py-1">Quantity</TableHead>
                            <TableHead className="text-xs py-1">Reason</TableHead>
                            <TableHead className="text-xs py-1">Timestamp</TableHead>
                            <TableHead className="text-xs py-1">User</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rejectionTransactions.map((txn: any, idx: number) => (
                            <TableRow key={idx} className="bg-portal-input">
                              <TableCell className="text-xs py-1">{txn.seq}</TableCell>
                              <TableCell className="text-xs py-1 text-red-600 font-medium">{txn.quantity}</TableCell>
                              <TableCell className="text-xs py-1">{txn.reason}</TableCell>
                              <TableCell className="text-xs py-1">{new Date(txn.timestamp).toLocaleString()}</TableCell>
                              <TableCell className="text-xs py-1">{txn.user}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-portal-label py-8">
                      No rejection transactions recorded.
                    </div>
                  )}

                  <h4 className="text-xs font-medium text-portal-label mt-6">Job Notes</h4>
                  <div className="p-3 bg-portal-input border border-portal-border text-sm min-h-[60px]">
                    {job.notes || "No notes available."}
                  </div>
                </div>
              )}

              {activeTab === "more" && (
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-24 text-right">Created</ErpLabel>
                    <ErpDisplay 
                      value={job.createdAt ? new Date(job.createdAt).toLocaleString() : "-"} 
                      className="flex-1" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-24 text-right">Created By</ErpLabel>
                    <ErpDisplay value={job.createdBy || "-"} className="flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-24 text-right">Modified</ErpLabel>
                    <ErpDisplay 
                      value={job.modifiedAt ? new Date(job.modifiedAt).toLocaleString() : "-"} 
                      className="flex-1" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-24 text-right">Modified By</ErpLabel>
                    <ErpDisplay value={job.modifiedBy || "-"} className="flex-1" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-portal-tab border-portal-border text-portal-input-foreground hover:bg-portal-tab-active hover:text-portal-tab-active-foreground"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
