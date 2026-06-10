"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios";
import { Search, Package, CheckCircle2, ChevronLeft, X, Copy } from "lucide-react";
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

export default function MobilePrivateSalePage() {
  const toast = useToasts();
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Selection & Modal
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Edit Data
  const [globalBroker, setGlobalBroker] = useState("");
  const [globalBuyer, setGlobalBuyer] = useState("");
  const [globalTransporter, setGlobalTransporter] = useState("");
  const [bulkRowData, setBulkRowData] = useState<Record<string, { soldRate: string, soldInvNo: string }>>({});

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

  const availableStock = useMemo(() => {
    return stockData.filter(item => {
      if (item.auction) return false; // Exclude auction items
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
    const initialData: Record<string, { soldRate: string, soldInvNo: string }> = {};
    selectedRowIds.forEach(id => {
      initialData[id] = { soldRate: "", soldInvNo: "" };
    });
    setBulkRowData(initialData);
    setGlobalBroker("");
    setGlobalBuyer("");
    setGlobalTransporter("");
    setIsModalOpen(true);
  };

  const submitSale = async () => {
    setIsSubmitting(true);
    try {
      const promises = selectedRowIds.map(id => {
        const rowInput = bulkRowData[id];
        return api.put(`/stock/${id}`, {
          BROKER: globalBroker,
          BUYER: globalBuyer,
          TRANSPORTER: globalTransporter,
          SOLD_RATE: rowInput?.soldRate ? parseFloat(rowInput.soldRate) : undefined,
          SOLD_INV_NO: rowInput?.soldInvNo ? parseInt(rowInput.soldInvNo) : undefined,
          SOLD_DATE: new Date().toISOString(),
        });
      });

      await Promise.all(promises);

      toast.success(`Successfully sold ${selectedRowIds.length} items!`);
      setIsModalOpen(false);
      setSelectedRowIds([]);

      // Refresh list
      const response = await api.get("/stock");
      setStockData(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process sale.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col gap-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/owner-mobile/sales" className="p-1 -ml-1 text-gray-400 hover:text-indigo-600 transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h2 className="text-lg font-bold text-gray-800">Private Sale</h2>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Mark or Inv..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : availableStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Package size={48} className="text-gray-300" />
            <p className="text-gray-500 font-medium">No available stock</p>
          </div>
        ) : (
          availableStock.map(item => {
            const isSelected = selectedRowIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelection(item.id)}
                className={`p-4 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer ${isSelected ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-gray-100 shadow-sm"
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white"
                      }`}>
                      {isSelected && <CheckCircle2 size={14} className="stroke-[3]" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-base leading-tight">{item.mark?.name || "Unknown Mark"}</h3>
                      <p className="text-xs text-gray-500 font-medium">{item.inv || "-"} / {item.invNo || "-"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-indigo-700 bg-indigo-100/50 px-2 py-0.5 rounded uppercase tracking-wide">
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
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-1.5 rounded-xl text-sm font-bold transition-colors"
            >
              Sell Now
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
                <h3 className="font-bold text-lg text-gray-800">Process Private Sale</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 bg-gray-100 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-slate-50">
                {/* Global Info */}
                <div className="space-y-4 bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
                  <div>
                    <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider ml-1 mb-1 block">Broker</label>
                    <input
                      type="text"
                      value={globalBroker}
                      onChange={(e) => setGlobalBroker(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      placeholder="e.g. J. Thomas"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider ml-1 mb-1 block">Buyer</label>
                    <input
                      type="text"
                      value={globalBuyer}
                      onChange={(e) => setGlobalBuyer(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      placeholder="e.g. Tata Global"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider ml-1 mb-1 block">Transporter</label>
                    <input
                      type="text"
                      value={globalTransporter}
                      onChange={(e) => setGlobalTransporter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      placeholder="e.g. ABC Logistics"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Individual Details</h4>
                  {selectedRowIds.map(id => {
                    const item = stockData.find(s => s.id === id);
                    if (!item) return null;
                    const rowData = bulkRowData[id] || { soldRate: "", soldInvNo: "" };

                    return (
                      <div key={id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex justify-between border-b border-gray-50 pb-2">
                          <span className="font-bold text-gray-800">{item.mark?.name}</span>
                          <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{item.grade}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Rate (₹)</label>
                            <input
                              type="number"
                              value={rowData.soldRate}
                              onChange={(e) => setBulkRowData(prev => ({ ...prev, [id]: { ...prev[id], soldRate: e.target.value } }))}
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-semibold"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Sold Inv No</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={rowData.soldInvNo}
                                onChange={(e) => setBulkRowData(prev => ({ ...prev, [id]: { ...prev[id], soldInvNo: e.target.value } }))}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-semibold"
                                placeholder="Optional"
                              />
                              <button
                                onClick={() => setBulkRowData(prev => ({ ...prev, [id]: { ...prev[id], soldInvNo: String(item.invNo || "") } }))}
                                className="bg-slate-100 text-gray-500 p-2 rounded-xl border border-slate-200 active:bg-slate-200"
                              >
                                <Copy size={16} />
                              </button>
                            </div>
                          </div>
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
                  className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl active:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Processing..." : `Confirm Sale (${selectedRowIds.length} items)`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
