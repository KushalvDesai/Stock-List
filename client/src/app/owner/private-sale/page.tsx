"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios";
import { Search, FilterX, LogOut, Home, Building, FileText, ShoppingCart, Edit2, Check, X, Gavel, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToasts } from "@/components/toast";
import { useAuthStore } from "@/store/authStore";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { AppSidebar, SidebarLink } from "@/components/app-sidebar";

const GRADES = [
  "BPS", "BOP", "BOPSM", "BP", "BPSM", "PF", "PD", "DUST", "CD",
  "BPS1", "BOPL1", "BOP1", "BOPSM1", "BP1", "BPSM1", "PF1", "PD1",
  "DUST1", "CD1", "OF", "BOPL"
];

interface StockEntry {
  id: string;
  inv: string | null;
  invNo: number | null;
  grade: string | null;
  totalBags: number | null;
  bagWt: number | null;
  netWt: number | null;
  dop: string | null;
  auction: boolean | null;
  broker: string | null;
  buyer: string | null;
  soldDate: string | null;
  soldRate: number | null;
  soldInvNo: number | null;
  billNo: string | null;
  biltyNo: string | null;
  transporter: string | null;
  purchaseSample: boolean | null;
  purchaseSampleDate: string | null;
  factory?: { name: string } | null;
  mark?: { name: string } | null;
}

const OWNER_LINKS: SidebarLink[] = [
  { href: "/owner", label: "Dashboard Home", icon: Home },
  { href: "/owner/company-management", label: "Company Management", icon: Building },
  { href: "/owner/private-sale", label: "Private Sale", icon: ShoppingCart },
  { href: "/owner/auction-sale", label: "Auction Sale", icon: Gavel },
  { href: "/owner/inventory", label: "Inventory", icon: Package },
  { href: "#", label: "Reports (Coming Soon)", icon: FileText },
];

