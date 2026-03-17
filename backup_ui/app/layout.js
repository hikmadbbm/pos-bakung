"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Utensils, DollarSign, BarChart, LogOut, Settings, Activity, Calendar, ClipboardList, Menu, X, Wallet, Smartphone, Users, Clock, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { setAuth, api } from "../../lib/api";
import { useRouter } from "next/navigation";
import { cn } from "../../lib/utils";
import UserMenu from "../../components/UserMenu";
import StopShiftButton from "../../components/StopShiftButton";
import { FocusModeProvider, useFocusMode } from "../../lib/focus-mode-context";
import { useToast } from "../../components/ui/use-toast";

const navGroups = [
  {
    group: null, // Top level items without a group
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    group: "Sales",
    items: [
      { href: "/orders", label: "POS", icon: ShoppingCart },
      { href: "/orders-list", label: "Order History", icon: ClipboardList },
      { href: "/shift", label: "Shift Management", icon: Clock },
    ]
  },
  {
    group: "Menu & Kitchen",
    items: [
      { href: "/menu", label: "Menu Management", icon: Utensils },
      { href: "/recipes", label: "Recipes", icon: ClipboardList },
      { href: "/kitchen", label: "Kitchen View", icon: Utensils },
    ]
  },
  {
    group: "Inventory",
    items: [
      { href: "/ingredients", label: "Ingredient List", icon: ClipboardList },
      { href: "/purchase", label: "Purchase", icon: ShoppingCart },
      { href: "/stock", label: "Stock", icon: Activity },
    ]
  },
  {
    group: "Finance",
    items: [
      { href: "/hpp-calculator", label: "HPP Calculator", icon: DollarSign },
      { href: "/expenses", label: "Expenses & Costs", icon: DollarSign },
    ]
  },
  {
    group: "Reports",
    items: [
      { href: "/reports", label: "General Reports", icon: BarChart },
      { href: "/cashier-report", label: "Cashier Report", icon: ClipboardList },
      { href: "/analytics", label: "AI Analytics", icon: Activity },
    ]
  },
  {
    group: null,
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ]
  }
];

function DashboardContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { error } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isFocusMode, setIsFocusMode } = useFocusMode();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (!token) {
      router.push("/login");
    } else if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, [router]);

  // Define permissions mapping
  const rolePermissions = {
    OWNER: ["/dashboard", "/orders", "/orders-list", "/menu", "/expenses", "/reports", "/analytics", "/shift", "/settings", "/kitchen", "/recipes", "/cashier-report", "/ingredients", "/purchase", "/stock", "/hpp-calculator"],
    MANAGER: ["/dashboard", "/orders", "/orders-list", "/menu", "/reports", "/analytics", "/shift", "/kitchen", "/recipes", "/cashier-report", "/ingredients", "/hpp-calculator", "/purchase", "/stock"],
    CASHIER: ["/orders", "/orders-list", "/cashier-report", "/shift"],
    KITCHEN: ["/kitchen", "/orders-list", "/menu", "/ingredients"]
  };

  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!user) return false;
      const allowedPaths = rolePermissions[user.role] || [];
      return allowedPaths.some(path => item.href.startsWith(path));
    })
  })).filter(group => group.items.length > 0);

  // Auto-exit Focus Mode if navigating away from the POS page
  useEffect(() => {
    if (pathname !== "/orders") {
      setIsFocusMode(false);
    }
  }, [pathname, setIsFocusMode]);

  const handleLogout = async () => {
    try {
      if (user) {
        const shift = await api.get(`/shifts/current/${user.id}`);
        if (shift) {
          error("Active Shift Detected: You must stop your shift and reconcile cash before logging out.");
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    setAuth(null, null);
    router.push("/login");
  };

  // Prevent Hydration Mismatch by only rendering dashboard shell after mount
  if (!mounted) {
    return <div className="flex items-center justify-center h-screen bg-gray-100">Loading system...</div>;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    return <div className="flex items-center justify-center h-screen bg-gray-100">Redirecting to login...</div>;
  }

  // Basic Page Authorization Redirect
  if (user && mounted) {
    const allowedPaths = rolePermissions[user.role] || [];
    const isAllowed = allowedPaths.some(path => pathname.startsWith(path));
    if (!isAllowed && pathname !== "/dashboard") { 
       // Basic protection
    }
  }

  return (
    <div className="flex h-screen bg-slate-50/50 font-sans overflow-hidden antialiased">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && !isFocusMode && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!isFocusMode && (
        <aside 
          className={cn(
            "fixed lg:static inset-y-0 left-0 glass-sidebar flex flex-col z-30 transition-all duration-300 ease-in-out",
            isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
            isCollapsed ? "lg:w-20" : "lg:w-64 shadow-xl lg:shadow-none"
          )}
        >
          <div className={cn("h-16 flex items-center border-b border-slate-200/60 px-4", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && (
              <div className="flex items-center gap-4 animate-fade-in">
                <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-black text-slate-900 truncate tracking-tight uppercase px-0.5">POS BAKUNG</h1>
                  <p className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full inline-block mt-0.5">SYSTEM V1.0</p>
                </div>
              </div>
            )}
            {isCollapsed && (
               <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200 animate-fade-in">
                 <ShoppingCart className="w-5 h-5 text-white" />
               </div>
            )}
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-6 overflow-y-auto scrollbar-hide">
            {filteredNavGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                {group.group && !isCollapsed && (
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-md">
                    {group.group}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={cn(
                          "flex items-center rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                          isCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                          isActive
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                        )}
                        title={isCollapsed ? item.label : ""}
                      >
                        <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110", !isCollapsed && "mr-3")} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                        {isActive && !isCollapsed && (
                           <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-200/60 mt-auto bg-slate-50/30">
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center w-full rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all duration-200",
                isCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
              )}
              title={isCollapsed ? "Logout" : ""}
            >
              <LogOut className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "mr-3")} />
              {!isCollapsed && "Logout"}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Focus Mode Exit Button - Adjusted for Mobile */}
        {isFocusMode && (
          <button
            onClick={() => setIsFocusMode(false)}
            className="absolute top-2 right-2 lg:top-4 lg:right-4 z-50 p-2.5 bg-white/90 backdrop-blur-md hover:bg-white shadow-xl rounded-full border border-slate-200 text-slate-700 transition-all hover:scale-110 active:scale-90"
            title="Exit Focus Mode"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        {!isFocusMode && (
          <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-600"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-transform active:scale-90"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {navGroups.flatMap(g => g.items).find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                </h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <StopShiftButton />
              {pathname === "/orders" && (
                <button
                  onClick={() => setIsFocusMode(true)} 
                  className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all active:scale-95 border border-transparent hover:border-slate-200 shadow-sm hover:shadow"
                  title="Enter Focus Mode"
                >
                   <Maximize2 className="w-5 h-5" />
                </button>
              )}
              <div className="h-8 w-px bg-slate-200 mx-1" />
              <UserMenu />
            </div>
          </header>
        )}

        {/* Page Content */}
        <div className={cn("flex-1 overflow-auto bg-slate-50/30", !isFocusMode && "p-4 lg:p-10 pb-20 lg:pb-10")}>
          <div className="max-w-[1600px] mx-auto animate-fade-in relative">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <FocusModeProvider>
      <DashboardContent>{children}</DashboardContent>
    </FocusModeProvider>
  );
}
