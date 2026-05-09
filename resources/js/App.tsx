import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import BOM from "./pages/BOM";
import Planning from "./pages/Planning";
/*import Assembly from "./pages/Assembly";  */
import ShopFloor from "./pages/ShopFloor";
import Dashboard from "./pages/Dashboard";
import PurchaseOrders from "./pages/PurchaseOrders";
/*import MRPRun from "./pages/MRPRun";
import RFQManagement from "./pages/RFQManagement";
import VendorQuotations from "./pages/VendorQuotations"; */
import Customers from "./pages/Customers";
import Vendors from "./pages/Vendors";
import Invoices from "./pages/Invoices";
import Settings from "./pages/Settings";
import Ledger from "./pages/Ledger";
import TaxConfiguration from "./pages/TaxConfiguration";
/*import InventoryLocation from "./pages/InventoryLocation";
import StockTransfer from "./pages/StockTransfer";
import StockTransferApproval from "./pages/StockTransferApproval";
import Barcode from "./pages/Barcode";
import InventoryApprovals from "./pages/InventoryApprovals";
import ImportTally from "./pages/ImportTally";*/
import POApproval from "./pages/POApproval";
/*import InvoiceApproval from "./pages/InvoiceApproval"; */
import GRN from "./pages/GRN";
import SupplierPayables from "./pages/SupplierPayables";
/*import EAuction from "./pages/EAuction";*/
import POReturn from "./pages/POReturn";
import CreditNotes from "./pages/CreditNotes";
//import AccountingAI from "./pages/AccountingAI";
import PitchDeck from "./pages/PitchDeck";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound"; 

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
               <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />  
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/bom" element={<ProtectedRoute><BOM /></ProtectedRoute>} />
         {/*  <Route path="/barcode" element={<ProtectedRoute><Barcode /></ProtectedRoute>} />  */}
            <Route path="/planning" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
          {/*   <Route path="/assembly" element={<ProtectedRoute><Assembly /></ProtectedRoute>} /> */}
            <Route path="/shopfloor" element={<ProtectedRoute><ShopFloor /></ProtectedRoute>} />
         {/*   <Route path="/import-tally" element={<ProtectedRoute><ImportTally /></ProtectedRoute>} />    */}
            <Route path="/accounting/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/accounting/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
           <Route path="/accounting/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/accounting/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
            <Route path="/accounting/supplier-payables" element={<ProtectedRoute><SupplierPayables /></ProtectedRoute>} /> 
            <Route path="/accounting/credit-notes" element={<ProtectedRoute><CreditNotes /></ProtectedRoute>} /> 
         {/*       <Route path="/accounting/ai-insights" element={<ProtectedRoute><AccountingAI /></ProtectedRoute>} />  */}
            <Route path="/purchase/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
              <Route path="/purchase/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
         {/*    <Route path="/purchase/rfq-management" element={<ProtectedRoute><RFQManagement /></ProtectedRoute>} />
            <Route path="/purchase/vendor-quotations" element={<ProtectedRoute><VendorQuotations /></ProtectedRoute>} />
            <Route path="/purchase/mrp-run" element={<ProtectedRoute><MRPRun /></ProtectedRoute>} /> */}
            <Route path="/purchase/grn" element={<ProtectedRoute><GRN /></ProtectedRoute>} />
            <Route path="/purchase/debit-note" element={<ProtectedRoute><POReturn /></ProtectedRoute>} />
       {/*     <Route path="/purchase/e-auction" element={<ProtectedRoute><EAuction /></ProtectedRoute>} />
            <Route path="/inventory-location" element={<ProtectedRoute><InventoryLocation /></ProtectedRoute>} />  */}
            <Route path="/approvals/po-approval" element={<ProtectedRoute><POApproval /></ProtectedRoute>} />
       {/*      <Route path="/approvals/invoice-approval" element={<ProtectedRoute><InvoiceApproval /></ProtectedRoute>} />
            <Route path="/approvals/inventory-approvals" element={<ProtectedRoute><InventoryApprovals /></ProtectedRoute>} />
            <Route path="/approvals/stock-transfer" element={<ProtectedRoute><StockTransferApproval /></ProtectedRoute>} />  */}
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        {/*     <Route path="/stock-transfer" element={<ProtectedRoute><StockTransfer /></ProtectedRoute>} />*/}
            <Route path="/tax-configuration" element={<ProtectedRoute><TaxConfiguration /></ProtectedRoute>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/pitch-deck" element={<PitchDeck />} />
            <Route path="*" element={<NotFound />} /> 
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
