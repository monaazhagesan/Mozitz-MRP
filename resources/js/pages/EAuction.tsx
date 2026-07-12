import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { 
  Gavel, 
  Clock, 
  TrendingUp, 
  Users, 
  Plus, 
  Search,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Timer,
  DollarSign,
  Package,
  ArrowLeft,
  RefreshCw,
  Award,
  Trophy,
  FileText,
  Calendar,
  Shield,
  Star,
  Settings,
  Play,
  Eye,
  Download,
  Filter
} from "lucide-react";

interface RFQ {
  id: string;
  rfq_number: string;
  title: string;
  status: string;
  created_at: string;
}

interface RFQItem {
  id: string;
  rfq_id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  description: string;
}

interface Auction {
  id: string;
  auction_number: string;
  title: string;
  description: string;
  status: "Draft" | "Scheduled" | "Active" | "Closed" | "Awarded";
  start_date: string;
  end_date: string;
  auction_type: "Forward" | "Reverse";
  created_at: string;
  rfq_id?: string;
  auto_award: boolean;
  award_criteria: string;
}

interface AuctionItem {
  id: string;
  auction_id: string;
  item_code: string;
  item_name: string;
  description: string;
  quantity: number;
  uom: string;
  start_price: number;
  current_bid: number;
  min_bid_increment: number;
  rfq_price?: number;
  auction_price?: number;
  savings_percent?: number;
}

interface Bid {
  id: string;
  auction_item_id: string;
  vendor_name: string;
  vendor_rating: number;
  bid_amount: number;
  bid_time: string;
  status: "Active" | "Outbid" | "Winner" | "Evaluated";
  notes: string;
  evaluation_score?: number;
  rank?: number;
}

interface AwardProposal {
  id: string;
  auction_id: string;
  status: "Pending" | "Approved" | "Rejected";
  created_at: string;
  total_amount: number;
  vendors: string[];
}

