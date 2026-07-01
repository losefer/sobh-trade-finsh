import React from "react";
import { Link, useLocation } from "wouter";
import { Users, CalendarDays, ReceiptText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "مركز العمليات", icon: CalendarDays },
    { href: "/summary", label: "كشف الرواتب", icon: ReceiptText },
    { href: "/employees", label: "إدارة الكوادر", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans relative overflow-hidden bg-grid-pattern">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      
      <aside className="w-full md:w-72 bg-sidebar/80 backdrop-blur-xl border-l border-white/5 flex-shrink-0 flex flex-col z-20 shadow-2xl">
        <div className="p-8 flex flex-col items-center border-b border-white/5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-700 flex items-center justify-center shadow-lg shadow-primary/20 mb-4 transform hover:scale-105 transition-transform">
            <ShieldCheck className="w-8 h-8 text-background" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight text-center">صبح للتجارة العامة</h1>
          <p className="text-primary font-medium text-sm mt-2 uppercase tracking-widest">مركز القيادة والتحكم</p>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div className="relative">
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl transition-all duration-300" />
                  )}
                  <div
                    className={cn(
                      "relative flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 cursor-pointer z-10",
                      isActive
                        ? "text-primary font-bold shadow-sm"
                        : "text-sidebar-foreground/70 hover:text-white hover:bg-white/5 font-medium"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-sidebar-foreground/50")} />
                    <span className="text-lg">{item.label}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 mt-auto border-t border-white/5">
          <div className="flex items-center gap-3 text-sm text-sidebar-foreground/50 bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            النظام متصل ومؤمن
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-10 relative z-10 scroll-smooth">
        <div className="max-w-7xl mx-auto page-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
