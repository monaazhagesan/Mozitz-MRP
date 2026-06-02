
import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, Area, AreaChart, CartesianGrid
} from "recharts";

/* ─── Types ────────────────────────────── */
type ChipKind = "up" | "dn" | "nt";
type BadgeKind = "up" | "dn" | "nt" | "in" | "wn";

/* ─── Design tokens ──────────────────────*/
const C = {
  blue:   "#185FA5",
  blueLt: "#e8f0fb",
  green:  "#1D9E75",
  greenLt:"#e8f5e9",
  amber:  "#BA7517",
  amberLt:"#fff8e1",
  purple: "#534AB7",
  purpleLt:"#ede7f6",
  red:    "#e84040",
  redLt:  "#fce4ec",
  border: "#e8e9eb",
  muted:  "#9aa0a6",
  sub:    "#5f6368",
  txt:    "#111111",
};

/* ─── Small components ───────────────────*/
function Chip({ kind, label }: { kind: ChipKind; label: string }) {
  const cls: Record<ChipKind, string> = {
    up: "bg-green-50 text-green-800",
    dn: "bg-red-50 text-red-800",
    nt: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls[kind]}`}>
      {label}
    </span>
  );
}

function Badge({ kind, label }: { kind: BadgeKind; label: string }) {
  const cls: Record<BadgeKind, string> = {
    up: "bg-green-50 text-green-800",
    dn: "bg-red-50 text-red-800",
    nt: "bg-gray-100 text-gray-500",
    in: "bg-blue-50 text-blue-800",
    wn: "bg-amber-50 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cls[kind]}`}>
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="flex-1 h-px bg-[#e8e9eb]" />
      <span className="text-[10px] font-semibold text-[#9aa0a6] tracking-widest uppercase whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-[#e8e9eb]" />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#e8e9eb] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, icon, right }: { title: string; icon: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111]">
        <i className={`ti ${icon} text-[14px] text-[#9aa0a6]`} />
        {title}
      </div>
      {right}
    </div>
  );
}

/* ─── KPI Card ───────────────────────────*/
function KpiCard({
  icon, iconBg, iconColor, chip, chipKind, label, value, sub, lineColor,
}: {
  icon: string; iconBg: string; iconColor: string;
  chip: string; chipKind: ChipKind;
  label: string; value: string; sub: string; lineColor: string;
}) {
  return (
    <div className="bg-white border border-[#e8e9eb] rounded-xl pt-3.5 px-4 pb-0 overflow-hidden">
      <div className="flex items-start justify-between mb-3.5">
        <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center ${iconBg}`}>
          <i className={`ti ${icon} text-[14px] ${iconColor}`} />
        </div>
        <Chip kind={chipKind} label={chip} />
      </div>
      <div className="text-[11px] text-[#80868b] mb-1 tracking-wide">{label}</div>
      <div className="text-[20px] font-semibold text-[#111] mb-0.5 tracking-tight">{value}</div>
      <div className="text-[11px] text-[#9aa0a6] mb-3">{sub}</div>
      <div className="h-[3px] -mx-4 rounded-b-xl" style={{ background: lineColor }} />
    </div>
  );
}

/* ─── Progress Row ───────────────────────*/
function ProgressRow({ label, width, color, val, change, changeUp }: {
  label: string; width: string; color: string; val: string; change: string; changeUp: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[#f1f3f4] last:border-0">
      <span className="text-[12px] text-[#5f6368] w-24 shrink-0">{label}</span>
      <div className="flex-1 h-[5px] bg-[#f1f3f4] rounded-full">
        <div className="h-[5px] rounded-full" style={{ width, background: color }} />
      </div>
      <span className="text-[12px] font-medium text-[#111] w-14 text-right shrink-0">{val}</span>
      <span className={`text-[11px] w-9 text-right shrink-0 ${changeUp ? "text-green-700" : "text-red-700"}`}>
        {change}
      </span>
    </div>
  );
}

/* ─── Insight Row ────────────────────────*/
function InsightRow({ iconBg, iconColor, icon, title, desc }: {
  iconBg: string; iconColor: string; icon: string; title: string; desc: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-[#f1f3f4] last:border-0">
      <div className={`w-[26px] h-[26px] rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <i className={`ti ${icon} text-[13px] ${iconColor}`} />
      </div>
      <div>
        <div className="text-[12px] font-medium text-[#111] mb-0.5">{title}</div>
        <div className="text-[11px] text-[#5f6368] leading-[1.55]">{desc}</div>
      </div>
    </div>
  );
}

