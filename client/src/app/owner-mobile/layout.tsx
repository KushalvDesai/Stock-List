"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingCart, Users, Bell, LogOut } from "lucide-react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { MobileNotificationDropdown } from "@/components/mobile-notification-dropdown";

export default function MobileOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const logout = useAuthStore(state => state.logout);

  useEffect(() => {
    // Add mobile specific classes to the body
    document.body.classList.add("overscroll-none", "select-none", "touch-pan-y");

    return () => {
      document.body.classList.remove("overscroll-none", "select-none", "touch-pan-y");
    };
  }, []);

  const navItems = [
    { name: "Home", href: "/owner-mobile", icon: Home },
    { name: "Inventory", href: "/owner-mobile/inventory", icon: Package },
    { name: "Sales", href: "/owner-mobile/sales", icon: ShoppingCart },
    { name: "Staff", href: "/owner-mobile/staff", icon: Users },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      {/* Mobile Top App Bar */}
      <header className="flex-none bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-10 pt-[max(env(safe-area-inset-top),16px)] pb-3 min-h-[60px]">
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">Overview</h1>
        <div className="flex items-center gap-2">
          <MobileNotificationDropdown />
          <button 
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      {/* iOS-Style Bottom Navigation Bar */}
      <nav className="flex-none bg-white border-t border-gray-200 flex items-center justify-around pb-[max(env(safe-area-inset-bottom),16px)] pt-2 z-20 min-h-[4rem]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? "text-indigo-800 font-bold" : "text-slate-500 hover:text-slate-800"
              } transition-colors`}
            >
              <Icon size={24} className={isActive ? "fill-indigo-100 stroke-[2.5]" : "stroke-2"} />
              <span className={`text-[10px] tracking-wide ${isActive ? "font-bold" : "font-medium"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
