import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import axios from "axios";

interface POFormItem {
  item_code: string;
  item_name: string;
  uom: string;
  quantity: string;
  unit_cost: string;
}

interface POFormProps {
  initialItems?: Array<{
    item_code: string;
    item_name: string;
    uom?: string;
    quantity: number;
    unit_cost?: number;
  }>;
  initialVendor?: string;
  onSuccess?: () => void;
}

export default function POForm({ initialItems, initialVendor, onSuccess }: POFormProps) {
  const { toast } = useToast();
  const [vendor, setVendor] = useState(initialVendor || "");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<POFormItem[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((it) => ({
          item_code: it.item_code,
          item_name: it.item_name,
          uom: it.uom || "Nos",
          quantity: it.quantity.toString(),
          unit_cost: (it.unit_cost ?? 0).toString(),
        }))
      : [{ item_code: "", item_name: "", uom: "Nos", quantity: "", unit_cost: "" }]
  );

  const updateItem = (index: number, field: keyof POFormItem, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItem = () =>
    setItems((prev) => [...prev, { item_code: "", item_name: "", uom: "Nos", quantity: "", unit_cost: "" }]);

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const generatePONumber = () => `PO-${Date.now()}`;

  const lineTotal = (item: POFormItem) => {
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.unit_cost) || 0;
    return qty * cost;
  };

  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const onSubmit = async () => {
    if (!vendor.trim()) {
      toast({ title: "Validation Error", description: "Please enter a vendor", variant: "destructive" });
      return;
    }

    const validItems = items.filter((item) => {
      const qty = Number(item.quantity);
      return item.item_code && !isNaN(qty) && qty > 0;
    });

    if (validItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item with a valid quantity",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const poNumber = generatePONumber();

      const poRes = await axios.post("/api/purchase-orders", {
        po_number: poNumber,
        vendor,
        type: "Standard",
        status: "Draft",
        currency: "INR",
        ship_to: "",
        bill_to: "",
        expected_date: expectedDate || null,
        subtotal,
        tax: 0,
        total: subtotal,
        notes: notes || null,
        line_items_count: validItems.length,
      });

      const poId = poRes.data?.id;

      await axios.post("/api/purchase-order-lines", {
        items: validItems.map((item, index) => ({
          po_id: poId,
          line_num: index + 1,
          item_code: item.item_code,
          description: item.item_name,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_cost) || 0,
          amount: lineTotal(item),
          total: lineTotal(item),
          uom: item.uom || "Nos",
        })),
      });

      toast({ title: "Success", description: `Purchase Order ${poNumber} created successfully` });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Vendor *</Label>
          <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor name" />
        </div>
        <div className="space-y-2">
          <Label>Expected Date</Label>
          <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Total</Label>
          <Input value={subtotal.toFixed(2)} disabled className="bg-muted/50 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Additional notes"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">PO Items</Label>
            <p className="text-sm text-muted-foreground">Materials to purchase</p>
          </div>
          <Button type="button" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 bg-muted/50 px-3 py-3 text-sm font-medium">
            <div className="col-span-2">Item Code</div>
            <div className="col-span-3">Item Name</div>
            <div className="col-span-2">UOM</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Unit Cost</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          <div className="divide-y">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 p-3 items-center">
                <div className="col-span-2">
                  <Input
                    value={item.item_code}
                    onChange={(e) => updateItem(index, "item_code", e.target.value)}
                    placeholder="Item Code"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    value={item.item_name}
                    onChange={(e) => updateItem(index, "item_name", e.target.value)}
                    placeholder="Item Name"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={item.uom}
                    onChange={(e) => updateItem(index, "uom", e.target.value)}
                    placeholder="UOM"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.unit_cost}
                    onChange={(e) => updateItem(index, "unit_cost", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? "Creating..." : "Create Purchase Order"}
        </Button>
      </div>
    </div>
  );
}