/* ─── Custom Tooltip ─────────────────────*/
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e8e9eb] rounded-lg px-3 py-2 shadow-md text-[11px]">
      <p className="font-medium text-[#111] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[#5f6368]">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-[#111]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Data ───────────────────────────────*/
const revenueData = [
  { month: "Jan", actual: 270, forecast: null, upper: null, lower: null },
  { month: "Feb", actual: 275, forecast: null, upper: null, lower: null },
  { month: "Mar", actual: 278, forecast: null, upper: null, lower: null },
  { month: "Apr", actual: 270, forecast: null, upper: null, lower: null },
  { month: "May", actual: 300, forecast: null, upper: null, lower: null },
  { month: "Jun", actual: 380, forecast: 380,  upper: 395,  lower: 365  },
  { month: "Jul", actual: null, forecast: 410, upper: 438,  lower: 382  },
  { month: "Aug", actual: null, forecast: 435, upper: 470,  lower: 400  },
  { month: "Sep", actual: null, forecast: 462, upper: 502,  lower: 422  },
];

const donutData = [
  { name: "Manufacturing", value: 42, color: "#3266ad" },
  { name: "Procurement",   value: 28, color: "#1D9E75" },
  { name: "Logistics",     value: 18, color: "#BA7517"  },
  { name: "Services",      value: 12, color: "#534AB7"  },
];

const demandData = [
  { w:"W1", s1:140, s2:95,  s3:60 },
  { w:"W2", s1:155, s2:100, s3:55 },
  { w:"W3", s1:160, s2:110, s3:70 },
  { w:"W4", s1:148, s2:105, s3:65 },
  { w:"W5", s1:170, s2:115, s3:75 },
  { w:"W6", s1:180, s2:120, s3:80 },
  { w:"W7", s1:175, s2:118, s3:72 },
  { w:"W8", s1:185, s2:125, s3:85 },
];

const cycleData = [
  { stage: "Procurement", days: 1.2, color: "#3266ad" },
  { stage: "Production",  days: 2.1, color: "#1D9E75" },
  { stage: "QC check",    days: 0.5, color: "#BA7517"  },
  { stage: "Dispatch",    days: 0.4, color: "#534AB7"  },
];

const momData = [
  { m:"Jan", v:2  },
  { m:"Feb", v:3  },
  { m:"Mar", v:1  },
  { m:"Apr", v:-3 },
  { m:"May", v:11 },
  { m:"Jun", v:27 },
];

const skuRows = [
  { sku:"SKU-1142", forecast:"1,240 u", mape:"4.2%",  mapeKind:"up" as BadgeKind,  conf:92, confColor:"#2e7d32" },
  { sku:"SKU-0887", forecast:"870 u",   mape:"6.8%",  mapeKind:"up" as BadgeKind,  conf:85, confColor:"#2e7d32" },
  { sku:"SKU-2201", forecast:"530 u",   mape:"11.4%", mapeKind:"wn" as BadgeKind,  conf:71, confColor:"#f57f17" },
  { sku:"SKU-3340", forecast:"320 u",   mape:"5.1%",  mapeKind:"up" as BadgeKind,  conf:88, confColor:"#2e7d32" },
  { sku:"SKU-4412", forecast:"190 u",   mape:"14.7%", mapeKind:"dn" as BadgeKind,  conf:62, confColor:"#c62828" },
];

const procRows = [
  { item:"Steel Brackets",   jul:"420 u", aug:"450 u", sep:"470 u", trend:"↑ 12%", tk:"up" as BadgeKind },
  { item:"Copper Wire",      jul:"290 u", aug:"310 u", sep:"295 u", trend:"→ Flat", tk:"nt" as BadgeKind },
  { item:"Circuit Boards",   jul:"180 u", aug:"210 u", sep:"240 u", trend:"↑ 33%", tk:"up" as BadgeKind },
  { item:"Fasteners",        jul:"960 u", aug:"940 u", sep:"900 u", trend:"↓ 6%",  tk:"dn" as BadgeKind },
  { item:"Aluminium Sheets", jul:"140 u", aug:"155 u", sep:"170 u", trend:"↑ 21%", tk:"up" as BadgeKind },
];

const navItems = [
  { icon:"ti-layout-dashboard", label:"Dashboard" },
  { icon:"ti-report-money",     label:"Accounting" },
  { icon:"ti-shopping-cart",    label:"Procurement" },
  { icon:"ti-package",          label:"Inventory" },
  { icon:"ti-settings-cog",     label:"Production" },
  { icon:"ti-chart-bar",        label:"Analytics", active: true },
  { icon:"ti-checks",           label:"Approvals" },
  { icon:"ti-settings",         label:"Settings" },
];

/* ─── Main ───────────────────────────────*/
export default function MozizsuiteAnalytics() {
  const [activeTab, setActiveTab] = useState("Analytics");
  const tabs = ["Analytics", "Forecasting", "Demand planning", "Reports"];

  return (
       <Layout>
    <div className="font-sans bg-[#f5f6f8] text-[#111] min-h-screen" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" />




      {/* ── Body ── */}
      <main className="px-6 py-5 max-w-[1440px] mx-auto">

        {/* Page header */}
        <div className="flex items-start justify-between mb-[18px]">
          <div>
            <div className="text-[18px] font-semibold text-[#111] tracking-tight mb-0.5">Analytics &amp; Forecasting</div>
            <div className="text-[12px] text-[#80868b]">Performance trends, demand signals, and AI-driven forecasts · Jun 2026</div>
          </div>
          <div className="flex gap-1.5 items-center">
            <button className="flex items-center gap-1.5 px-3 py-[5px] text-[12px] text-[#5f6368] border border-[#e2e3e5] rounded-lg bg-white hover:bg-[#f8f9fa] cursor-pointer font-sans">
              <i className="ti ti-adjustments-horizontal text-[13px]" /> Filter
            </button>
            <button className="flex items-center gap-1.5 px-3 py-[5px] text-[12px] text-white border border-[#185FA5] rounded-lg bg-[#185FA5] hover:bg-[#1456a0] cursor-pointer font-sans">
              <i className="ti ti-sparkles text-[13px]" /> AI insights
            </button>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-4 gap-2.5 mb-[18px]">
          <KpiCard icon="ti-currency-rupee" iconBg="bg-[#e8f0fb]" iconColor="text-[#185FA5]" chip="↑ 12.5%" chipKind="up" label="Revenue (MTD)" value="₹1.9M" sub="Forecast: ₹2.1M by Jun 30" lineColor={C.blue} />
          <KpiCard icon="ti-shopping-bag" iconBg="bg-[#e8f5e9]" iconColor="text-[#2e7d32]" chip="↑ 8.2%" chipKind="up" label="Orders (MTD)" value="342" sub="Forecast: 389 by Jun 30" lineColor={C.green} />
          <KpiCard icon="ti-rotate" iconBg="bg-[#fff8e1]" iconColor="text-[#f57f17]" chip="→ Stable" chipKind="nt" label="Inventory turnover" value="6.4×" sub="Target 7.0× · gap 0.6" lineColor={C.amber} />
          <KpiCard icon="ti-clock" iconBg="bg-[#ede7f6]" iconColor="text-[#512da8]" chip="↑ Better" chipKind="up" label="Avg lead time" value="4.2 days" sub="Down from 5.1 days last mo." lineColor={C.purple} />
        </div>

        {/* Revenue analytics */}
        <SectionLabel>Revenue analytics</SectionLabel>
        <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-3 mb-3.5">

          {/* Revenue trend */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111]">
                <i className="ti ti-chart-line text-[14px] text-[#9aa0a6]" /> Revenue trend with 90-day forecast
              </div>
              <div className="flex flex-wrap gap-2.5">
                {[["#3266ad","Actual"],["#1D9E75","Forecast"],["#b5d4f4","Band"]].map(([c,l]) => (
                  <span key={l} className="flex items-center gap-1 text-[11px] text-[#5f6368]">
                    <span className="w-[9px] h-[9px] rounded-sm inline-block" style={{ background: c }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3266ad" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#3266ad" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b5d4f4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#b5d4f4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(0,0,0,0.05)" strokeDasharray="0" />
                <XAxis dataKey="month" tick={{ fill: "#9aa0a6", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9aa0a6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#gradBand)" name="Upper band" />
                <Area type="monotone" dataKey="lower" stroke="transparent" fill="white" />
                <Area type="monotone" dataKey="actual" stroke="#3266ad" strokeWidth={2} fill="url(#gradActual)" dot={{ r: 3, fill: "#3266ad" }} name="Actual" connectNulls={false} />
                <Area type="monotone" dataKey="forecast" stroke="#1D9E75" strokeWidth={2} strokeDasharray="5 4" fill="url(#gradForecast)" dot={{ r: 3, fill: "#1D9E75" }} name="Forecast" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Donut */}
          <Card>
            <CardHeader title="Revenue by category" icon="ti-chart-donut" right={
              <a href="#" className="text-[11px] text-[#185FA5] flex items-center gap-0.5 no-underline cursor-pointer">
                Detail <i className="ti ti-arrow-right text-[12px]" />
              </a>
            } />
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
                  {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2.5 mt-2.5">
              {donutData.map((d) => (
                <span key={d.name} className="flex items-center gap-1 text-[11px] text-[#5f6368]">
                  <span className="w-[9px] h-[9px] rounded-sm inline-block" style={{ background: d.color }} />
                  {d.name} {d.value}%
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* Demand forecasting */}
        <SectionLabel>Demand forecasting</SectionLabel>
        <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-3 mb-3.5">

          {/* Demand bars */}
          <Card>
            <CardHeader title="Demand forecast — top SKUs (8 weeks)" icon="ti-packages" />
            <div className="flex flex-wrap gap-2.5 mb-2">
              {[["#3266ad","SKU-1142 Steel Brackets"],["#1D9E75","SKU-0887 Copper Wire"],["#BA7517","SKU-2201 Circuit Boards"]].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1 text-[11px] text-[#5f6368]">
                  <span className="w-[9px] h-[9px] rounded-sm inline-block" style={{ background: c }} />
                  {l}
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={demandData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="w" tick={{ fill: "#9aa0a6", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9aa0a6", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="s1" name="SKU-1142" fill="#3266ad" radius={[2,2,0,0]} />
                <Bar dataKey="s2" name="SKU-0887" fill="#1D9E75" radius={[2,2,0,0]} />
                <Bar dataKey="s3" name="SKU-2201" fill="#BA7517"  radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* SKU accuracy table */}
          <Card>
            <CardHeader title="Forecast accuracy by SKU" icon="ti-table" right={<Badge kind="in" label="Jul – Sep" />} />
            <table className="w-full border-collapse table-fixed text-left">
              <thead>
                <tr>
                  {["SKU","Forecast","MAPE","Confidence"].map((h, i) => (
                    <th key={h} className="text-[10px] font-semibold text-[#9aa0a6] pb-2 border-b border-[#f1f3f4] tracking-widest uppercase"
                      style={{ textAlign: i > 0 ? "right" : "left", width: i===0?"30%":i===1?"20%":i===2?"16%":"34%" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skuRows.map((r) => (
                  <tr key={r.sku}>
                    <td className="text-[12px] font-medium text-[#111] py-2 border-b border-[#f1f3f4]">{r.sku}</td>
                    <td className="text-[12px] text-[#5f6368] py-2 border-b border-[#f1f3f4] text-right">{r.forecast}</td>
                    <td className="text-[12px] py-2 border-b border-[#f1f3f4] text-right"><Badge kind={r.mapeKind} label={r.mape} /></td>
                    <td className="text-[12px] py-2 border-b border-[#f1f3f4] text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="w-[72px] h-[5px] bg-[#f1f3f4] rounded-full">
                          <div className="h-[5px] rounded-full" style={{ width: `${r.conf}%`, background: r.confColor }} />
                        </div>
                        <span className="text-[10px] text-[#5f6368]">{r.conf}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Operational analytics */}
        <SectionLabel>Operational analytics</SectionLabel>
        <div className="grid grid-cols-3 gap-3 mb-3.5">

          {/* Revenue by channel */}
          <Card>
            <CardHeader title="Revenue by channel" icon="ti-chart-bar" />
            <ProgressRow label="Direct sales"  width="78%" color="#3266ad" val="₹1.48M" change="↑14%" changeUp />
            <ProgressRow label="Distributors"  width="42%" color="#1D9E75" val="₹0.80M" change="↑9%"  changeUp />
            <ProgressRow label="E-commerce"    width="26%" color="#BA7517"  val="₹0.49M" change="↑22%" changeUp />
            <ProgressRow label="Exports"        width="15%" color="#534AB7"  val="₹0.29M" change="↓3%"  changeUp={false} />
          </Card>

          {/* Cycle time */}
          <Card>
            <CardHeader title="Cycle time breakdown" icon="ti-clock" />
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cycleData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#9aa0a6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}d`} />
                <YAxis type="category" dataKey="stage" tick={{ fill: "#9aa0a6", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v) => `${v} days`} />
                <Bar dataKey="days" radius={[0,3,3,0]}>
                  {cycleData.map((d) => <Cell key={d.stage} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* MoM growth */}
          <Card>
            <CardHeader title="Month-on-month growth" icon="ti-trending-up" />
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={momData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: "#9aa0a6", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9aa0a6", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v >= 0 ? "+" : ""}${v}%`} />
                <ReferenceLine y={0} stroke="#e8e9eb" />
                <Tooltip formatter={(v: any) => `${v >= 0 ? "+" : ""}${v}%`} />
                <Bar dataKey="v" radius={[3,3,0,0]}>
                  {momData.map((d) => <Cell key={d.m} fill={d.v >= 0 ? "#1D9E75" : "#e84040"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* AI Insights */}
        <SectionLabel>AI-generated insights</SectionLabel>
        <div className="grid grid-cols-2 gap-3 mb-3.5">

          {/* Key insights */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111]">
                <i className="ti ti-sparkles text-[14px] text-[#9aa0a6]" /> Key insights
              </div>
              <span className="text-[10px] bg-[#ede7f6] text-[#512da8] px-2 py-0.5 rounded-full font-medium">AI · Jun 2026</span>
            </div>
            <InsightRow iconBg="bg-[#e8f5e9]" iconColor="text-[#2e7d32]" icon="ti-trending-up" title="Revenue accelerating in Q2" desc="Jun is on track to exceed ₹2.1M — a 10.5% jump from May, driven by e-commerce and direct-sales channels." />
            <InsightRow iconBg="bg-[#fff8e1]" iconColor="text-[#f57f17]" icon="ti-alert-triangle" title="SKU-2201 forecast confidence low" desc="Circuit Board MAPE at 11.4%. Consider increasing safety stock by 20% for Jul–Aug to avoid stockout risk." />
            <InsightRow iconBg="bg-[#e8f0fb]" iconColor="text-[#185FA5]" icon="ti-clock" title="Lead time improved 18%" desc="Avg lead time fell from 5.1 → 4.2 days after onboarding Mahindra Steels as primary supplier in May." />
            <InsightRow iconBg="bg-[#fce4ec]" iconColor="text-[#c62828]" icon="ti-package" title="Inventory turnover below target" desc="Current 6.4× vs target 7.0×. Slow-moving SKU-4412 is the primary drag — review reorder policy this week." />
          </Card>

          {/* 90-day procurement forecast */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111]">
                <i className="ti ti-calendar-stats text-[14px] text-[#9aa0a6]" /> 90-day procurement forecast
              </div>
              <Badge kind="in" label="Jul – Sep 2026" />
            </div>
            <table className="w-full border-collapse table-fixed text-left">
              <thead>
                <tr>
                  {["Item","Jul","Aug","Sep","Trend"].map((h, i) => (
                    <th key={h} className="text-[10px] font-semibold text-[#9aa0a6] pb-2 border-b border-[#f1f3f4] tracking-widest uppercase"
                      style={{ textAlign: i > 0 ? "right" : "left", width: i===0?"32%":i===4?"20%":"16%" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {procRows.map((r) => (
                  <tr key={r.item}>
                    <td className="text-[11px] font-medium text-[#111] py-2 border-b border-[#f1f3f4]">{r.item}</td>
                    <td className="text-[11px] text-[#5f6368] py-2 border-b border-[#f1f3f4] text-right">{r.jul}</td>
                    <td className="text-[11px] text-[#5f6368] py-2 border-b border-[#f1f3f4] text-right">{r.aug}</td>
                    <td className="text-[11px] text-[#5f6368] py-2 border-b border-[#f1f3f4] text-right">{r.sep}</td>
                    <td className="text-[11px] py-2 border-b border-[#f1f3f4] text-right"><Badge kind={r.tk} label={r.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 pt-2.5 border-t border-[#f1f3f4] flex justify-end">
              <button className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#e2e3e5] bg-white text-[#111] hover:bg-[#f8f9fa] cursor-pointer font-sans">
                <i className="ti ti-file-invoice text-[13px]" /> Generate procurement plan
              </button>
            </div>
          </Card>
        </div>

      </main>
    </div>
    </Layout>
  );
}