export default function PrivateSalePage() {
  const toast = useToasts();
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection and Bulk Edit State
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkGlobalData, setBulkGlobalData] = useState({ broker: "", buyer: "", transporter: "" });
  const [bulkRowData, setBulkRowData] = useState<Record<string, { soldRate: string, soldInvNo: string }>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Dispatch Message States
  const [isDispatchSetupModalOpen, setIsDispatchSetupModalOpen] = useState(false);
  const [dispatchTemplate, setDispatchTemplate] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successDispatchMessage, setSuccessDispatchMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('dispatch_template');
    if (saved) setDispatchTemplate(saved);
  }, []);

  // Filters
  const [filterDate, setFilterDate] = useState("");
  const [filterInvNo, setFilterInvNo] = useState("");
  const [filterGrade, setFilterGrade] = useState("");

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

  const filteredStock = useMemo(() => {
    return stockData.filter((item) => {
      // Only show items that are NOT marked for auction
      if (item.auction) return false;

      // Filter Date (DOP)
      if (filterDate) {
        const itemDate = item.dop ? new Date(item.dop).toISOString().split('T')[0] : "";
        if (itemDate !== filterDate) return false;
      }
      // Filter InvNo
      if (filterInvNo) {
        if (item.invNo?.toString() !== filterInvNo) return false;
      }
      // Filter Grade
      if (filterGrade) {
        if (item.grade !== filterGrade) return false;
      }
      return true;
    });
  }, [stockData, filterDate, filterInvNo, filterGrade]);

  const clearFilters = () => {
    setFilterDate("");
    setFilterInvNo("");
    setFilterGrade("");
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRowIds(filteredStock.map(item => item.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRowIds(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const openBulkModal = () => {
    const initialRowData: Record<string, { soldRate: string, soldInvNo: string }> = {};
    selectedRowIds.forEach(id => {
      const row = stockData.find(s => s.id === id);
      initialRowData[id] = {
        soldRate: row?.soldRate ? String(row.soldRate) : "",
        soldInvNo: row?.soldInvNo ? String(row.soldInvNo) : "",
      };
    });
    setBulkRowData(initialRowData);
    setBulkGlobalData({ broker: "", buyer: "", transporter: "" });
    setIsBulkEditModalOpen(true);
  };

  const submitBulkEdit = async () => {
    setIsSubmittingEdit(true);
    try {
      let combinedMessage = "";

      const promises = selectedRowIds.map(id => {
        const rowInput = bulkRowData[id];
        const payload = {
          BROKER: bulkGlobalData.broker,
          BUYER: bulkGlobalData.buyer,
          TRANSPORTER: bulkGlobalData.transporter,
          SOLD_RATE: rowInput?.soldRate ? parseFloat(rowInput.soldRate) : undefined,
          SOLD_INV_NO: rowInput?.soldInvNo ? parseInt(rowInput.soldInvNo) : undefined,
          SOLD_DATE: new Date().toISOString(),
        };

        if (dispatchTemplate) {
          const item = stockData.find(s => s.id === id);
          if (item) {
            let msg = dispatchTemplate;
            msg = msg.replace(/\[factory\]/g, item.factory?.name || "");
            msg = msg.replace(/\[mark\]/g, item.mark?.name || "");
            msg = msg.replace(/\[inv\+invNo\]/g, `${item.inv || ""}${item.invNo || ""}`);
            msg = msg.replace(/\[grade\]/g, item.grade || "");
            msg = msg.replace(/\[soldRate\]/g, rowInput?.soldRate || "");
            msg = msg.replace(/\[broker\]/g, bulkGlobalData.broker || "");
            msg = msg.replace(/\[buyer\]/g, bulkGlobalData.buyer || "");
            msg = msg.replace(/\[transporter\]/g, bulkGlobalData.transporter || "");
            combinedMessage += msg + "\n";
          }
        }

        return api.put(`/stock/${id}`, payload);
      });
      
      await Promise.all(promises);
      
      toast.success(`Successfully updated ${selectedRowIds.length} items!`);
      setIsBulkEditModalOpen(false);
      setSelectedRowIds([]);
      setBulkGlobalData({ broker: "", buyer: "", transporter: "" });
      setBulkRowData({});

      if (combinedMessage.trim()) {
        setSuccessDispatchMessage(combinedMessage.trim());
        setIsSuccessModalOpen(true);
      }
      
      // Refresh stock data
      const response = await api.get("/stock");
      setStockData(response.data);
    } catch (error) {
      console.error("Failed to update stock", error);
      toast.error("Failed to update stock details.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex">
      <AppSidebar title="Owner Panel" links={OWNER_LINKS} />

      <div className="flex-1 flex flex-col min-w-0 ml-20 pb-12">
        {/* Top Navbar */}
        <header className="bg-slate-50 border-b border-slate-300 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-none">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-700 tracking-tight">Private Sale</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                window.location.href = '/login';
              }}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-slate-800 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        <div className="w-full max-w-[1800px] mx-auto px-8 lg:px-12 pt-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 bg-slate-50 shadow-none px-6 py-4 rounded-none border border-slate-300 gap-4">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-3">View the entire stock available for private sale.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openBulkModal}
                  disabled={selectedRowIds.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-none text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-none"
                >
                  Mark Selected as Sold ({selectedRowIds.length})
                </button>
                <button
                  onClick={() => setIsDispatchSetupModalOpen(true)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 border border-slate-300 rounded-none text-sm font-medium hover:bg-slate-300 transition-colors shadow-none"
                >
                  Setup Dispatch Message
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Date (DOP)</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-none outline-none transition-colors text-sm"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Inv No</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    placeholder="Search Inv No"
                    value={filterInvNo}
                    onChange={(e) => setFilterInvNo(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-32 bg-slate-100 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-none outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Grade</label>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-none outline-none transition-colors text-sm cursor-pointer"
                >
                  <option value="">All Grades</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-end h-full mt-5">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent rounded-none transition-colors text-sm font-medium"
                  title="Clear all filters"
                >
                  <FilterX size={16} />
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-none shadow-none border border-slate-300 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-200 text-gray-700 font-semibold border-b border-slate-300 uppercase text-xs tracking-wider sticky top-0 z-10 shadow-none">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-indigo-600 bg-slate-200 border-gray-300 rounded-none focus:ring-indigo-500 cursor-pointer"
                        checked={filteredStock.length > 0 && selectedRowIds.length === filteredStock.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3">INV</th>
                    <th className="px-4 py-3">INV NO</th>
                    <th className="px-4 py-3">GRADE</th>
                    <th className="px-4 py-3 text-right">BAGS</th>
                    <th className="px-4 py-3 text-right">BAG WT (kg)</th>
                    <th className="px-4 py-3 text-right">NET WT (kg)</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">DOP</th>
                    <th className="px-4 py-3 text-center">BROKER</th>
                    <th className="px-4 py-3 text-center">BUYER</th>
                    <th className="px-4 py-3 text-center">TRANSPORTER</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">SOLD DATE</th>
                    <th className="px-4 py-3 text-right">SOLD RATE</th>
                    <th className="px-4 py-3 text-center">SOLD INV NO</th>
                    <th className="px-4 py-3 text-center">BILL NO</th>
                    <th className="px-4 py-3 text-center">BILTY NO</th>
                    <th className="px-4 py-3 text-center">PUR. SAMPLE</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">PUR. DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={19} className="px-4 py-12 text-center text-gray-500 font-medium">
                        Loading stock database...
                      </td>
                    </tr>
                  ) : filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="px-4 py-12 text-center text-gray-500 font-medium">
                        No stock entries found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence>
                      {filteredStock.map((row, index) => {
                        const isSelected = selectedRowIds.includes(row.id);

                        return (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-indigo-50/30'}`}
                        >
                          <td className="px-4 py-2.5 text-center">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 text-indigo-600 bg-slate-200 border-gray-300 rounded-none focus:ring-indigo-500 cursor-pointer"
                              checked={isSelected}
                              onChange={() => handleSelectRow(row.id)}
                            />
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-700">
                            {row.inv || "-"}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-700">
                            {row.invNo || "-"}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-indigo-700">
                            {row.grade || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-700">
                            {row.totalBags || 0}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-700">
                            {row.bagWt?.toFixed(1) || "0.0"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                            {row.netWt?.toFixed(2) || "0.00"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-600 whitespace-nowrap">
                            {formatDate(row.dop)}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-700">
                            {row.broker || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-700">
                            {row.buyer || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-700">
                            {row.transporter || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-600 whitespace-nowrap">
                            {formatDate(row.soldDate)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                            {row.soldRate !== null ? `₹${row.soldRate.toFixed(2)}` : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-700">
                            {row.soldInvNo || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-700">
                            {row.billNo || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-700">
                            {row.biltyNo || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {row.purchaseSample ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Yes</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium bg-slate-200 text-gray-600 border border-slate-300">No</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-600 whitespace-nowrap">
                            {formatDate(row.purchaseSampleDate)}
                          </td>
                        </motion.tr>
                      );
                    })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-100 border-t border-slate-300 p-3 px-4 flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">Showing {filteredStock.length} entr{filteredStock.length === 1 ? 'y' : 'ies'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-50 rounded-none shadow-none w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-300 flex justify-between items-center bg-slate-100">
              <h2 className="text-lg font-bold text-slate-700">Mark Selected as Sold ({selectedRowIds.length})</h2>
              <button onClick={() => setIsBulkEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-6 mb-8 bg-indigo-50 p-4 rounded-none border border-indigo-100">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Broker</label>
                  <input 
                    type="text"
                    value={bulkGlobalData.broker}
                    onChange={(e) => setBulkGlobalData(prev => ({ ...prev, broker: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                    placeholder="Enter Broker Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Buyer</label>
                  <input 
                    type="text"
                    value={bulkGlobalData.buyer}
                    onChange={(e) => setBulkGlobalData(prev => ({ ...prev, buyer: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                    placeholder="Enter Buyer Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Transporter</label>
                  <input 
                    type="text"
                    value={bulkGlobalData.transporter}
                    onChange={(e) => setBulkGlobalData(prev => ({ ...prev, transporter: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                    placeholder="Enter Transporter Name"
                  />
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Individual Line Details</h3>
              <div className="space-y-4">
                {selectedRowIds.map(id => {
                  const row = stockData.find(s => s.id === id);
                  if (!row) return null;
                  const rowData = bulkRowData[id] || { soldRate: "", soldInvNo: "" };

                  return (
                    <div key={id} className="grid grid-cols-12 gap-6 items-center bg-slate-50 p-4 rounded-none border border-slate-300 shadow-none">
                      <div className="col-span-4 text-sm">
                        <div className="font-bold text-slate-800 mb-1">
                          {row.inv || "-"} / {row.invNo || "-"}
                        </div>
                        <div className="text-gray-500 text-xs font-medium">
                          Grade: {row.grade || "-"} • Bags: {row.totalBags || 0} • Net Wt: {row.netWt || 0}kg
                        </div>
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Sold Rate (₹)</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={rowData.soldRate}
                          onChange={(e) => setBulkRowData(prev => ({ ...prev, [id]: { ...prev[id], soldRate: e.target.value } }))}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-none focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="e.g. 150.50"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Sold Inv No</label>
                        <div className="flex gap-2">
                          <input 
                            type="number"
                            value={rowData.soldInvNo}
                            onChange={(e) => setBulkRowData(prev => ({ ...prev, [id]: { ...prev[id], soldInvNo: e.target.value } }))}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-none focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Optional"
                          />
                          <button 
                            title="Copy original Inv No"
                            onClick={() => setBulkRowData(prev => ({ ...prev, [id]: { ...prev[id], soldInvNo: String(row.invNo || "") } }))}
                            className="px-2 py-1.5 bg-slate-200 border border-gray-300 rounded-none text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            Copy Original
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-300 bg-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsBulkEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-slate-800 hover:bg-gray-200 bg-slate-200 border border-gray-300 rounded-none transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitBulkEdit}
                disabled={isSubmittingEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-none shadow-none transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingEdit ? "Saving..." : "Save Details"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dispatch Setup Modal */}
      {isDispatchSetupModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-50 rounded-none shadow-none w-full max-w-2xl flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-300 flex justify-between items-center bg-slate-100">
              <h2 className="text-lg font-bold text-slate-700">Setup Dispatch Message</h2>
              <button onClick={() => setIsDispatchSetupModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Click a variable to insert it into your template.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['[factory]', '[mark]', '[inv+invNo]', '[grade]', '[soldRate]', '[broker]', '[buyer]', '[transporter]'].map(v => (
                  <button
                    key={v}
                    onClick={() => setDispatchTemplate(prev => prev + v)}
                    className="px-2 py-1 bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-none hover:bg-indigo-200 transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                value={dispatchTemplate}
                onChange={(e) => setDispatchTemplate(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="Example: [mark] [inv+invNo] [grade] bought at [soldRate] by [broker] for [buyer] depot [transporter]"
              />
            </div>
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-300 flex justify-end gap-3">
              <button 
                onClick={() => setIsDispatchSetupModalOpen(false)}
                className="px-4 py-2 border border-slate-300 bg-white text-slate-700 font-medium rounded-none hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('dispatch_template', dispatchTemplate);
                  setIsDispatchSetupModalOpen(false);
                  toast.success("Dispatch template saved!");
                }}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-none hover:bg-indigo-700 transition-colors text-sm"
              >
                Save Template
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dispatch Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-50 rounded-none shadow-none w-full max-w-2xl flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-300 flex justify-between items-center bg-slate-100">
              <h2 className="text-lg font-bold text-slate-700">Dispatch Message</h2>
              <button onClick={() => setIsSuccessModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <textarea
                readOnly
                value={successDispatchMessage}
                className="w-full h-48 p-3 border border-gray-300 rounded-none bg-white outline-none text-sm font-mono whitespace-pre-wrap"
              />
            </div>
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-300 flex justify-end gap-3">
              <button 
                onClick={() => setIsSuccessModalOpen(false)}
                className="px-4 py-2 border border-slate-300 bg-white text-slate-700 font-medium rounded-none hover:bg-slate-50 transition-colors text-sm"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(successDispatchMessage);
                  toast.success("Copied to clipboard!");
                }}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-none hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
              >
                Copy to Clipboard
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
