"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Package, PlusCircle, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function StaffDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 text-gray-800 font-sans">
      <nav className="flex justify-between items-center mb-12 max-w-5xl mx-auto bg-white/70 backdrop-blur-md shadow-sm px-6 py-4 rounded-2xl border border-white/20">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Staff Portal
          </h1>
          <p className="text-sm text-gray-500 font-medium">Welcome back, {user?.username || 'Staff'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </nav>

      <main className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 justify-center items-stretch mt-20">
        <Link href="/staff/view-stock" className="flex-1 group">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-full bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-10 flex flex-col items-center justify-center gap-6 cursor-pointer hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Package size={48} className="text-indigo-600" />
            </div>
            <div className="text-center relative z-10">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">View Stock</h2>
              <p className="text-gray-500">Browse and search the current inventory in the warehouse.</p>
            </div>
          </motion.div>
        </Link>

        <Link href="/staff/add-stock" className="flex-1 group">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="h-full bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-10 flex flex-col items-center justify-center gap-6 cursor-pointer hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <PlusCircle size={48} className="text-purple-600" />
            </div>
            <div className="text-center relative z-10">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Add Stock</h2>
              <p className="text-gray-500">Upload new stock entries and record inventory details.</p>
            </div>
          </motion.div>
        </Link>
      </main>
    </div>
  );
}
