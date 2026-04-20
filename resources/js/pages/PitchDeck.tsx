import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Maximize2, Minimize2, ArrowLeft,
  BarChart3, Package, ShoppingCart, Receipt, Bot, Shield, 
  Globe, Zap, Users, TrendingUp, CheckCircle2, Layers,
  Factory, FileText, Truck, CreditCard, Brain, Workflow
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SLIDES = [
  // Slide 0 - Title
  {
    id: "title",
    render: () => (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground px-8 md:px-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white" style={{
              width: `${Math.random() * 200 + 50}px`, height: `${Math.random() * 200 + 50}px`,
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.3
            }} />
          ))}
        </div>
        <div className="relative z-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-sm font-medium mb-8 backdrop-blur-sm">
            <Zap className="h-4 w-4" /> AI-Powered ERP Platform
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-tight">
            MozitzSuite
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl font-light opacity-90 mb-10 max-w-3xl mx-auto">
            The Intelligent ERP for Modern Manufacturing & Distribution
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm opacity-80">
            {["Inventory", "Production", "Procurement", "Accounting", "AI Automation"].map(t => (
              <span key={t} className="px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm">{t}</span>
            ))}
          </div>
        </div>
      </div>
    )
  },
  // Slide 1 - Problem
  {
    id: "problem",
    render: () => (
      <div className="flex flex-col justify-center h-full px-8 md:px-16 lg:px-24 bg-background">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-sm font-bold text-destructive uppercase tracking-widest mb-4">The Problem</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-10 leading-tight">
            Manufacturers & Distributors Are<br />
            <span className="text-destructive">Drowning in Complexity</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Layers, title: "Disconnected Systems", desc: "Separate tools for inventory, production, accounting — nothing talks to each other." },
              { icon: TrendingUp, title: "No Visibility", desc: "Leaders can't see real-time cash flow, stock levels, or production status in one place." },
              { icon: Users, title: "Manual Bottlenecks", desc: "Teams spend hours on data entry, approvals, and reconciliation that should be automated." },
            ].map(item => (
              <div key={item.title} className="p-6 rounded-2xl border border-border bg-card">
                <item.icon className="h-10 w-10 text-destructive mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
  // Slide 2 - Solution
  {
    id: "solution",
    render: () => (
      <div className="flex flex-col justify-center h-full px-8 md:px-16 lg:px-24 bg-gradient-to-br from-background to-accent/5">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Our Solution</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight">
            One Platform. <span className="text-primary">Complete Control.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
            MozitzSuite unifies every business process — from raw material to revenue — in a single AI-powered platform.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Package, label: "Smart Inventory", color: "text-blue-500" },
              { icon: Factory, label: "Production Planning", color: "text-green-500" },
              { icon: ShoppingCart, label: "Procurement & RFQ", color: "text-orange-500" },
              { icon: Receipt, label: "Invoicing & GST", color: "text-purple-500" },
              { icon: CreditCard, label: "Payables & Ledger", color: "text-pink-500" },
              { icon: Brain, label: "AI Automation Agent", color: "text-primary" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
                <item.icon className={`h-6 w-6 ${item.color} shrink-0`} />
                <span className="font-semibold text-sm text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
  // Slide 3 - Key Modules
  {
    id: "modules",
    render: () => (
      <div className="flex flex-col justify-center h-full px-8 md:px-16 lg:px-24 bg-background">
        <div className="max-w-6xl mx-auto w-full">
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Core Modules</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-10">
            Everything You Need, <span className="text-primary">Built-In</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Package, title: "Inventory Management", points: ["Real-time stock tracking", "Multi-location support", "Auto reorder points", "Barcode scanning"] },
              { icon: Workflow, title: "Production & BOM", points: ["Bill of Materials", "Discrete job scheduling", "Shop floor tracking", "Material allocation"] },
              { icon: ShoppingCart, title: "Procurement Suite", points: ["Purchase orders & RFQ", "Vendor quotation comparison", "GRN & quality checks", "E-Auction module"] },
              { icon: FileText, title: "Accounting & GST", points: ["Invoice management", "Recurring invoices", "Credit notes & ledger", "GST-compliant tax engine"] },
            ].map(mod => (
              <div key={mod.title} className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <mod.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{mod.title}</h3>
                </div>
                <ul className="space-y-2">
                  {mod.points.map(p => (
                    <li key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
  // Slide 4 - AI Agent
  {
    id: "ai",
    render: () => (
      <div className="flex flex-col justify-center h-full px-8 md:px-16 lg:px-24 bg-gradient-to-br from-primary/5 to-background">
        <div className="max-w-5xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
            <Bot className="h-4 w-4" /> Powered by AI
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight">
            Meet <span className="text-primary">MozitzAI Agent</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
            A conversational AI assistant that automates business operations through natural language commands.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {[
                "\"Create invoice for ABC Traders ₹5,000\" → Invoice created",
                "\"Show low stock items\" → Instant inventory report",
                "\"Generate GST report for March\" → Report ready",
                "\"Create PO for Steel Corp\" → Step-by-step guided flow",
              ].map((ex, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                  <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{ex}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {[
                { title: "Anomaly Detection", desc: "Flags duplicate invoices, unusual payment patterns automatically" },
                { title: "Cash Flow Forecasting", desc: "Predicts cash position 30-90 days out based on historical data" },
                { title: "Smart Auto-fill", desc: "AI parses job descriptions and fills complex forms instantly" },
              ].map(f => (
                <div key={f.title} className="p-4 rounded-xl bg-card border border-border">
                  <h4 className="font-bold text-foreground mb-1">{f.title}</h4>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  },
  // Slide 5 - Approvals & Security
  {
    id: "security",
    render: () => (
      <div className="flex flex-col justify-center h-full px-8 md:px-16 lg:px-24 bg-background">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Governance & Security</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-10 leading-tight">
            Enterprise-Grade <span className="text-primary">Controls</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Role-Based Access", desc: "Admin, Procurement, Finance, Warehouse, Inventory — granular permissions for every role." },
              { icon: CheckCircle2, title: "Multi-Level Approvals", desc: "PO approvals, invoice approvals, stock transfer approvals, inventory adjustments — nothing slips through." },
              { icon: Globe, title: "Cloud-Native", desc: "Secure cloud infrastructure with real-time sync, automatic backups, and 99.9% uptime SLA." },
            ].map(item => (
              <div key={item.title} className="p-6 rounded-2xl border border-border bg-card text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
  // Slide 6 - Market & Traction
  {
    id: "market",
    render: () => (
      <div className="flex flex-col justify-center h-full px-8 md:px-16 lg:px-24 bg-gradient-to-br from-background to-accent/5">
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Market Opportunity</p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-10 leading-tight">
            Massive Addressable Market
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {[
              { value: "$78B", label: "Global ERP Market by 2028", sub: "Growing at 10.7% CAGR" },
              { value: "63M+", label: "SME Manufacturers in India", sub: "Under-served by legacy ERP" },
              { value: "4x", label: "ROI Within 12 Months", sub: "Through automation savings" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-5xl md:text-6xl font-extrabold text-primary mb-2">{stat.value}</p>
                <p className="font-bold text-foreground mb-1">{stat.label}</p>
                <p className="text-sm text-muted-foreground">{stat.sub}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {["Manufacturing", "Distribution", "FMCG", "Auto Parts", "Electronics", "Textiles"].map(ind => (
              <span key={ind} className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium text-sm">{ind}</span>
            ))}
          </div>
        </div>
      </div>
    )
  },
  // Slide 7 - CTA
  {
    id: "cta",
    render: () => (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground px-8 md:px-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white" style={{
              width: `${Math.random() * 300 + 100}px`, height: `${Math.random() * 300 + 100}px`,
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4
            }} />
          ))}
        </div>
        <div className="relative z-10 text-center max-w-3xl">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            Ready to Transform<br />Your Business?
          </h2>
          <p className="text-xl md:text-2xl font-light opacity-90 mb-10">
            Join the future of intelligent manufacturing operations with MozitzSuite.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="px-8 py-4 rounded-xl bg-white text-primary font-bold text-lg">
              Request a Demo
            </div>
            <div className="px-8 py-4 rounded-xl bg-white/15 backdrop-blur-sm font-bold text-lg border border-white/20">
              Contact Sales
            </div>
          </div>
          <p className="mt-10 text-sm opacity-60">
            www.mozitzsuite.com • hello@mozitzsuite.com
          </p>
        </div>
      </div>
    )
  },
];

export default function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  const goTo = useCallback((idx: number) => {
    setCurrent(Math.max(0, Math.min(SLIDES.length - 1, idx)));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goTo(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
      if (e.key === "Escape" && isFullscreen) { document.exitFullscreen?.(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, goTo, isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            {current + 1} / {SLIDES.length}
          </span>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Slide */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          {SLIDES[current].render()}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-3 py-3 bg-card/80 backdrop-blur-sm border-t border-border shrink-0">
        <Button variant="outline" size="icon" onClick={() => goTo(current - 1)} disabled={current === 0} className="h-9 w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
            />
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={() => goTo(current + 1)} disabled={current === SLIDES.length - 1} className="h-9 w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {isFullscreen && (
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-9 w-9 ml-2">
            <Minimize2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
