import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search, Plus, ChevronRight, ChevronDown, Trash2, Package,
  Boxes, Layers, Component as CompIcon, AlertTriangle, CheckCircle2, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

// ─────────────────── types ───────────────────
type BomHeader = {
  id: string;
  item_code: string;
  item_name: string;
  item_type: string;
  uom: string;
  revision: string;
  status: string;
};
type BomComponentRow = {
  id: string;
  bom_id: string;
  component: string;
  description: string;
  quantity: number;
  uom: string;
  type: string;
  item_seq: number;
};
type StockMap = Record<string, number>;
type TreeNode = {
  key: string;
  code: string;
  name: string;
  type: string;
  qty: number;
  unit: string;
  stock: number;
  bomId?: string;       // bom_components row id (if from a BOM)
  parentBomId?: string; // header id of the BOM where this row lives
  children: TreeNode[];
};

const typeBadge = (type: string) => {
  const t = (type || "").toLowerCase();
  if (t.includes("product")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (t.includes("assembly")) return "bg-teal-50 text-teal-700 border-teal-200";
  if (t.includes("component")) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200"; // material/default
};
const typeIcon = (type: string) => {
  const t = (type || "").toLowerCase();
  if (t.includes("product")) return <Package className="h-3.5 w-3.5 text-emerald-600" />;
  if (t.includes("assembly")) return <Layers className="h-3.5 w-3.5 text-teal-600" />;
  if (t.includes("component")) return <CompIcon className="h-3.5 w-3.5 text-amber-600" />;
  return <Boxes className="h-3.5 w-3.5 text-blue-600" />;
};
const stockColor = (stock: number, need: number) => {
  if (stock <= 0 || stock < need) return "text-red-600";
  if (stock < need * 2) return "text-amber-600";
  return "text-emerald-600";
};

export default function BOM() {
  const { toast } = useToast();
  const [headers, setHeaders] = useState<BomHeader[]>([]);
  const [allComponents, setAllComponents] = useState<BomComponentRow[]>([]);
  const [stock, setStock] = useState<StockMap>({});
  const [inventoryItems, setInventoryItems] = useState<{ item_code: string; item_name: string; item_type: string | null; quantity_on_hand: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);

  // ui state
  const [tab, setTab] = useState("tree");
  const [search, setSearch] = useState("");
  const [selectedHeaderId, setSelectedHeaderId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // explosion
  const [expBomId, setExpBomId] = useState<string>("");
  const [expQty, setExpQty] = useState<number>(1);

  // where used
  const [wuCode, setWuCode] = useState<string>("");

  // modals
  const [bomModalOpen, setBomModalOpen] = useState(false);
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [addParentBomId, setAddParentBomId] = useState<string | null>(null);

  const [bomForm, setBomForm] = useState({ code: "", name: "", type: "Product", uom: "Ea", revision: "A" });
  const [compForm, setCompForm] = useState({ code: "", name: "", type: "Material", qty: 1, unit: "pcs" });

  // ─────────────────── load ───────────────────
  const loadAll = async () => {
    try {
      setLoading(true);

      const [h, c, inv] = await Promise.all([
        axios.get("/api/bom-headers?status=Active"),
        axios.get("/api/bom-components"),
        axios.get("/api/inventory-stock"),
      ]);

      // ✅ Normalize all responses safely
      const headersData = Array.isArray(h.data)
        ? h.data
        : h.data?.data ?? [];

      const componentsData = Array.isArray(c.data)
        ? c.data
        : c.data?.data ?? [];

      const inventoryData =
        inv.data?.data ??
        inv.data?.items ??
        inv.data ??
        [];

      // ✅ Set state
      setHeaders(headersData);
      setAllComponents(componentsData);
      const normalized = (inventoryData || []).map((r: any) => ({
        item_code: r.item_code ?? r.itemCode,
        item_name: r.item_name ?? r.itemName,
        item_type: r.item_type ?? r.itemType,
        quantity_on_hand: r.quantity_on_hand ?? r.quantityOnHand,
      }));

      setInventoryItems(normalized);

      // ✅ Build stock map safely
      const map: StockMap = {};

      inventoryData.forEach((r: any, index: number) => {


        const code = r?.itemCode;
        const qty = Number(r?.quantityOnHand ?? 0);

        if (code) {
          map[code] = qty;
        }
      });

      console.log("FINAL STOCK MAP:", map);

      setStock(map);

    } catch (error: any) {
      console.error("LOAD ERROR:", error);

      toast({
        title: "Failed to load data",
        description: error?.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // header lookup by item_code (so a component referencing another product is treated as a sub-assembly)
  const headerByCode = useMemo(() => {
    const m: Record<string, BomHeader> = {};
    headers.forEach(h => { m[h.item_code] = h; });
    return m;
  }, [headers]);

  const componentsByBomId = useMemo(() => {
    const m: Record<string, BomComponentRow[]> = {};
    allComponents.forEach(c => {
      (m[c.bom_id] ||= []).push(c);
    });
    Object.values(m).forEach(arr => arr.sort((a, b) => (a.item_seq ?? 0) - (b.item_seq ?? 0)));
    return m;
  }, [allComponents]);

  // build a recursive tree from a BOM header
  const buildTree = (header: BomHeader, prefix = "", visited = new Set<string>()): TreeNode => {
    const node: TreeNode = {
      key: prefix + header.id,
      code: header.item_code,
      name: header.item_name,
      type: header.item_type || "Product",
      qty: 1,
      unit: header.uom,
      stock: stock[header.item_code] ?? 0,
      parentBomId: header.id,
      children: [],
    };
    if (visited.has(header.id)) return node;
    const nextVisited = new Set(visited).add(header.id);
    const rows = componentsByBomId[header.id] ?? [];
    node.children = rows.map((r) => {
      const subHeader = headerByCode[r.component];
      if (subHeader && subHeader.id !== header.id) {
        const sub = buildTree(subHeader, prefix + r.id + "/", nextVisited);
        sub.qty = Number(r.quantity) || 0;
        sub.unit = r.uom || sub.unit;
        sub.bomId = r.id;
        sub.key = prefix + r.id;
        return sub;
      }
      return {
        key: prefix + r.id,
        code: r.component,
        name: r.description,
        type: r.type || "Material",
        qty: Number(r.quantity) || 0,
        unit: r.uom || "pcs",
        stock: stock[r.component] ?? 0,
        bomId: r.id,
        parentBomId: header.id,
        children: [],
      };
    });
    return node;
  };

  const filteredHeaders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return headers;
    return headers.filter(h =>
      h.item_code.toLowerCase().includes(q) || h.item_name.toLowerCase().includes(q)
    );
  }, [headers, search]);

  const selectedHeader = headers.find(h => h.id === selectedHeaderId) || null;
  const tree = selectedHeader ? buildTree(selectedHeader) : null;

  // stats
  const stats = useMemo(() => {
    const uniqueComps = new Set(allComponents.map(c => c.component)).size;
    let maxLvls = 0;
    headers.forEach(h => {
      const t = buildTree(h);
      const depth = (n: TreeNode, d = 0): number => n.children.length === 0 ? d : Math.max(...n.children.map(c => depth(c, d + 1)));
      maxLvls = Math.max(maxLvls, depth(t));
    });
    let gaps = 0;
    allComponents.forEach(c => {
      if ((stock[c.component] ?? 0) < Number(c.quantity)) gaps++;
    });
    return { boms: headers.length, comps: uniqueComps, lvls: maxLvls, gaps };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, allComponents, stock]);

  // ─────────────────── tree renderer ───────────────────
  const toggle = (key: string) => {
    setCollapsed(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const renderRow = (node: TreeNode, level = 0) => {
    const hasChildren = node.children.length > 0;
    const isOpen = !collapsed.has(node.key);
    const totalNeed = node.qty;
    return (
      <div key={node.key}>
        <div
          className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors"
          style={{ marginLeft: level * 18 }}
        >
          {hasChildren ? (
            <button onClick={() => toggle(node.key)} className="h-5 w-5 inline-flex items-center justify-center rounded border bg-background hover:border-primary hover:text-primary">
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="h-5 w-5 inline-block" />
          )}
          <span className="h-6 w-6 inline-flex items-center justify-center rounded border bg-card">
            {typeIcon(node.type)}
          </span>
          <span className="font-mono text-xs font-semibold min-w-[90px]">{node.code}</span>
          <span className="text-xs text-muted-foreground flex-1 truncate">{node.name}</span>
          <Badge variant="outline" className={`text-[10px] uppercase ${typeBadge(node.type)}`}>{node.type}</Badge>
          <span className="text-xs font-medium text-amber-600 min-w-[44px] text-right">{node.qty}</span>
          <span className="text-[10px] text-muted-foreground min-w-[28px]">{node.unit}</span>
          <span className={`text-xs font-medium min-w-[60px] text-right ${stockColor(node.stock, totalNeed)}`}>
            [{node.stock}]
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {(node.parentBomId || headerByCode[node.code]) && (
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => openAddComp(headerByCode[node.code]?.id || node.parentBomId!)}>
                <Plus className="h-3 w-3" />
              </Button>
            )}
            {node.bomId && (
              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:text-red-700"
                onClick={() => deleteComponent(node.bomId!)}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        {hasChildren && isOpen && (
          <div className="border-l border-dashed border-border ml-3">
            {node.children.map(c => renderRow(c, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    if (!tree) return;
    const all = new Set<string>();
    const walk = (n: TreeNode) => { if (n.children.length) { all.add(n.key); n.children.forEach(walk); } };
    walk(tree);
    setCollapsed(all);
  };

  // ─────────────────── actions ───────────────────
  const openAddComp = (bomId: string) => {
    setAddParentBomId(bomId);
    setCompForm({ code: "", name: "", type: "Material", qty: 1, unit: "pcs" });
    setCompModalOpen(true);
  };

  const autoFillComp = (code: string) => {
    setCompForm(f => ({ ...f, code }));
    const item = inventoryItems.find(i => i.item_code.toLowerCase() === code.toLowerCase());
    if (item) {
      setCompForm(f => ({
        ...f,
        code: item.item_code,
        name: item.item_name,
        type: item.item_type || f.type,
      }));
    }
  };

  const saveBOM = async () => {
    if (!bomForm.code || !bomForm.name) {
      toast({ title: "Code and name required", variant: "destructive" });
      return;
    }

    const exists = headers.find(
      (h) => h.item_code.toLowerCase() === bomForm.code.toLowerCase()
    );

    if (exists) {
      toast({ title: "BOM already exists", variant: "destructive" });
      return;
    }

    try {
      const res = await axios.post("/api/bom-headers", {
        item_code: bomForm.code,
        item_name: bomForm.name,
        item_type: bomForm.type,
        uom: bomForm.uom,
        revision: bomForm.revision,
        status: "Active",
      });

      toast({ title: "BOM created" });

      setBomModalOpen(false);
      setBomForm({
        code: "",
        name: "",
        type: "Product",
        uom: "Ea",
        revision: "A",
      });

      await loadAll();
      setSelectedHeaderId(res.data.id);
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveComp = async () => {
    if (!addParentBomId || !compForm.code || !compForm.name) {
      toast({ title: "Code and name required", variant: "destructive" });
      return;
    }

    const existing = componentsByBomId[addParentBomId] ?? [];

    if (
      existing.some(
        (c) => c.component.toLowerCase() === compForm.code.toLowerCase()
      )
    ) {
      toast({
        title: "Component already exists",
        variant: "destructive",
      });
      return;
    }

    const nextSeq =
      (existing.reduce((m, r) => Math.max(m, r.item_seq || 0), 0) || 0) + 10;

    try {
      await axios.post("/api/bom-components", {
        bom_id: addParentBomId,
        component: compForm.code,
        description: compForm.name,
        type: compForm.type,
        quantity: compForm.qty,
        uom: compForm.unit,
        item_seq: nextSeq,
        operation_seq: 10,
      });

      toast({ title: "Component added" });
      setCompModalOpen(false);
      await loadAll();
    } catch (error: any) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteComponent = async (rowId: string) => {
    try {
      await axios.delete(`/api/bom-components/${rowId}`);

      toast({ title: "Component removed" });
      await loadAll();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ─────────────────── explosion ───────────────────
  const explosion = useMemo(() => {
    if (!expBomId) return [];
    const header = headers.find(h => h.id === expBomId);
    if (!header) return [];
    const root = buildTree(header);
    // flatten leaves only (materials/components without sub-bom)
    const acc: Record<string, { code: string; name: string; type: string; unit: string; need: number; stock: number }> = {};
    const walk = (n: TreeNode, mult: number) => {
      if (n.children.length === 0) {
        const need = n.qty * mult;
        if (!acc[n.code]) acc[n.code] = { code: n.code, name: n.name, type: n.type, unit: n.unit, need: 0, stock: stock[n.code] ?? 0 };
        acc[n.code].need += need;
      } else {
        n.children.forEach(c => walk(c, mult * (c === n ? 1 : 1)));
        // for sub-assemblies: child quantities are absolute per parent unit, multiply by qty
        // re-walk children with their qty as multiplier:
      }
    };
    // Correct multi-level explosion
    const walk2 = (n: TreeNode, mult: number) => {
      if (n.children.length === 0) {
        if (!acc[n.code]) acc[n.code] = { code: n.code, name: n.name, type: n.type, unit: n.unit, need: 0, stock: stock[n.code] ?? 0 };
        acc[n.code].need += n.qty * mult;
        return;
      }
      n.children.forEach(c => walk2(c, mult * n.qty));
    };
    // root.qty is 1 for the assembly; user's expQty multiplies the root
    root.children.forEach(c => walk2(c, expQty));
    return Object.values(acc).sort((a, b) => a.code.localeCompare(b.code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expBomId, expQty, headers, allComponents, stock]);

  // ─────────────────── where used ───────────────────
  const allComponentCodes = useMemo(() => {
    const s = new Set<string>();
    allComponents.forEach(c => s.add(c.component));
    return Array.from(s).sort();
  }, [allComponents]);

  const whereUsed = useMemo(() => {
    if (!wuCode) return [];
    const rows = allComponents.filter(c => c.component === wuCode);
    return rows.map(r => {
      const h = headers.find(x => x.id === r.bom_id);
      return h ? { headerId: h.id, parentCode: h.item_code, parentName: h.item_name, qty: Number(r.quantity), unit: r.uom } : null;
    }).filter(Boolean) as any[];
  }, [wuCode, allComponents, headers]);

  // ─────────────────── render ───────────────────
  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-[#e8eef4] p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">BOM Manager</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Bill of Materials · MRP</p>
            </div>
            <Button onClick={() => { setBomForm({ code: "", name: "", type: "Product", uom: "Ea", revision: "A" }); setBomModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New BOM
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total BOMs" value={stats.boms} accent="bg-blue-500" />
            <StatCard label="Unique Components" value={stats.comps} accent="bg-teal-500" />
            <StatCard label="Max BOM Levels" value={stats.lvls} accent="bg-emerald-500" />
            <StatCard label="Stock Gaps" value={stats.gaps} accent="bg-amber-500" />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="tree">BOM Tree</TabsTrigger>
              <TabsTrigger value="explosion">BOM Explosion</TabsTrigger>
              <TabsTrigger value="whereused">Where Used</TabsTrigger>
            </TabsList>

            {/* ── Tree tab ── */}
            <TabsContent value="tree" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
                {/* Left list */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="h-4 w-4 text-emerald-600" /> Products / Assemblies
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <div className="px-3 pb-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search BOMs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                  </div>
                  <CardContent className="p-0 max-h-[calc(100vh-360px)] overflow-y-auto">
                    {loading ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
                    ) : filteredHeaders.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">No BOMs found</div>
                    ) : filteredHeaders.map(h => (
                      <button
                        key={h.id}
                        onClick={() => {
                          setSelectedHeaderId(h.id);
                          setSelectedProductCode(h.item_code); // ✅ ADD THIS
                        }}
                        className={`w-full text-left px-3 py-2.5 border-b flex items-center gap-2.5 hover:bg-muted/50 ${selectedHeaderId === h.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                      >
                        <span className="h-7 w-7 inline-flex items-center justify-center rounded border bg-card">
                          {typeIcon(h.item_type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs font-semibold truncate">{h.item_code}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{h.item_name}</div>
                          <div className="flex gap-1 mt-0.5">
                            <Badge variant="outline" className={`text-[9px] ${typeBadge(h.item_type)}`}>{h.item_type}</Badge>
                            <Badge variant="outline" className="text-[9px]">Rev {h.revision}</Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Right tree */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {selectedHeader ? (
                          <>
                            {typeIcon(selectedHeader.item_type)}
                            <span className="font-mono">{selectedHeader.item_code}</span>
                            <span className="text-muted-foreground font-normal">— {selectedHeader.item_name}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Select a product</span>
                        )}
                      </CardTitle>
                      {selectedHeader && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={expandAll}>Expand All</Button>
                          <Button size="sm" variant="outline" onClick={collapseAll}>Collapse</Button>
                          <Button size="sm" onClick={() => openAddComp(selectedHeader.id)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Component
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="max-h-[calc(100vh-340px)] overflow-y-auto">
                    {!tree ? (
                      <div className="text-center py-16 text-muted-foreground text-sm">
                        <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        Select a product from the list to view its Bill of Materials
                      </div>
                    ) : tree.children.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        No components yet. Click <strong>+ Component</strong> to add one.
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {tree.children.map(c => renderRow(c, 0))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Explosion tab ── */}
            <TabsContent value="explosion" className="mt-4">
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layers className="h-4 w-4 text-amber-600" /> BOM Explosion — Net Requirements
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Label className="text-xs text-muted-foreground">Produce Qty:</Label>
                      <Input type="number" min={1} value={expQty}
                        onChange={(e) => setExpQty(Math.max(1, Number(e.target.value) || 1))}
                        className="w-24 h-9" />
                      <Select value={expBomId} onValueChange={setExpBomId}>
                        <SelectTrigger className="w-[280px] h-9">
                          <SelectValue placeholder="Select a BOM…" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map(h => (
                            <SelectItem key={h.id} value={h.id}>{h.item_code} — {h.item_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!expBomId ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Select a BOM to explode.</div>
                  ) : explosion.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">No leaf components found.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Total Need</TableHead>
                          <TableHead className="text-right">On Hand</TableHead>
                          <TableHead className="text-right">Shortage</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {explosion.map(r => {
                          const short = Math.max(0, r.need - r.stock);
                          const status = r.stock <= 0 || r.stock < r.need
                            ? { label: "Short", cls: "bg-red-100 text-red-700 border-red-200", icon: <X className="h-3 w-3" /> }
                            : r.stock < r.need * 2
                              ? { label: "Low", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: <AlertTriangle className="h-3 w-3" /> }
                              : { label: "OK", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> };
                          return (
                            <TableRow key={r.code}>
                              <TableCell className="font-mono text-xs font-semibold">{r.code}</TableCell>
                              <TableCell>{r.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${typeBadge(r.type)}`}>{r.type}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">{r.need} {r.unit}</TableCell>
                              <TableCell className={`text-right font-medium ${stockColor(r.stock, r.need)}`}>{r.stock}</TableCell>
                              <TableCell className={`text-right font-medium ${short > 0 ? "text-red-600" : "text-muted-foreground"}`}>{short}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`gap-1 ${status.cls}`}>
                                  {status.icon} {status.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Where Used tab ── */}
            <TabsContent value="whereused" className="mt-4">
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CompIcon className="h-4 w-4 text-purple-600" /> Where Used
                    </CardTitle>
                    <Select value={wuCode} onValueChange={setWuCode}>
                      <SelectTrigger className="w-[280px] h-9">
                        <SelectValue placeholder="Select component…" />
                      </SelectTrigger>
                      <SelectContent>
                        {allComponentCodes.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {!wuCode ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Select a component to see which BOMs use it.</div>
                  ) : whereUsed.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Not used in any BOM.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Used In (BOM)</TableHead>
                          <TableHead>Parent Name</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {whereUsed.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs font-semibold">{r.parentCode}</TableCell>
                            <TableCell>{r.parentName}</TableCell>
                            <TableCell className="text-right">{r.qty}</TableCell>
                            <TableCell>{r.unit}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedHeaderId(r.headerId); setTab("tree"); }}>
                                View BOM
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── New BOM modal ── */}
      <Dialog open={bomModalOpen} onOpenChange={setBomModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New BOM</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Product Code *</Label>

              <Select
                value={bomForm.code || ""}
                onValueChange={(value) => {
                  const item = inventoryItems.find(i => i.item_code === value);

                  setBomForm(prev => ({
                    ...prev,
                    code: value,
                    name: item?.item_name || "",
                    type: item?.item_type || prev.type,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product code" />
                </SelectTrigger>

                <SelectContent>
                  {inventoryItems
                    .filter(item => item.item_code?.startsWith("PRD"))
                    .map((item) => (
                      <SelectItem
                        key={item.item_code}
                        value={item.item_code}
                      >
                        {item.item_code}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Product Name *</Label>
              <Input value={bomForm.name} onChange={(e) => setBomForm({ ...bomForm, name: e.target.value })} placeholder="T1 Shaft Assembly" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={bomForm.type} onValueChange={(v) => setBomForm({ ...bomForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Product">Product</SelectItem>
                  <SelectItem value="Assembly">Assembly</SelectItem>
                  <SelectItem value="Component">Component</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Revision</Label>
              <Input value={bomForm.revision} onChange={(e) => setBomForm({ ...bomForm, revision: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">UoM</Label>
              <Input value={bomForm.uom} onChange={(e) => setBomForm({ ...bomForm, uom: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBomModalOpen(false)}>Cancel</Button>
            <Button onClick={saveBOM}>Create BOM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Component modal ── */}
      <Dialog open={compModalOpen} onOpenChange={setCompModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Component</DialogTitle></DialogHeader>
          <div className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2 mb-2">
            Adding to: <span className="font-mono font-semibold text-foreground">
              {headers.find(h => h.id === addParentBomId)?.item_code ?? "—"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Component Code *</Label>

              <Select
                value={compForm.code}
                onValueChange={(value) => {
                  const item = inventoryItems.find(i => i.item_code === value);

                  setCompForm(f => ({
                    ...f,
                    code: item?.item_code || "",
                    name: item?.item_name || "",
                    type: item?.item_type || f.type,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select code" />
                </SelectTrigger>

                <SelectContent>
                  {inventoryItems
                    .filter(item =>
                      item.item_code?.startsWith("CMP") ||
                      item.item_code?.startsWith("MAT")
                    )
                    .map((item) => (
                      <SelectItem key={item.item_code} value={item.item_code}>
                        {item.item_code}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <p className="text-[10px] text-muted-foreground mt-1">
                Select a MAT component to auto-fill details
              </p>
            </div>
            <div>
              <Label className="text-xs">Component Name *</Label>
              <Input value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} placeholder="Bearing 10010" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={compForm.type} onValueChange={(v) => setCompForm({ ...compForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Material">Material</SelectItem>
                  <SelectItem value="Component">Component</SelectItem>
                  <SelectItem value="Assembly">Assembly</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Qty Required *</Label>
              <Input type="number" min={0.001} step={0.001}
                value={compForm.qty}
                onChange={(e) => setCompForm({ ...compForm, qty: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Unit of Measure</Label>
              <Select value={compForm.unit} onValueChange={(v) => setCompForm({ ...compForm, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pcs", "kg", "m", "l", "set", "lot", "Ea"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompModalOpen(false)}>Cancel</Button>
            <Button onClick={saveComp}>Add Component</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
