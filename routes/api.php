<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\RfqController;
use App\Http\Controllers\RfqItemController;
use App\Http\Controllers\RfqVendorController;
use App\Http\Controllers\VendorQuotationController;
use App\Http\Controllers\InventoryStockController;
use App\Http\Controllers\BomComponentController;
use App\Http\Controllers\BomDeletionLogController;
use App\Http\Controllers\BomHeaderController;
use App\Http\Controllers\BomOperationController;
use App\Http\Controllers\OperationController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\OperatorController;
use App\Http\Controllers\JobAllocationController;
use App\Http\Controllers\ItemDemandController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\OrganizationSettingsController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\StorageBinController;
use App\Http\Controllers\DefaultLocationController;
use App\Http\Controllers\WarehouseStockController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\ItemBatchController;
use App\Http\Controllers\ItemSerialController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CompanyDetailController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\InventoryInsightsController;
use App\Http\Controllers\LedgerEntryController;
use App\Http\Controllers\CreditNoteController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderPackageController;
use App\Http\Controllers\CreditNoteItemController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\PurchaseOrderLineController;
use App\Http\Controllers\PurchaseOrderShipmentController;
use App\Http\Controllers\PurchaseOrderTaxController;
use App\Http\Controllers\GRNItemController;
use App\Http\Controllers\StockTransactionController;
use App\Http\Controllers\SupplierPayableController;
use App\Http\Controllers\PoReturnItemController;
use App\Http\Controllers\PoReturnController;
use App\Http\Controllers\RegularOrderTemplateController;
use App\Http\Controllers\RecurringInvoiceController;
use App\Http\Controllers\StocktakeController;
use App\Http\Controllers\MaterialIssueController;
use App\Http\Controllers\StockAdjustmentController;
use App\Http\Controllers\MoveTransactionController;
use App\Http\Controllers\GRNController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware('web')->group(function () {
Route::post('/register', [AuthController::class, 'register']);
Route::post('/update-profile', [AuthController::class, 'updateProfile']);
Route::get('/profile', [AuthController::class, 'getProfile']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/user', [AuthController::class, 'user']);
Route::get('/check-session', [AuthController::class, 'checkSession']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
});


Route::middleware('web')->group(function () {
    Route::get('/customers', [CustomerController::class, 'index']);
Route::get('/customers/{id}', [CustomerController::class, 'show']);
Route::post('/customers', [CustomerController::class, 'store']);
Route::put('/customers/{id}', [CustomerController::class, 'update']);
Route::delete('/customers/{id}', [CustomerController::class, 'destroy']);

Route::get('/vendors', [VendorController::class, 'index']);
Route::get('/vendors/create', [VendorController::class, 'create']);
Route::post('/vendors', [VendorController::class, 'store']);
Route::get('/vendors/{id}', [VendorController::class, 'show']);
Route::get('/vendors/{id}/edit', [VendorController::class, 'edit']);
Route::put('/vendors/{id}', [VendorController::class, 'update']);
Route::delete('/vendors/{id}', [VendorController::class, 'destroy']);
Route::post('/vendors/import', [VendorController::class, 'import']);

Route::get('/rfqs', [RfqController::class, 'index']);
Route::get('/rfqs/{id}', [RfqController::class, 'show']);
Route::post('/rfqs', [RfqController::class, 'store']);
//Route::resource('/rfq_items', RfqItemController::class);
Route::get('/rfq-vendors', [RfqVendorController::class, 'index']);
Route::post('/rfq-vendors/import', [RfqVendorController::class, 'import']);
Route::post('/rfq/send/{id}', [RfqController::class, 'send']);
Route::get('/rfq/view/{id}', [RfqController::class, 'markViewed']);
Route::post('/rfq/quote/{id}', [RfqController::class, 'markQuoted']);
Route::post('/rfq/close/{id}', [RfqController::class, 'close']);

Route::get('/vendor-quotations', [VendorQuotationController::class, 'index']);
Route::post('/vendor-quotations', [VendorQuotationController::class, 'store']);
Route::post('/vendor-quotations/{id}/select', [VendorQuotationController::class, 'select']);


Route::get('/inventory-stock', [InventoryStockController::class, 'index']);
Route::get('/inventory-stock/{id}', [InventoryStockController::class, 'show']);
Route::post('/inventory-stock', [InventoryStockController::class, 'store']);
Route::put('/inventory-stock/{id}', [InventoryStockController::class, 'update']);
Route::delete('/inventory-stock/{id}', [InventoryStockController::class, 'destroy']);
Route::post('/inventory-stock/allocate', [InventoryStockController::class, 'allocate']);
Route::patch('/inventory-stock/by-code/{code}', [InventoryStockController::class, 'updateByCode']);
Route::patch('/inventory-stock/{id}/enable-batch-tracking', [InventoryStockController::class, 'enableBatchTracking']);
Route::patch('/inventory-stock/{id}/enable-serial-tracking', [InventoryStockController::class, 'enableSerialTracking']);
Route::get('/stock/check', [InventoryStockController::class, 'checkStock']);

Route::post('/inventory-insights', [InventoryInsightsController::class, 'generateInsights']);

Route::get('/bom-components', [BomComponentController::class, 'index']);
Route::get('/bom-component', [BomComponentController::class, 'Detail']);
Route::get('/bom-components/{id}', [BomComponentController::class, 'show']);
Route::post('/bom-components', [BomComponentController::class, 'store']);
Route::post('/bom-components/bulk', [BomComponentController::class, 'storeMany']);
Route::delete('/bom-components', [BomComponentController::class, 'deleteByBomId']);
Route::put('/bom-components/{id}', [BomComponentController::class, 'update']);
Route::delete('/bom-components/{id}', [BomComponentController::class, 'destroy']);

Route::get('/bom-deletion-logs', [BomDeletionLogController::class, 'index']);
Route::get('/bom-deletion-logs/{id}', [BomDeletionLogController::class, 'show']);
Route::post('/bom-deletion-logs', [BomDeletionLogController::class, 'store']);

Route::post('/bom-components/delete-by-bom', [BomComponentController::class, 'deleteByBomId']);
Route::get('/bom-headers', [BomHeaderController::class, 'index']);
Route::get('/bom-headers/by-item-code', [BomHeaderController::class, 'getByItemCode']);
Route::get('/bom-headers/{id}', [BomHeaderController::class, 'show']);
Route::post('/bom-headers', [BomHeaderController::class, 'store']);
Route::post('/bom-headers/{id}/activate', [BomHeaderController::class, 'activate']);
Route::delete('/bom-headers/{id}', [BomHeaderController::class, 'destroy']); // Delete BOM header by ID
Route::put('/bom-headers/{id}', [BomHeaderController::class, 'update']);


Route::get('/bom-operations', [BomOperationController::class, 'index']);
Route::get('/bom-operations/{id}', [BomOperationController::class, 'show']);
Route::post('/bom-operations', [BomOperationController::class, 'store']);
Route::delete('/bom-operations', [BomOperationController::class, 'deleteByBomId']); // Delete all operations by BOM ID
Route::post('/bom-operations/delete-by-bom', [BomOperationController::class, 'deleteOperationsByBomId']); // Delete only operations (keeps components)
Route::put('/bom-operations/{id}', [BomOperationController::class, 'update']);

Route::get('/operations', [OperationController::class, 'index']);
Route::get('/operations/{id}', [OperationController::class, 'show']);
Route::post('/operations', [OperationController::class, 'store']);
Route::put('/operations/{id}', [OperationController::class, 'update']);
Route::delete('/operations/{id}', [OperationController::class, 'destroy']);

Route::get('/resources', [ResourceController::class, 'index']);
Route::get('/resources/{id}', [ResourceController::class, 'show']);
Route::post('/resources', [ResourceController::class, 'store']);
Route::put('/resources/{id}', [ResourceController::class, 'update']);
Route::delete('/resources/{id}', [ResourceController::class, 'destroy']);

Route::get('/operators', [OperatorController::class, 'index']);
Route::get('/operators/{id}', [OperatorController::class, 'show']);
Route::post('/operators', [OperatorController::class, 'store']);
Route::put('/operators/{id}', [OperatorController::class, 'update']);
Route::delete('/operators/{id}', [OperatorController::class, 'destroy']);


Route::get('/job-allocations', [JobAllocationController::class, 'index']);
Route::get('/job-allocations/{id}', [JobAllocationController::class, 'show']);
Route::post('/job-allocations', [JobAllocationController::class, 'store']);
Route::patch('/job-allocations/{id}', [JobAllocationController::class, 'update']);
Route::post('/job-allocations/active', [JobAllocationController::class, 'active']);
Route::post('/job-allocations/breakup', [JobAllocationController::class, 'breakup']);
Route::post('/job-allocations/deallocate', [JobAllocationController::class, 'deallocate']);
Route::post('/job-allocations/{id}/issue', [JobAllocationController::class, 'issue']);

Route::get('/item-demands', [ItemDemandController::class, 'index']);
Route::get('/item-demands/{id}', [ItemDemandController::class, 'show']);
Route::post('/item-demands', [ItemDemandController::class, 'store']);

Route::get('/invoices', [InvoiceController::class, 'index']);
Route::post('/invoices', [InvoiceController::class, 'store']);
Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
Route::post('/invoices/{id}/payments', [InvoiceController::class, 'recordPayment']);
Route::put('/invoices/{id}', [InvoiceController::class, 'update']);

Route::get('/departments', [DepartmentController::class, 'index']);
Route::get('/departments/{id}', [DepartmentController::class, 'show']);
Route::post('/departments', [DepartmentController::class, 'store'])->middleware('permission:settings.manage_departments');
Route::put('/departments/{id}', [DepartmentController::class, 'update'])->middleware('permission:settings.manage_departments');
Route::delete('/departments/{id}', [DepartmentController::class, 'destroy'])->middleware('permission:settings.manage_departments');

Route::get('/roles', [RoleController::class, 'index']);
Route::get('/roles/{id}', [RoleController::class, 'show']);
Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:settings.manage_roles');
Route::put('/roles/{id}', [RoleController::class, 'update'])->middleware('permission:settings.manage_roles');
Route::delete('/roles/{id}', [RoleController::class, 'destroy'])->middleware('permission:settings.manage_roles');

Route::get('/team', [TeamController::class, 'index'])->middleware('permission:settings.manage_team');
Route::get('/team/{id}', [TeamController::class, 'show'])->middleware('permission:settings.manage_team');
Route::post('/team', [TeamController::class, 'store'])->middleware('permission:settings.manage_team');
Route::put('/team/{id}', [TeamController::class, 'update'])->middleware('permission:settings.manage_team');
Route::delete('/team/{id}', [TeamController::class, 'destroy'])->middleware('permission:settings.manage_team');
Route::put('/team/{id}/permissions', [TeamController::class, 'updatePermissions'])->middleware('permission:settings.manage_team');

Route::get('/organization-settings', [OrganizationSettingsController::class, 'show']);
Route::put('/organization-settings', [OrganizationSettingsController::class, 'update'])->middleware('permission:settings.manage_general');

Route::apiResource('/locations', LocationController::class);
Route::get('/storage-bins', [StorageBinController::class, 'apiIndex']);
Route::post('/storage-bins', [StorageBinController::class, 'store']);
Route::delete('/storage-bins/{id}', [StorageBinController::class, 'destroy']);

Route::get('/warehouse-stock', [WarehouseStockController::class, 'index']);
Route::get('/warehouse-stock/unallocated', [WarehouseStockController::class, 'unallocated']);
Route::post('/warehouse-stock', [WarehouseStockController::class, 'store']);
Route::put('/warehouse-stock/{id}', [WarehouseStockController::class, 'update']);
Route::delete('/warehouse-stock/{id}', [WarehouseStockController::class, 'destroy']);

Route::get('/stock-transfers', [StockTransferController::class, 'index']);
Route::post('/stock-transfers', [StockTransferController::class, 'store']);
Route::delete('/stock-transfers/{id}', [StockTransferController::class, 'destroy']);

Route::get('/batches', [ItemBatchController::class, 'index']);
Route::post('/batches', [ItemBatchController::class, 'store']);
Route::put('/batches/by-number/{batchNumber}', [ItemBatchController::class, 'updateGroup']);
Route::delete('/batches/by-number/{batchNumber}', [ItemBatchController::class, 'destroyGroup']);
Route::delete('/batches/{id}', [ItemBatchController::class, 'destroy']);

Route::get('/serial-numbers', [ItemSerialController::class, 'index']);
Route::post('/serial-numbers', [ItemSerialController::class, 'store']);
Route::delete('/serial-numbers/{id}', [ItemSerialController::class, 'destroy']);

Route::get('/default-location', [DefaultLocationController::class, 'show']);
Route::post('/default-location', [DefaultLocationController::class, 'storeOrUpdate']);

Route::apiResource('/categories', CategoryController::class);

Route::get('/company', [CompanyDetailController::class, 'index']);   // Get company info
Route::post('/company', [CompanyDetailController::class, 'store']); // Save or update

Route::post('/upload', [UploadController::class, 'upload']);


Route::get('/ledger-entries', [LedgerEntryController::class, 'index']);
Route::get('/ledger-entries/{id}', [LedgerEntryController::class, 'show']);
Route::post('/ledger-entries', [LedgerEntryController::class, 'store']);
Route::delete('/ledger-entries/{id}', [LedgerEntryController::class, 'destroy']);


Route::get('/credit-notes', [CreditNoteController::class, 'index']);
Route::get('/credit-notes/{id}', [CreditNoteController::class, 'show']);
Route::post('/credit-notes', [CreditNoteController::class, 'store']);
Route::delete('/credit-notes/{id}', [CreditNoteController::class, 'destroy']);
Route::patch('/credit-notes/{id}', [CreditNoteController::class, 'update']);

Route::post('/credit-note-items', [CreditNoteItemController::class, 'store']);
Route::get('/credit-note-items/{id}', [CreditNoteItemController::class, 'show']);
Route::get('/credit-note-items', [CreditNoteItemController::class, 'index']);

Route::post('/order-insights', [OrderController::class, 'generateInsights']);
Route::post('/orders', [OrderController::class, 'store']);
Route::get('/orders', [OrderController::class, 'index']);
Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
Route::get('/orders/next-so', [OrderController::class, 'getNextSONumber']);
Route::get('/orders/{id}', [OrderController::class, 'show'])
    ->where('id', '[0-9]+');

Route::put('/orders/recalculate-status', [OrderController::class, 'recalculateStatus']);
Route::put('/orders/{id}', [OrderController::class, 'update']);
Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);

Route::get('/order-packages', [OrderPackageController::class, 'index']);
Route::post('/order-packages', [OrderPackageController::class, 'store']);
Route::get('/order-packages/{id}', [OrderPackageController::class, 'show']);
Route::put('/order-packages/{id}', [OrderPackageController::class, 'update']);
Route::delete('/order-packages/{id}', [OrderPackageController::class, 'destroy']);


Route::apiResource('purchase-orders', PurchaseOrderController::class);

Route::post('/purchase-order-lines', [PurchaseOrderLineController::class,'store']);

Route::post('/purchase-order-shipments', [PurchaseOrderShipmentController::class,'store']);

Route::post('/purchase-order-taxes', [PurchaseOrderTaxController::class,'store']);

Route::get('/purchase-orders/by-number/{po_number}', [PurchaseOrderController::class, 'showByNumber']);

Route::patch('/purchase_orders/{po_number}', [PurchaseOrderController::class, 'updateStatus']);
Route::post('/generate-po-pdf', [PurchaseOrderController::class, 'generatePDF']);
Route::get('/purchase-order-lines', [PurchaseOrderLineController::class, 'index']);
// routes/api.php
Route::put('/purchase-orders/{id}', [PurchaseOrderController::class, 'update']);
// routes/api.php
Route::patch('purchase-orders/{id}/status', [PurchaseOrderController::class, 'updateStatus']);

// Purchase Order Lines
Route::put('/purchase-order-lines/{id}', [PurchaseOrderLineController::class,'update']);
Route::delete('/purchase-order-lines/{id}', [PurchaseOrderLineController::class,'destroy']);

// Shipments
Route::put('/purchase-order-shipments/{id}', [PurchaseOrderShipmentController::class,'update']);
Route::delete('/purchase-order-shipments/{id}', [PurchaseOrderShipmentController::class,'destroy']);

// Taxes
Route::put('/purchase-order-taxes/{id}', [PurchaseOrderTaxController::class,'update']);
Route::delete('/purchase-order-taxes/{id}', [PurchaseOrderTaxController::class,'destroy']);

Route::delete('/purchase-order-lines/by-po/{po_id}', [PurchaseOrderLineController::class, 'deleteByPO']);

Route::get('/grn/check', [GRNController::class, 'check']);
Route::post('/grn', [GRNController::class, 'store']);
Route::post('/grn-items', [GRNItemController::class, 'store']);
Route::get('/grn', [GRNController::class, 'index']);


Route::put('/purchase-order-items/update-received', [PurchaseOrderLineController::class, 'updateReceived']);
Route::patch('/purchase-order-items/update-received', [PurchaseOrderLineController::class, 'updateReceived']);
Route::patch('/purchase-orders/{po_number}', [PurchaseOrderController::class, 'updateStatus']);
Route::patch('/purchase-orders/{id}', [PurchaseOrderController::class, 'updateStatus']);

Route::get('/stock-transactions', [StockTransactionController::class, 'index']);
Route::get('/stock-transactions/{id}', [StockTransactionController::class, 'show']);
Route::post('/stock-transactions', [StockTransactionController::class, 'store']);
Route::delete('/stock-transactions/{id}', [StockTransactionController::class, 'destroy']);

Route::get('/supplier-payables', [SupplierPayableController::class, 'index']);
Route::post('/supplier-payables', [SupplierPayableController::class, 'store']);


Route::post('/po-return-items', [PoReturnItemController::class, 'store']); // store multiple items
Route::get('/po-return-items/{returnId}', [PoReturnItemController::class, 'index']);


Route::post('/po-returns', [PoReturnController::class, 'store']);      // create PO Return
Route::get('/po-returns', [PoReturnController::class, 'index']);       // list all PO Returns
Route::get('/po-returns/{id}', [PoReturnController::class, 'show']);

Route::post('/regular-template', [RegularOrderTemplateController::class, 'store']);
Route::delete('/regular-template/{id}', [RegularOrderTemplateController::class, 'destroy']);
Route::get('/regular-template', [RegularOrderTemplateController::class, 'index']);
Route::put('/regular-template/{id}', [RegularOrderTemplateController::class, 'update']);


Route::get('/recurring-invoices', [RecurringInvoiceController::class, 'index']);
Route::post('/recurring-invoices', [RecurringInvoiceController::class, 'store']);
Route::get('/recurring-invoices/{id}', [RecurringInvoiceController::class, 'show']);
Route::put('/recurring-invoices/{id}', [RecurringInvoiceController::class, 'update']);
Route::delete('/recurring-invoices/{id}', [RecurringInvoiceController::class, 'destroy']);
Route::patch('/recurring-invoices/{id}/status', [RecurringInvoiceController::class, 'toggleStatus']);
Route::patch('/recurring-invoices/{id}/cancel', [RecurringInvoiceController::class, 'cancel']);
Route::post('/recurring-invoices/process', [RecurringInvoiceController::class, 'process']);


Route::get('/stocktakes', [StocktakeController::class, 'index']);
Route::post('/stocktakes', [StocktakeController::class, 'store']);
Route::get('/stocktakes/{id}', [StocktakeController::class, 'show']);
Route::delete('/stocktakes/{id}', [StocktakeController::class, 'destroy']);
Route::put('/stocktakes/{id}', [StocktakeController::class, 'update']);

route::post('/stock-adjustments', [StockAdjustmentController::class, 'store']);
route::get('/stock-adjustments', [StockAdjustmentController::class, 'index']);
Route::delete('/stock-adjustments/{id}', [StockAdjustmentController::class, 'destroy']);

Route::get('/material-issues', [MaterialIssueController::class, 'index']);
Route::get('/material-issues/{id}', [MaterialIssueController::class, 'show']);
Route::post('/material-issues', [MaterialIssueController::class, 'store']);
Route::delete('/material-issues/{id}', [MaterialIssueController::class, 'destroy']);

Route::get('/jobs', [JobController::class, 'index']);
Route::post('/jobs', [JobController::class, 'store']);
Route::get('/jobs/{id}', [JobController::class, 'show']);
Route::put('/jobs/{id}', [JobController::class, 'update']);
Route::delete('/jobs/{id}', [JobController::class, 'destroy']);
Route::post('/job-moves/update', [JobController::class, 'updateMoves']);


Route::post('/move-transactions', [MoveTransactionController::class, 'store']);
Route::get('/move-transactions/job/{jobId}', [MoveTransactionController::class, 'getByJob']);
Route::get('/move-transactions/summary/{jobId}', [MoveTransactionController::class, 'summary']);

    });
