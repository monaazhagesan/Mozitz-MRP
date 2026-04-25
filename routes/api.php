<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\RfqController;
use App\Http\Controllers\RfqItemController;
use App\Http\Controllers\RfqVendorController;
use App\Http\Controllers\InventoryStockController;
use App\Http\Controllers\BomComponentController;
use App\Http\Controllers\BomDeletionLogController;
use App\Http\Controllers\BomHeaderController;
use App\Http\Controllers\BomOperationController;
use App\Http\Controllers\JobAllocationController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\UserRoleController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\StorageBinController;
use App\Http\Controllers\DefaultLocationController;
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
use App\Http\Controllers\GrnController;
use App\Http\Controllers\GrnItemController;
use App\Http\Controllers\StockTransactionController;
use App\Http\Controllers\SupplierPayableController;
use App\Http\Controllers\PoReturnItemController;
use App\Http\Controllers\PoReturnController;



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
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/user', [AuthController::class, 'user']);
Route::get('/check-session', [AuthController::class, 'checkSession']);
});

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

Route::post('/rfqs', [RfqController::class, 'store']);
//Route::resource('/rfq_items', RfqItemController::class);
Route::get('/rfq-vendors', [RfqVendorController::class, 'index']);
Route::post('/rfq-vendors/import', [RfqVendorController::class, 'import']);


Route::get('/inventory-stock', [InventoryStockController::class, 'index']);
Route::get('/inventory-stock/{id}', [InventoryStockController::class, 'show']);
Route::post('/inventory-stock', [InventoryStockController::class, 'store']);
Route::put('/inventory-stock/{id}', [InventoryStockController::class, 'update']);
Route::delete('/inventory-stock/{id}', [InventoryStockController::class, 'destroy']);
Route::post('/inventory-stock/allocate', [InventoryStockController::class, 'allocate']);

Route::post('/inventory-insights', [InventoryInsightsController::class, 'generateInsights']);

Route::get('/bom-components', [BomComponentController::class, 'index']);
Route::get('/bom-components/{id}', [BomComponentController::class, 'show']);
Route::post('/bom-components', [BomComponentController::class, 'store']);
Route::delete('/bom-components', [BomComponentController::class, 'deleteByBomId']);
Route::put('/bom-components/{id}', [BomComponentController::class, 'update']);
Route::delete('/bom-components/{id}', [BomComponentController::class, 'destroy']);

Route::get('/bom-deletion-logs', [BomDeletionLogController::class, 'index']);
Route::get('/bom-deletion-logs/{id}', [BomDeletionLogController::class, 'show']);
Route::post('/bom-deletion-logs', [BomDeletionLogController::class, 'store']);

Route::get('/bom-headers', [BomHeaderController::class, 'index']);
Route::get('/bom-headers/{id}', [BomHeaderController::class, 'show']);
Route::post('/bom-headers', [BomHeaderController::class, 'store']);
Route::delete('/bom-headers/{id}', [BomHeaderController::class, 'destroy']); // Delete BOM header by ID
Route::put('/bom-headers/{id}', [BomHeaderController::class, 'update']);

Route::get('/bom-operations', [BomOperationController::class, 'index']);
Route::get('/bom-operations/{id}', [BomOperationController::class, 'show']);
Route::post('/bom-operations', [BomOperationController::class, 'store']);
Route::delete('/bom-operations', [BomOperationController::class, 'deleteByBomId']); // Delete all operations by BOM ID
Route::put('/bom-operations/{id}', [BomOperationController::class, 'update']);


Route::get('/job-allocations', [JobAllocationController::class, 'index']);
Route::get('/job-allocations/{id}', [JobAllocationController::class, 'show']);
Route::post('/job-allocations', [JobAllocationController::class, 'store']);

Route::get('/invoices', [InvoiceController::class, 'index']);
Route::post('/invoices', [InvoiceController::class, 'store']);
Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
Route::post('/invoices/{id}/payments', [InvoiceController::class, 'recordPayment']);
Route::put('/invoices/{id}', [InvoiceController::class, 'update']);

Route::get('/user-roles', [UserRoleController::class, 'index']);
Route::post('/user-roles/import', [UserRoleController::class, 'import']);
Route::post('/user-roles', [UserRoleController::class, 'store']);
Route::delete('/user-roles/{user}/role', [UserRoleController::class, 'removeRole']);

Route::apiResource('/locations', LocationController::class);
Route::apiResource('/storage-bins', StorageBinController::class);

Route::get('/default-location', [DefaultLocationController::class, 'show']);
Route::post('/default-location', [DefaultLocationController::class, 'storeOrUpdate']);

Route::apiResource('/categories', CategoryController::class);
Route::apiResource('/locations', LocationController::class);

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

Route::get('/grn/check', [GrnController::class, 'check']);
Route::post('/grn', [GrnController::class, 'store']);
Route::post('/grn-items', [GrnItemController::class, 'store']);
Route::get('/grn', [GRNController::class, 'index']);


Route::put('/purchase-order-items/update-received', [PurchaseOrderLineController::class, 'updateReceived']);
Route::patch('/purchase-order-items/update-received', [PurchaseOrderLineController::class, 'updateReceived']);
Route::patch('/purchase-orders/{po_number}', [PurchaseOrderController::class, 'updateStatus']);
Route::patch('/purchase-orders/{id}', [PurchaseOrderController::class, 'updateStatus']);

Route::get('/stock-transactions', [StockTransactionController::class, 'index']);
Route::get('/stock-transactions/{id}', [StockTransactionController::class, 'show']);
Route::post('/stock-transactions', [StockTransactionController::class, 'store']);

Route::get('/supplier-payables', [SupplierPayableController::class, 'index']);
Route::post('/supplier-payables', [SupplierPayableController::class, 'store']);


Route::post('/po-return-items', [PoReturnItemController::class, 'store']); // store multiple items
Route::get('/po-return-items/{returnId}', [PoReturnItemController::class, 'index']); 


Route::post('/po-returns', [PoReturnController::class, 'store']);      // create PO Return
Route::get('/po-returns', [PoReturnController::class, 'index']);       // list all PO Returns
Route::get('/po-returns/{id}', [PoReturnController::class, 'show']); 