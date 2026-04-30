import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, FileSpreadsheet, BarChart3, CalendarRange, Receipt, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceLike {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerGSTIN: string;
  subtotal: number;
  sgstTotal: number;
  cgstTotal: number;
  total: number;
  amountPaid: number;
  status: string;
  isProforma?: boolean;
  currency?: string;
}

interface Props {
  invoices: InvoiceLike[];
}

type ReportType = "monthly" | "custom" | "fy" | "tax" | "customer";

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "monthly", label: "Monthly Report", icon: CalendarRange, desc: "Invoices grouped by selected month" },
  { id: "custom", label: "Custom Date Range", icon: BarChart3, desc: "Pick any from / to dates" },
  { id: "fy", label: "Financial Year", icon: FileText, desc: "April–March FY summary" },
  { id: "tax", label: "Tax Report (GST)", icon: Receipt, desc: "CGST / SGST tax breakdown" },
  { id: "customer", label: "Customer Report", icon: Users, desc: "Sales aggregated by customer" },
];

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmtINR = (n: number) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fyRange = (fy: string) => {
  // fy like "2024-2025"
  const [s, e] = fy.split("-").map(Number);
  return { from: `${s}-04-01`, to: `${e}-03-31` };
};

const buildFYOptions = () => {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const opts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const start = y - i;
    opts.push(`${start}-${start + 1}`);
  }
  return opts;
};

