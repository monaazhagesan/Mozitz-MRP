import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Assembly = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load jobs from localStorage
  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem("jobs");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [operations, setOperations] = useState([
    { id: 1, sequence: 1, name: "Cut Material", duration: "30 min", status: "pending" },
    { id: 2, sequence: 2, name: "Weld Parts", duration: "45 min", status: "pending" },
    { id: 3, sequence: 3, name: "Quality Check", duration: "15 min", status: "pending" },
  ]);

  const [bomItems, setBomItems] = useState([
    { id: 1, part: "Steel Plate", quantity: 5, unit: "pcs", stockLevel: 120, required: 5, status: "available" },
    { id: 2, part: "Welding Wire", quantity: 2, unit: "kg", stockLevel: 8, required: 2, status: "available" },
    { id: 3, part: "Bolts M8", quantity: 20, unit: "pcs", stockLevel: 15, required: 20, status: "low" },
  ]);

  const [jobCardData, setJobCardData] = useState({
    jobNumber: "",
    productName: "",
    quantity: "",
    dueDate: "",
    notes: "",
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("jobs");
      if (saved) {
        setJobs(JSON.parse(saved));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const moveOperation = (index: number, direction: "up" | "down") => {
    const newOperations = [...operations];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < newOperations.length) {
      [newOperations[index], newOperations[newIndex]] = [newOperations[newIndex], newOperations[index]];
      newOperations.forEach((op, idx) => {
        op.sequence = idx + 1;
      });
      setOperations(newOperations);
    }
  };

 const handleUpdateJobStatus = async (jobId: string, newStatus: string) => {
  try {
    const response = await fetch(`/api/jobs/${jobId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      throw new Error("Failed to update status");
    }

    setJobs((prevJobs: any[]) =>
      prevJobs.map((job) =>
        job.id === jobId
          ? { ...job, status: newStatus }
          : job
      )
    );

    toast({
      title: "Status Updated",
      description: `Job ${jobId} status changed to ${newStatus}.`,
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to update job status.",
      variant: "destructive",
    });
  }
};


  const handleViewJob = (job: any) => {
    setSelectedJob(job);
    setIsViewDialogOpen(true);
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assembly Job Management</h1>
            <p className="text-muted-foreground mt-1">
              View and manage production jobs
            </p>
          </div>
        </div>

        {/* Jobs List */}
        <Card>
          <CardHeader>
            <CardTitle>Production Jobs</CardTitle>
            <CardDescription>
              View job details and update status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No jobs available. Create jobs from the Planning module.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job: any) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.id}</TableCell>
                      <TableCell>{job.productName}</TableCell>
                      <TableCell>{job.quantity}</TableCell>
                      <TableCell>{job.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={job.priority === "High" ? "destructive" : "secondary"}>
                          {job.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={job.status}
                          onValueChange={(value) => handleUpdateJobStatus(job.id, value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Ready for Dispatch">Ready for Dispatch</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewJob(job)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Job Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Job Details</DialogTitle>
              <DialogDescription>
                View job information, operations, and materials
              </DialogDescription>
            </DialogHeader>

            {selectedJob && (
              <div className="space-y-6 py-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Job Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Job Number</p>
                        <p className="font-medium">{selectedJob.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Product</p>
                        <p className="font-medium">{selectedJob.productName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <p className="font-medium">{selectedJob.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p className="font-medium">{selectedJob.dueDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Priority</p>
                        <Badge variant={selectedJob.priority === "High" ? "destructive" : "secondary"}>
                          {selectedJob.priority}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant="outline">{selectedJob.status}</Badge>
                      </div>
                    </div>
                    {selectedJob.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{selectedJob.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Operations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Seq</TableHead>
                          <TableHead>Operation</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedJob.operations?.map((op: any) => (
                          <TableRow key={op.id}>
                            <TableCell>{op.sequence}</TableCell>
                            <TableCell>{op.name}</TableCell>
                            <TableCell>{op.duration}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{op.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bill of Materials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part</TableHead>
                          <TableHead>Required</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedJob.bomItems?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.part}</TableCell>
                            <TableCell>{item.required}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.stockLevel}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  item.status === "available"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-orange-50 text-orange-700"
                                }
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Assembly;
