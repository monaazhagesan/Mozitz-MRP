import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GRNSearchResultsDialog } from "./GRNSearchResultsDialog";
import axios from "axios";


interface FindGRNDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: string[];
  onViewGRN?: (grn: any) => void;
  onPrintGRN?: (grn: any) => void;
}

export interface GRNFilters {
  grnFrom: string;
  grnTo: string;
  dateFrom: string;
  dateTo: string;
  supplier: string;
  poNumber: string;
}

const initialFilters: GRNFilters = {
  grnFrom: "",
  grnTo: "",
  dateFrom: "",
  dateTo: "",
  supplier: "",
  poNumber: "",
};

const ErpLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={cn("text-xs font-medium text-gray-700 whitespace-nowrap", className)}>
    {children}
  </label>
);

const ErpInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      "h-7 px-2 text-sm bg-white text-gray-900 border border-gray-300 focus:outline-none focus:border-blue-500",
      className
    )}
    {...props}
  />
);

export function FindGRNDialog({ open, onOpenChange, vendors, onViewGRN, onPrintGRN }: FindGRNDialogProps) {
  const [filters, setFilters] = useState<GRNFilters>(initialFilters);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [resultsOpen, setResultsOpen] = useState(false);

  const handleClear = () => {
    setFilters(initialFilters);
  };

 const handleFind = async () => {
  setIsSearching(true);

  try {

    const params: any = {};

    // Apply filters
    if (filters.grnFrom) {
      params.grnFrom = filters.grnFrom;
    }

    if (filters.grnTo) {
      params.grnTo = filters.grnTo;
    }

    if (filters.dateFrom) {
      params.dateFrom = filters.dateFrom;
    }

    if (filters.dateTo) {
      params.dateTo = filters.dateTo;
    }

    if (filters.supplier) {
      params.supplier = filters.supplier;
    }

    if (filters.poNumber) {
      params.poNumber = filters.poNumber;
    }

    const response = await axios.get("/api/grn", {
      params
    });

    const data = response.data;

    setSearchResults(data || []);
    setResultsOpen(true);
    onOpenChange(false);

  } catch (error: any) {
    console.error("Search error:", error);
  } finally {
    setIsSearching(false);
  }
};

  const updateFilter = (key: keyof GRNFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleOpenGRN = (grn: any) => {
    setResultsOpen(false);
    onViewGRN?.(grn);
  };

  const handlePrintGRN = (grn: any) => {
    onPrintGRN?.(grn);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[500px] p-0 bg-gray-100 border border-gray-400 gap-0">
          <DialogHeader className="bg-gray-300 px-3 py-2 border-b border-gray-400">
            <DialogTitle className="text-sm font-medium text-gray-800">
              Find Goods Receipt Notes
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4 bg-gray-100">
            {/* GRN Range */}
            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">GRN Number</ErpLabel>
              <ErpInput
                value={filters.grnFrom}
                onChange={(e) => updateFilter("grnFrom", e.target.value)}
                placeholder="From"
                className="w-28"
              />
              <span className="text-xs text-gray-700">-</span>
              <ErpInput
                value={filters.grnTo}
                onChange={(e) => updateFilter("grnTo", e.target.value)}
                placeholder="To"
                className="w-28"
              />
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Receipt Date</ErpLabel>
              <ErpInput
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter("dateFrom", e.target.value)}
                className="w-32"
              />
              <span className="text-xs text-gray-700">-</span>
              <ErpInput
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter("dateTo", e.target.value)}
                className="w-32"
              />
            </div>

            {/* Supplier */}
            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">Supplier</ErpLabel>
              <select
                value={filters.supplier}
                onChange={(e) => updateFilter("supplier", e.target.value)}
                className="h-7 px-2 text-sm bg-white text-gray-900 border border-gray-300 focus:outline-none flex-1 max-w-[280px]"
              >
                <option value="">All Suppliers</option>
                {vendors.map((vendor) => (
                  <option key={vendor} value={vendor}>
                    {vendor}
                  </option>
                ))}
              </select>
            </div>

            {/* PO Number */}
            <div className="flex items-center gap-2">
              <ErpLabel className="w-28 text-right">PO Number</ErpLabel>
              <ErpInput
                value={filters.poNumber}
                onChange={(e) => updateFilter("poNumber", e.target.value)}
                placeholder="Enter PO Number"
                className="flex-1 max-w-[280px]"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-center gap-2 p-4 border-t border-gray-400 bg-gray-200">
            <Button
              variant="outline"
              onClick={handleClear}
              className="h-8 px-6 text-sm bg-gray-100 hover:bg-gray-200 border-gray-400 text-gray-700"
            >
              Clear
            </Button>
            <Button
              onClick={handleFind}
              disabled={isSearching}
              className="h-8 px-6 text-sm bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSearching ? "Searching..." : "Find"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GRNSearchResultsDialog
        open={resultsOpen}
        onOpenChange={setResultsOpen}
        grns={searchResults}
        onOpen={handleOpenGRN}
        onPrint={handlePrintGRN}
      />
    </>
  );
}
