"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios";
import { Search, Gavel, CheckCircle2, ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useToasts } from "@/components/toast";

interface StockEntry {
  id: string;
  inv: string | null;
  invNo: number | null;
  grade: string | null;
  totalBags: number | null;
  netWt: number | null;
  dop: string | null;
  auction: boolean | null;
  factory?: { name: string } | null;
  mark?: { name: string } | null;
}

export default function MobileAuctionSalePage() {
  const toast = useToasts();
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Selection & Modal
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Edit Data
  const [globalAuctionBroker, setGlobalAuctionBroker] = useState("");
  const [bulkRowData, setBulkRowData] = useState<Record<string, { soldRate: string }>>({});

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await api.get("/stock");
        setStockData(response.data);
      } catch (error) {
        console.error("Failed to fetch stock:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStock();
  }, []);

  const auctionStock = useMemo(() => {
    return stockData.filter(item => {
      if (!item.auction) return false; // Only show auction items
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const mark = item.mark?.name?.toLowerCase() || "";
        const inv = item.inv?.toLowerCase() || "";
        if (!mark.includes(query) && !inv.includes(query)) return false;
      }
      return true;
    });
  }, [stockData, searchQuery]);

  const toggleSelection = (id: string) => {
    setSelectedRowIds(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const openModal = () => {
    const initialData: Record<string, { soldRate: string }> = {};
    selectedRowIds.forEach(id => {
      initialData[id] = { soldRate: "" };
    });
    setBulkRowData(initialData);
    setGlobalAuctionBroker("");
    setIsModalOpen(true);
  };

  const submitSale = async () => {
    setIsSubmitting(true);
    try {
      const promises = selectedRowIds.map(id => {
        const rowInput = bulkRowData[id];
        const payload: any = {
          SOLD_RATE: rowInput?.soldRate ? parseFloat(rowInput.soldRate) : undefined,
          SOLD_DATE: new Date().toISOString(),
        };
        if (globalAuctionBroker) {
          payload.AUCTION_BROKER = globalAuctionBroker;
        }
        return api.put(`/stock/${id}`, payload);
      });
      
      await Promise.all(promises);
      
      toast.success(`Successfully recorded auction sale for ${selectedRowIds.length} items!`);
      setIsModalOpen(false);
      setSelectedRowIds([]);
      
      // Refresh list
      const response = await api.get("/stock");
      setStockData(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process auction sale.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col gap-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/owner-mobile/sales" className="p-1 -ml-1 text-gray-400 hover:text-amber-600 transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h2 className="text-lg font-bold text-gray-800">Auction Sale</h2>
        </div>
        
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Mark or Inv..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : auctionStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Gavel size={48} className="text-gray-300" />
            <p className="text-gray-500 font-medium">No stock assigned for auction</p>
          </div>
        ) : (
          auctionStock.map(item => {
            const isSelected = selectedRowIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelection(item.id)}
                className={`p-4 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer ${
                  isSelected ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-white border-gray-100 shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? "bg-amber-500 border-amber-500 text-white" : "border-gray-300 bg-white"
                    }`}>
                      {isSelected && <CheckCircle2 size={14} className="stroke-[3]" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-base leading-tight">{item.mark?.name || "Unknown Mark"}</h3>
                      <p className="text-xs text-gray-500 font-medium">{item.inv || "-"} / {item.invNo || "-"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded uppercase tracking-wide">
                      {item.grade || "No Grade"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-gray-100/60">
                  <span className="text-xs text-gray-500 font-medium">Bags: <strong className="text-gray-800">{item.totalBags || 0}</strong></span>
                  <span className="text-xs text-gray-500 font-medium">Net: <strong className="text-gray-800">{item.netWt?.toFixed(1) || 0}kg</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedRowIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between z-20 max-w-2xl mx-auto"
          >
            <div className="font-bold">
              {selectedRowIds.length} Selected
            </div>
            <button
              onClick={openModal}
              className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-1.5 rounded-xl text-sm font-bold transition-colors"
            >
              Record Sale
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sale Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-white w-full rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden max-w-2xl mx-auto"
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800">Process Auction Sale</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 bg-gray-100 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-slate-50">
                {/* Global Info */}
                <div className="space-y-4 bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
                  <div>
                    <label className="text-xs font-bold text-amber-800 uppercase tracking-wider ml-1 mb-1 block">Global Auction Broker</label>
                    <div className="relative">
                      <select
                        value={globalAuctionBroker}
                        onChange={(e) => setGlobalAuctionBroker(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm appearance-none font-medium text-gray-700"
                      >
                        <option value="">Select Auction Broker...</option>
                        <option value="J_THOMAS">J Thomas</option>
                        <option value="PARCON">Parcon</option>
                        <option value="CARRITT_MORAN">Carritt Moran</option>
                        <option value="PARAMOUNT">Paramount</option>
                        <option value="CONTEMPORARY">Contemporary</option>
                        <option value="ATB">ATB</option>
                        <option value="PTM">PTM</option>
                        <option value="ASSAM_TEA_BROKERS">Assam Tea Brokers</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronLeft size={16} className="text-gray-400 -rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Individual Rates</h4>
                  {selectedRowIds.map(id => {
                    const item = stockData.find(s => s.id === id);
                    if (!item) return null;
                    const rowData = bulkRowData[id] || { soldRate: "" };
                    
                    return (
                      <div key={id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                          <div className="font-bold text-gray-800">{item.mark?.name}</div>
                          <div className="text-xs text-gray-500 font-medium">{item.inv} / {item.invNo}</div>
                        </div>
                        
                        <div className="w-32">
                          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Rate (₹)</label>
                          <input 
                            type="number"
                            value={rowData.soldRate}
                            onChange={(e) => setBulkRowData(prev => ({ ...prev, [id]: { soldRate: e.target.value } }))}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-sm font-semibold"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-white border-t border-gray-100 pb-[max(env(safe-area-inset-bottom),16px)]">
                <button
                  onClick={submitSale}
                  disabled={isSubmitting}
                  className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl active:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Processing..." : `Record Sale (${selectedRowIds.length} items)`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
