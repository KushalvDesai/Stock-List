"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios";
import { Search, Package, Filter, MoreVertical, CheckCircle2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StockEntry {
  id: string;
  inv: string | null;
  invNo: number | null;
  grade: string | null;
  totalBags: number | null;
  bagWt: number | null;
  netWt: number | null;
  dop: string | null;
  soldRate: number | null;
  auction: boolean | null;
  factory?: { name: string } | null;
  mark?: { name: string } | null;
}

export default function MobileInventoryPage() {
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'sold'>('available');

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    const fetchStock = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = localStorage.getItem('offline_inventory');
        if (cached) setStockData(JSON.parse(cached));
        setIsLoading(false);
        return;
      }
      try {
        const response = await api.get("/stock");
        setStockData(response.data);
        localStorage.setItem('offline_inventory', JSON.stringify(response.data));
      } catch (error) {
        console.error("Failed to fetch stock:", error);
        const cached = localStorage.getItem('offline_inventory');
        if (cached) setStockData(JSON.parse(cached));
      } finally {
        setIsLoading(false);
      }
    };
    fetchStock();
  }, []);

  const filteredStock = useMemo(() => {
    return stockData.filter(item => {
      // Tab filter
      if (activeTab === 'available' && item.soldRate !== null) return false;
      if (activeTab === 'sold' && item.soldRate === null) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const mark = item.mark?.name?.toLowerCase() || "";
        const inv = item.inv?.toLowerCase() || "";
        const factory = item.factory?.name?.toLowerCase() || "";
        if (!mark.includes(query) && !inv.includes(query) && !factory.includes(query)) return false;
      }
      return true;
    });
  }, [stockData, activeTab, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Sticky Header & Search */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-4 py-3 space-y-3 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search marks, factories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {(['available', 'sold', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {isOffline && (
        <div className="bg-amber-100 text-amber-800 text-[10px] font-bold text-center py-1 uppercase tracking-wider">
          Offline Mode - Showing Cached Data
        </div>
      )}

      {/* List Content */}
      <div className="p-4 space-y-3 pb-8">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Package size={48} className="text-gray-300" />
            <p className="text-gray-500 font-medium">No inventory found</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredStock.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{item.mark?.name || "Unknown Mark"}</h3>
                    <p className="text-[11px] text-gray-500">{item.factory?.name || "Unknown Factory"}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    {item.soldRate !== null ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        <CheckCircle2 size={10} strokeWidth={3} /> Sold
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        <Clock size={10} strokeWidth={3} /> Stock
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mb-0.5">Grade</p>
                    <p className="text-xs font-bold text-gray-900">{item.grade || "-"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mb-0.5">Bags</p>
                    <p className="text-xs font-bold text-gray-900">{item.totalBags || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mb-0.5">Net Wt</p>
                    <p className="text-xs font-bold text-gray-900">{item.netWt?.toFixed(1) || "0.0"} kg</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
