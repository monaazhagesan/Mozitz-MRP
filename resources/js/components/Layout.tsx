import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";
import {
  Package,
  ShoppingCart,
  GitBranch,
  Users,
  Settings,
  Clipboard,
  FileText,
  DollarSign,
  CheckSquare,
  Wallet,
  MapPin,
  Upload,
  Calculator,
  Building2,
  HelpCircle,
  PackageCheck,
  Receipt,
  LogOut,
  CreditCard,
  UsersIcon,
  ChevronDown,
  FileOutput,
  Brain,
  Bell,
  Search,
  Download,
  Calendar,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}
interface NavItem {
  name: string;
  href?: string;
  icon: any;
  items?: NavItem[];
}
interface NavGroup {
  name: string;
  icon: any;
  items: NavItem[];
  badge?: number;
}

/* ── tiny dropdown hook ── */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return { open, setOpen, ref };
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { signOut, user, loading } = useAuth();
  const [activeViewTab, setActiveViewTab] = useState("Overview");

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#6b7280" }}>
        Loading…
      </div>
    );
  }

  const navigationGroups: NavGroup[] = [
    {
      name: "Accounting",
      icon: FileText,
      items: [
        { name: "Customers", href: "/accounting/customers", icon: Users },
        { name: "Vendors", href: "/purchase/vendors", icon: Building2 },
        { name: "Orders", href: "/orders", icon: ShoppingCart },
        { name: "Invoices", href: "/accounting/invoices", icon: FileText },
        { name: "Ledger", href: "/accounting/ledger", icon: FileText },
        { name: "Credit Notes", href: "/accounting/credit-notes", icon: FileOutput },
        { name: "Tax Configuration", href: "/tax-configuration", icon: Calculator },
        { name: "AI Insights", href: "/accounting/ai-insights", icon: Brain },
      ],
    },
    {
      name: "Procurement",
      icon: ShoppingCart,
      items: [
        {
          name: "Store Keeper", icon: PackageCheck,
          items: [
            { name: "GRN", href: "/purchase/grn", icon: Clipboard },
            { name: "Debit Note", href: "/purchase/debit-note", icon: Package },
            { name: "Supplier Payable", href: "/accounting/supplier-payables", icon: DollarSign },
          ],
        },
        { name: "MRP", href: "/purchase/mrp-run", icon: Clipboard },
        { name: "Purchase Order", href: "/purchase/purchase-orders", icon: FileText },
        {
          name: "Vendor Management", icon: Building2,
          items: [
            { name: "Vendor Onboarding", href: "/purchase/vendors", icon: Users },
            { name: "RFQ Management", href: "/purchase/rfq-management", icon: FileText },
            { name: "Award Quotation", href: "/purchase/vendor-quotations", icon: Receipt },
            { name: "E-Auction Vendors", href: "/purchase/e-auction", icon: Wallet },
          ],
        },
      ],
    },
    {
      name: "Inventory",
      icon: Package,
      items: [
        { name: "Stock", href: "/inventory", icon: Package },
        { name: "Warehouse", href: "/inventory-location", icon: MapPin },
        { name: "Stock Transfer", href: "/stock-transfer", icon: GitBranch },
        { name: "Approvals", href: "/approvals/inventory-approvals", icon: CheckSquare },
        { name: "Import from Tally", href: "/import-tally", icon: Upload },
      ],
    },
    {
      name: "Production",
      icon: Clipboard,
      items: [
        { name: "BOM", href: "/bom", icon: GitBranch },
        { name: "Planning", href: "/planning", icon: FileText },
        { name: "Shopfloor", href: "/shopfloor", icon: Clipboard },
      ],
    },
    {
      name: "Analytics",
      icon: GitBranch,
      items: [
        {
          name: "Dashboard",
          href: "/analytics",
          icon: FileText,
        }
      ],
    },
    {
      name: "Approvals",
      icon: CheckSquare,

      items: [
        { name: "PO Approval", href: "/approvals/po-approval", icon: CheckSquare },
        { name: "Invoice Approval", href: "/approvals/invoice-approval", icon: CheckSquare },
      ],
    },
  ];

  const isItemActive = (item: NavItem, path: string): boolean => {
    if (item.href && item.href === path) return true;
    if (item.items) return item.items.some(c => isItemActive(c, path));
    return false;
  };

  const getFirstHref = (item: NavItem): string => {
    if (item.href) return item.href;
    if (item.items?.length) return getFirstHref(item.items[0]);
    return "/";
  };

  const getActiveGroup = () => {
    for (const g of navigationGroups) {
      if (g.items.some(i => isItemActive(i, location.pathname))) return g;
    }
    return null;
  };

  const currentGroup = getActiveGroup();

  // Breadcrumb: find deepest active item name
  const getActiveCrumb = (): { section: string; page: string } => {
    if (location.pathname === "/") return { section: "Dashboard", page: "Overview of your warehouse operations" };
    for (const g of navigationGroups) {
      for (const item of g.items) {
        if (item.href === location.pathname) return { section: g.name, page: item.name };
        if (item.items) {
          const child = item.items.find(c => c.href === location.pathname);
          if (child) return { section: g.name, page: child.name };
        }
      }
    }
    return { section: "Dashboard", page: "" };
  };
  const crumb = getActiveCrumb();

  const userDropdown = useDropdown();
  const initials = user?.email?.substring(0, 2).toUpperCase() || "VI";

  return (
    <>
      <style>{`
        /* ── Reset scoped to layout ── */
        .lyt-root *, .lyt-root *::before, .lyt-root *::after { box-sizing: border-box; }
        .lyt-root { display:flex; flex-direction:column;  position: relative;   z-index: 0; height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif; }

        /* ── Topnav ── */
        .lyt-topnav {
          background:#fff; border-bottom:1px solid #e3e5e8;
          height:52px; display:flex; align-items:center;
          padding:0 20px; gap:0; position:sticky; top:0; z-index:200; flex-shrink:0;
        }
        .lyt-brand {
          display:flex; align-items:center; gap:8px;
          margin-right:28px; flex-shrink:0; text-decoration:none;
        }
        .lyt-brand-logo {
          width:30px; height:30px; border-radius:8px; overflow:hidden; flex-shrink:0;
        }
        .lyt-brand-logo img { width:100%; height:100%; object-fit:cover; }
        .lyt-brand-name { font-size:14px; font-weight:700; color:#1a1d23; letter-spacing:-0.3px; }
        .lyt-brand-name span { color:#1a56db; }

        /* nav links */
        .lyt-nav-links { display:flex; align-items:center; gap:2px; flex:1; }
        .lyt-nav-link {
          display:flex; align-items:center; gap:5px;
          padding:6px 12px; font-size:13px; font-weight:400;
          color:#6b7280; border-radius:7px; cursor:pointer;
          white-space:nowrap; text-decoration:none;
          transition:background 0.12s, color 0.12s; position:relative;
        }
        .lyt-nav-link:hover { background:#f3f4f6; color:#1a1d23; }
        .lyt-nav-link.active { background:#eff6ff; color:#1d4ed8; font-weight:500; }
        .lyt-nav-link svg { width:15px; height:15px; flex-shrink:0; }
        .lyt-notif-dot {
          width:6px; height:6px; background:#ef4444;
          border-radius:50%; margin-left:2px; flex-shrink:0;
        }

        /* right actions */
        .lyt-nav-right { display:flex; align-items:center; gap:6px; flex-shrink:0; margin-left:12px; }
        .lyt-pill-btn {
          display:flex; align-items:center; gap:5px;
          padding:5px 12px; font-size:12px; font-weight:400;
          color:#6b7280; border:1px solid #e3e5e8;
          border-radius:7px; cursor:pointer; background:#fff;
          font-family:inherit; white-space:nowrap;
          transition:background 0.12s;
        }
        .lyt-pill-btn:hover { background:#f9fafb; }
        .lyt-pill-btn svg { width:13px; height:13px; }
        .lyt-icon-btn {
          width:32px; height:32px;
          display:flex; align-items:center; justify-content:center;
          border-radius:7px; cursor:pointer; color:#6b7280;
          border:none; background:transparent; position:relative;
          transition:background 0.12s;
        }
        .lyt-icon-btn:hover { background:#f3f4f6; }
        .lyt-icon-btn svg { width:18px; height:18px; }
        .lyt-bell-dot {
          position:absolute; top:5px; right:5px;
          width:7px; height:7px; background:#ef4444;
          border-radius:50%; border:1.5px solid #fff;
        }
        .lyt-avatar {
          width:30px; height:30px; border-radius:50%;
          background:#1a56db; display:flex; align-items:center; justify-content:center;
          font-size:10.5px; font-weight:700; color:#fff;
          cursor:pointer; letter-spacing:0.5px; flex-shrink:0;
          border:none;
        }

        /* user dropdown */
        .lyt-user-wrap { position:relative; }
        .lyt-user-trigger {
          display:flex; align-items:center; gap:5px;
          background:transparent; border:none; cursor:pointer; padding:4px;
          border-radius:7px; transition:background 0.12s;
        }
        .lyt-user-trigger:hover { background:#f3f4f6; }
        .lyt-user-trigger svg { width:14px; height:14px; color:#9ca3af; }
        .lyt-dropdown {
          position:absolute; top:calc(100% + 6px); right:0;
          background:#fff; border:1px solid #e3e5e8;
          border-radius:10px; width:200px;
          box-shadow:0 4px 16px rgba(0,0,0,0.08);
          z-index:300; overflow:hidden;
        }
        .lyt-dropdown-header { padding:10px 14px; border-bottom:1px solid #f3f4f6; }
        .lyt-dropdown-header p { margin:0; }
        .lyt-dropdown-title { font-size:12px; font-weight:600; color:#111827; }
        .lyt-dropdown-sub   { font-size:11px; color:#9ca3af; margin-top:2px !important; }
        .lyt-dropdown-item {
          display:flex; align-items:center; gap:8px;
          padding:8px 14px; font-size:12.5px; color:#374151;
          cursor:pointer; text-decoration:none;
          transition:background 0.1s;
        }
        .lyt-dropdown-item:hover { background:#f9fafb; }
        .lyt-dropdown-item svg { width:14px; height:14px; color:#9ca3af; flex-shrink:0; }
        .lyt-dropdown-sep { height:1px; background:#f3f4f6; margin:4px 0; }
        .lyt-dropdown-item.danger { color:#dc2626; }
        .lyt-dropdown-item.danger svg { color:#dc2626; }

         /* ── Breadcrumb bar ── */
        .lyt-breadcrumb-bar {
          background:#fff; border-bottom:1px solid #e3e5e8;
          height:40px; display:flex; align-items:center; justify-content:space-between;
          padding:0 20px; position:sticky; top:52px; z-index:199; flex-shrink:0;
        }
        .lyt-breadcrumb {
          display:flex; align-items:center; gap:6px;
          font-size:12px; color:#9ca3af;
        }
        .lyt-breadcrumb svg { width:13px; height:13px; }
        .lyt-breadcrumb .sep { color:#d1d5db; }
        .lyt-breadcrumb .crumb-active { color:#374151; font-weight:500; }
        .lyt-breadcrumb .crumb-sub { color:#9ca3af; }
        .lyt-view-tabs { display:flex; align-items:center; gap:2px; }
        .lyt-view-tab {
          font-size:12px; font-weight:400; padding:4px 10px;
          color:#6b7280; border-radius:6px; cursor:pointer;
          border:none; background:transparent; font-family:inherit;
          transition:background 0.12s;
        }
        .lyt-view-tab:hover { background:#f3f4f6; color:#374151; }
        .lyt-view-tab.active { color:#1d4ed8; background:#eff6ff; font-weight:500; }


        /* ── Subnav ── */
        .lyt-subnav {
          background:#fff; border-bottom:1px solid #e3e5e8;
          height:40px; display:flex; align-items:center;
          padding:0 20px; position:sticky; top:52px; z-index:199; flex-shrink:0;
        }
        .lyt-subnav-tabs { display:flex; align-items:center; gap:2px; flex:1; }
        .lyt-subtab {
          display:flex; align-items:center; gap:6px;
          font-size:12.5px; font-weight:400; padding:0 12px;
          color:#6b7280; cursor:pointer; white-space:nowrap;
          text-decoration:none; height:40px;
          border-bottom:2px solid transparent;
          transition:color 0.12s, border-color 0.12s;
        }
        .lyt-subtab:hover { color:#1a1d23; }
        .lyt-subtab.active { color:#1d4ed8; border-bottom-color:#1d4ed8; font-weight:500; }
        .lyt-subtab svg { width:14px; height:14px; flex-shrink:0; }

        /* subtab with dropdown */
        .lyt-subtab-dropdown { position:relative; }
        .lyt-subtab-dropdown-btn {
          display:flex; align-items:center; gap:6px;
          font-size:12.5px; font-weight:400; padding:0 12px;
          color:#6b7280; cursor:pointer; white-space:nowrap;
          background:transparent; border:none; font-family:inherit;
          height:40px; border-bottom:2px solid transparent;
          transition:color 0.12s, border-color 0.12s;
        }
        .lyt-subtab-dropdown-btn:hover { color:#1a1d23; }
        .lyt-subtab-dropdown-btn.active { color:#1d4ed8; border-bottom-color:#1d4ed8; font-weight:500; }
        .lyt-subtab-dropdown-btn svg { width:14px; height:14px; flex-shrink:0; }
        .lyt-subtab-chevron { width:12px !important; height:12px !important; color:#9ca3af; }
        .lyt-sub-dropdown {
          position:absolute; top:calc(100% + 2px); left:0;
          background:#fff; border:1px solid #e3e5e8;
          border-radius:8px; min-width:180px;
          box-shadow:0 4px 12px rgba(0,0,0,0.08);
          z-index:300; overflow:hidden; padding:4px;
        }
        .lyt-sub-dropdown-item {
          display:flex; align-items:center; gap:8px;
          padding:7px 10px; font-size:12.5px; color:#374151;
          cursor:pointer; text-decoration:none; border-radius:6px;
          transition:background 0.1s;
        }
        .lyt-sub-dropdown-item:hover { background:#f3f4f6; }
        .lyt-sub-dropdown-item.active { background:#eff6ff; color:#1d4ed8; }
        .lyt-sub-dropdown-item svg { width:14px; height:14px; color:#9ca3af; flex-shrink:0; }
        .lyt-sub-dropdown-item.active svg { color:#1d4ed8; }

        /* main */
       .lyt-main {
  flex: 1;
  overflow: auto;
  background: #f4f5f7;
  position: relative;
  z-index: 1;
}

        @media (max-width:768px) {
          .lyt-nav-link span { display:none; }
          .lyt-pill-btn span { display:none; }
        }
      `}</style>

      <div className="lyt-root">
        {/* ══ Top nav ══ */}
        <header className="lyt-topnav">
          {/* Brand */}
          <Link to="/" className="lyt-brand">
            <div className="lyt-brand-logo">
              <img src={logo} alt="Mozizsuite" />
            </div>
            <span className="lyt-brand-name">Moziz<span>suite</span></span>
          </Link>

          {/* Nav links */}
          <nav className="lyt-nav-links" aria-label="Main navigation">
            {/* Dashboard link */}
            <Link
              to="/"
              className={cn("lyt-nav-link", location.pathname === "/" && "active")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Dashboard</span>
              {location.pathname === "/" && <span className="lyt-notif-dot" />}
            </Link>

            {navigationGroups.map((group) => {
              const hasActive = group.items.some(i => isItemActive(i, location.pathname));
              const firstHref = getFirstHref(group.items[0]);
              const Icon = group.icon;
              return (
                <Link
                  key={group.name}
                  to={firstHref}
                  className={cn("lyt-nav-link", hasActive && "active")}
                >
                  <Icon size={15} />
                  <span>{group.name}</span>
                  {hasActive && <span className="lyt-notif-dot" />}
                </Link>
              );
            })}

            <Link
              to="/settings"
              className={cn("lyt-nav-link", location.pathname === "/settings" && "active")}
            >
              <Settings size={15} />
              <span>Settings</span>
              {location.pathname === "/settings" && <span className="lyt-notif-dot" />}
            </Link>
          </nav>

          {/* Right zone */}
          <div className="lyt-nav-right">
            <button className="lyt-pill-btn">
              <Calendar size={13} />
              <span>Jun 2026</span>
            </button>
            <button className="lyt-pill-btn">
              <Download size={13} />
              <span>Export</span>
            </button>
            <button className="lyt-icon-btn" aria-label="Search">
              <Search />
            </button>
            <button className="lyt-icon-btn" aria-label="Notifications">
              <Bell />
              <span className="lyt-bell-dot" />
            </button>

            {/* User dropdown */}
            <div className="lyt-user-wrap" ref={userDropdown.ref}>
              <button
                className="lyt-user-trigger"
                onClick={() => userDropdown.setOpen(o => !o)}
                aria-label="User menu"
              >
                <div className="lyt-avatar">{initials}</div>
                <ChevronDown size={14} color="#9ca3af" />
              </button>

              {userDropdown.open && (
                <div className="lyt-dropdown">
                  <div className="lyt-dropdown-header">
                    <p className="lyt-dropdown-title">MOZITZSOFTECH</p>
                    <p className="lyt-dropdown-sub">{user?.email?.split("@")[0] || "vignesh waran"}</p>
                  </div>
                  <div style={{ padding: "4px" }}>
                    <a className="lyt-dropdown-item" href="#">
                      <Building2 size={14} /> Account
                    </a>
                    <Link className="lyt-dropdown-item" to="/settings" onClick={() => userDropdown.setOpen(false)}>
                      <Settings size={14} /> Settings
                    </Link>
                    <Link className="lyt-dropdown-item" to="/settings?section=team" onClick={() => userDropdown.setOpen(false)}>
                      <UsersIcon size={14} /> Team
                    </Link>
                    <a className="lyt-dropdown-item" href="#">
                      <CreditCard size={14} /> Subscription
                    </a>
                    <div className="lyt-dropdown-sep" />
                    <button
                      className="lyt-dropdown-item danger"
                      style={{ width: "100%", background: "none", border: "none", fontFamily: "inherit", cursor: "pointer" }}
                      onClick={signOut}
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ══ Breadcrumb + View tabs bar ══ */}
        <div className="lyt-breadcrumb-bar">
          <div className="lyt-breadcrumb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="sep">›</span>
            <span className="crumb-active">{crumb.section}</span>
            {crumb.page && <><span className="sep">·</span><span className="crumb-sub">{crumb.page}</span></>}
          </div>
          {location.pathname === "/" && (
            <div className="lyt-view-tabs">
              {["Overview", "Analytics", "Forecasts", "Reports"].map((tab) => (
                <button
                  key={tab}
                  className={cn("lyt-view-tab", activeViewTab === tab && "active")}
                  onClick={() => setActiveViewTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {location.pathname.startsWith("/analytics") && (
            <div className="lyt-view-tabs">
              {["Analytics", "Forecasting", "Demand Planning", "Reports"].map((tab) => (
                <button
                  key={tab}
                  className={cn("lyt-view-tab", activeViewTab === tab && "active")}
                  onClick={() => setActiveViewTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>


        {/* ══ Subnav (subcategory tabs) ══ */}
        {currentGroup && (
          <div className="lyt-subnav">
            <div className="lyt-subnav-tabs">
              {currentGroup.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = !!(item.items?.length);
                const isActive = isItemActive(item, location.pathname);

                if (hasChildren) {
                  return (
                    <SubDropdownTab
                      key={item.name}
                      item={item}
                      isActive={isActive}
                      currentPath={location.pathname}
                    />
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.href || "/"}
                    className={cn("lyt-subtab", isActive && "active")}
                  >
                    <Icon size={14} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ Main content ══ */}
        <main className="lyt-main">{children}</main>
      </div>
    </>
  );
};

/* ── Sub-dropdown tab component ── */
function SubDropdownTab({
  item,
  isActive,
  currentPath,
}: {
  item: NavItem;
  isActive: boolean;
  currentPath: string;
}) {
  const { open, setOpen, ref } = useDropdown();
  const Icon = item.icon;

  return (
    <div className="lyt-subtab-dropdown" ref={ref}>
      <button
        className={cn("lyt-subtab-dropdown-btn", isActive && "active")}
        onClick={() => setOpen(o => !o)}
      >
        <Icon size={14} />
        {item.name}
        <ChevronDown size={12} color="#9ca3af" />
      </button>
      {open && (
        <div className="lyt-sub-dropdown">
          {item.items?.map((child) => {
            const ChildIcon = child.icon;
            const childActive = child.href === currentPath;
            return (
              <Link
                key={child.name}
                to={child.href || "/"}
                className={cn("lyt-sub-dropdown-item", childActive && "active")}
                onClick={() => setOpen(false)}
              >
                <ChildIcon size={14} />
                {child.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Layout;