export default function EAuction() {
  const { toast } = useToast();
  
  // RFQs for conversion
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [rfqItems, setRfqItems] = useState<RFQItem[]>([]);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  
  // Convert to Auction Dialog
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [useRfqQuotesAsInitial, setUseRfqQuotesAsInitial] = useState(true);
  const [allInvited, setAllInvited] = useState(true);
  
  // Auctions
  const [auctions, setAuctions] = useState<Auction[]>([
    {
      id: "1",
      auction_number: "AUC-2024-001",
      title: "Electric Supplies",
      description: "Reverse auction for electric supplies",
      status: "Active",
      start_date: "2024-01-15T09:00:00",
      end_date: "2024-01-20T17:00:00",
      auction_type: "Reverse",
      created_at: "2024-01-10T10:00:00",
      auto_award: true,
      award_criteria: "lowest_price"
    },
    {
      id: "2",
      auction_number: "AUC-2024-002",
      title: "Steel Materials Procurement",
      description: "Reverse auction for steel raw materials",
      status: "Scheduled",
      start_date: "2024-01-25T10:00:00",
      end_date: "2024-01-30T18:00:00",
      auction_type: "Reverse",
      created_at: "2024-01-12T14:00:00",
      auto_award: false,
      award_criteria: "best_value"
    },
    {
      id: "3",
      auction_number: "AUC-2024-003",
      title: "Packaging Materials",
      description: "Reverse auction for packaging supplies",
      status: "Closed",
      start_date: "2024-01-05T08:00:00",
      end_date: "2024-01-10T16:00:00",
      auction_type: "Reverse",
      created_at: "2024-01-02T09:00:00",
      auto_award: true,
      award_criteria: "lowest_price"
    }
  ]);

  const [auctionItems, setAuctionItems] = useState<AuctionItem[]>([
    {
      id: "1",
      auction_id: "1",
      item_code: "ELC-001",
      item_name: "Copper Wire 2.5mm",
      description: "Standard copper wire",
      quantity: 40,
      uom: "Units",
      start_price: 20,
      current_bid: 15,
      min_bid_increment: 0.5,
      rfq_price: 20,
      auction_price: 15,
      savings_percent: 0.8
    },
    {
      id: "2",
      auction_id: "1",
      item_code: "ELC-002",
      item_name: "Circuit Breaker 32A",
      description: "Industrial circuit breaker",
      quantity: 20,
      uom: "Units",
      start_price: 10,
      current_bid: 5,
      min_bid_increment: 0.25,
      rfq_price: 10,
      auction_price: 5,
      savings_percent: 0.2
    }
  ]);

  const [bids, setBids] = useState<Bid[]>([
    {
      id: "1",
      auction_item_id: "1",
      vendor_name: "Acme Enterprise",
      vendor_rating: 4.5,
      bid_amount: 15,
      bid_time: "2024-01-15T10:30:00",
      status: "Active",
      notes: "LPO +0.8%",
      evaluation_score: 95,
      rank: 1
    },
    {
      id: "2",
      auction_item_id: "1",
      vendor_name: "TechSupply Co",
      vendor_rating: 4.2,
      bid_amount: 18,
      bid_time: "2024-01-15T11:15:00",
      status: "Outbid",
      notes: "",
      evaluation_score: 85,
      rank: 2
    },
    {
      id: "3",
      auction_item_id: "2",
      vendor_name: "Acme Enterprise",
      vendor_rating: 4.5,
      bid_amount: 5,
      bid_time: "2024-01-15T14:00:00",
      status: "Active",
      notes: "LPO +0.2%",
      evaluation_score: 92,
      rank: 1
    }
  ]);

  const [awardProposals, setAwardProposals] = useState<AwardProposal[]>([
    {
      id: "1",
      auction_id: "1",
      status: "Pending",
      created_at: "2024-01-20T17:05:00",
      total_amount: 900,
      vendors: ["Acme Enterprise"]
    }
  ]);

  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);
  const [isAwardCriteriaDialogOpen, setIsAwardCriteriaDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  const [newBidAmount, setNewBidAmount] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  const [newAuction, setNewAuction] = useState({
    title: "",
    description: "",
    auction_type: "Reverse",
    start_date: "",
    end_date: "",
    auto_award: true,
    award_criteria: "lowest_price"
  });

  const [awardCriteria, setAwardCriteria] = useState({
    pricing_weight: 60,
    rating_weight: 25,
    delivery_weight: 15
  });

  // Fetch RFQs from database
  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        const res = await axios.get('/api/rfqs');
        const openStatuses = new Set(['sent', 'viewed', 'quoted', 'closed']);
        const data = (res.data || []).filter((r: any) => openStatuses.has(r.status));
        setRfqs(data as RFQ[]);
      } catch {
        // ignore — auction page can still be used with mock data
      }
    };
    fetchRFQs();
  }, []);

  const filteredAuctions = auctions.filter(auction => {
    const matchesSearch = auction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         auction.auction_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || auction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Active</Badge>;
      case "Scheduled":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Scheduled</Badge>;
      case "Draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "Closed":
        return <Badge variant="outline">Closed</Badge>;
      case "Awarded":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Awarded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleConvertToAuction = () => {
    if (!selectedRFQ) return;
    
    const auctionNumber = `AUC-${new Date().getFullYear()}-${String(auctions.length + 1).padStart(3, '0')}`;
    const newAuctionEntry: Auction = {
      id: String(Date.now()),
      auction_number: auctionNumber,
      title: selectedRFQ.title,
      description: `Converted from ${selectedRFQ.rfq_number}`,
      status: "Draft",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      auction_type: "Reverse",
      created_at: new Date().toISOString(),
      rfq_id: selectedRFQ.id,
      auto_award: true,
      award_criteria: "lowest_price"
    };

    setAuctions([...auctions, newAuctionEntry]);
    setIsConvertDialogOpen(false);
    setSelectedRFQ(null);
    
    toast({
      title: "Auction Created",
      description: `${selectedRFQ.rfq_number} has been converted to ${auctionNumber}`
    });
  };

  const handleStartAwarding = (auction: Auction) => {
    setSelectedAuction(auction);
    setIsAwardDialogOpen(true);
  };

  const handleAutoAward = () => {
    if (!selectedAuction) return;

    // Find winning bids based on criteria
    const auctionBids = bids.filter(b => 
      auctionItems.some(i => i.auction_id === selectedAuction.id && i.id === b.auction_item_id)
    );

    // Update winning bids
    const updatedBids = bids.map(bid => {
      if (bid.rank === 1 && auctionBids.includes(bid)) {
        return { ...bid, status: "Winner" as const };
      }
      return bid;
    });

    setBids(updatedBids);

    // Create award proposal
    const newProposal: AwardProposal = {
      id: String(Date.now()),
      auction_id: selectedAuction.id,
      status: "Pending",
      created_at: new Date().toISOString(),
      total_amount: auctionItems
        .filter(i => i.auction_id === selectedAuction.id)
        .reduce((sum, i) => sum + (i.current_bid * i.quantity), 0),
      vendors: [...new Set(auctionBids.filter(b => b.rank === 1).map(b => b.vendor_name))]
    };

    setAwardProposals([...awardProposals, newProposal]);
    setIsAwardDialogOpen(false);

    toast({
      title: "Award Proposal Created",
      description: "Approver needs to approve this proposal before final awarding."
    });
  };

  const handleApproveProposal = (proposalId: string) => {
    setAwardProposals(awardProposals.map(p => 
      p.id === proposalId ? { ...p, status: "Approved" as const } : p
    ));
    
    // Update auction status
    const proposal = awardProposals.find(p => p.id === proposalId);
    if (proposal) {
      setAuctions(auctions.map(a => 
        a.id === proposal.auction_id ? { ...a, status: "Awarded" as const } : a
      ));
    }

    toast({
      title: "Proposal Approved",
      description: "Vendors have been awarded successfully."
    });
  };

  const handleGeneratePO = async (proposal: AwardProposal) => {
    const auction = auctions.find(a => a.id === proposal.auction_id);
    if (!auction) return;

    const auctionItemsForProposal = auctionItems.filter(i => i.auction_id === proposal.auction_id);
    const winningBids = bids.filter(b => 
      b.status === "Winner" && auctionItemsForProposal.some(i => i.id === b.auction_item_id)
    );

    // Group items by vendor
    const vendorItems: Record<string, { items: AuctionItem[], bids: Bid[] }> = {};
    winningBids.forEach(bid => {
      const item = auctionItemsForProposal.find(i => i.id === bid.auction_item_id);
      if (item) {
        if (!vendorItems[bid.vendor_name]) {
          vendorItems[bid.vendor_name] = { items: [], bids: [] };
        }
        vendorItems[bid.vendor_name].items.push(item);
        vendorItems[bid.vendor_name].bids.push(bid);
      }
    });

    // Create PO for each vendor
    for (const [vendorName, { items, bids: vendorBids }] of Object.entries(vendorItems)) {
      const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const subtotal = items.reduce((sum, item, idx) => sum + (vendorBids[idx].bid_amount * item.quantity), 0);
      
      let poData: any;
      try {
        const poRes = await axios.post('/api/purchase-orders', {
          po_number: poNumber,
          vendor: vendorName,
          expected_date: new Date().toISOString().split('T')[0],
          status: 'Awaiting Approval',
          subtotal: subtotal,
          tax: 0,
          total: subtotal,
          notes: `Generated from E-Auction ${auction.auction_number}`,
        });
        poData = poRes.data;
      } catch (poError: any) {
        toast({
          title: "Error",
          description: `Failed to create PO for ${vendorName}: ${poError.response?.data?.message || poError.message}`,
          variant: "destructive"
        });
        continue;
      }

      // Insert PO items
      const poItems = items.map((item, idx) => ({
        po_id: poData.id,
        item_code: item.item_code,
        description: item.item_name,
        quantity: item.quantity,
        unit_price: vendorBids[idx].bid_amount,
        total: vendorBids[idx].bid_amount * item.quantity
      }));

      try {
        await axios.post('/api/purchase-order-lines', { items: poItems });
      } catch (itemsError: any) {
        toast({
          title: "Warning",
          description: `PO created but failed to add items: ${itemsError.response?.data?.message || itemsError.message}`,
          variant: "destructive"
        });
        continue;
      }

      toast({
        title: "Purchase Order Created",
        description: `${poNumber} created for ${vendorName}`
      });
    }

    if (Object.keys(vendorItems).length === 0) {
      toast({
        title: "No Winners Found",
        description: "No winning bids to generate PO from. Please ensure the auction has winning bids.",
        variant: "destructive"
      });
    }
  };

  const handleCreateAuction = () => {
    const auctionNumber = `AUC-${new Date().getFullYear()}-${String(auctions.length + 1).padStart(3, '0')}`;
    const newAuctionEntry: Auction = {
      id: String(Date.now()),
      auction_number: auctionNumber,
      title: newAuction.title,
      description: newAuction.description,
      status: "Draft",
      start_date: newAuction.start_date,
      end_date: newAuction.end_date,
      auction_type: newAuction.auction_type as "Forward" | "Reverse",
      created_at: new Date().toISOString(),
      auto_award: newAuction.auto_award,
      award_criteria: newAuction.award_criteria
    };

    setAuctions([...auctions, newAuctionEntry]);
    setIsCreateDialogOpen(false);
    setNewAuction({ title: "", description: "", auction_type: "Reverse", start_date: "", end_date: "", auto_award: true, award_criteria: "lowest_price" });
    
    toast({
      title: "Auction Created",
      description: `Auction ${auctionNumber} has been scheduled successfully.`
    });
  };

  const handleSubmitBid = () => {
    if (!selectedItem || !newBidAmount || !vendorName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const bidAmount = parseFloat(newBidAmount);
    const auction = auctions.find(a => a.id === selectedItem.auction_id);
    
    if (auction?.auction_type === "Reverse") {
      if (bidAmount >= selectedItem.current_bid) {
        toast({
          title: "Invalid Bid",
          description: "For reverse auctions, bid must be lower than current bid",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (bidAmount <= selectedItem.current_bid) {
        toast({
          title: "Invalid Bid",
          description: "For forward auctions, bid must be higher than current bid",
          variant: "destructive"
        });
        return;
      }
    }

    const updatedBids = bids.map(bid => {
      if (bid.auction_item_id === selectedItem.id && bid.status === "Active") {
        return { ...bid, status: "Outbid" as const, rank: (bid.rank || 0) + 1 };
      }
      return bid;
    });

    const newBid: Bid = {
      id: String(Date.now()),
      auction_item_id: selectedItem.id,
      vendor_name: vendorName,
      vendor_rating: 4.0,
      bid_amount: bidAmount,
      bid_time: new Date().toISOString(),
      status: "Active",
      notes: bidNotes,
      evaluation_score: Math.floor(Math.random() * 20) + 80,
      rank: 1
    };

    setBids([...updatedBids, newBid]);

    setAuctionItems(auctionItems.map(item => {
      if (item.id === selectedItem.id) {
        const savings = ((item.start_price - bidAmount) / item.start_price) * 100;
        return { 
          ...item, 
          current_bid: bidAmount,
          auction_price: bidAmount,
          savings_percent: savings / 100
        };
      }
      return item;
    }));

    setIsBidDialogOpen(false);
    setNewBidAmount("");
    setBidNotes("");
    
    toast({
      title: "Bid Submitted",
      description: `Your bid of ₹${bidAmount} has been submitted successfully.`
    });
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const activeAuctions = auctions.filter(a => a.status === "Active").length;
  const scheduledAuctions = auctions.filter(a => a.status === "Scheduled").length;
  const pendingProposals = awardProposals.filter(p => p.status === "Pending").length;
  const totalSavings = auctionItems.reduce((sum, i) => sum + ((i.rfq_price || 0) - (i.auction_price || 0)) * i.quantity, 0);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">E-Auction</h1>
            <p className="text-muted-foreground mt-1">Convert RFQs to auctions, drive competition, and auto-award winning bids</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Convert RFQ
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Auction
            </Button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <RefreshCw className="h-8 w-8 text-blue-500 mt-1" />
                <div>
                  <h3 className="font-semibold">RFQ to Auction</h3>
                  <p className="text-sm text-muted-foreground">Convert any RFQ into a live auction event</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-8 w-8 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Schedule Auctions</h3>
                  <p className="text-sm text-muted-foreground">Boost efficiency and drive competition</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Trophy className="h-8 w-8 text-amber-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Auto-Award</h3>
                  <p className="text-sm text-muted-foreground">Automatic bid evaluation and selection</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-8 w-8 text-purple-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Compliance</h3>
                  <p className="text-sm text-muted-foreground">Maintain bid records for transparency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Auctions</p>
                  <p className="text-2xl font-bold">{activeAuctions}</p>
                </div>
                <Gavel className="h-8 w-8 text-green-500/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="text-2xl font-bold">{scheduledAuctions}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bids</p>
                  <p className="text-2xl font-bold">{bids.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Awards</p>
                  <p className="text-2xl font-bold">{pendingProposals}</p>
                </div>
                <Award className="h-8 w-8 text-amber-500/60" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Savings</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalSavings.toFixed(0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Auctions</TabsTrigger>
            <TabsTrigger value="bidding">Vendor Bidding</TabsTrigger>
            <TabsTrigger value="awards">
              Award Proposals
              {pendingProposals > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white">{pendingProposals}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Bid Records</TabsTrigger>
          </TabsList>

          {/* Auctions Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search auctions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Awarded">Awarded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAuctions.map((auction) => (
                <Card 
                  key={auction.id} 
                  className="cursor-pointer transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {auction.rfq_id && <FileText className="h-4 w-4 text-blue-500" />}
                        <Badge variant="outline" className="text-xs">{auction.auction_number}</Badge>
                      </div>
                      {getStatusBadge(auction.status)}
                    </div>
                    <CardTitle className="text-lg mt-2">{auction.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{auction.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <ArrowDown className="h-4 w-4 text-green-600" />
                        <span>{auction.auction_type}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Timer className="h-4 w-4" />
                        <span>{getTimeRemaining(auction.end_date)}</span>
                      </div>
                    </div>

                    {auction.auto_award && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Trophy className="h-3 w-3" />
                        <span>Auto-award enabled</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedAuction(auction);
                          setActiveTab("bidding");
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {(auction.status === "Closed" || auction.status === "Active") && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleStartAwarding(auction)}
                        >
                          <Award className="h-4 w-4 mr-1" />
                          Award
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Vendor Bidding */}
          <TabsContent value="bidding" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedAuction?.title || "Select an Auction"}</CardTitle>
                    <CardDescription>
                      {selectedAuction && (
                        <div className="flex items-center gap-4 mt-1">
                          <span>{selectedAuction.auction_number}</span>
                          {getStatusBadge(selectedAuction.status)}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  {selectedAuction && selectedAuction.status === "Active" && (
                    <Button onClick={() => setIsAwardCriteriaDialogOpen(true)} variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Award Criteria
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedAuction ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Qty Offered</TableHead>
                        <TableHead>RFQ Price/UOM</TableHead>
                        <TableHead>Auction Price/UOM</TableHead>
                        <TableHead>Final Amount</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auctionItems
                        .filter(item => item.auction_id === selectedAuction.id)
                        .map((item) => {
                          const itemBids = bids.filter(b => b.auction_item_id === item.id).sort((a, b) => (a.rank || 99) - (b.rank || 99));
                          const leadingBid = itemBids.find(b => b.status === "Active");
                          
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-sm font-medium">
                                    L{leadingBid?.rank || 1}
                                  </span>
                                  {leadingBid?.evaluation_score && (
                                    <Badge variant="outline" className="text-xs">
                                      T1 🔒
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{leadingBid?.vendor_name || "No bids"}</p>
                                  <p className="text-xs text-muted-foreground">{item.item_name}</p>
                                </div>
                              </TableCell>
                              <TableCell>{item.quantity} {item.uom}</TableCell>
                              <TableCell>
                                <span>$ {item.rfq_price?.toFixed(0)}</span>
                                {item.savings_percent && (
                                  <Badge className="ml-2 bg-green-100 text-green-700 text-xs">
                                    LPO +{(item.savings_percent * 100).toFixed(1)}%
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <span>$ {item.auction_price?.toFixed(0)}</span>
                                {item.savings_percent && (
                                  <Badge className="ml-2 bg-green-100 text-green-700 text-xs">
                                    LPO +{(item.savings_percent * 100).toFixed(1)}%
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-semibold">
                                $ {((item.auction_price || item.current_bid) * item.quantity).toFixed(0)}
                              </TableCell>
                              <TableCell>
                                {selectedAuction.status === "Active" && (
                                  <Button 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setIsBidDialogOpen(true);
                                    }}
                                  >
                                    Place Bid
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="font-medium">Bid Total</TableCell>
                        <TableCell className="font-bold">
                          $ {auctionItems
                            .filter(i => i.auction_id === selectedAuction.id)
                            .reduce((sum, i) => sum + ((i.auction_price || i.current_bid) * i.quantity), 0)
                            .toFixed(0)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select an auction from the Auctions tab to view bidding details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Award Proposals */}
          <TabsContent value="awards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Award Proposals</CardTitle>
                <CardDescription>Review and approve awarding proposals for completed auctions</CardDescription>
              </CardHeader>
              <CardContent>
                {awardProposals.length > 0 ? (
                  <div className="space-y-4">
                    {awardProposals.map((proposal) => {
                      const auction = auctions.find(a => a.id === proposal.auction_id);
                      return (
                        <Card key={proposal.id} className="border-l-4 border-l-amber-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="bg-amber-100 p-3 rounded-lg">
                                  <Trophy className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold">Awarding proposal created</h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Approver needs to approve this proposal before final awarding of vendors on line items.
                                  </p>
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="text-sm">Auction: <strong>{auction?.title}</strong></span>
                                    <span className="text-sm">Amount: <strong>$ {proposal.total_amount}</strong></span>
                                    <span className="text-sm">Vendors: <strong>{proposal.vendors.join(", ")}</strong></span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  className={
                                    proposal.status === "Pending" 
                                      ? "bg-amber-500 text-white" 
                                      : proposal.status === "Approved"
                                      ? "bg-green-500 text-white"
                                      : "bg-red-500 text-white"
                                  }
                                >
                                  {proposal.status}
                                </Badge>
                                {proposal.status === "Pending" && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleApproveProposal(proposal.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                )}
                                {proposal.status === "Approved" && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleGeneratePO(proposal)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    Generate PO
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No award proposals yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bid Records */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bid Records</CardTitle>
                    <CardDescription>Complete history of all bids for transparency and compliance</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auction</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Bid Amount</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Eval Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids
                      .sort((a, b) => new Date(b.bid_time).getTime() - new Date(a.bid_time).getTime())
                      .map((bid) => {
                        const item = auctionItems.find(i => i.id === bid.auction_item_id);
                        const auction = auctions.find(a => a.id === item?.auction_id);
                        return (
                          <TableRow key={bid.id}>
                            <TableCell>{auction?.auction_number}</TableCell>
                            <TableCell className="font-medium">{item?.item_name || "Unknown"}</TableCell>
                            <TableCell>{bid.vendor_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {bid.vendor_rating}
                              </div>
                            </TableCell>
                            <TableCell>₹{bid.bid_amount.toFixed(2)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(bid.bid_time).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{bid.evaluation_score || "-"}</Badge>
                            </TableCell>
                            <TableCell>
                              {bid.status === "Active" && (
                                <Badge className="bg-green-500 text-white">Leading</Badge>
                              )}
                              {bid.status === "Outbid" && (
                                <Badge variant="secondary">Outbid</Badge>
                              )}
                              {bid.status === "Winner" && (
                                <Badge className="bg-amber-500 text-white">Winner</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Convert RFQ Dialog */}
        <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <ArrowLeft className="h-5 w-5 cursor-pointer" onClick={() => setIsConvertDialogOpen(false)} />
                <DialogTitle>Convert to Auction</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Select RFQ</Label>
                <Select onValueChange={(value) => setSelectedRFQ(rfqs.find(r => r.id === value) || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an RFQ to convert" />
                  </SelectTrigger>
                  <SelectContent>
                    {rfqs.map((rfq) => (
                      <SelectItem key={rfq.id} value={rfq.id}>
                        {rfq.rfq_number} - {rfq.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">INITIAL BID</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="use-rfq-quotes" 
                      checked={useRfqQuotesAsInitial}
                      onCheckedChange={(checked) => setUseRfqQuotesAsInitial(checked as boolean)}
                    />
                    <Label htmlFor="use-rfq-quotes">Use RFQ quotes as initial bids</Label>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Participants</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="all-invited" 
                      checked={allInvited}
                      onCheckedChange={(checked) => setAllInvited(checked as boolean)}
                    />
                    <Label htmlFor="all-invited">All invited</Label>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleConvertToAuction} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!selectedRFQ}
              >
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Auction Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule New Auction</DialogTitle>
              <DialogDescription>Create a new auction to drive vendor competition</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newAuction.title}
                  onChange={(e) => setNewAuction({ ...newAuction, title: e.target.value })}
                  placeholder="Enter auction title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newAuction.description}
                  onChange={(e) => setNewAuction({ ...newAuction, description: e.target.value })}
                  placeholder="Enter auction description"
                />
              </div>
              <div className="space-y-2">
                <Label>Auction Type</Label>
                <Select
                  value={newAuction.auction_type}
                  onValueChange={(value) => setNewAuction({ ...newAuction, auction_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reverse">Reverse (Lowest Bid Wins)</SelectItem>
                    <SelectItem value="Forward">Forward (Highest Bid Wins)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={newAuction.start_date}
                    onChange={(e) => setNewAuction({ ...newAuction, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="datetime-local"
                    value={newAuction.end_date}
                    onChange={(e) => setNewAuction({ ...newAuction, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="auto-award" 
                    checked={newAuction.auto_award}
                    onCheckedChange={(checked) => setNewAuction({ ...newAuction, auto_award: checked as boolean })}
                  />
                  <Label htmlFor="auto-award">Enable auto-award for winning bids</Label>
                </div>
                <div className="space-y-2">
                  <Label>Award Criteria</Label>
                  <Select
                    value={newAuction.award_criteria}
                    onValueChange={(value) => setNewAuction({ ...newAuction, award_criteria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lowest_price">Lowest Price</SelectItem>
                      <SelectItem value="best_value">Best Value (Price + Rating)</SelectItem>
                      <SelectItem value="custom">Custom Criteria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateAuction} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Auction
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Award Criteria Dialog */}
        <Dialog open={isAwardCriteriaDialogOpen} onOpenChange={setIsAwardCriteriaDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Customize Award Criteria</DialogTitle>
              <DialogDescription>Set weights for automatic bid evaluation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pricing Weight ({awardCriteria.pricing_weight}%)</Label>
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={awardCriteria.pricing_weight}
                  onChange={(e) => setAwardCriteria({ ...awardCriteria, pricing_weight: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier Rating Weight ({awardCriteria.rating_weight}%)</Label>
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={awardCriteria.rating_weight}
                  onChange={(e) => setAwardCriteria({ ...awardCriteria, rating_weight: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Time Weight ({awardCriteria.delivery_weight}%)</Label>
                <Input
                  type="range"
                  min="0"
                  max="100"
                  value={awardCriteria.delivery_weight}
                  onChange={(e) => setAwardCriteria({ ...awardCriteria, delivery_weight: parseInt(e.target.value) })}
                />
              </div>
              <div className="bg-muted p-3 rounded-lg text-sm">
                Total: {awardCriteria.pricing_weight + awardCriteria.rating_weight + awardCriteria.delivery_weight}%
                {(awardCriteria.pricing_weight + awardCriteria.rating_weight + awardCriteria.delivery_weight) !== 100 && (
                  <span className="text-destructive ml-2">(Must equal 100%)</span>
                )}
              </div>
              <Button 
                onClick={() => setIsAwardCriteriaDialogOpen(false)} 
                className="w-full"
                disabled={(awardCriteria.pricing_weight + awardCriteria.rating_weight + awardCriteria.delivery_weight) !== 100}
              >
                Save Criteria
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Start Awarding Dialog */}
        <Dialog open={isAwardDialogOpen} onOpenChange={setIsAwardDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                Start Awarding - {selectedAuction?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span className="font-medium">
                    {auctionItems.filter(i => i.auction_id === selectedAuction?.id).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-semibold text-primary">
                    $ {auctionItems
                      .filter(i => i.auction_id === selectedAuction?.id)
                      .reduce((sum, i) => sum + ((i.auction_price || i.current_bid) * i.quantity), 0)
                      .toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Winning Vendors:</span>
                  <span className="font-medium">
                    {[...new Set(bids.filter(b => b.rank === 1).map(b => b.vendor_name))].length}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                This will create an awarding proposal based on current bid rankings. 
                An approver will need to approve before final vendor awarding.
              </p>
              
              <Button onClick={handleAutoAward} className="w-full bg-blue-600 hover:bg-blue-700">
                <Trophy className="h-4 w-4 mr-2" />
                Create Award Proposal
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bid Dialog */}
        <Dialog open={isBidDialogOpen} onOpenChange={setIsBidDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Place Bid - {selectedItem?.item_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item Code:</span>
                  <span className="font-medium">{selectedItem?.item_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{selectedItem?.quantity} {selectedItem?.uom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Bid:</span>
                  <span className="font-semibold text-primary">₹{selectedItem?.current_bid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Increment:</span>
                  <span className="font-medium">₹{selectedItem?.min_bid_increment.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Your Company Name *</Label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Enter your company name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Your Bid Amount (₹) * - Must be lower than current bid</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newBidAmount}
                  onChange={(e) => setNewBidAmount(e.target.value)}
                  placeholder="Enter your bid amount"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={bidNotes}
                  onChange={(e) => setBidNotes(e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>
              
              <Button onClick={handleSubmitBid} className="w-full">
                <Gavel className="h-4 w-4 mr-2" />
                Submit Bid
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
