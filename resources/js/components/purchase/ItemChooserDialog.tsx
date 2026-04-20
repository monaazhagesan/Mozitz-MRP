import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  hsn?: string;
  hsn_code?: string;
  description: string | null;
  item_type: string | null;
  unit_cost: number | null;
}

interface ItemChooserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: InventoryItem) => void;
}

const ItemChooserDialog = ({ open, onOpenChange, onSelect }: ItemChooserDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open]);

  useEffect(() => {
  if (searchTerm) {
    const filtered = items.filter(
      (item) =>
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredItems(filtered);
  } else {
    setFilteredItems(items);
  }
}, [searchTerm, items]);

 const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/inventory-stock");

      // Map API response to match frontend InventoryItem interface
      const data = Array.isArray(response.data.items)
        ? response.data.items.map((item: any) => ({
            id: item.id,
            item_code: item.itemCode || "-",   // API field mapping
            item_name: item.itemName || item.description || "-",
            hsn_code: item.hsnCode || "",
            description: item.description || "-",
            item_type: item.item_type || "Internal",
            unit_cost: item.purchasePrice ?? 0,
          }))
        : [];

      console.log("Fetched items:", data); // debug
      setItems(data);
      setFilteredItems(data);
    } catch (error: any) {
      console.error("Error fetching items:", error);
      toast({
        title: "Error Fetching Items",
        description: error.response?.data?.message || error.message || "Failed to fetch items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleFind = () => {
    const filtered = items.filter(
      (item) =>
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredItems(filtered);
  };

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      onOpenChange(false);
      setSelectedItem(null);
      setSearchTerm("");
    }
  };

  const handleRowClick = (item: InventoryItem) => {
    setSelectedItem(item);
  };

  const handleRowDoubleClick = (item: InventoryItem) => {
    onSelect(item);
    onOpenChange(false);
    setSelectedItem(null);
    setSearchTerm("");
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedItem(null);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="text-base font-medium">Items</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <span className="text-sm">Find:</span>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter item code or name..."
            className="flex-1 h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFind();
            }}
          />
        </div>

        <div className="border rounded flex-1 overflow-hidden min-h-[300px]">
          <div className="h-full overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  <TableHead className="w-[120px] text-xs font-medium">Item</TableHead>
                  <TableHead className="text-xs font-medium">Description</TableHead>
                  <TableHead className="w-[100px] text-xs font-medium">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
               {loading ? (
  <TableRow>
    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
      Loading items...
    </TableCell>
  </TableRow>
) : !Array.isArray(filteredItems) || filteredItems.length === 0 ? (
  <TableRow>
    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
      No items found
    </TableCell>
  </TableRow>
) : (
  filteredItems.map((item) => (
    <TableRow
      key={item.id}
      className={`cursor-pointer hover:bg-muted/50 ${
        selectedItem?.id === item.id ? "bg-primary text-primary-foreground" : ""
      }`}
      onClick={() => handleRowClick(item)}
      onDoubleClick={() => handleRowDoubleClick(item)}
    >
      <TableCell className="text-xs py-1.5">{item.item_code || "-"}</TableCell>
      <TableCell className="text-xs py-1.5">
        {item.item_name || item.description || "-"}
      </TableCell>
      <TableCell className="text-xs py-1.5">
        {item.item_type || "Internal"}
      </TableCell>
    </TableRow>
  ))
)}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-center gap-2 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFind}
            className="min-w-[80px]"
          >
            <Search className="h-4 w-4 mr-1" />
            Find
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSelect}
            disabled={!selectedItem}
            className="min-w-[80px]"
          >
            OK
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="min-w-[80px]"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemChooserDialog;
