"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Package, PlusCircle, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { NotificationDropdown } from "@/components/notification-dropdown";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/axios";

export default function StaffDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [factory, setFactory] = useState<any>(null);

  useEffect(() => {
    const fetchFactory = async () => {
      try {
        const res = await api.get('/company/my-factory');
        setFactory(res.data);
      } catch (error) {
        console.error('Error fetching factory:', error);
      }
    };
    fetchFactory();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-gray-800 font-sans">
      <nav className="flex justify-between items-center mb-8 max-w-5xl mx-auto bg-white shadow-sm px-6 py-4 rounded-md border border-gray-200 relative z-50">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Staff Portal
            {factory && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                {factory.name}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Welcome back, {user?.username || 'Staff'}</p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationDropdown />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-gray-200 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 justify-center items-stretch mt-12">
        <Link href="/staff/view-stock" className="flex-1 group">
          <div className="h-full bg-white border border-gray-200 shadow-sm rounded-md p-10 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">
            <div className="w-16 h-16 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors duration-200">
              <Package size={32} className="text-indigo-600" />
            </div>
            <div className="text-center relative z-10">
              <h2 className="text-xl font-bold text-gray-800 mb-2">View Stock</h2>
              <p className="text-gray-500">Browse and search the current inventory in the warehouse.</p>
            </div>
          </div>
        </Link>

        <Link href="/staff/add-stock" className="flex-1 group">
          <div className="h-full bg-white border border-gray-200 shadow-sm rounded-md p-10 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">
            <div className="w-16 h-16 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors duration-200">
              <PlusCircle size={32} className="text-indigo-600" />
            </div>
            <div className="text-center relative z-10">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Add Stock</h2>
              <p className="text-gray-500">Upload new stock entries and record inventory details.</p>
            </div>
          </div>
        </Link>
      </main>
    </div>
  );
}
