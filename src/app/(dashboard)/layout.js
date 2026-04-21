"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, ShoppingCart, Utensils, DollarSign, BarChart, LogOut, Settings, Activity, Calendar, ClipboardList, Menu, X, Wallet, Smartphone, Users, Clock, Maximize2, Minimize2, RefreshCw, Sun, Moon, ShieldCheck, Sparkles } from "lucide-react";
import { setAuth, api, decodeAndValidateJwt } from "../../lib/api";
import { useRouter } from "next/navigation";
import { cn } from "../../lib/utils";
import UserMenu from "../../components/UserMenu";
import StopShiftButton from "../../components/StopShiftButton";
import GeminiChat from "../../components/dashboard/GeminiChat";
import { FocusModeProvider, useFocusMode } from "../../lib/focus-mode-context";
import { DarkModeProvider, useDarkMode } from "../../lib/dark-mode-context";
import StoreStatusBadge from "../../components/StoreStatusBadge";
import { useToast } from "../../components/ui/use-toast";
import { useTranslation } from "../../lib/language-context";
import { Skeleton } from "../../components/ui/skeleton";

export function DashboardContent({ children }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [aiContext, setAiContext] = useState(null);

  useEffect(() => {
    const fetchAiContext = async () => {
      try {
        const res = await api.get("/dashboard/insights");
        setAiContext(res.summary);
      } catch (err) {
        console.error("AI Context Sync Failed", err);
      }
    };
    fetchAiContext();
    const interval = setInterval(fetchAiContext, 300000); // Sync every 5 mins
    return () => clearInterval(interval);
  }, []);

  const navGroups = useMemo(() => [
    {
      group: null,
      items: [
        { href: "/dashboard", label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: "/assistant", label: "Tje Strategic Assistant", icon: Sparkles },
      ]
    },
    {
      group: t('nav.pos'),
      items: [
        { href: "/orders", label: t('nav.pos'), icon: ShoppingCart },
        { href: "/order-history", label: t('nav.orders'), icon: ClipboardList },
        { href: "/daily-shift", label: t('nav.shift'), icon: Clock },
      ]
    },
    {
      group: t('nav.kitchen'),
      items: [
        { href: "/products", label: t('nav.products'), icon: Utensils },
        { href: "/recipes", label: t('nav.recipes'), icon: ClipboardList },
        { href: "/kitchen", label: t('nav.kitchen'), icon: Utensils },
      ]
    },
    {
      group: t('nav.stock'),
      items: [
        { href: "/raw-materials", label: t('nav.vault'), icon: ClipboardList },
        { href: "/add-stock", label: t('nav.add_stock'), icon: ShoppingCart },
        { href: "/stock-room", label: t('nav.stock'), icon: Activity },
      ]
    },
    {
      group: t('nav.finance') || "Finance",
      items: [
        { href: "/promotions", label: t('nav.promotions'), icon: Utensils },
        { href: "/expenses", label: t('nav.expenses'), icon: DollarSign },
        { href: "/finance", label: t('nav.finance') || "Finance", icon: Wallet },
      ]
    },
    {
      group: t('nav.reports'),
      items: [
        { href: "/sales-reports", label: t('nav.sales_reports'), icon: BarChart },
        { href: "/cashier-logs", label: t('nav.cashier_logs'), icon: ClipboardList },
        { href: "/sales-insights", label: t('nav.sales_insights'), icon: Activity },
        { href: "/audit-logs", label: t('nav.audit_logs'), icon: ShieldCheck },
      ]
    },
    {
      group: null,
      items: [
        { href: "/settings", label: t('nav.settings'), icon: Settings },
        { href: "/settings/operational", label: t('nav.store_status'), icon: Clock },
      ]
    }
  ], [t]);
  const { error } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isFocusMode, setIsFocusMode } = useFocusMode();
  const constraintsRef = React.useRef(null);

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !decodeAndValidateJwt(token)) {
      setAuth(null, null); // Clear corrupted/expired state
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

  // Define permissions mapping based on strict hierarchy
  const rolePermissions = {
    OWNER: ["/dashboard", "/assistant", "/orders", "/order-history", "/products", "/expenses", "/finance", "/sales-reports", "/sales-insights", "/daily-shift", "/settings", "/kitchen", "/recipes", "/cashier-logs", "/raw-materials", "/add-stock", "/stock-room", "/promotions", "/settings/operational", "/audit-logs"],
    ADMIN: ["/dashboard", "/assistant", "/orders", "/order-history", "/products", "/expenses", "/finance", "/sales-reports", "/sales-insights", "/daily-shift", "/kitchen", "/recipes", "/cashier-logs", "/raw-materials", "/add-stock", "/stock-room", "/promotions", "/settings/operational", "/audit-logs"],
    MANAGER: ["/dashboard", "/assistant", "/orders", "/order-history", "/products", "/expenses", "/finance", "/sales-reports", "/sales-insights", "/daily-shift", "/kitchen", "/recipes", "/cashier-logs", "/raw-materials", "/add-stock", "/stock-room", "/promotions", "/settings/operational", "/audit-logs"],
    CASHIER: ["/orders", "/order-history", "/daily-shift", "/cashier-logs"],
    WAITER: ["/orders", "/order-history"],
    KITCHEN: ["/kitchen", "/order-history", "/products", "/raw-materials"],
    STAFF: ["/dashboard", "/order-history"]
  };

  // Route Guard: Redirect if unauthorized
  useEffect(() => {
    if (!mounted || !user) return;
    
    const role = user.role || "STAFF";
    const allowedPaths = rolePermissions[role] || [];
    
    // Check if current path (or prefix) is allowed
    const isAllowed = allowedPaths.some(path => pathname === path || pathname.startsWith(path + "/"));
    
    // Root dashboard is exception or should be in allowedPaths
    if (!isAllowed && pathname !== "/login" && pathname !== "/403") {
      console.warn(`Route Guard: Access Denied for role ${role} to ${pathname}`);
      router.push("/dashboard"); // Redirect to safe default
    }
  }, [mounted, user, pathname, router]);

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
  }, [mounted, user, navGroups]);

  // Auto-exit Focus Mode if navigating away from the POS page
  useEffect(() => {
    if (pathname !== "/orders") {
      setIsFocusMode(false);
    }
  }, [pathname, setIsFocusMode]);

  const handleLogout = async () => {
    try {
      if (user?.id) {
        try {
          const shift = await api.get(`/shifts/current?userId=${user.id}`);
          if (shift) {
            error("Active Shift Detected: You must stop your shift and reconcile cash before logging out.");
            return;
          }
          // Log logout activity
          await api.post('/auth/logout');
        } catch (apiErr) {
          console.warn("Audit/Shift check failed during logout, proceeding anyway", apiErr);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setAuth(null, null);
    router.push("/login");
  };

  const { isDark, toggleDark } = useDarkMode();

  if (!mounted) {
    return (
      <div className={cn("flex h-screen overflow-hidden", isDark ? "bg-[#0d1117]" : "bg-slate-50/50")}>
        {/* Sidebar Skeleton */}
        <aside className={cn("hidden lg:flex w-72 flex-col border-r p-6 space-y-8", isDark ? "bg-[#111820] border-white/5" : "bg-white border-slate-100")}>
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="space-y-4 pt-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded-lg" />
                <Skeleton className="h-4 flex-1 rounded-lg" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className={cn("h-20 border-b flex items-center justify-between px-10", isDark ? "bg-[#111820]/90 border-white/5" : "bg-white/80 border-slate-100")}>
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-2xl" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-32 rounded-2xl" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </header>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-3xl" />
              ))}
            </div>
            <Skeleton className="h-[400px] w-full rounded-[2.5rem]" />
          </div>
        </main>
      </div>
    );
  }

  const token = localStorage.getItem("token");
  if (!token) return null;

  return (
    <div className={cn("flex h-screen font-sans overflow-hidden antialiased transition-colors duration-300", isDark ? "bg-[#0d1117]" : "bg-slate-50/50")}>
      {isSidebarOpen && !isFocusMode && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {!isFocusMode && (
        <aside
          className={cn(
            "fixed lg:static inset-y-0 left-0 glass-sidebar flex flex-col z-30 transition-all duration-300 ease-in-out print:hidden",
            isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
            isCollapsed ? "lg:w-20" : "lg:w-72 shadow-xl lg:shadow-none"
          )}
        >
          <div className={cn("h-24 flex items-center border-b px-6 transition-colors duration-300", isCollapsed ? "justify-center" : "justify-between", isDark ? "border-[rgba(255,255,255,0.05)]" : "border-slate-100")}>
            {!isCollapsed && (
              <div className="flex items-center gap-3 animate-fade-in py-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-100 shadow-md shrink-0 ring-4 ring-emerald-50/50">
                  <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn("text-[10px] font-black uppercase tracking-tight truncate", isDark ? "text-slate-100" : "text-slate-900")}>Bakmie You-Tje</span>
                  <span className={cn("text-[8px] font-bold uppercase tracking-widest truncate", isDark ? "text-slate-500" : "text-slate-400")}>(powered by Bakung Studio)</span>
                  <span className={cn("text-[8px] font-black mt-0.5", isDark ? "text-emerald-400" : "text-emerald-600")}>v4.1</span>
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-100 shadow-md shrink-0 ring-4 ring-emerald-50/50 animate-fade-in">
                <img src="/favicon-96x96.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-8 overflow-y-auto scrollbar-hide py-8">
            {filteredNavGroups.map((group, gIdx) => (
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
                            ? isDark
                              ? "bg-emerald-900/30 text-emerald-400 shadow-sm border border-emerald-500/20"
                              : "bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100/50"
                            : isDark
                              ? "text-slate-400 hover:bg-[#1a2820]/60 hover:text-emerald-400 font-medium"
                              : "text-slate-500 hover:bg-slate-50 hover:text-emerald-700 font-medium"
                        )}
                        title={isCollapsed ? item.label : ""}
                      >
                        <Icon className={cn(
                          "w-5 h-5 flex-shrink-0 transition-all duration-300", 
                          !isCollapsed && "mr-3", 
                          isActive 
                            ? (isDark ? "text-emerald-400" : "text-emerald-700")
                            : (isDark ? "text-slate-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-600")
                        )} />
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

          <div className={cn("p-4 border-t mt-auto transition-colors duration-300", isDark ? "border-[rgba(255,255,255,0.05)]" : "border-slate-100")}>
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center w-full rounded-2xl text-xs font-semibold transition-all duration-300 tracking-tight",
                isDark ? "text-slate-500 hover:bg-rose-900/30 hover:text-rose-400" : "text-slate-400 hover:bg-rose-50 hover:text-rose-600",
                isCollapsed ? "justify-center px-2 py-4" : "px-5 py-4"
              )}
            >
              <LogOut className={cn("w-4 h-4 flex-shrink-0", !isCollapsed && "mr-3")} />
              {!isCollapsed && t('nav.logout')}
            </button>
          </div>
        </aside>
      )}

      <main ref={constraintsRef} className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {isFocusMode && (
          <motion.button 
            drag
            dragConstraints={constraintsRef}
            dragElastic={0.1}
            onClick={() => setIsFocusMode(false)}
            whileHover={{ scale: 1.1, backgroundColor: "rgba(15, 23, 42, 0.8)" }}
            className="fixed bottom-8 right-8 z-[100] w-10 h-10 bg-slate-900/40 backdrop-blur-md text-white border border-white/20 rounded-full flex items-center justify-center shadow-2xl transition-shadow group cursor-move"
          >
            <Minimize2 className="w-4 h-4" />
          </motion.button>
        )}

        {!isFocusMode && (
          <header className={cn(
            "h-16 lg:h-20 backdrop-blur-md border-b flex items-center justify-between px-4 lg:px-10 z-10 shrink-0 sticky top-0 print:hidden transition-colors duration-300",
            isDark ? "bg-[#111820]/90 border-[rgba(255,255,255,0.05)]" : "bg-white/80 border-slate-100"
          )}>
            <div className="flex items-center gap-4 lg:gap-6">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 rounded-xl bg-slate-50 text-slate-600"><Menu className="w-5 h-5" /></button>
              <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:block p-2.5 -ml-2.5 rounded-2xl hover:bg-slate-50 text-slate-500 border border-transparent hover:border-slate-100 shadow-sm"><Menu className="w-5 h-5" /></button>
              <div className="flex items-center gap-2">
                <div className="flex lg:hidden w-8 h-8 rounded-lg overflow-hidden border border-slate-100 shadow-sm shrink-0 items-center justify-center bg-emerald-50">
                  <img src="/favicon-96x96.png" alt="Logo" className="w-5 h-5 object-contain" />
                </div>
                <h2 className={cn("flex text-sm lg:text-xl font-black tracking-tight items-center gap-2", isDark ? "text-slate-100" : "text-slate-900")}>
                  <span className="inline">{navGroups.flatMap(g => g.items).find((n) => pathname.startsWith(n.href))?.label || "Bakmie You-Tje"}</span>
                  <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                </h2>
              </div>
            </div>

            <div className="flex items-center space-x-2 lg:space-x-4">
              <StopShiftButton mode="header" />
              <StoreStatusBadge />
              <div className="h-6 lg:h-8 w-px bg-slate-100 mx-0.5 lg:mx-1" />
              <UserMenu />
            </div>
          </header>
        )}

        <div className={cn("flex-1 overflow-auto transition-colors duration-300", isDark ? "bg-[#0d1117]" : "bg-slate-50/30", !isFocusMode && "p-3 lg:p-6 pb-24 lg:pb-6")}>
          <div className="max-w-[1800px] mx-auto animate-fade-in relative">
            {children}
          </div>
        </div>

        {!isFocusMode && (
          <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92vw] h-20 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-[2.5rem] shadow-xl flex items-center justify-around px-4 z-40 print:hidden">
            {[
              { href: "/dashboard", label: t('nav.dashboard'), icon: LayoutDashboard },
              { href: "/orders", label: t('nav.pos'), icon: ShoppingCart },
              { href: "/order-history", label: t('nav.orders'), icon: ClipboardList },
              { href: "/kitchen", label: t('nav.kitchen'), icon: Utensils },
              { href: "/settings", label: t('nav.settings'), icon: Settings },
            ].filter(item => {
              if (!user) return false;
              const allowedPaths = rolePermissions[user.role] || [];
              return allowedPaths.some(path => item.href.startsWith(path));
            }).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("flex flex-col items-center gap-1 transition-all", isActive ? "text-emerald-600 scale-110" : "text-slate-400")}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-[0.1em]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
        <GeminiChat contextData={aiContext} />
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <DarkModeProvider>
      <FocusModeProvider>
        <DashboardContent>{children}</DashboardContent>
      </FocusModeProvider>
    </DarkModeProvider>
  );
}
