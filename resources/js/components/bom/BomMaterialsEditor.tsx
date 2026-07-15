import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { NewMaterialRow, InventoryItemOption } from "./types";

const stockColor = (stock: number, need: number) => {
  if (stock <= 0 || stock < need) return "text-red-600";
  if (stock < need * 2) return "text-amber-600";
  return "text-emerald-600";
};

interface BomMaterialsEditorProps {
  rows: NewMaterialRow[];
  onRowsChange: (rows: NewMaterialRow[]) => void;
  inventoryItems: InventoryItemOption[];
  stock: Record<string, number>;
  readOnly?: boolean;
}

export function BomMaterialsEditor({ rows, onRowsChange, inventoryItems, stock, readOnly }: BomMaterialsEditorProps) {
  const { toast } = useToast();
  const [materialPick, setMaterialPick] = useState({ code: "", quantity: 1, scrap_percent: 0 });

  const addMaterialRow = () => {
    const item = inventoryItems.find(i => i.item_code === materialPick.code);
    if (!item || materialPick.quantity <= 0) {
      toast({ title: "Select a material and enter a quantity greater than zero", variant: "destructive" });
      return;
    }
    if (rows.some(r => r.component === item.item_code)) {
      toast({ title: "This material is already on the list", variant: "destructive" });
      return;
    }
    onRowsChange([...rows, {
      tempId: crypto.randomUUID(),
      component: item.item_code,
      description: item.item_name,
      uom: "",
      quantity: materialPick.quantity,
      scrap_percent: materialPick.scrap_percent,
      stock: stock[item.item_code] ?? 0,
    }]);
    setMaterialPick({ code: "", quantity: 1, scrap_percent: 0 });
  };

  const removeMaterialRow = (tempId: string) => onRowsChange(rows.filter(r => r.tempId !== tempId));

  const moveMaterialRow = (index: number, dir: -1 | 1) => {
    const swap = index + dir;
    if (swap < 0 || swap >= rows.length) return;
    const next = [...rows];
    [next[index], next[swap]] = [next[swap], next[index]];
    onRowsChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="border rounded-md divide-y">
          {rows.map((r, i) => {
            const totalQty = r.quantity * (1 + r.scrap_percent / 100);
            return (
              <div key={r.tempId} className="flex items-center gap-2 px-3 py-2">
                {!readOnly && (
                  <div className="flex flex-col">
                    <button disabled={i === 0} onClick={() => moveMaterialRow(i, -1)} className="disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
                    <button disabled={i === rows.length - 1} onClick={() => moveMaterialRow(i, 1)} className="disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-semibold">{r.component}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{r.description}</div>
                </div>
                <div className="text-xs text-right w-20">Qty {r.quantity}</div>
                <div className="text-xs text-right w-20 text-muted-foreground">Scrap {r.scrap_percent}%</div>
                <div className="text-xs text-right w-24 font-medium">= {totalQty.toFixed(3)}</div>
                <div className={`text-xs text-right w-16 ${stockColor(r.stock, r.quantity)}`}>[{r.stock}]</div>
                {!readOnly && (
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => removeMaterialRow(r.tempId)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <Label className="text-xs">Add Material</Label>
          <div className="grid grid-cols-4 gap-2 items-end">
            <div className="col-span-2">
              <Select value={materialPick.code} onValueChange={(v) => setMaterialPick(p => ({ ...p, code: v }))}>
                <SelectTrigger><SelectValue placeholder="Search item code…" /></SelectTrigger>
                <SelectContent>
                  {inventoryItems
                    .filter(item => item.item_code?.startsWith("CMP") || item.item_code?.startsWith("MAT"))
                    .map((item) => (
                      <SelectItem key={item.item_code} value={item.item_code}>
                        {item.item_code} — {item.item_name} [{item.quantity_on_hand ?? 0}]
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input type="number" min={0.001} step={0.001} placeholder="Qty/Assembly"
                value={materialPick.quantity}
                onChange={(e) => setMaterialPick(p => ({ ...p, quantity: Number(e.target.value) }))} />
            </div>
            <div>
              <Input type="number" min={0} max={100} step={0.1} placeholder="Scrap %"
                value={materialPick.scrap_percent}
                onChange={(e) => setMaterialPick(p => ({ ...p, scrap_percent: Number(e.target.value) }))} />
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={addMaterialRow}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
          </Button>
        </div>
      )}
    </div>
  );
}
