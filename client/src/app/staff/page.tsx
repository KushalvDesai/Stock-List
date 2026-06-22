"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Package, PlusCircle, LogOut, Check } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { NotificationDropdown } from "@/components/notification-dropdown";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import { useNotificationStore } from "@/store/notificationStore";

export default function StaffDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [factories, setFactories] = useState<any[]>([]);
  const { notifications, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    const fetchFactories = async () => {
      try {
        const res = await api.get('/company/my-factory');
        setFactories(res.data || []);
      } catch (error) {
        console.error('Error fetching factories:', error);
      }
    };
    fetchFactories();
    fetchNotifications();
  }, [fetchNotifications]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const dispatchAdviceNotifs = notifications.filter(n => n.title === 'Dispatch Advice Needed');

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-gray-800 font-sans flex flex-col">
      <nav className="flex justify-between items-center mb-8 max-w-5xl mx-auto w-full bg-white shadow-sm px-6 py-4 rounded-md border border-gray-200 relative z-50">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Staff Portal
            {factories.length > 0 && (
              <div className="flex gap-2 ml-2">
                {factories.map((f: any) => (
                  <span key={f.id} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </h1>
          <p className="text-sm text-slate-800 font-medium mt-1">Welcome back, {user?.username || 'Staff'}</p>
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

      <main className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-amber-100/50 border-b border-amber-200 px-6 py-4">
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              Notice Board: High Priority Actions
            </h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {dispatchAdviceNotifs.length === 0 ? (
                <div className="text-center py-4 text-amber-800 font-medium opacity-80">
                  No dispatch advice needed at the moment.
                </div>
              ) : (
                dispatchAdviceNotifs.map(notif => (
                  <div key={notif.id} className="bg-white p-4 rounded-md border border-amber-200 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                    <div className="flex justify-between items-start ml-2">
                      <div>
                        <h3 className="font-bold text-gray-800">{notif.title}</h3>
                        <p className="text-sm text-gray-600">{notif.message}</p>
                        <p className="text-xs text-slate-700 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch mt-4">

          <Link href="/staff/add-stock" className="flex-1 group">
            <div className="h-full bg-white border border-gray-200 shadow-sm rounded-md p-10 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">
              <div className="w-16 h-16 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors duration-200">
                <PlusCircle size={32} className="text-indigo-600" />
              </div>
              <div className="text-center relative z-10">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Sample Entry</h2>
                <p className="text-slate-800 text-sm">Upload new stock entries and record inventory details.</p>
              </div>
            </div>
          </Link>

          <Link href="/staff/view-stock" className="flex-1 group">
            <div className="h-full bg-white border border-gray-200 shadow-sm rounded-md p-10 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">
              <div className="w-16 h-16 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors duration-200">
                <Package size={32} className="text-indigo-600" />
              </div>
              <div className="text-center relative z-10">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Stock List</h2>
                <p className="text-slate-800 text-sm">Browse and search the current inventory in the warehouse.</p>
              </div>
            </div>
          </Link>

          <Link href="/staff/after-sales" className="flex-1 group">
            <div className="h-full bg-white border border-gray-200 shadow-sm rounded-md p-10 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">
              <div className="w-16 h-16 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors duration-200">
                <Check size={32} className="text-emerald-600" />
              </div>
              <div className="text-center relative z-10">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Dispatch Advice</h2>
                <p className="text-slate-800 text-sm">Browse previously sold inventory items.</p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
