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

interface GRNItem {
  id: string;
  item_code: string;
  description: string;
  accepted_quantity: number;
  unit_price: number;
  total_amount: number;
}

interface GRNData {
  grn_number: string;
  po_number: string;
  vendor: string;
  receipt_date: string;
  created_at: string;
  grn_items: GRNItem[];
  items: GRNItem[]; 
}

interface GRNPrintReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grn: GRNData | null;
}

const GRNPrintReceipt = ({ open, onOpenChange, grn }: GRNPrintReceiptProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const acceptedItems = grn?.items?.filter(
  (item) => Number(item.accepted_quantity) > 0
) || [];

    const totalAmount = acceptedItems.reduce(
      (sum, item) => sum + (Number(item.accepted_quantity) * Number(item.unit_price)),
      0
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GRN Receipt - ${grn?.grn_number}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header h2 {
              font-size: 13px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0;
              margin-bottom: 20px;
            }
            .info-left, .info-right {
              padding: 2px 0;
            }
            .info-row {
              display: flex;
              margin-bottom: 2px;
            }
            .info-label {
              min-width: 140px;
            }
            .info-value {
              font-weight: normal;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .items-table th,
            .items-table td {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 5px 8px;
              text-align: left;
            }
            .items-table th {
              font-weight: bold;
              background: transparent;
            }
            .items-table td.right,
            .items-table th.right {
              text-align: right;
            }
            .total-row {
              border-top: 1px dashed #000;
              padding: 10px 8px;
              text-align: right;
              font-weight: bold;
            }
            .total-label {
              display: inline-block;
              min-width: 120px;
              text-align: right;
              margin-right: 20px;
            }
            .signature-section {
              margin-top: 60px;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              width: 200px;
              margin: 0 auto;
              padding-top: 5px;
            }
            @media print {
              body {
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>YOUR COMPANY NAME</h1>
            <h2>GOODS RECEIPT NOTE</h2>
          </div>
          
          <div class="info-grid">
            <div class="info-left">
              <div class="info-row">
                <span class="info-label">Vendor</span>
                <span class="info-value">${grn?.vendor || ""}</span>
              </div>
              <div class="info-row">
                <span class="info-label">PO Number</span>
                <span class="info-value">${grn?.po_number || ""}</span>
              </div>
            </div>
            <div class="info-right">
              <div class="info-row">
                <span class="info-label">GRN/Receipt No</span>
                <span class="info-value">${grn?.grn_number || ""}</span>
              </div>
              <div class="info-row">
                <span class="info-label">GRN/Receipt Date</span>
                <span class="info-value">${grn?.receipt_date ? format(new Date(grn.receipt_date), "dd-MMM-yy").toUpperCase() : ""}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Creation Date</span>
                <span class="info-value">${grn?.created_at ? format(new Date(grn.created_at), "dd-MMM-yy").toUpperCase() : ""}</span>
              </div>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>LPO No.</th>
                <th>Item Description</th>
                <th class="right">Qty</th>
                <th>Unit</th>
                <th class="right">Rate</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${acceptedItems.map((item) => `
                <tr>
                  <td>${grn?.po_number || ""}</td>
                  <td>${item.item_code} - ${item.description || ""}</td>
                  <td class="right">${Number(item.accepted_quantity).toFixed(0)}</td>
                  <td>Each</td>
                  <td class="right">${Number(item.unit_price).toFixed(2)}</td>
                  <td class="right">${(Number(item.accepted_quantity) * Number(item.unit_price)).toFixed(2)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          
          <div class="total-row">
            <span class="total-label">Total GRN Amount</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          
          <div class="signature-section">
            <div class="signature-line">Approved by</div>
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

  if (!grn) return null;

  const acceptedItems = grn.items?.filter(
  (item) => Number(item.accepted_quantity) > 0
) || [];

  const totalAmount = acceptedItems.reduce(
  (sum, item) => sum + Number(item.accepted_quantity) * Number(item.unit_price),
  0
);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>GRN Print Preview - {grn.grn_number}</span>
            <Button onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Print Preview */}
        <div
          ref={printRef}
          className="bg-white p-6 border rounded-lg font-mono text-sm"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-base font-bold">YOUR COMPANY NAME</h1>
            <h2 className="text-sm font-bold mt-1">GOODS RECEIPT NOTE</h2>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-32">Vendor</span>
                <span>{grn.vendor}</span>
              </div>
              <div className="flex">
                <span className="w-32">PO Number</span>
                <span>{grn.po_number}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex">
                <span className="w-32">GRN/Receipt No</span>
                <span>{grn.grn_number}</span>
              </div>
              <div className="flex">
                <span className="w-32">GRN/Receipt Date</span>
                <span>
                  {format(new Date(grn.receipt_date), "dd-MMM-yy").toUpperCase()}
                </span>
              </div>
              <div className="flex">
                <span className="w-32">Creation Date</span>
                <span>
                  {format(new Date(grn.created_at), "dd-MMM-yy").toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="border-y border-dashed border-foreground">
                <th className="py-2 text-left">LPO No.</th>
                <th className="py-2 text-left">Item Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-left pl-2">Unit</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {acceptedItems.map((item) => (
                <tr key={item.id} className="border-b border-dashed border-muted">
                  <td className="py-2">{grn.po_number}</td>
                  <td className="py-2">
                    {item.item_code} - {item.description || ""}
                  </td>
                  <td className="py-2 text-right">
                    {Number(item.accepted_quantity).toFixed(0)}
                  </td>
                  <td className="py-2 pl-2">Each</td>
                  <td className="py-2 text-right">
                    {Number(item.unit_price).toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    {(Number(item.accepted_quantity) * Number(item.unit_price)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="border-t border-dashed border-foreground pt-3 text-right font-bold text-xs">
            <span className="mr-8">Total GRN Amount</span>
            <span>{totalAmount.toFixed(2)}</span>
          </div>

          {/* Signature */}
          <div className="mt-16 text-center">
            <div className="inline-block border-t border-foreground w-48 pt-1">
              Approved by
            </div>
          </div>
        </div>

        {acceptedItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No accepted items to print. Only accepted quantities are shown in the receipt.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GRNPrintReceipt;
