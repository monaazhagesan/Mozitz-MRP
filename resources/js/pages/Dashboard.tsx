import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ─── Types ─────────────────────────────────────────────── */
interface LowStockItem {
  sku: string;
  name: string;
  current: number;
  minimum: number;
  status: "critical" | "warning";
  itemType: string;
  id: string;
}

/* ─── Static data (unchanged from original) ─────────────── */
const recentOrders = [
  { id: "ORD-001", customer: "Acme Corp",       items: 12, status: "Processing", date: "2025-10-01", amount: 41300 },
  { id: "ORD-002", customer: "TechStart Inc",   items: 8,  status: "Shipped",    date: "2025-10-01", amount: 33040 },
  { id: "ORD-003", customer: "Global Retail",   items: 24, status: "Delivered",  date: "2025-09-30", amount: 61360 },
  { id: "ORD-004", customer: "Smart Solutions", items: 15, status: "Processing", date: "2025-10-02", amount: 28900 },
  { id: "ORD-005", customer: "Nexus Traders",   items: 6,  status: "Pending",    date: "2025-10-02", amount: 18200 },
];

const revenueData = [
  { month: "Jan", revenue: 270, target: 280 },
  { month: "Feb", revenue: 275, target: 290 },
  { month: "Mar", revenue: 278, target: 295 },
  { month: "Apr", revenue: 270, target: 300 },
  { month: "May", revenue: 300, target: 310 },
  { month: "Jun", revenue: 380, target: 320 },
];

const productionData = [
  { week: "Week 1", planned: 1200, actual: 1050 },
  { week: "Week 2", planned: 1300, actual: 1180 },
  { week: "Week 3", planned: 1150, actual: 1230 },
  { week: "Week 4", planned: 1600, actual: 1320 },
];

const supplierData = [
  { name: "Mahindra Steels",  pct: 98, status: "ontime"  },
  { name: "Tata Components",  pct: 91, status: "good"    },
  { name: "ZenElectro Ltd",   pct: 74, status: "delayed" },
  { name: "AgroParts Co",     pct: 85, status: "good"    },
];

const pendingApprovals = [
  { id: "PO-2241", amount: "₹1.2L",  type: "MRO"     },
  { id: "PO-2238", amount: "₹88,500",type: "Raw Mat"  },
  { id: "PO-2235", amount: "₹43,000",type: "Tooling"  },
];

const fulfillmentRates = [
  { label: "Delivered",   pct: 62, color: "#16a34a" },
  { label: "In transit",  pct: 21, color: "#185FA5" },
  { label: "Processing",  pct: 12, color: "#d97706" },
  { label: "Pending",     pct: 5,  color: "#9ca3af" },
];

/* ─── Small helpers ──────────────────────────────────────── */
const statusBadge: Record<string, string> = {
  Processing: "badge-processing",
  Shipped:    "badge-shipped",
  Delivered:  "badge-delivered",
  Pending:    "badge-pending",
};
const supplierBadge: Record<string, string> = {
  ontime:  "badge-ontime",
  good:    "badge-good",
  delayed: "badge-delayed",
};
const supplierLabel: Record<string, string> = {
  ontime:  "On time",
  good:    "Good",
  delayed: "Delayed",
};

