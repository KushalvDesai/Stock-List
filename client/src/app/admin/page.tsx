"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, LogOut, RefreshCw, Home, Users, Terminal, Activity } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { NotificationDropdown } from "@/components/notification-dropdown";

interface BannedIp {
  ip: string;
  expiresAt: string;
}


export default function AdminDashboard() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const toast = useToasts();
  const [bannedIps, setBannedIps] = useState<BannedIp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBannedIps = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/admin/banned-ips");
      setBannedIps(res.data);
    } catch (error) {
      console.error("Failed to fetch banned IPs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBannedIps();
    // Poll every 120 seconds
    const interval = setInterval(() => {
      fetchBannedIps();
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleUnban = async (ip: string) => {
    try {
      await api.post("/admin/unban", { ip });
      setBannedIps(prev => prev.filter(item => item.ip !== ip));
      toast.success(`Successfully unbanned IP: ${ip}`);
    } catch (error) {
      console.error("Failed to unban IP:", error);
      toast.error("Failed to unban IP");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="w-full h-full flex flex-col font-mono">
        {/* Top Navbar */}
        <header className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] border-b border-current sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-none">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-current tracking-tight">Security Dashboard</h1>
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

        <div className="w-full max-w-6xl mx-auto px-8 lg:px-12 pt-8 space-y-8">
          <div className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] shadow-none border border-current rounded-none p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-current flex items-center gap-2">
                  <ShieldAlert className="text-red-500" />
                  Rate-Limited IP Addresses
                </h2>
                <p className="text-sm text-current font-medium mt-1">Manage IP blocks triggered by failed logins</p>
              </div>
              <button
                onClick={fetchBannedIps}
                className="p-2 rounded-none hover:bg-transparent text-current transition-none"
                title="Refresh"
              >
                <RefreshCw size={20} className={isLoading ? "" : ""} />
              </button>
            </div>

            {isLoading && bannedIps.length === 0 ? (
              <div className="text-center py-12 text-current">Loading data...</div>
            ) : bannedIps.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-none bg-green-100 flex items-center justify-center">
                  <ShieldCheck size={32} className="text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-current">All Clear</p>
                  <p className="text-current text-sm">No IP addresses are currently rate-limited.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-none border border-current">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-transparent border-b border-current">
                      <th className="py-4 px-6 font-semibold text-current text-sm uppercase tracking-wider">IP Address</th>
                      <th className="py-4 px-6 font-semibold text-current text-sm uppercase tracking-wider">Ban Expires</th>
                      <th className="py-4 px-6 font-semibold text-current text-sm uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] divide-y divide-gray-100">
                    {bannedIps.map((banned) => {
                      const expiryDate = new Date(banned.expiresAt);
                      return (
                        <tr
                          key={banned.ip}
                          className="hover:bg-transparent transition-none"
                        >
                          <td className="py-4 px-6 text-current font-medium">
                            {banned.ip}
                          </td>
                          <td className="py-4 px-6 text-current">
                            {expiryDate.toLocaleTimeString()} ({Math.ceil((expiryDate.getTime() - Date.now()) / 60000)} mins left)
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleUnban(banned.ip)}
                              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-none transition-none"
                            >
                              Unban IP
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
