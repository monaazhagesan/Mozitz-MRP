<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BomComponentController;
use App\Http\Controllers\BomDeletionLogController;
use App\Http\Controllers\BomHeaderController;
use App\Http\Controllers\BomOperationController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CreditNoteItemController;
use App\Http\Controllers\CreditNoteController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\GRNController;
use App\Http\Controllers\GRNItemController;
use App\Http\Controllers\InventoryStockController;
use App\Http\Controllers\InvoiceItemController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ItemDemandController;
use App\Http\Controllers\JobAllocationController;
use App\Http\Controllers\LedgerEntryController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\PaymentHistoryController;
use App\Http\Controllers\PoReturnItemController;
use App\Http\Controllers\PurchaseOrderItemController;
use App\Http\Controllers\RfqItemController;
use App\Http\Controllers\RfqVendorController;
use App\Http\Controllers\StockTransactionController;
use App\Http\Controllers\StorageBinController;
use App\Http\Controllers\SupplierPayableController;
use App\Http\Controllers\UserRoleController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/user/reset-password-form', [AuthController::class, 'showResetForm'])
    ->name('user.reset-password-form');

Route::post('/user/reset-password-submit', [AuthController::class, 'submitNewPassword'])
    ->name('user.reset-password-submit');


Route::get('{any}', function () {
    return view('app');
})->where('any', '.*');

Route::middleware('web')->group(function () {
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/user', [AuthController::class, 'user']);
Route::get('/check-session', [AuthController::class, 'checkSession']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']); 
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/user', [AuthController::class, 'user']);

Route::get('/bom-components', [BomComponentController::class, 'index']);
Route::get('/bom-components/{id}', [BomComponentController::class, 'show']);
Route::post('/bom-components', [BomComponentController::class, 'store']);

Route::get('/bom-deletion-logs', [BomDeletionLogController::class, 'index']);
Route::get('/bom-deletion-logs/{id}', [BomDeletionLogController::class, 'show']);
Route::post('/bom-deletion-logs', [BomDeletionLogController::class, 'store']);

Route::get('/bom-headers', [BomHeaderController::class, 'index']);
Route::get('/bom-headers/{id}', [BomHeaderController::class, 'show']);
Route::post('/bom-headers', [BomHeaderController::class, 'store']);

Route::get('/bom-operations', [BomOperationController::class, 'index']);
Route::get('/bom-operations/{id}', [BomOperationController::class, 'show']);
Route::post('/bom-operations', [BomOperationController::class, 'store']);

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);
Route::post('/categories', [CategoryController::class, 'store']);

Route::get('/credit-note-items', [CreditNoteItemController::class, 'index']);
Route::get('/credit-note-items/{id}', [CreditNoteItemController::class, 'show']);
Route::post('/credit-note-items', [CreditNoteItemController::class, 'store']);

Route::get('/credit-notes', [CreditNoteController::class, 'index']);
Route::get('/credit-notes/{id}', [CreditNoteController::class, 'show']);
Route::post('/credit-notes', [CreditNoteController::class, 'store']);
Route::delete('/credit-notes/{id}', [CreditNoteController::class, 'destroy']);

Route::get('/customers', [CustomerController::class, 'index']);
Route::get('/customers/{id}', [CustomerController::class, 'show']);
Route::post('/customers', [CustomerController::class, 'store']);
Route::put('/customers/{id}', [CustomerController::class, 'update']);
Route::delete('/customers/{id}', [CustomerController::class, 'destroy']);


Route::get('/grns', [GRNController::class, 'index']);
Route::get('/grns/{id}', [GRNController::class, 'show']);
Route::post('/grns', [GRNController::class, 'store']);
Route::put('/grns/{id}', [GRNController::class, 'update']);
Route::delete('/grns/{id}', [GRNController::class, 'destroy']);


Route::get('/grns/{grn_id}/items', [GRNItemController::class, 'index']);
Route::post('/grn-items', [GRNItemController::class, 'store']);
Route::delete('/grn-items/{id}', [GRNItemController::class, 'destroy']);

Route::get('/inventory-stock', [InventoryStockController::class, 'index']);
Route::get('/inventory-stock/{id}', [InventoryStockController::class, 'show']);
Route::post('/inventory-stock', [InventoryStockController::class, 'store']);

Route::get('/invoice-items', [InvoiceItemController::class, 'index']);
Route::get('/invoice-items/{id}', [InvoiceItemController::class, 'show']);
Route::post('/invoice-items', [InvoiceItemController::class, 'store']);

Route::get('/invoices', [InvoiceController::class, 'index']);
Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
Route::post('/invoices', [InvoiceController::class, 'store']);

Route::get('/item-demands', [ItemDemandController::class, 'index']);
Route::get('/item-demands/{id}', [ItemDemandController::class, 'show']);
Route::post('/item-demands', [ItemDemandController::class, 'store']);

Route::get('/job-allocations', [JobAllocationController::class, 'index']);
Route::get('/job-allocations/{id}', [JobAllocationController::class, 'show']);
Route::post('/job-allocations', [JobAllocationController::class, 'store']);

Route::get('/ledger-entries', [LedgerEntryController::class, 'index']);
Route::get('/ledger-entries/{id}', [LedgerEntryController::class, 'show']);
Route::post('/ledger-entries', [LedgerEntryController::class, 'store']);

Route::get('/locations', [LocationController::class, 'index']);
Route::get('/locations/{id}', [LocationController::class, 'show']);
Route::post('/locations', [LocationController::class, 'store']);

Route::get('/payment-history', [PaymentHistoryController::class, 'index']);
Route::get('/payment-history/{id}', [PaymentHistoryController::class, 'show']);
Route::post('/payment-history', [PaymentHistoryController::class, 'store']);

Route::get('/po-return-items', [PoReturnItemController::class, 'index']);
Route::get('/po-return-items/{id}', [PoReturnItemController::class, 'show']);
Route::post('/po-return-items', [PoReturnItemController::class, 'store']);
Route::put('/po-return-items/{id}', [PoReturnItemController::class, 'update']);
Route::delete('/po-return-items/{id}', [PoReturnItemController::class, 'destroy']);

Route::get('/purchase-order-items', [PurchaseOrderItemController::class, 'index']);
Route::get('/purchase-order-items/{id}', [PurchaseOrderItemController::class, 'show']);
Route::post('/purchase-order-items', [PurchaseOrderItemController::class, 'store']);
Route::put('/purchase-order-items/{id}', [PurchaseOrderItemController::class, 'update']);
Route::delete('/purchase-order-items/{id}', [PurchaseOrderItemController::class, 'destroy']);


Route::resource('rfq_items', RfqItemController::class);

Route::get('/rfq-vendors', [RfqVendorController::class, 'index']);
Route::post('/rfq-vendors/import', [RfqVendorController::class, 'import']);

Route::get('/stock-transactions', [StockTransactionController::class, 'index']);
Route::post('/stock-transactions/import', [StockTransactionController::class, 'import']);

Route::get('/storage-bins', [StorageBinController::class, 'index']);
Route::post('/storage-bins/import', [StorageBinController::class, 'import']);

Route::get('/supplier-payables', [SupplierPayableController::class, 'index']);
Route::post('/supplier-payables/import', [SupplierPayableController::class, 'import']);

Route::get('/user-roles', [UserRoleController::class, 'index']);
Route::post('/user-roles/import', [UserRoleController::class, 'import']);