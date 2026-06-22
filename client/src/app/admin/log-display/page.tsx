"use client";

import React, { useEffect, useState, useRef } from "react";
import { LogOut, Home, Users, Terminal, RefreshCw, Trash2, Activity } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { NotificationDropdown } from "@/components/notification-dropdown";


export default function LogsPage() {
  const { logout } = useAuthStore();
  const router = useRouter();
  
  const [logs, setLogs] = useState<{ server: string, client: string }>({ server: '', client: '' });
  const [activeTab, setActiveTab] = useState<'server' | 'client'>('server');
  
  const scrollRef = useRef<HTMLPreElement>(null);

  const stripAnsi = (str: string) => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get("/admin/logs");
      setLogs(res.data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, activeTab]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="w-full h-full flex flex-col font-mono">
        {/* Top Navbar */}
        <header className="bg-yellow-50/80 dark:bg-black/80 backdrop-blur-md border-4 border-current shadow-[4px_4px_0_0_currentColor] border-b border-current shrink-0 px-6 py-4 flex justify-between items-center shadow-none sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-current tracking-tight">System Logs</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-current hover:text-current transition-none"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-8 lg:px-12 py-8">
          <div className="bg-black shadow-none rounded-none flex flex-col overflow-hidden border border-current h-[600px]">
            {/* Terminal Header */}
            <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-6">
                <span className="font-bold text-white text-sm tracking-wide">Console</span>
                <div className="flex gap-2 border-l border-slate-600 pl-6">
                  <button 
                    onClick={() => setActiveTab('server')}
                    className={`px-3 py-1 rounded-none text-xs font-semibold uppercase tracking-wider transition-none ${activeTab === 'server' ? 'bg-slate-600 text-white' : 'text-slate-700 hover:bg-slate-700 hover:text-white'}`}
                  >
                    Server
                  </button>
                  <button 
                    onClick={() => setActiveTab('client')}
                    className={`px-3 py-1 rounded-none text-xs font-semibold uppercase tracking-wider transition-none ${activeTab === 'client' ? 'bg-slate-600 text-white' : 'text-slate-700 hover:bg-slate-700 hover:text-white'}`}
                  >
                    Client
                  </button>
                </div>
              </div>
            </div>

            {/* Terminal Window */}
            <pre 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed text-white whitespace-pre-wrap focus:outline-none"
              style={{ fontFamily: "'Consolas', 'Courier New', Courier, monospace" }}
            >
              {logs[activeTab] ? stripAnsi(logs[activeTab]) : "Waiting for logs..."}
            </pre>
          </div>
        </div>
      </div>
  );
}
