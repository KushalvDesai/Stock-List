"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Menu, LucideIcon } from "lucide-react";

export interface SidebarLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface AppSidebarProps {
  title: string;
  links: SidebarLink[];
}

export function AppSidebar({ title, links }: AppSidebarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "#") return false;
    return pathname === path;
  };

  return (
    <>
      {/* Backdrop for open sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-20 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col z-30`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {isSidebarOpen && <span className="font-bold text-gray-800 tracking-tight whitespace-nowrap overflow-hidden">{title}</span>}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-slate-800 hover:text-gray-900 transition-colors mx-auto"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <div className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
          {links.map((link, index) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link 
                key={index}
                href={link.href} 
                className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                title={link.label}
              >
                <Icon size={20} className="flex-shrink-0" />
                {isSidebarOpen && <span className="whitespace-nowrap overflow-hidden text-sm">{link.label}</span>}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  );
}
