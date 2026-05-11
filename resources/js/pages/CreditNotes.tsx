import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, DollarSign, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import CreditNoteForm from "@/components/creditnote/CreditNoteForm";
import CreditNoteList from "@/components/creditnote/CreditNoteList";
import axios from "axios";

export interface CreditNote {
  id: string;
  credit_note_number: string;
  customer_id: string;
  customer_name: string;
  invoice_id?: string;
  invoice_number?: string;
  credit_date: string;
  reason: string;
  status: "draft" | "approved" | "applied" | "cancelled";
  total_amount: number;
  applied_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditNoteItem {
  id: string;
  credit_note_id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

const CreditNotes = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCreditNotes();
  }, []);

const loadCreditNotes = async () => {
  setLoading(true);
  try {
    const response = await axios.get("/api/credit-notes");

    const data = response.data;

    const notesArray =
      Array.isArray(data) ? data :
      Array.isArray(data?.data) ? data.data :
      Array.isArray(data?.creditNotes) ? data.creditNotes :
      [];

    setCreditNotes(notesArray);
  } catch (error) {
    console.error("Error loading credit notes:", error);
    setCreditNotes([]); // important fallback
  } finally {
    setLoading(false);
  }
};

  const filteredNotes = creditNotes.filter(
    (note) =>
      note.credit_note_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.invoice_number && note.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

 const stats = {
  total: creditNotes.length,
  draft: creditNotes.filter((n) => n.status.toLowerCase() === "draft").length,
  approved: creditNotes.filter((n) => n.status.toLowerCase() === "approved").length,
  applied: creditNotes.filter((n) => n.status.toLowerCase() === "applied").length,
  totalAmount: creditNotes.reduce((sum, n) => sum + (Number(n.total_amount) || 0), 0),
  appliedAmount: creditNotes.reduce((sum, n) => sum + (Number(n.applied_amount) || 0), 0),
};

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Credit Notes</h1>
            <p className="text-muted-foreground mt-2">
              Manage customer credit notes and adjustments
            </p>
          </div>
          <Button onClick={() => setActiveTab("create")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Credit Note
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Credit Notes</p>
                  <h3 className="text-3xl font-bold mt-2">{stats.total}</h3>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                  <h3 className="text-3xl font-bold mt-2">{stats.draft}</h3>
                </div>
                <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Credit Amount</p>
                  <h3 className="text-3xl font-bold mt-2">₹{!isNaN(Number(stats.totalAmount)) ? Number(stats.totalAmount).toFixed(2) : '0.00'}</h3>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Applied Amount</p>
                  <h3 className="text-3xl font-bold mt-2">₹{stats.appliedAmount && !isNaN(Number(stats.appliedAmount)) 
      ? Number(stats.appliedAmount).toFixed(2) 
      : '0.00'}</h3>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list">Credit Notes</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>All Credit Notes</CardTitle>
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by number, customer, invoice..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CreditNoteList
                  creditNotes={filteredNotes}
                  loading={loading}
                  onRefresh={loadCreditNotes}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <CreditNoteForm
              onSuccess={() => {
                loadCreditNotes();
                setActiveTab("list");
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CreditNotes;
