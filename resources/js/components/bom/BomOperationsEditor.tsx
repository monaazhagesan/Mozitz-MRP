import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { NewOperationRow, OperationMasterRow } from "./types";

interface BomOperationsEditorProps {
  rows: NewOperationRow[];
  onRowsChange: (rows: NewOperationRow[]) => void;
  operationsMaster: OperationMasterRow[];
  readOnly?: boolean;
}

export function BomOperationsEditor({ rows, onRowsChange, operationsMaster, readOnly }: BomOperationsEditorProps) {
  const { toast } = useToast();
  const [operationPick, setOperationPick] = useState({
    operation_code: "", department: "", setup_time: 0, run_time: 0, labor_cost: 0, qc_required: false,
  });

  const addOperationRow = () => {
    if (!operationPick.operation_code || operationPick.run_time <= 0) {
      toast({ title: "Select an operation and enter a cycle time greater than zero", variant: "destructive" });
      return;
    }
    const nextSeq = (rows.reduce((m, r) => Math.max(m, r.operation_seq), 0) || 0) + 10;
    onRowsChange([...rows, {
      tempId: crypto.randomUUID(),
      operation_seq: nextSeq,
      operation_code: operationPick.operation_code,
      department: operationPick.department,
      work_center: operationPick.department,
      setup_time: operationPick.setup_time,
      run_time: operationPick.run_time,
      labor_cost: operationPick.labor_cost,
      qc_required: operationPick.qc_required,
    }]);
    setOperationPick({ operation_code: "", department: "", setup_time: 0, run_time: 0, labor_cost: 0, qc_required: false });
  };

  const removeOperationRow = (tempId: string) => onRowsChange(rows.filter(r => r.tempId !== tempId));

  const moveOperationRow = (index: number, dir: -1 | 1) => {
    const swap = index + dir;
    if (swap < 0 || swap >= rows.length) return;
    const next = [...rows];
    [next[index], next[swap]] = [next[swap], next[index]];
    onRowsChange(next.map((r, i) => ({ ...r, operation_seq: (i + 1) * 10 })));
  };

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="border rounded-md divide-y">
          {rows.map((r, i) => (
            <div key={r.tempId} className="flex items-center gap-2 px-3 py-2">
              {!readOnly && (
                <div className="flex flex-col">
                  <button disabled={i === 0} onClick={() => moveOperationRow(i, -1)} className="disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
                  <button disabled={i === rows.length - 1} onClick={() => moveOperationRow(i, 1)} className="disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
                </div>
              )}
              <div className="text-xs font-mono w-8">{r.operation_seq}</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">{r.operation_code}</div>
                <div className="text-[11px] text-muted-foreground truncate">{r.work_center || "—"}</div>
              </div>
              <div className="text-xs text-right w-24">Setup {r.setup_time}</div>
              <div className="text-xs text-right w-24">Cycle {r.run_time}</div>
              {r.qc_required && <Badge variant="outline" className="text-[9px]">QC</Badge>}
              {!readOnly && (
                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => removeOperationRow(r.tempId)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <Label className="text-xs">Add Operation</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={operationPick.operation_code}
              onValueChange={(v) => {
                const op = operationsMaster.find(o => o.operation_name === v);
                setOperationPick(p => ({ ...p, operation_code: v, department: op?.department || "" }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Operation name…" /></SelectTrigger>
              <SelectContent>
                {operationsMaster.map((o, i) => (
                  <SelectItem key={`${o.operation_name}-${i}`} value={o.operation_name}>{o.operation_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input disabled placeholder="Work Center" value={operationPick.department} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Setup Time</Label>
              <Input type="number" min={0} step={0.1} value={operationPick.setup_time}
                onChange={(e) => setOperationPick(p => ({ ...p, setup_time: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Cycle Time *</Label>
              <Input type="number" min={0} step={0.1} value={operationPick.run_time}
                onChange={(e) => setOperationPick(p => ({ ...p, run_time: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Labour Time</Label>
              <Input type="number" min={0} step={0.1} value={operationPick.labor_cost}
                onChange={(e) => setOperationPick(p => ({ ...p, labor_cost: Number(e.target.value) }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={operationPick.qc_required}
              onCheckedChange={(v) => setOperationPick(p => ({ ...p, qc_required: !!v }))} />
            QC Required
          </label>
          <Button size="sm" variant="outline" onClick={addOperationRow}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
          </Button>
        </div>
      )}
    </div>
  );
}
