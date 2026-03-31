"use client";
import React, { useState, useEffect, useMemo } from "react";
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

import { useTranslation } from "../../lib/language-context";

export function DashboardContent({ children }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const navGroups = useMemo(() => [
    {
      group: null, 
      items: [
        { href: "/dashboard", label: t('dashboard'), icon: LayoutDashboard },
      ]
    },
    {
      group: t('pos'),
      items: [
        { href: "/orders", label: t('pos'), icon: ShoppingCart },
        { href: "/orders-list", label: t('orders'), icon: ClipboardList },
        { href: "/shift", label: t('shift'), icon: Clock },
      ]
    },
    {
      group: t('kitchen'),
      items: [
        { href: "/menu", label: t('products'), icon: Utensils },
        { href: "/recipes", label: t('recipes'), icon: ClipboardList },
        { href: "/kitchen", label: t('kitchen'), icon: Utensils },
      ]
    },
    {
      group: t('stock'),
      items: [
        { href: "/ingredients", label: t('vault'), icon: ClipboardList },
        { href: "/purchase", label: t('add_stock'), icon: ShoppingCart },
        { href: "/stock", label: t('stock'), icon: Activity },
      ]
    },
    {
      group: t('expenses'),
      items: [
        { href: "/hpp-calculator", label: t('cost_calculator'), icon: DollarSign },
        { href: "/expenses", label: t('expenses'), icon: DollarSign },
      ]
    },
    {
      group: t('reports'),
      items: [
        { href: "/promotions", label: t('promotions'), icon: Utensils },
        { href: "/reports", label: t('sales_reports'), icon: BarChart },
        { href: "/cashier-report", label: t('cashier_logs'), icon: ClipboardList },
        { href: "/analytics", label: t('sales_insights'), icon: Activity },
      ]
    },
    {
      group: null,
      items: [
        { href: "/settings", label: t('settings'), icon: Settings },
      ]
    }
  ], [t]);
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
      try {
        const u = JSON.parse(userStr);
        if (u && typeof u === 'object') {
          setUser(u);
        }
      } catch (e) {
        console.error("Layout: Failed to parse user data", e);
      }
    }
  }, [router]);

  // Define permissions mapping
  const rolePermissions = {
    OWNER: ["/dashboard", "/orders", "/orders-list", "/menu", "/expenses", "/reports", "/analytics", "/shift", "/settings", "/kitchen", "/recipes", "/cashier-report", "/ingredients", "/purchase", "/stock", "/hpp-calculator", "/promotions"],
    MANAGER: ["/dashboard", "/orders", "/orders-list", "/menu", "/reports", "/analytics", "/shift", "/kitchen", "/recipes", "/cashier-report", "/ingredients", "/hpp-calculator", "/purchase", "/stock", "/promotions"],
    CASHIER: ["/orders", "/orders-list", "/cashier-report", "/shift"],
    KITCHEN: ["/kitchen", "/orders-list", "/menu", "/ingredients"]
  };

  const filteredNavGroups = React.useMemo(() => {
    if (!mounted || !user) return [];
    const role = user.role || "";
    const allowedPaths = rolePermissions[role] || [];
    
    return navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        return allowedPaths.some(path => item.href.startsWith(path));
      })
    })).filter(group => group.items.length > 0);
  }, [mounted, user]);

  // Auto-exit Focus Mode if navigating away from the POS page
  useEffect(() => {
    if (pathname !== "/orders") {
      setIsFocusMode(false);
    }
  }, [pathname, setIsFocusMode]);

  const handleLogout = async () => {
    try {
      if (user?.id) { // Optional chaining for user.id
        // Only attempt to check shift if authenticated
        try {
          const shift = await api.get(`/shifts/current/${user.id}`);
          if (shift) {
            error("Active Shift Detected: You must stop your shift and reconcile cash before logging out.");
            return;
          }
        } catch (apiErr) {
          // If 401 occurs here, just proceed with logout
          console.warn("Auth check failed during logout, proceeding anyway", apiErr);
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
            isCollapsed ? "lg:w-20" : "lg:w-72 shadow-xl lg:shadow-none"
          )}
        >
          <div className={cn("h-24 flex items-center border-b border-slate-100 px-6", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && (
              <div className="flex items-center gap-3 animate-fade-in py-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-100 shadow-md shrink-0 ring-4 ring-emerald-50/50">
                  <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">Bakmie You-Tje</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">(powered by Bakung Studio)</span>
                  <span className="text-[8px] font-black text-emerald-600 mt-0.5">v2.1</span>
                </div>
              </div>
            )}
            {isCollapsed && (
               <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-100 shadow-md shrink-0 ring-4 ring-emerald-50/50 animate-fade-in">
                 <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-cover" />
               </div>
            )}
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100/50 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-8 overflow-y-auto scrollbar-hide py-8">
            {!mounted ? (
              <div className="space-y-4 px-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : filteredNavGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2">
                {group.group && !isCollapsed && (
                  <div className="px-4 py-1 text-[10px] font-semibold text-slate-400 tracking-tight">
                    {group.group}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={cn(
                          "flex items-center rounded-2xl text-sm font-bold transition-all duration-300 group relative",
                          isCollapsed ? "justify-center px-2 py-3.5" : "px-4 py-3.5",
                          isActive
                            ? "bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100/50"
                            : "text-slate-500 hover:bg-slate-50 hover:text-emerald-700 font-medium"
                        )}
                        title={isCollapsed ? item.label : ""}
                      >
                        <Icon className={cn("w-5 h-5 flex-shrink-0 transition-all duration-300", !isCollapsed && "mr-3", isActive ? "text-emerald-700" : "text-slate-400 group-hover:text-emerald-600")} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                        {isActive && !isCollapsed && (
                           <div className="absolute left-0 w-1.5 h-6 bg-emerald-800 rounded-r-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 mt-auto">

            
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center w-full rounded-2xl text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 tracking-tight",
                isCollapsed ? "justify-center px-2 py-4" : "px-5 py-4"
              )}
              title={isCollapsed ? "Logout" : ""}
            >
              <LogOut className={cn("w-4 h-4 flex-shrink-0", !isCollapsed && "mr-3")} />
              {!isCollapsed && t('logout')}
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
          <header className="h-16 lg:h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 lg:px-10 z-10 shrink-0 sticky top-0">
            <div className="flex items-center gap-4 lg:gap-6">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2.5 rounded-xl bg-slate-50 text-slate-600 active:scale-90 transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block p-2.5 -ml-2.5 rounded-2xl hover:bg-slate-50 text-slate-500 transition-all active:scale-90 border border-transparent hover:border-slate-100 shadow-sm"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="lg:hidden w-8 h-8 rounded-lg overflow-hidden border border-slate-100 shadow-sm shrink-0">
                  <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-sm lg:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="hidden sm:inline">{navGroups.flatMap(g => g.items).find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}</span>
                  <span className="sm:hidden text-xs">{navGroups.flatMap(g => g.items).find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}</span>
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full shadow-[0_0_8px_rgba(5,150,105,0.4)]" />
                </h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-6">
              <div className="hidden sm:block">
                <StopShiftButton />
              </div>
              {pathname === "/orders" && (
                <button
                  onClick={() => setIsFocusMode(true)} 
                  className="p-2.5 lg:p-3 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl lg:rounded-2xl transition-all active:scale-95 border border-transparent hover:border-emerald-100 shadow-sm"
                  title="Enter Focus Mode"
                >
                   <Maximize2 className="w-5 h-5" />
                </button>
              )}
              <div className="h-6 lg:h-8 w-px bg-slate-100 mx-0.5 lg:mx-1" />
              <UserMenu />
            </div>
          </header>
        )}

        {/* Page Content */}
        <div className={cn("flex-1 overflow-auto bg-slate-50/30", !isFocusMode && "p-3 lg:p-10 pb-24 lg:pb-10")}>
          <div className="max-w-[1600px] mx-auto animate-fade-in relative">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation (Visible on mobile/tablet) */}
        {!isFocusMode && (
          <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90vw] h-16 bg-white/90 backdrop-blur-xl border border-slate-100 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-around px-4 z-40">
            {[
              { href: "/dashboard", label: "Home", icon: LayoutDashboard },
              { href: "/orders", label: "Sales", icon: ShoppingCart },
              { href: "/orders-list", label: "Orders", icon: ClipboardList },
              { href: "/kitchen", label: "Kitchen", icon: Utensils },
              { href: "/settings", label: "Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 transition-all",
                    isActive ? "text-emerald-600 scale-110" : "text-slate-400"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                  {isActive && <div className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />}
                </Link>
              );
            })}
          </div>
        )}
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
