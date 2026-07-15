// Canonical row shapes for building a BOM's materials/operations, shared by
// the Production BOM module (BOM.tsx) and the Inventory Item Creation
// wizard (MRPPlannerTab.tsx) so both use the exact same editor UI/behavior.

export type NewMaterialRow = {
  tempId: string;
  component: string;
  description: string;
  uom: string;
  quantity: number;
  scrap_percent: number;
  stock: number;
};

export type NewOperationRow = {
  tempId: string;
  operation_seq: number;
  operation_code: string;
  department: string;
  work_center: string;
  setup_time: number;
  run_time: number;
  labor_cost: number;
  qc_required: boolean;
};

// Deliberately has no "machine"/"resource" field — Work Center is defined
// on the BOM, the specific Machine/Resource is assigned later at Job /
// Shop Floor execution.
export type OperationMasterRow = {
  operation_name: string;
  department: string;
};

export type InventoryItemOption = {
  item_code: string;
  item_name: string;
  item_type?: string | null;
  quantity_on_hand?: number | null;
  uom?: string | null;
};
