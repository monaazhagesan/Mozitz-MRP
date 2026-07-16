import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, X, Warehouse as WarehouseIcon, Boxes, PackageSearch, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

// ─────────────────── types ───────────────────
type LocationRow = {
  id: string;
  location_name: string;
  legal_name?: string | null;
};
type StorageBinRow = {
  id: string;
  location_id: string;
  bin_name: string;
};
type WarehouseStockRow = {
  id: string;
  item_code: string;
  item_name: string;
  item_total_on_hand: number;
  location_id: string;
  location_name?: string;
  storage_bin_id: string | null;
  storage_bin_name?: string | null;
  quantity_on_hand: number;
};
type UnallocatedRow = {
  item_code: string;
  item_name: string;
  uom: string;
  quantity_on_hand: number;
  allocated: number;
  unallocated: number;
};

const InventoryLocation = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [bins, setBins] = useState<StorageBinRow[]>([]);
  const [stockRows, setStockRows] = useState<WarehouseStockRow[]>([]);
  const [unallocated, setUnallocated] = useState<UnallocatedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"warehouses" | "unallocated">("warehouses");
  const [search, setSearch] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const [pick, setPick] = useState({ item_code: "", storage_bin_id: "", quantity_on_hand: 0 });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [locRes, binRes, stockRes, unallocRes] = await Promise.all([
        axios.get("/api/locations"),
        axios.get("/api/storage-bins"),
        axios.get("/api/warehouse-stock"),
        axios.get("/api/warehouse-stock/unallocated"),
      ]);
      setLocations(locRes.data?.data ?? []);
      setBins(Array.isArray(binRes.data) ? binRes.data : []);
      setStockRows(Array.isArray(stockRes.data) ? stockRes.data : []);
      setUnallocated(Array.isArray(unallocRes.data) ? unallocRes.data : []);
    } catch (error: any) {
      toast({
        title: "Failed to load warehouse data",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(l => l.location_name?.toLowerCase().includes(q));
  }, [locations, search]);

  const stockByLocation = useMemo(() => {
    const m: Record<string, WarehouseStockRow[]> = {};
    stockRows.forEach(r => { (m[r.location_id] ||= []).push(r); });
    return m;
  }, [stockRows]);

  const locationTotals = (locationId: string) => {
    const rows = stockByLocation[locationId] ?? [];
    return { items: rows.length, qty: rows.reduce((s, r) => s + Number(r.quantity_on_hand), 0) };
  };

  const stats = useMemo(() => {
    const distinctAllocatedItems = new Set(stockRows.map(r => r.item_code)).size;
    const totalQty = stockRows.reduce((s, r) => s + Number(r.quantity_on_hand), 0);
    return {
      warehouses: locations.length,
      allocatedItems: distinctAllocatedItems,
      unallocatedItems: unallocated.length,
      totalQty,
    };
  }, [locations, stockRows, unallocated]);

  const selectedLocation = locations.find(l => l.id === selectedLocationId) || null;
  const selectedLocationRows = selectedLocationId ? (stockByLocation[selectedLocationId] ?? []) : [];
  const binsForSelectedLocation = bins.filter(b => b.location_id === selectedLocationId);

  const resetPick = () => setPick({ item_code: "", storage_bin_id: "", quantity_on_hand: 0 });

  const allocateItem = async () => {
    if (!selectedLocationId) return;
    const item = unallocated.find(u => u.item_code === pick.item_code);
    if (!item || pick.quantity_on_hand <= 0) {
      toast({ title: "Select an item and enter a quantity greater than zero", variant: "destructive" });
      return;
    }
    if (pick.quantity_on_hand > item.unallocated) {
      toast({ title: `Only ${item.unallocated} of ${item.item_code} is unallocated`, variant: "destructive" });
      return;
    }
    try {
      await axios.post("/api/warehouse-stock", {
        item_code: pick.item_code,
        location_id: selectedLocationId,
        storage_bin_id: pick.storage_bin_id || null,
        quantity_on_hand: pick.quantity_on_hand,
      });
      toast({ title: "Stock allocated" });
      resetPick();
      await loadAll();
    } catch (error: any) {
      toast({
        title: "Failed to allocate",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const removeAllocation = async (rowId: string) => {
    try {
      await axios.delete(`/api/warehouse-stock/${rowId}`);
      toast({ title: "Allocation removed" });
      await loadAll();
    } catch (error: any) {
      toast({
        title: "Failed to remove allocation",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-[#e8eef4] p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto space-y-4">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Warehouse</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Stock by Location · Inventory</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Warehouses" value={stats.warehouses} accent="bg-blue-500" />
            <StatCard label="Allocated Items" value={stats.allocatedItems} accent="bg-emerald-500" />
            <StatCard label="Unallocated Items" value={stats.unallocatedItems} accent="bg-amber-500" />
            <StatCard label="Total Allocated Qty" value={stats.totalQty} accent="bg-teal-500" />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="warehouses">By Warehouse</TabsTrigger>
              <TabsTrigger value="unallocated">
                Unallocated Stock {unallocated.length > 0 && <Badge variant="outline" className="ml-1.5 text-[10px]">{unallocated.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* ── By Warehouse ── */}
            <TabsContent value="warehouses" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
                {/* Left: locations list */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <WarehouseIcon className="h-4 w-4 text-blue-600" /> Locations
                    </CardTitle>
                  </CardHeader>
                  <div className="px-3 pb-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search locations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                  </div>
                  <CardContent className="p-0 max-h-[calc(100vh-420px)] overflow-y-auto">
                    {loading ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
                    ) : filteredLocations.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">No locations found</div>
                    ) : filteredLocations.map(loc => {
                      const totals = locationTotals(loc.id);
                      return (
                        <button
                          key={loc.id}
                          onClick={() => setSelectedLocationId(loc.id)}
                          className={`w-full text-left px-3 py-2.5 border-b flex items-center gap-2.5 hover:bg-muted/50 ${selectedLocationId === loc.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                        >
                          <span className="h-7 w-7 inline-flex items-center justify-center rounded border bg-card">
                            <WarehouseIcon className="h-3.5 w-3.5 text-blue-600" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{loc.location_name}</div>
                            <div className="flex gap-1 mt-0.5">
                              <Badge variant="outline" className="text-[9px]">{totals.items} item{totals.items === 1 ? "" : "s"}</Badge>
                              <Badge variant="outline" className="text-[9px]">{totals.qty} units</Badge>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Right: selected warehouse detail */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {selectedLocation ? (
                        <>
                          <WarehouseIcon className="h-4 w-4 text-blue-600" />
                          {selectedLocation.location_name}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Select a warehouse</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!selectedLocation ? (
                      <div className="text-center py-16 text-muted-foreground text-sm">
                        <Boxes className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        Select a warehouse from the list to view and allocate its stock
                      </div>
                    ) : (
                      <>
                        {selectedLocationRows.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm border rounded-md">
                            No stock allocated to this warehouse yet.
                          </div>
                        ) : (
                          <div className="border rounded-md divide-y">
                            {selectedLocationRows.map(row => (
                              <div key={row.id} className="flex items-center gap-2 px-3 py-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-mono text-xs font-semibold">{row.item_code}</div>
                                  <div className="text-[11px] text-muted-foreground truncate">{row.item_name}</div>
                                </div>
                                {row.storage_bin_name && (
                                  <Badge variant="outline" className="text-[9px]">{row.storage_bin_name}</Badge>
                                )}
                                <div className="text-sm font-medium w-20 text-right">{row.quantity_on_hand}</div>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => removeAllocation(row.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                          <div className="text-xs font-semibold">Allocate Item</div>
                          <div className="grid grid-cols-4 gap-2 items-end">
                            <div className="col-span-2">
                              <Select value={pick.item_code} onValueChange={(v) => setPick(p => ({ ...p, item_code: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                                <SelectContent>
                                  {unallocated.length === 0 ? (
                                    <SelectItem value="none" disabled>Nothing unallocated</SelectItem>
                                  ) : (
                                    unallocated.map(u => (
                                      <SelectItem key={u.item_code} value={u.item_code}>
                                        {u.item_code} — {u.item_name} [{u.unallocated} unallocated]
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Select
                                value={pick.storage_bin_id || "__none"}
                                onValueChange={(v) => setPick(p => ({ ...p, storage_bin_id: v === "__none" ? "" : v }))}
                              >
                                <SelectTrigger><SelectValue placeholder="Bin (optional)" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none">No bin</SelectItem>
                                  {binsForSelectedLocation.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.bin_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Input
                                type="number"
                                min={0.001}
                                step={0.001}
                                placeholder="Qty"
                                value={pick.quantity_on_hand || ""}
                                onChange={(e) => setPick(p => ({ ...p, quantity_on_hand: Number(e.target.value) }))}
                              />
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={allocateItem}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Allocate
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Unallocated Stock ── */}
            <TabsContent value="unallocated" className="mt-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PackageSearch className="h-4 w-4 text-amber-600" /> Items Not Yet Assigned to a Warehouse
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {unallocated.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Every item's stock is fully allocated to a warehouse.
                    </div>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {unallocated.map(u => (
                        <div key={u.item_code} className="flex items-center gap-3 px-3 py-2.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs font-semibold">{u.item_code}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{u.item_name}</div>
                          </div>
                          <div className="text-xs text-muted-foreground w-28 text-right">On hand: {u.quantity_on_hand}</div>
                          <div className="text-xs text-muted-foreground w-24 text-right">Allocated: {u.allocated}</div>
                          <div className="text-sm font-semibold text-amber-700 w-28 text-right">Unallocated: {u.unallocated}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

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

export default InventoryLocation;
