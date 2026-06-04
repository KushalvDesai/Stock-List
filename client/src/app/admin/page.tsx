"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, LogOut, RefreshCw, Home, Users, Terminal } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { AppSidebar, SidebarLink } from "@/components/app-sidebar";

interface BannedIp {
  ip: string;
  expiresAt: string;
}

const ADMIN_LINKS: SidebarLink[] = [
  { href: "/admin", label: "Security Dashboard", icon: Home },
  { href: "/admin/user-management", label: "User Management", icon: Users },
  { href: "/admin/log-display", label: "System Logs", icon: Terminal },
];

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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
      <AppSidebar title="Admin Panel" links={ADMIN_LINKS} />

      <div className="flex-1 flex flex-col min-w-0 ml-20 pb-12">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Security Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        <div className="w-full max-w-6xl mx-auto px-8 lg:px-12 pt-8 space-y-8">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <ShieldAlert className="text-red-500" />
                  Rate-Limited IP Addresses
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Manage IP blocks triggered by failed logins</p>
              </div>
              <button
                onClick={fetchBannedIps}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {isLoading && bannedIps.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Loading data...</div>
            ) : bannedIps.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <ShieldCheck size={32} className="text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-700">All Clear</p>
                  <p className="text-gray-500 text-sm">No IP addresses are currently rate-limited.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-4 px-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">IP Address</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">Ban Expires</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-sm uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {bannedIps.map((banned) => {
                      const expiryDate = new Date(banned.expiresAt);
                      return (
                        <motion.tr
                          key={banned.ip}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-6 text-gray-800 font-medium">
                            {banned.ip}
                          </td>
                          <td className="py-4 px-6 text-gray-500">
                            {expiryDate.toLocaleTimeString()} ({Math.ceil((expiryDate.getTime() - Date.now()) / 60000)} mins left)
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleUnban(banned.ip)}
                              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                              Unban IP
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
