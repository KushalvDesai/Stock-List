"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, FilterX, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, X } from "lucide-react";
import { api } from "@/lib/axios";
import { motion, AnimatePresence } from "framer-motion";
import { useToasts } from "@/components/toast";

const GRADES = [
  "BPS", "BOP", "BOPSM", "BP", "BPSM", "PF", "PD", "DUST", "CD", 
  "BPS1", "BOPL1", "BOP1", "BOPSM1", "BP1", "BPSM1", "PF1", "PD1", 
  "DUST1", "CD1", "OF", "BOPL"
];

interface StockEntry {
  id: string;
  factory?: { name: string } | null;
  mark?: { name: string } | null;
  inv: string | null;
  invNo: number | null;
  grade: string | null;
  totalBags: number | null;
  bagWt: number | null;
  netWt: number | null;
  dop: string | null;
  user: string | null;
  auction: boolean | null;
  soldRate: number | null;
  soldDate: string | null;
  broker: string | null;
  buyer: string | null;
  transporter: string | null;
}

export default function AfterSalesPage() {
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToasts();

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [bulkGlobalData, setBulkGlobalData] = useState({ broker: "", buyer: "", transporter: "" });
  const [bulkRowData, setBulkRowData] = useState<Record<string, { soldInvNo: string, markId: string }>>({});
  const [marks, setMarks] = useState<any[]>([]);

  // Dispatch Message States
  const [isDispatchSetupModalOpen, setIsDispatchSetupModalOpen] = useState(false);
  const [dispatchTemplate, setDispatchTemplate] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successDispatchMessage, setSuccessDispatchMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('dispatch_template');
    if (saved) setDispatchTemplate(saved);
  }, []);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="text-indigo-600 ml-1" />;
    return <ArrowDown size={14} className="text-indigo-600 ml-1" />;
  };

  // Search & Filter State
  const SEARCH_FIELDS = [
    { key: 'grade', label: 'Grade', type: 'select' },
    { key: 'soldDate', label: 'Sold Date', type: 'date' },
    { key: 'broker', label: 'Broker', type: 'text' },
    { key: 'buyer', label: 'Buyer', type: 'text' },
  ];

  const [filterFactory, setFilterFactory] = useState("");
  const [filterInvCombined, setFilterInvCombined] = useState("");
  const [searchField, setSearchField] = useState("grade");
  const [searchValue, setSearchValue] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");

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
    const fetchMarks = async () => {
      try {
        const res = await api.get('/company/my-factory');
        const factories = res.data || [];
        let allMarks: any[] = [];
        factories.forEach((factory: any) => {
          if (factory.marks) {
            allMarks = [...allMarks, ...factory.marks];
          }
        });
        setMarks(allMarks);
      } catch (error) {
        console.error('Error fetching marks:', error);
      }
    };
    fetchStock();
    fetchMarks();
  }, []);

  const handleSelectRow = (id: string) => {
    setSelectedRowIds(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const openBulkModal = () => {
    // Check if ALL selected items already have broker and buyer
    const allHaveBrokerBuyer = selectedRowIds.every(id => {
      const row = stockData.find(s => s.id === id);
      return row && row.broker && row.buyer;
    });

    if (allHaveBrokerBuyer) {
      let combinedMessage = "";
      if (dispatchTemplate) {
        selectedRowIds.forEach(id => {
          const item = stockData.find(s => s.id === id);
          if (item) {
            let msg = dispatchTemplate;
            msg = msg.replace(/\[factory\]/g, item.factory?.name || "");
            msg = msg.replace(/\[mark\]/g, item.mark?.name || "");
            msg = msg.replace(/\[inv\+invNo\]/g, `${item.inv || ""}${item.invNo || ""}`);
            msg = msg.replace(/\[grade\]/g, item.grade || "");
            msg = msg.replace(/\[soldRate\]/g, String(item.soldRate || ""));
            msg = msg.replace(/\[broker\]/g, item.broker || "");
            msg = msg.replace(/\[buyer\]/g, item.buyer || "");
            msg = msg.replace(/\[transporter\]/g, item.transporter || "");
            combinedMessage += msg + "\n";
          }
        });
      }
      setSuccessDispatchMessage(combinedMessage.trim());
      setIsSuccessModalOpen(true);
      return;
    }

    const initialRowData: Record<string, { soldInvNo: string, markId: string }> = {};
    selectedRowIds.forEach(id => {
      const row = stockData.find(s => s.id === id);
      initialRowData[id] = {
        soldInvNo: row?.invNo ? String(row.invNo) : "", // By default copy invNo
        markId: "", // Will be selected by user
      };
    });
    setBulkRowData(initialRowData);
    setBulkGlobalData({ broker: "", buyer: "", transporter: "" });
    setIsBulkEditModalOpen(true);
  };

  const submitBulkEdit = async () => {
    if (!bulkGlobalData.broker || !bulkGlobalData.buyer) {
      toast.error("Broker and Buyer are compulsory for Dispatch Advice.");
      return;
    }
    
    setIsSubmittingEdit(true);
    try {
      let combinedMessage = "";

      const promises = selectedRowIds.map(id => {
        const rowInput = bulkRowData[id];
        const payload = {
          BROKER: bulkGlobalData.broker,
          BUYER: bulkGlobalData.buyer,
          TRANSPORTER: bulkGlobalData.transporter,
          SOLD_INV_NO: rowInput?.soldInvNo ? parseInt(rowInput.soldInvNo) : undefined,
          MARK_ID: rowInput?.markId || undefined,
        };

        if (dispatchTemplate) {
          const item = stockData.find(s => s.id === id);
          if (item) {
            let msg = dispatchTemplate;
            msg = msg.replace(/\[factory\]/g, item.factory?.name || "");
            // Use the newly selected mark if any, otherwise existing mark
            const markObj = marks.find(m => m.id === rowInput?.markId) || item.mark;
            msg = msg.replace(/\[mark\]/g, markObj?.name || "");
            const finalInvNo = rowInput?.soldInvNo || item.invNo || "";
            msg = msg.replace(/\[inv\+invNo\]/g, `${item.inv || ""}${finalInvNo}`);
            msg = msg.replace(/\[grade\]/g, item.grade || "");
            msg = msg.replace(/\[soldRate\]/g, String(item.soldRate || ""));
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
      
      const response = await api.get("/stock");
      setStockData(response.data);
    } catch (error) {
      console.error("Failed to update stock", error);
      toast.error("Failed to update stock details.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const filteredStock = useMemo(() => {
    let result = stockData.filter((item) => {
      // ONLY show sold items
      if (!item.soldRate && !item.soldDate) return false;

      // Dedicated Filters
      if (filterFactory && (!item.factory?.name || !item.factory.name.toLowerCase().includes(filterFactory.toLowerCase()))) return false;
      if (filterInvCombined) {
        const textPart = filterInvCombined.replace(/[0-9]/g, '').trim().toLowerCase();
        const numPart = filterInvCombined.replace(/[^0-9]/g, '').trim();
        if (textPart && (!item.inv || !item.inv.toLowerCase().includes(textPart))) return false;
        if (numPart && item.invNo?.toString() !== numPart) return false;
      }

      const fieldDef = SEARCH_FIELDS.find(f => f.key === searchField);
      if (!fieldDef) return true;

      if (fieldDef.type === 'date') {
        if (!searchDateFrom && !searchDateTo) return true;
        let itemDate: string | null | undefined = item.soldDate;
        
        if (!itemDate) return false;
        const itemDateStr = new Date(itemDate).toISOString().split('T')[0];
        if (searchDateFrom && itemDateStr < searchDateFrom) return false;
        if (searchDateTo && itemDateStr > searchDateTo) return false;
        return true;
      }

      if (!searchValue) return true;
      const term = searchValue.toLowerCase();

      if (searchField === 'grade') return item.grade === searchValue;
      if (searchField === 'broker') return !!item.broker && item.broker.toLowerCase().includes(term);
      if (searchField === 'buyer') return !!item.buyer && item.buyer.toLowerCase().includes(term);
      
      return true;
    });

    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof StockEntry];
        let bValue: any = b[sortConfig.key as keyof StockEntry];

        if (sortConfig.key === 'factory') {
          aValue = a.factory?.name || "";
          bValue = b.factory?.name || "";
        } else if (sortConfig.key === 'mark') {
          aValue = a.mark?.name || "";
          bValue = b.mark?.name || "";
        }

        if (aValue === null || aValue === undefined) aValue = "";
        if (bValue === null || bValue === undefined) bValue = "";

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [stockData, searchField, searchValue, searchDateFrom, searchDateTo, filterFactory, filterInvCombined, sortConfig]);

  const clearFilters = () => {
    setSearchValue("");
    setSearchDateFrom("");
    setSearchDateTo("");
    setFilterFactory("");
    setFilterInvCombined("");
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        <Link href="/staff" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 w-fit font-medium transition-colors">
          <ArrowLeft size={18} />
          Back to Staff Dashboard
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 bg-white shadow-sm px-6 py-4 rounded-md border border-gray-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">After Sales Records</h1>
            <p className="text-sm text-gray-500 font-medium mb-3">Browse previously sold inventory items.</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openBulkModal}
                disabled={selectedRowIds.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-sm text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Make Dispatch Advice ({selectedRowIds.length})
              </button>
              <button
                onClick={() => setIsDispatchSetupModalOpen(true)}
                className="px-4 py-2 bg-slate-200 text-slate-700 border border-slate-300 rounded-sm text-sm font-medium hover:bg-slate-300 transition-colors shadow-sm"
              >
                Setup Dispatch Message
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Factory</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. ABC Factory"
                  value={filterFactory}
                  onChange={(e) => setFilterFactory(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-36 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-sm placeholder:normal-case"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Search Inv</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. MK123"
                  value={filterInvCombined}
                  onChange={(e) => setFilterInvCombined(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-32 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-sm uppercase placeholder:normal-case"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Search Field</label>
              <select
                value={searchField}
                onChange={(e) => {
                  setSearchField(e.target.value);
                  clearFilters();
                }}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-sm cursor-pointer min-w-[150px]"
              >
                {SEARCH_FIELDS.map(f => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>

            {SEARCH_FIELDS.find(f => f.key === searchField)?.type === 'date' ? (
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Date Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-sm w-[130px]"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-sm w-[130px]"
                  />
                </div>
              </div>
            ) : SEARCH_FIELDS.find(f => f.key === searchField)?.type === 'select' ? (
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Select Value</label>
                <select
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-sm cursor-pointer min-w-[150px]"
                >
                  <option value="">Any</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Search Value</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter search term..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-48 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-sm outline-none transition-colors text-sm placeholder:normal-case"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col justify-end h-full mt-5">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent rounded-sm transition-colors text-sm font-medium"
                title="Clear all filters"
              >
                <FilterX size={16} />
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <button 
                      onClick={() => {
                        if (selectedRowIds.length === filteredStock.length) {
                          setSelectedRowIds([]);
                        } else {
                          setSelectedRowIds(filteredStock.map(s => s.id));
                        }
                      }}
                      className="text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      {selectedRowIds.length === filteredStock.length && filteredStock.length > 0 ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  {[
                    { key: 'factory', label: 'FACTORY' },
                    { key: 'mark', label: 'MARK' },
                    { key: 'inv', label: 'INV' },
                    { key: 'invNo', label: 'INV NO' },
                    { key: 'grade', label: 'GRADE' },
                    { key: 'netWt', label: 'NET WT (kg)', align: 'right' },
                    { key: 'auction', label: 'AUCTION/PVT', align: 'center' },
                    { key: 'soldDate', label: 'SOLD DATE', align: 'center' },
                    { key: 'soldRate', label: 'SOLD RATE', align: 'right' },
                    { key: 'broker', label: 'BROKER', align: 'center' },
                    { key: 'buyer', label: 'BUYER', align: 'center' },
                  ].map(col => (
                    <th 
                      key={col.key}
                      className={`px-4 py-3 cursor-pointer select-none group hover:bg-gray-200 transition-colors ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''} whitespace-nowrap`}
                      onClick={() => handleSort(col.key)}
                    >
                      <div className={`flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                        {col.label}
                        <SortIcon columnKey={col.key} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-gray-500 font-medium">
                      Loading stock database...
                    </td>
                  </tr>
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-gray-500 font-medium">
                      No after sales entries found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence>
                    {filteredStock.map((row, index) => (
                      <motion.tr 
                        key={row.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${selectedRowIds.includes(row.id) ? 'bg-indigo-50' : ''}`}
                        onClick={() => handleSelectRow(row.id)}
                      >
                        <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => handleSelectRow(row.id)}
                            className={`transition-colors ${selectedRowIds.includes(row.id) ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-400'}`}
                          >
                            {selectedRowIds.includes(row.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                        <td className="px-2 py-2.5 font-medium text-gray-800">
                          {row.factory?.name || "-"}
                        </td>
                        <td className="px-2 py-2.5 font-medium text-gray-800">
                          {row.mark?.name || "-"}
                        </td>
                        <td className="px-2 py-2.5 font-medium text-gray-800">
                          {row.inv || "-"}
                        </td>
                        <td className="px-2 py-2.5 font-medium text-gray-800">
                          {row.invNo || "-"}
                        </td>
                        <td className="px-2 py-2.5 font-bold text-indigo-700">
                          {row.grade || "-"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-gray-700">
                          {row.netWt || 0}
                        </td>
                        <td className="px-2 py-2.5 text-center font-medium">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${row.auction ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {row.auction ? 'Auction' : 'Private'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center font-medium text-gray-700">
                          {formatDate(row.soldDate)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-bold text-emerald-600">
                          {row.soldRate ? `₹${row.soldRate}` : "-"}
                        </td>
                        <td className="px-2 py-2.5 text-center font-medium text-gray-700">
                          {row.broker || "-"}
                        </td>
                        <td className="px-2 py-2.5 text-center font-medium text-gray-700">
                          {row.buyer || "-"}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isBulkEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-md shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">Make Dispatch Advice</h2>
                  <p className="text-sm text-gray-500 mt-1">Fill in dispatch details for the {selectedRowIds.length} selected items.</p>
                </div>
                <button 
                  onClick={() => setIsBulkEditModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-sm transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-white">
                <h3 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Global Sale Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-4 border border-slate-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Broker <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      value={bulkGlobalData.broker}
                      onChange={(e) => setBulkGlobalData(prev => ({ ...prev, broker: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                      placeholder="Enter Broker Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Buyer <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      value={bulkGlobalData.buyer}
                      onChange={(e) => setBulkGlobalData(prev => ({ ...prev, buyer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                      placeholder="Enter Buyer Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Transporter</label>
                    <input 
                      type="text"
                      value={bulkGlobalData.transporter}
                      onChange={(e) => setBulkGlobalData(prev => ({ ...prev, transporter: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                      placeholder="Optional Transporter Name"
                    />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-700 mb-4 border-b pb-2">Individual Line Details</h3>
                <div className="space-y-4">
                  {selectedRowIds.map(id => {
                    const row = stockData.find(s => s.id === id);
                    if (!row) return null;
                    const rowData = bulkRowData[id] || { soldInvNo: "", markId: "" };

                    return (
                      <div key={id} className="grid grid-cols-12 gap-6 items-center bg-slate-50 p-4 rounded-sm border border-slate-200">
                        <div className="col-span-4 text-sm">
                          <div className="font-bold text-slate-800 mb-1">
                            {row.inv || "-"} / {row.invNo || "-"}
                          </div>
                          <div className="text-gray-500 text-xs font-medium">
                            Grade: {row.grade || "-"} • Net Wt: {row.netWt || 0}kg • Rate: ₹{row.soldRate || 0}
                          </div>
                        </div>
                        <div className="col-span-4">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Mark (Optional)</label>
                          <select
                            value={rowData.markId}
                            onChange={(e) => setBulkRowData(prev => ({ ...prev, [id]: { ...prev[id], markId: e.target.value } }))}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="">Select Mark</option>
                            {marks.map((m: any) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Sold Inv No (Optional)</label>
                          <input 
                            type="number"
                            value={rowData.soldInvNo}
                            onChange={(e) => setBulkRowData(prev => ({ ...prev, [id]: { ...prev[id], soldInvNo: e.target.value } }))}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsBulkEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-slate-800 hover:bg-gray-200 bg-slate-200 border border-gray-300 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitBulkEdit}
                  disabled={isSubmittingEdit}
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmittingEdit ? "Saving..." : "Save Dispatch Advice"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isDispatchSetupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-md shadow-xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Setup Dispatch Template</h2>
                <button 
                  onClick={() => setIsDispatchSetupModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-sm transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">Use variables like <code className="bg-gray-100 px-1 rounded">[inv+invNo]</code>, <code className="bg-gray-100 px-1 rounded">[grade]</code>, <code className="bg-gray-100 px-1 rounded">[soldRate]</code>, <code className="bg-gray-100 px-1 rounded">[mark]</code>, <code className="bg-gray-100 px-1 rounded">[factory]</code>, <code className="bg-gray-100 px-1 rounded">[broker]</code>, <code className="bg-gray-100 px-1 rounded">[buyer]</code>.</p>
                <textarea
                  value={dispatchTemplate}
                  onChange={(e) => setDispatchTemplate(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-sm font-mono"
                  placeholder="e.g. Please dispatch [inv+invNo] [mark] [grade] at [soldRate] to [buyer] via [broker]"
                />
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    localStorage.setItem('dispatch_template', dispatchTemplate);
                    toast.success('Template saved successfully!');
                    setIsDispatchSetupModalOpen(false);
                  }}
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-sm transition-colors shadow-sm"
                >
                  Save Template
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-md shadow-xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-emerald-800 tracking-tight flex items-center gap-2">
                  <CheckSquare size={20} className="text-emerald-600" />
                  Dispatch Advice Ready
                </h2>
                <button 
                  onClick={() => setIsSuccessModalOpen(false)}
                  className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-sm transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-3 font-medium">Here is your generated dispatch advice message:</p>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm">
                  <pre className="whitespace-pre-wrap text-sm text-slate-800 font-mono">
                    {successDispatchMessage || "No template configured. Please setup your dispatch template first."}
                  </pre>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between gap-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(successDispatchMessage);
                    toast.success("Copied to clipboard!");
                  }}
                  disabled={!successDispatchMessage}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 bg-white border border-slate-300 rounded-sm transition-colors disabled:opacity-50"
                >
                  Copy to Clipboard
                </button>
                <button 
                  onClick={() => setIsSuccessModalOpen(false)}
                  className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-sm transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