export const InvoiceReports = ({ invoices }: Props) => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>("monthly");

  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [fromDate, setFromDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const fyOptions = useMemo(buildFYOptions, []);
  const [fy, setFy] = useState(fyOptions[0]);
  const [customer, setCustomer] = useState<string>("__all__");

  const customers = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.customerName).filter(Boolean))).sort(),
    [invoices],
  );

  const { dateFrom, dateTo, periodLabel } = useMemo(() => {
    if (reportType === "monthly") {
      const m = Number(month) - 1;
      const y = Number(year);
      const from = new Date(y, m, 1).toISOString().slice(0, 10);
      const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
      return { dateFrom: from, dateTo: to, periodLabel: `${monthNames[m]} ${y}` };
    }
    if (reportType === "fy") {
      const r = fyRange(fy);
      return { dateFrom: r.from, dateTo: r.to, periodLabel: `FY ${fy}` };
    }
    if (reportType === "custom") {
      return { dateFrom: fromDate, dateTo: toDate, periodLabel: `${fromDate} to ${toDate}` };
    }
    // tax / customer => use custom range too
    return { dateFrom: fromDate, dateTo: toDate, periodLabel: `${fromDate} to ${toDate}` };
  }, [reportType, month, year, fy, fromDate, toDate]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.isProforma) return false;
      if (!inv.invoiceDate.split("T")[0]) return false;
      if (inv.invoiceDate.split("T")[0] < dateFrom || inv.invoiceDate.split("T")[0] > dateTo) return false;
      if (reportType === "customer" && customer !== "__all__" && inv.customerName !== customer) return false;
      return true;
    });
  }, [invoices, dateFrom, dateTo, reportType, customer]);

  const totals = useMemo(() => {
    const t = { count: filtered.length, subtotal: 0, cgst: 0, sgst: 0, total: 0, paid: 0, due: 0 };
    filtered.forEach((i) => {
      t.subtotal += Number(i.subtotal) || 0;
      t.cgst += Number(i.cgstTotal) || 0;
      t.sgst += Number(i.sgstTotal) || 0;
      t.total += Number(i.total) || 0;
      t.paid += Number(i.amountPaid) || 0;
    });
    t.due = t.total - t.paid;
    return t;
  }, [filtered]);

  const customerSummary = useMemo(() => {
    const map = new Map<string, { count: number; total: number; paid: number; due: number }>();
    filtered.forEach((i) => {
      const cur = map.get(i.customerName) || { count: 0, total: 0, paid: 0, due: 0 };
      cur.count += 1;
      cur.total += Number(i.total) || 0;
      cur.paid += Number(i.amountPaid) || 0;
      cur.due = cur.total - cur.paid;
      map.set(i.customerName, cur);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const reportTitle = REPORT_TYPES.find((r) => r.id === reportType)?.label || "Report";

  const buildExportRows = () => {
    if (reportType === "tax") {
      return filtered.map((i) => ({
        "Invoice No": i.invoiceNo,
        Date: i.invoiceDate.split("T")[0],
        Customer: i.customerName,
        GSTIN: i.customerGSTIN || "",
        "Taxable Value": Number(i.subtotal) || 0,
        CGST: Number(i.cgstTotal) || 0,
        SGST: Number(i.sgstTotal) || 0,
        "Total Tax": (Number(i.cgstTotal) || 0) + (Number(i.sgstTotal) || 0),
        "Invoice Total": Number(i.total) || 0,
      }));
    }
    if (reportType === "customer") {
      return customerSummary.map((c) => ({
        Customer: c.name,
        Invoices: c.count,
        "Total Sales": c.total,
        "Amount Paid": c.paid,
        "Outstanding": c.due,
      }));
    }
    return filtered.map((i) => ({
      "Invoice No": i.invoiceNo,
      Date: i.invoiceDate.split("T")[0],
      "Due Date": i.dueDate.split("T")[0],
      Customer: i.customerName,
      Subtotal: Number(i.subtotal) || 0,
      CGST: Number(i.cgstTotal) || 0,
      SGST: Number(i.sgstTotal) || 0,
      Total: Number(i.total) || 0,
      Paid: Number(i.amountPaid) || 0,
      Outstanding: (Number(i.total) || 0) - (Number(i.amountPaid) || 0),
      Status: i.status,
    }));
  };

  const handleExportXLSX = () => {
    const rows = buildExportRows();
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export for this period.", variant: "destructive" });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportTitle.slice(0, 30));
    // Summary sheet
    const summary = [
      ["Report", reportTitle],
      ["Period", periodLabel],
      ["Invoices", totals.count],
      ["Subtotal", totals.subtotal],
      ["CGST", totals.cgst],
      ["SGST", totals.sgst],
      ["Total", totals.total],
      ["Paid", totals.paid],
      ["Outstanding", totals.due],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
    XLSX.writeFile(wb, `${reportTitle.replace(/\s+/g, "_")}_${periodLabel.replace(/[^a-z0-9]/gi, "_")}.xlsx`);
    toast({ title: "Exported", description: "XLSX downloaded." });
  };

  const handleExportPDF = () => {
    const rows = buildExportRows();
    if (!rows.length) {
      toast({ title: "No data", description: "Nothing to export for this period.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(reportTitle, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${periodLabel}`, 14, 22);
    doc.text(
      `Invoices: ${totals.count}   Total: ${fmtINR(totals.total)}   Paid: ${fmtINR(totals.paid)}   Outstanding: ${fmtINR(totals.due)}`,
      14,
      28,
    );

    const head = [Object.keys(rows[0])];
    const body = rows.map((r) =>
      Object.values(r).map((v) => (typeof v === "number" ? v.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : String(v ?? ""))),
    );
    autoTable(doc, {
      head,
      body,
      startY: 34,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`${reportTitle.replace(/\s+/g, "_")}_${periodLabel.replace(/[^a-z0-9]/gi, "_")}.pdf`);
    toast({ title: "Exported", description: "PDF downloaded." });
  };

  return (
    <div className="space-y-4">
      {/* Report type cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {REPORT_TYPES.map((r) => {
          const Icon = r.icon;
          const active = reportType === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">{r.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Filters + Export */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            {reportType === "monthly" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {monthNames.map((m, idx) => (
                        <SelectItem key={m} value={String(idx + 1).padStart(2, "0")}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Year</Label>
                  <Input type="number" className="w-[120px]" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
              </>
            )}

            {reportType === "fy" && (
              <div className="space-y-1">
                <Label className="text-xs">Financial Year</Label>
                <Select value={fy} onValueChange={setFy}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fyOptions.map((f) => (
                      <SelectItem key={f} value={f}>FY {f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(reportType === "custom" || reportType === "tax" || reportType === "customer") && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" className="w-[170px]" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" className="w-[170px]" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </>
            )}

            {reportType === "customer" && (
              <div className="space-y-1">
                <Label className="text-xs">Customer</Label>
                <Select value={customer} onValueChange={setCustomer}>
                  <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={handleExportXLSX}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export XLSX
              </Button>
              <Button onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SummaryTile label="Invoices" value={String(totals.count)} />
        <SummaryTile label="Subtotal" value={fmtINR(totals.subtotal)} />
        <SummaryTile label="CGST" value={fmtINR(totals.cgst)} />
        <SummaryTile label="SGST" value={fmtINR(totals.sgst)} />
        <SummaryTile label="Total" value={fmtINR(totals.total)} highlight />
        <SummaryTile label="Outstanding" value={fmtINR(totals.due)} />
      </div>

      {/* Result table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{reportTitle} — {periodLabel}</CardTitle>
          <Badge variant="secondary">{filtered.length} records</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {reportType === "customer" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerSummary.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
                ) : customerSummary.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.count}</TableCell>
                    <TableCell className="text-right">{fmtINR(c.total)}</TableCell>
                    <TableCell className="text-right">{fmtINR(c.paid)}</TableCell>
                    <TableCell className="text-right">{fmtINR(c.due)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  {reportType === "tax" && <TableHead>GSTIN</TableHead>}
                  <TableHead className="text-right">{reportType === "tax" ? "Taxable" : "Subtotal"}</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {reportType !== "tax" && <TableHead>Status</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No invoices in this period</TableCell></TableRow>
                ) : filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.invoiceNo}</TableCell>
                    <TableCell>{i.invoiceDate.split("T")[0]}</TableCell>
                    <TableCell>{i.customerName}</TableCell>
                    {reportType === "tax" && <TableCell>{i.customerGSTIN || "-"}</TableCell>}
                    <TableCell className="text-right">{fmtINR(i.subtotal)}</TableCell>
                    <TableCell className="text-right">{fmtINR(i.cgstTotal)}</TableCell>
                    <TableCell className="text-right">{fmtINR(i.sgstTotal)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtINR(i.total)}</TableCell>
                    {reportType !== "tax" && (
                      <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const SummaryTile = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`rounded-lg border p-3 ${highlight ? "bg-primary/5 border-primary/30" : "bg-card"}`}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-base font-semibold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</p>
  </div>
);

export default InvoiceReports;
