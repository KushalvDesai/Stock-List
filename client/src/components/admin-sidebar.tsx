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

interface AdminSidebarProps {
  title: string;
  links: SidebarLink[];
}

export function AdminSidebar({ title, links }: AdminSidebarProps) {
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
          className="fixed inset-0 bg-black/60 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} fixed left-0 top-0 bottom-0 bg-yellow-50 dark:bg-black border-r-4 border-current flex flex-col z-30 font-mono transition-none`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b-4 border-current">
          {isSidebarOpen && <span className="font-bold tracking-tight whitespace-nowrap overflow-hidden uppercase">{title}</span>}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 border-2 border-transparent hover:border-current transition-none mx-auto uppercase font-bold"
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
                className={`flex items-center gap-3 px-3 py-2 font-bold uppercase transition-none border-2 border-transparent ${active ? 'border-indigo-900 bg-indigo-900 text-yellow-50 shadow-[4px_4px_0_0_#312e81] dark:border-green-500 dark:bg-green-500 dark:text-black dark:shadow-[4px_4px_0_0_#22c55e]' : 'hover:border-current'}`}
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
