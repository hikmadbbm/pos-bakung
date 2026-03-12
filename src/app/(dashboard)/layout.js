"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Utensils, DollarSign, BarChart, LogOut, Settings, Activity, Calendar, ClipboardList, Menu, X, Wallet, Smartphone, Users, Clock, Maximize2, Minimize2 } from "lucide-react";
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
      { href: "/purchase", label: "Purchase", icon: Smartphone },
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
    MANAGER: ["/dashboard", "/orders", "/orders-list", "/menu", "/reports", "/analytics", "/shift", "/kitchen", "/recipes", "/cashier-report", "/ingredients", "/hpp-calculator"],
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
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && !isFocusMode && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!isFocusMode && (
        <aside 
          className={cn(
            "fixed lg:static inset-y-0 left-0 bg-white border-r flex flex-col shadow-sm z-30 transition-all duration-300",
            isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
            isCollapsed ? "lg:w-20" : "lg:w-64"
          )}
        >
          <div className={cn("h-16 flex items-center border-b px-4", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-blue-600 truncate">Bakmie You-Tje</h1>
                <p className="text-[10px] text-gray-500 truncate">Powered by Bakung</p>
              </div>
            )}
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
            {filteredNavGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {group.group && !isCollapsed && (
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {group.group}
                  </div>
                )}
                {group.group && isCollapsed && (
                   <div className="border-t my-2 border-gray-100 mx-2" />
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
                          "flex items-center rounded-md text-sm font-medium transition-colors group",
                          isCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                          isActive
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                        title={isCollapsed ? item.label : ""}
                      >
                        <Icon className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-2 border-t mt-auto">
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center w-full rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors",
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
            className="absolute top-2 right-2 lg:top-4 lg:right-4 z-50 p-2 bg-white/90 hover:bg-white shadow-md rounded-full border border-gray-200 text-gray-700 transition-all hover:scale-105 active:scale-95"
            title="Exit Focus Mode"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        {!isFocusMode && (
          <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-6 shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 text-gray-600"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block p-2 -ml-2 rounded-md hover:bg-gray-100 text-gray-600"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-800 truncate">
                {navGroups.flatMap(g => g.items).find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <StopShiftButton />
              {pathname === "/orders" && (
                <button
                  onClick={() => setIsFocusMode(true)} 
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  title="Enter Focus Mode"
                >
                   <Maximize2 className="w-5 h-5" />
                </button>
              )}
              <UserMenu />
            </div>
          </header>
        )}

        {/* Page Content */}
        <div className={cn("flex-1 overflow-auto", !isFocusMode && "p-4 lg:p-6 pb-20 lg:pb-6")}>
          {children}
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
