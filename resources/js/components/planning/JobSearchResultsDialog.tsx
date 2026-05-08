import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JobSearchResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: any[];
  onViewGenealogy?: (job: any) => void;
  onViewOperations?: (job: any) => void;
  onViewComponents?: (job: any) => void;
  onOpen?: (job: any) => void;
}

export function JobSearchResultsDialog({
  open,
  onOpenChange,
  jobs,
  onViewGenealogy,
  onViewOperations,
  onViewComponents,
  onOpen,
}: JobSearchResultsDialogProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const handleRowClick = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleDoubleClick = (job: any) => {
    onOpen?.(job);
  };

  const selectedJob = jobs.find((job) => job.id === selectedJobId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] min-h-[500px] p-0 bg-[#d4d0c8] border border-[#808080] gap-0 shadow-[inset_1px_1px_0_#ffffff,inset_-1px_-1px_0_#404040]">
        {/* Windows Classic Style Header */}
        <DialogHeader className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#d4d0c8] border border-[#808080] flex items-center justify-center">
              <span className="text-[10px]">📋</span>
            </div>
            <DialogTitle className="text-sm font-normal text-white">
              Lot Based Jobs Summary (M4)
            </DialogTitle>
          </div>
          <div className="flex items-center gap-[2px]">
            <button className="w-[18px] h-[18px] bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040] flex items-center justify-center text-xs font-bold hover:bg-[#c0c0c0] active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]">
              _
            </button>
            <button className="w-[18px] h-[18px] bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040] flex items-center justify-center text-xs font-bold hover:bg-[#c0c0c0] active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]">
              □
            </button>
            <button 
              onClick={() => onOpenChange(false)}
              className="w-[18px] h-[18px] bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040] flex items-center justify-center text-xs font-bold hover:bg-[#c0c0c0] active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
            >
              ×
            </button>
          </div>
        </DialogHeader>

        <div className="p-2 bg-[#d4d0c8] flex-1">
          {/* Toolbar */}
          <div className="flex items-center gap-1 mb-2 pb-1 border-b border-[#808080]">
            <button className="w-6 h-6 bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040] flex items-center justify-center text-xs hover:bg-[#c0c0c0]">
              📋
            </button>
          </div>

          {/* Results Table */}
          <div className="border-2 border-[#808080] border-t-[#404040] border-l-[#404040] bg-white max-h-[350px] overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#d4d0c8]">
                  <th className="w-6 px-1 py-1 text-left font-normal text-black border-r border-b border-[#808080]"></th>
                  <th className="w-28 px-2 py-1 text-left font-normal text-black border-r border-b border-[#808080]">Job</th>
                  <th className="w-24 px-2 py-1 text-left font-normal text-black border-r border-b border-[#808080]">Type</th>
                  <th className="w-32 px-2 py-1 text-left font-normal text-black border-r border-b border-[#808080]">Assembly</th>
                  <th className="w-24 px-2 py-1 text-left font-normal text-black border-r border-b border-[#808080]">Unit Number</th>
                  <th className="px-2 py-1 text-left font-normal text-black border-b border-[#808080]">Class</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#808080]">
                      No jobs found matching your criteria
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => handleRowClick(job.id)}
                      onDoubleClick={() => handleDoubleClick(job)}
                      className={cn(
                        "cursor-pointer border-b border-[#d4d0c8]",
                        selectedJobId === job.id 
                          ? "bg-[#000080] text-white" 
                          : "hover:bg-[#d4d0c8]"
                      )}
                    >
                      <td className="w-6 px-1 py-1 border-r border-[#d4d0c8]">
                        {selectedJobId === job.id && (
                          <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-6 border-l-current ml-1"></div>
                        )}
                      </td>
                      <td className="px-2 py-1 border-r border-[#d4d0c8] font-normal">{job.job_number || job.job_number || ""}</td>
                      <td className="px-2 py-1 border-r border-[#d4d0c8]">
                        <div className="flex items-center">
                          <span>{job.type || "Standard"}</span>
                          <span className="ml-1 text-[10px]">▼</span>
                        </div>
                      </td>
                      <td className="px-2 py-1 border-r border-[#d4d0c8]">{job.assembly || job.product_name || ""}</td>
                      <td className="px-2 py-1 border-r border-[#d4d0c8]">{job.start || ""}</td>
                      <td className="px-2 py-1">{ `${job.status?.substring(0, 3).toUpperCase() || "PND"}-WAC-M4`}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Horizontal scrollbar placeholder */}
          <div className="flex items-center mt-1">
            <div className="flex-1 h-4 bg-[#d4d0c8] border border-[#808080] border-t-[#404040] border-l-[#404040]">
              <div className="h-full w-24 bg-[#d4d0c8] border border-[#ffffff] border-r-[#404040] border-b-[#404040]"></div>
            </div>
          </div>
        </div>

        {/* Footer Buttons - Windows Classic Style */}
        <div className="flex justify-center gap-3 p-3 bg-[#d4d0c8] border-t border-[#ffffff]">
          <Button
            variant="outline"
            onClick={() => selectedJob && onViewGenealogy?.(selectedJob)}
            disabled={!selectedJob}
            className="h-7 px-4 text-xs bg-[#d4d0c8] hover:bg-[#c0c0c0] border-2 border-[#ffffff] border-r-[#404040] border-b-[#404040] text-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
          >
            View Genealogy
          </Button>
          <Button
            variant="outline"
            onClick={() => selectedJob && onViewOperations?.(selectedJob)}
            disabled={!selectedJob}
            className="h-7 px-4 text-xs bg-[#d4d0c8] hover:bg-[#c0c0c0] border-2 border-[#ffffff] border-r-[#404040] border-b-[#404040] text-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
          >
            Operations
          </Button>
          <Button
            variant="outline"
            onClick={() => selectedJob && onViewComponents?.(selectedJob)}
            disabled={!selectedJob}
            className="h-7 px-4 text-xs bg-[#d4d0c8] hover:bg-[#c0c0c0] border-2 border-[#ffffff] border-r-[#404040] border-b-[#404040] text-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
          >
            Components
          </Button>
          <Button
            onClick={() => selectedJob && onOpen?.(selectedJob)}
            disabled={!selectedJob}
            className="h-7 px-6 text-xs bg-[#d4d0c8] hover:bg-[#c0c0c0] border-2 border-[#ffffff] border-r-[#404040] border-b-[#404040] text-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed active:border-[#404040] active:border-l-[#808080] active:border-t-[#808080]"
          >
            Open
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