/* ─── Custom tooltip ─────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e3e5e8", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#374151" }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: {p.dataKey === "revenue" || p.dataKey === "target" ? `₹${p.value}K` : p.value}
        </p>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  const [orders, setOrders] = useState<any[]>([]);
const [customers, setCustomers] = useState<any[]>([]);
const [invoices, setInvoices] = useState<any[]>([]);
const [totalRevenue, setTotalRevenue] = useState<number>(0);

useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      const [ordersRes, customersRes, invoicesRes] = await Promise.all([
        axios.get("/api/orders"),
        axios.get("/api/customers"),
        axios.get("/api/invoices"),
      ]);

      const ordersData = ordersRes.data?.data ?? ordersRes.data ?? [];
      const customersData = customersRes.data?.data ?? customersRes.data ?? [];
      const invoicesData = invoicesRes.data?.data ?? invoicesRes.data ?? [];

      console.log("ORDERS DATA:", ordersData);
      console.log("CUSTOMERS DATA:", customersData);
      console.log("INVOICES DATA:", invoicesData);

      setOrders(ordersData);
      setCustomers(customersData);
      setInvoices(invoicesData);

    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  };

  fetchDashboardData();
}, []);

  useEffect(() => {
    const fetchLowStockItems = async () => {
      try {
        const { data } = await axios.get("/inventory-stock");
        const items = Array.isArray(data) ? data : data?.data ?? [];
        const lowStock: LowStockItem[] = items
          .filter((item: any) => {
            const available =
              item.available_quantity ??
              (item.quantity_on_hand ?? 0) - (item.allocated_quantity ?? 0) - (item.committed_quantity ?? 0);
            return available <= (item.reorder_point ?? 0);
          })
          .map((item: any) => {
            const available =
              item.available_quantity ??
              (item.quantity_on_hand ?? 0) - (item.allocated_quantity ?? 0) - (item.committed_quantity ?? 0);
            return {
              sku: item.item_code,
              name: item.item_name,
              current: available,
              minimum: item.reorder_point ?? 0,
              status: available < (item.reorder_point ?? 0) * 0.25 ? "critical" : "warning",
              itemType: item.item_type,
              id: item.id,
            };
          });
        setLowStockItems(lowStock);
      } catch (err) {
        console.error("Error fetching low stock items:", err);
      }
    };
    fetchLowStockItems();
  }, []);

  const totalOrders = orders.length;
const totalCustomers = customers.length;



  return (
    <Layout>
      {/* ── Global scoped styles ── */}
      <style>{`
        .dash-root { padding: 22px 20px; max-width: 1600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; color: #1a1d23; }

        /* page header */
        .dash-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
        .dash-page-title  { font-size:17px; font-weight:600; color:#111827; letter-spacing:-0.3px; margin-bottom:3px; }
        .dash-page-sub    { font-size:12px; color:#9ca3af; }
        .dash-page-actions { display:flex; gap:7px; }
        .dash-action-btn  { display:flex; align-items:center; gap:5px; padding:5px 12px; font-size:12px; color:#6b7280; border:1px solid #e3e5e8; border-radius:7px; cursor:pointer; background:#fff; font-family:inherit; }
        .dash-action-btn.primary { background:#1a56db; color:#fff; border-color:#1a56db; }

        /* KPI grid */
        .kpi-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:18px; }
        .kpi-card { background:#fff; border:1px solid #e3e5e8; border-radius:10px; padding:16px; display:flex; flex-direction:column; }
        .kpi-top  { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; }
        .kpi-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:16px; }
        .kpi-icon.blue   { background:#eff6ff; color:#1d4ed8; }
        .kpi-icon.green  { background:#f0fdf4; color:#16a34a; }
        .kpi-icon.amber  { background:#fffbeb; color:#d97706; }
        .kpi-icon.red    { background:#fef2f2; color:#dc2626; }
        .kpi-badge       { font-size:10.5px; font-weight:500; padding:2px 7px; border-radius:20px; }
        .kpi-badge.up    { background:#f0fdf4; color:#15803d; }
        .kpi-badge.down  { background:#fef2f2; color:#b91c1c; }
        .kpi-label { font-size:11px; font-weight:500; color:#9ca3af; letter-spacing:0.4px; margin-bottom:4px; text-transform:uppercase; }
        .kpi-value { font-size:22px; font-weight:700; color:#111827; letter-spacing:-0.5px; margin-bottom:4px; }
        .kpi-sub   { font-size:11px; color:#9ca3af; }
        .kpi-accent { height:3px; margin:12px -16px -16px; border-radius:0 0 10px 10px; }
        .kpi-accent.blue  { background:#1d4ed8; }
        .kpi-accent.green { background:#16a34a; }
        .kpi-accent.amber { background:#d97706; }
        .kpi-accent.red   { background:#dc2626; }

        /* Section label */
        .sec-label { font-size:10px; font-weight:600; color:#9ca3af; letter-spacing:0.8px; text-transform:uppercase; margin:6px 0 12px; display:flex; align-items:center; gap:8px; }
        .sec-label::before,.sec-label::after { content:''; flex:1; height:1px; background:#e5e7eb; }

        /* Layout */
        .row-2-3 { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(0,1fr); gap:12px; margin-bottom:14px; }
        .row-3   { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:14px; }
        .col-stack { display:flex; flex-direction:column; gap:12px; }

        /* Card */
        .dash-card { background:#fff; border:1px solid #e3e5e8; border-radius:10px; padding:16px 18px; }
        .card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .card-title  { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:500; color:#111827; }
        .card-title svg { width:15px; height:15px; color:#9ca3af; }
        .card-action { font-size:11.5px; color:#1d4ed8; cursor:pointer; display:flex; align-items:center; gap:3px; text-decoration:none; font-weight:400; }

        /* Chart legend */
        .chart-legend { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:8px; }
        .legend-item  { display:flex; align-items:center; gap:4px; font-size:11px; color:#6b7280; }
        .legend-sq    { width:9px; height:9px; border-radius:2px; display:inline-block; }
        .legend-dash  { width:14px; border-top:2px dashed #1D9E75; display:inline-block; }

        /* Orders table */
        .orders-table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .orders-table th { font-size:10px; font-weight:600; color:#9ca3af; text-align:left; padding:0 0 8px; border-bottom:1px solid #f3f4f6; letter-spacing:0.5px; text-transform:uppercase; }
        .orders-table td { font-size:12.5px; color:#374151; padding:9px 0; border-bottom:1px solid #f3f4f6; vertical-align:middle; }
        .orders-table tr:last-child td { border-bottom:none; }
        .order-id   { color:#1d4ed8; font-weight:500; }
        .order-cust { color:#6b7280; }

        /* Badges */
        .badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:10.5px; font-weight:500; white-space:nowrap; }
        .badge-processing { background:#fffbeb; color:#92400e; }
        .badge-shipped    { background:#eff6ff; color:#1e40af; }
        .badge-delivered  { background:#f0fdf4; color:#166534; }
        .badge-pending    { background:#f3f4f6; color:#4b5563; }
        .badge-danger     { background:#fef2f2; color:#991b1b; }
        .badge-warning    { background:#fffbeb; color:#92400e; }
        .badge-info       { background:#eff6ff; color:#1e40af; }
        .badge-ontime     { background:#f0fdf4; color:#166534; }
        .badge-good       { background:#eff6ff; color:#1e40af; }
        .badge-delayed    { background:#fffbeb; color:#92400e; }
        .badge-critical   { background:#fef2f2; color:#991b1b; }

        /* Alert items */
        .alert-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; font-size:12px; margin-bottom:7px; }
        .alert-item:last-child { margin-bottom:0; }
        .alert-item.danger  { background:#fef2f2; color:#991b1b; }
        .alert-item.warning { background:#fffbeb; color:#92400e; }
        .alert-item.info    { background:#eff6ff; color:#1e40af; }
        .alert-qty { margin-left:auto; font-size:11px; font-weight:500; opacity:0.85; }

        /* Progress */
        .prog-item { margin-bottom:11px; }
        .prog-item:last-child { margin-bottom:0; }
        .prog-row-lbl { display:flex; justify-content:space-between; font-size:12px; color:#6b7280; margin-bottom:5px; }
        .prog-row-lbl span:last-child { font-weight:500; color:#374151; }
        .prog-track { height:5px; background:#f3f4f6; border-radius:3px; }
        .prog-fill  { height:5px; border-radius:3px; }

        /* Supplier */
        .sup-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f3f4f6; font-size:12.5px; }
        .sup-row:last-child { border-bottom:none; }
        .sup-name  { color:#6b7280; }
        .sup-right { display:flex; align-items:center; gap:10px; }
        .sup-pct   { font-weight:600; color:#111827; font-size:13px; }

        /* Approvals */
        .approval-row { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:#f9fafb; border-radius:7px; margin-bottom:6px; font-size:12px; color:#374151; }
        .approval-row:last-child { margin-bottom:0; }

        /* Quick actions */
        .qa-btn { display:flex; align-items:center; gap:10px; padding:9px 12px; font-size:12.5px; border-radius:8px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; text-align:left; width:100%; color:#374151; font-family:inherit; margin-bottom:6px; transition:background 0.12s; }
        .qa-btn:last-child { margin-bottom:0; }
        .qa-btn:hover { background:#f9fafb; }

        /* Low stock */
        .stock-action-btn { display:inline-flex; align-items:center; padding:3px 10px; font-size:11px; font-weight:500; border-radius:6px; border:none; cursor:pointer; font-family:inherit; }
        .stock-action-btn.make { background:#1d4ed8; color:#fff; }
        .stock-action-btn.buy  { background:#f3f4f6; color:#374151; border:1px solid #e5e7eb; }

        /* Responsive */
        @media (max-width:1100px) {
          .row-2-3 { grid-template-columns:minmax(0,1fr); }
          .row-3   { grid-template-columns:repeat(2,minmax(0,1fr)); }
        }
        @media (max-width:768px) {
          .kpi-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .row-3    { grid-template-columns:minmax(0,1fr); }
        }
      `}</style>

      <div className="dash-root">
        {/* ── Page header ── */}
        <div className="dash-page-header">
          <div>
            <div className="dash-page-title">Operations Dashboard</div>
            <div className="dash-page-sub">Real-time summary · last updated just now</div>
          </div>
          <div className="dash-page-actions">
            <button className="dash-action-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M4 6h16M8 12h8M11 18h2"/></svg>
              Filter
            </button>
            <button className="dash-action-btn primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
       <div className="kpi-grid">
  {[
    {
      color: "blue",
      icon: "₹",
      label: "Total Revenue",
      value: `₹${(totalRevenue / 100000).toFixed(1)}L`,
      sub: "From invoices",
      badge: "live",
      up: true,
    },
    {
      color: "green",
      icon: "🛒",
      label: "Total Orders",
      value: orders.length,
      sub: "All orders",
      badge: "live",
      up: true,
    },
    {
      color: "amber",
      icon: "👥",
      label: "Active Customers",
      value: customers.length,
      sub: "Registered users",
      badge: "live",
      up: true,
    },
    {
      color: "red",
      icon: "⏱",
      label: "Pending Invoices",
      value: invoices.filter(i => i.status !== "paid").length,
      sub: "Unpaid invoices",
      badge: "live",
      up: false,
    },
  ].map((k) => (
    <div className="kpi-card" key={k.label}>
      <div className="kpi-top">
        <div className={`kpi-icon ${k.color}`} style={{ fontSize: 15 }}>
          {k.icon}
        </div>
        <span className={`kpi-badge ${k.up ? "up" : "down"}`}>
          {k.badge}
        </span>
      </div>

      <div className="kpi-label">{k.label}</div>
      <div className="kpi-value">{k.value}</div>
      <div className="kpi-sub">{k.sub}</div>

      <div className={`kpi-accent ${k.color}`} />
    </div>
  ))}
