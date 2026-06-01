"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";

interface BannedIp {
  ip: string;
  expiresAt: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
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
    // Poll every 30 seconds
    const interval = setInterval(fetchBannedIps, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUnban = async (ip: string) => {
    try {
      await api.post("/admin/unban", { ip });
      setBannedIps(prev => prev.filter(item => item.ip !== ip));
    } catch (error) {
      console.error("Failed to unban IP:", error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 text-gray-800 font-sans">
      <nav className="flex justify-between items-center mb-12 max-w-5xl mx-auto bg-white/70 backdrop-blur-md shadow-sm px-6 py-4 rounded-2xl border border-white/20">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Admin Portal
          </h1>
          <p className="text-sm text-gray-500 font-medium">System Security Dashboard</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </nav>

      <main className="max-w-5xl mx-auto flex flex-col gap-8 mt-12">
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <ShieldAlert className="text-red-500" />
              Rate-Limited IP Addresses
            </h2>
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
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
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
      </main>
    </div>
  );
}
