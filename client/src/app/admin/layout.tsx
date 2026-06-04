"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar, SidebarLink } from "@/components/admin-sidebar";
import { Home, Users, Terminal, Activity, Moon, Sun } from "lucide-react";

const ADMIN_LINKS: SidebarLink[] = [
  { href: "/admin", label: "Security Dashboard", icon: Home },
  { href: "/admin/user-management", label: "User Management", icon: Users },
  { href: "/admin/log-display", label: "System Logs", icon: Terminal },
  { href: "/admin/telemetry", label: "Telemetry", icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [isDark]);

  return (
    <div className={`min-h-screen font-mono flex transition-none ${isDark ? 'bg-black text-green-500' : 'bg-yellow-50 text-indigo-900'}`}>
      <AdminSidebar title="Admin Panel" links={ADMIN_LINKS} />
      <div className="flex-1 flex flex-col min-w-0 ml-20 pb-12 relative">
        <button 
          onClick={() => setIsDark(!isDark)}
          className={`fixed bottom-8 right-8 z-50 p-3 rounded-none border-4 transition-none font-bold shadow-[6px_6px_0_0_currentColor] active:shadow-none active:translate-y-1.5 active:translate-x-1.5 ${isDark ? 'border-green-500 text-green-500 hover:bg-green-500 hover:text-black bg-black' : 'border-indigo-900 text-indigo-900 hover:bg-indigo-900 hover:text-yellow-50 bg-yellow-50'}`}
          title="Toggle Theme"
        >
          {isDark ? <Sun size={24} /> : <Moon size={24} />}
        </button>
        {children}
      </div>
    </div>
  );
}