</div>

        {/* ── Charts ── */}
        <div className="sec-label">Performance overview</div>
        <div className="row-2-3">
          {/* Revenue line chart */}
          <div className="dash-card">
            <div className="card-header">
              <div className="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Revenue overview
              </div>
              <div className="chart-legend" style={{ marginBottom: 0 }}>
                <span className="legend-item"><span className="legend-sq" style={{ background: "#1a56db" }} />Revenue</span>
                <span className="legend-item"><span className="legend-dash" />Target</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#1a56db" strokeWidth={2.5} dot={{ r: 4, fill: "#1a56db", strokeWidth: 2, stroke: "#fff" }} name="Revenue" />
                <Line type="monotone" dataKey="target" stroke="#1D9E75" strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Production bar chart */}
          <div className="dash-card">
            <div className="card-header">
              <div className="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                Production performance
              </div>
              <a className="card-action" href="#">All weeks →</a>
            </div>
            <div className="chart-legend">
              <span className="legend-item"><span className="legend-sq" style={{ background: "#b5d4f4" }} />Planned</span>
              <span className="legend-item"><span className="legend-sq" style={{ background: "#1a56db" }} />Actual</span>
            </div>
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={productionData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="planned" fill="#b5d4f4" radius={[4, 4, 0, 0]} name="Planned" />
                <Bar dataKey="actual"  fill="#1a56db" radius={[4, 4, 0, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Operations ── */}
        <div className="sec-label">Operations</div>
        <div className="row-3">

          {/* Recent orders */}
          <div className="dash-card">
            <div className="card-header">
              <div className="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Recent orders
              </div>
              <a className="card-action" href="#" onClick={(e) => { e.preventDefault(); }}>View all →</a>
            </div>
            <table className="orders-table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Order</th>
                  <th style={{ width: "34%" }}>Customer</th>
                  <th style={{ width: "22%", textAlign: "right" }}>Amount</th>
                  <th style={{ width: "16%", textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="order-id">{o.id}</td>
                    <td className="order-cust">{o.customer}</td>
                    <td style={{ textAlign: "right", fontWeight: 500 }}>₹{o.amount.toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${statusBadge[o.status] || "badge-pending"}`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inventory alerts + Fulfillment rate */}
          <div className="col-stack">
            <div className="dash-card">
              <div className="card-header">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Inventory alerts
                </div>
                <span className="badge badge-danger">3 active</span>
              </div>
              {lowStockItems.length > 0 ? (
                lowStockItems.slice(0, 3).map((item) => (
                  <div key={item.sku} className={`alert-item ${item.status === "critical" ? "danger" : "warning"}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span><strong>{item.sku}</strong> {item.name} — {item.status === "critical" ? "below reorder" : "shortage risk"}</span>
                    <span className="alert-qty">{item.current} left</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="alert-item danger">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    <span><strong>SKU-1142</strong> Steel Brackets — below reorder</span>
                    <span className="alert-qty">12 left</span>
                  </div>
                  <div className="alert-item warning">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    <span><strong>SKU-0887</strong> Copper Wire — shortage risk</span>
                    <span className="alert-qty">34 left</span>
                  </div>
                  <div className="alert-item info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                    <span><strong>SKU-2201</strong> Circuit Boards — restock soon</span>
                    <span className="alert-qty">58 left</span>
                  </div>
                </>
              )}
            </div>

            {/* Fulfillment rate */}
            <div className="dash-card">
              <div className="card-header">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                  Fulfillment rate
                </div>
              </div>
              {fulfillmentRates.map((f) => (
                <div className="prog-item" key={f.label}>
                  <div className="prog-row-lbl"><span>{f.label}</span><span>{f.pct}%</span></div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{ width: `${f.pct}%`, background: f.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supplier + Approvals + Quick actions */}
          <div className="col-stack">
            {/* Supplier performance */}
            <div className="dash-card">
              <div className="card-header">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  Supplier performance
                </div>
              </div>
              {supplierData.map((s) => (
                <div className="sup-row" key={s.name}>
                  <span className="sup-name">{s.name}</span>
                  <div className="sup-right">
                    <span className="sup-pct">{s.pct}%</span>
                    <span className={`badge ${supplierBadge[s.status]}`}>{supplierLabel[s.status]}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pending approvals */}
            <div className="dash-card">
              <div className="card-header">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  Pending approvals
                </div>
                <span className="badge badge-warning">5 waiting</span>
              </div>
              {pendingApprovals.map((a) => (
                <div className="approval-row" key={a.id}>
                  <span>{a.id} · {a.amount}</span>
                  <span className="badge badge-processing">{a.type}</span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="dash-card">
              <div className="card-header">
                <div className="card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Quick actions
                </div>
              </div>
              <button className="qa-btn" onClick={() => navigate("/purchase/purchase-orders")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New purchase order ↗
              </button>
              <button className="qa-btn" onClick={() => navigate("/purchase/rfq-management")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" width="15" height="15"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                Reorder inventory ↗
              </button>
              <button className="qa-btn" onClick={() => navigate("/planning")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" width="15" height="15"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Plan production ↗
              </button>
              <button className="qa-btn" onClick={() => navigate("/accounting/invoices")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" width="15" height="15"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Generate invoice report ↗
              </button>
            </div>
          </div>
        </div>

        {/* ── Low Stock table (full width) ── */}
        {lowStockItems.length > 0 && (
          <>
            <div className="sec-label">Low stock alerts</div>
            <div className="dash-card" style={{ marginBottom: 14 }}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th style={{ width: "15%" }}>SKU</th>
                    <th style={{ width: "38%" }}>Product</th>
                    <th style={{ width: "12%", textAlign: "center" }}>Stock</th>
                    <th style={{ width: "12%", textAlign: "center" }}>Min</th>
                    <th style={{ width: "13%", textAlign: "center" }}>Status</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.sku}>
                      <td className="order-id">{item.sku}</td>
                      <td>{item.name}</td>
                      <td style={{ textAlign: "center", fontWeight: 600, color: item.status === "critical" ? "#dc2626" : "#d97706" }}>
                        {item.current}
                      </td>
                      <td style={{ textAlign: "center", color: "#9ca3af" }}>{item.minimum}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${item.status === "critical" ? "badge-critical" : "badge-warning"}`}>
                          {item.status === "critical" ? "Critical" : "Warning"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {item.itemType === "Product" ? (
                          <button className="stock-action-btn make" onClick={() => navigate("/planning")}>Make</button>
                        ) : item.itemType === "Raw Material" || item.itemType === "Semi Finished" ? (
                          <button className="stock-action-btn buy" onClick={() => navigate("/purchase/rfq-management")}>Buy</button>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
