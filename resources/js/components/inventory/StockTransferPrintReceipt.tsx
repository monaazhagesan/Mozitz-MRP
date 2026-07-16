import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";

interface TransferItem {
  item_code: string;
  item_name: string;
  quantity: number;
}

interface TransferData {
  transfer_number: string;
  transfer_date: string;
  status: string;
  notes: string | null;
  from_location?: { location_name: string } | null;
  to_location?: { location_name: string } | null;
  items: TransferItem[];
}

interface StockTransferPrintReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: TransferData | null;
}

const StockTransferPrintReceipt = ({ open, onOpenChange, transfer }: StockTransferPrintReceiptProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const items = transfer?.items || [];
    const fromLabel = transfer?.from_location?.location_name ?? "Unallocated";
    const toLabel = transfer?.to_location?.location_name ?? "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock Transfer Receipt - ${transfer?.transfer_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
            .header h2 { font-size: 13px; font-weight: bold; margin-bottom: 15px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 20px; }
            .info-left, .info-right { padding: 2px 0; }
            .info-row { display: flex; margin-bottom: 2px; }
            .info-label { min-width: 140px; }
            .info-value { font-weight: normal; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .items-table th, .items-table td { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 8px; text-align: left; }
            .items-table th { font-weight: bold; background: transparent; }
            .items-table td.right, .items-table th.right { text-align: right; }
            .total-row { border-top: 1px dashed #000; padding: 10px 8px; text-align: right; font-weight: bold; }
            .total-label { display: inline-block; min-width: 120px; text-align: right; margin-right: 20px; }
            .signature-section { margin-top: 60px; display: flex; justify-content: space-around; text-align: center; }
            .signature-line { border-top: 1px solid #000; width: 180px; padding-top: 5px; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>YOUR COMPANY NAME</h1>
            <h2>STOCK TRANSFER NOTE</h2>
          </div>

          <div class="info-grid">
            <div class="info-left">
              <div class="info-row">
                <span class="info-label">Transfer No</span>
                <span class="info-value">${transfer?.transfer_number || ""}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Transfer Date</span>
                <span class="info-value">${transfer?.transfer_date ? format(new Date(transfer.transfer_date), "dd-MMM-yy").toUpperCase() : ""}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value">${(transfer?.status || "").toUpperCase()}</span>
              </div>
            </div>
            <div class="info-right">
              <div class="info-row">
                <span class="info-label">From</span>
                <span class="info-value">${fromLabel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">To</span>
                <span class="info-value">${toLabel}</span>
              </div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Description</th>
                <th class="right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => `
                <tr>
                  <td>${item.item_code}</td>
                  <td>${item.item_name || ""}</td>
                  <td class="right">${Number(item.quantity)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="total-row">
            <span class="total-label">Total Items</span>
            <span>${items.length}</span>
          </div>

          ${transfer?.notes ? `<div style="margin-top:15px;"><strong>Notes:</strong> ${transfer.notes}</div>` : ""}

          <div class="signature-section">
            <div class="signature-line">Issued by</div>
            <div class="signature-line">Received by</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (!transfer) return null;

  const fromLabel = transfer.from_location?.location_name ?? "Unallocated";
  const toLabel = transfer.to_location?.location_name ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Stock Transfer Print Preview - {transfer.transfer_number}</span>
            <Button onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="bg-white p-6 border rounded-lg font-mono text-sm">
          <div className="text-center mb-6">
            <h1 className="text-base font-bold">YOUR COMPANY NAME</h1>
            <h2 className="text-sm font-bold mt-1">STOCK TRANSFER NOTE</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-32">Transfer No</span>
                <span>{transfer.transfer_number}</span>
              </div>
              <div className="flex">
                <span className="w-32">Transfer Date</span>
                <span>{format(new Date(transfer.transfer_date), "dd-MMM-yy").toUpperCase()}</span>
              </div>
              <div className="flex">
                <span className="w-32">Status</span>
                <span>{transfer.status.toUpperCase()}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex">
                <span className="w-32">From</span>
                <span>{fromLabel}</span>
              </div>
              <div className="flex">
                <span className="w-32">To</span>
                <span>{toLabel}</span>
              </div>
            </div>
          </div>

          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="border-y border-dashed border-foreground">
                <th className="py-2 text-left">Item Code</th>
                <th className="py-2 text-left">Item Description</th>
                <th className="py-2 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items.map((item) => (
                <tr key={item.item_code} className="border-b border-dashed border-muted">
                  <td className="py-2">{item.item_code}</td>
                  <td className="py-2">{item.item_name}</td>
                  <td className="py-2 text-right">{Number(item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-foreground pt-3 text-right font-bold text-xs">
            <span className="mr-8">Total Items</span>
            <span>{transfer.items.length}</span>
          </div>

          {transfer.notes && (
            <div className="mt-4 text-xs">
              <span className="font-bold">Notes: </span>
              <span>{transfer.notes}</span>
            </div>
          )}

          <div className="mt-16 flex justify-around text-center text-xs">
            <div className="inline-block border-t border-foreground w-40 pt-1">Issued by</div>
            <div className="inline-block border-t border-foreground w-40 pt-1">Received by</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockTransferPrintReceipt;
