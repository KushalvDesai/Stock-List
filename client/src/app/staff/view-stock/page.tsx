"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, FilterX, Edit2, Check, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
}

export default function ViewStockPage() {
  const toast = useToasts();
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Mode State
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<StockEntry>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

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
    { key: 'dop', label: 'Date of Purchase (DOP)', type: 'date' },
    { key: 'user', label: 'User', type: 'text' },
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
    fetchStock();
  }, []);

  const filteredStock = useMemo(() => {
    let result = stockData.filter((item) => {
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
        let itemDate: string | null | undefined = null;
        if (searchField === 'dop') itemDate = item.dop;
        
        if (!itemDate) return false;
        const itemDateStr = new Date(itemDate).toISOString().split('T')[0];
        if (searchDateFrom && itemDateStr < searchDateFrom) return false;
        if (searchDateTo && itemDateStr > searchDateTo) return false;
        return true;
      }

      if (!searchValue) return true;
      const term = searchValue.toLowerCase();

      if (searchField === 'grade') return item.grade === searchValue;
      if (searchField === 'user') return !!item.user && item.user.toLowerCase().includes(term);
      
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

  const startEditing = (row: StockEntry) => {
    setEditingRowId(row.id);
    setEditFormData({
      inv: row.inv,
      invNo: row.invNo,
      grade: row.grade,
      totalBags: row.totalBags,
      bagWt: row.bagWt,
      netWt: row.netWt,
      auction: row.auction,
    });
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  const submitEditRequest = async (id: string) => {
    setIsSubmittingEdit(true);
    try {
      await api.post(`/stock/${id}/edit-request`, editFormData);
      toast.success("Edit request submitted! Waiting for owner approval.");
      setEditingRowId(null);
      setEditFormData({});
    } catch (error) {
      console.error("Failed to submit edit request", error);
      toast.error("Failed to submit edit request.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleEditChange = (field: keyof StockEntry, value: any) => {
    setEditFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'totalBags' || field === 'bagWt') {
        const tb = parseFloat(updated.totalBags as any);
        const bw = parseFloat(updated.bagWt as any);
        if (!isNaN(tb) && !isNaN(bw)) {
          updated.netWt = parseFloat((tb * bw).toFixed(2));
        } else {
          updated.netWt = null;
        }
      }
      return updated;
    });
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">View Stock Database</h1>
            <p className="text-sm text-gray-500 font-medium">Browse and search the current inventory in the warehouse.</p>
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
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  {[
                    { key: 'factory', label: 'FACTORY' },
                    { key: 'mark', label: 'MARK' },
                    { key: 'inv', label: 'INV' },
                    { key: 'invNo', label: 'INV NO' },
                    { key: 'grade', label: 'GRADE' },
                    { key: 'totalBags', label: 'BAGS', align: 'right' },
                    { key: 'bagWt', label: 'BAG WT (kg)', align: 'right' },
                    { key: 'netWt', label: 'NET WT (kg)', align: 'right' },
                    { key: 'dop', label: 'DOP', align: 'center' },
                    { key: 'auction', label: 'AUCTION', align: 'center' },
                    { key: 'user', label: 'USER', align: 'center' }
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
                  <th className="px-4 py-3 text-center w-24">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500 font-medium">
                      Loading stock database...
                    </td>
                  </tr>
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500 font-medium">
                      No stock entries found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence>
                    {filteredStock.map((row, index) => {
                      const isEditing = editingRowId === row.id;
                      
                      return (
                        <motion.tr 
                          key={row.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-indigo-50/30 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-center text-gray-400 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-2 py-2.5 font-medium text-gray-800">
                            {row.factory?.name || "-"}
                          </td>
                          <td className="px-2 py-2.5 font-medium text-gray-800">
                            {row.mark?.name || "-"}
                          </td>
                          <td className="px-2 py-2.5 font-medium text-gray-800">
                            {isEditing ? (
                              <input 
                                type="text" 
                                value={editFormData.inv || ""} 
                                onChange={(e) => handleEditChange('inv', e.target.value.toUpperCase())}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" 
                              />
                            ) : (row.inv || "-")}
                          </td>
                          <td className="px-2 py-2.5 font-medium text-gray-800">
                            {isEditing ? (
                              <input 
                                type="number" 
                                value={editFormData.invNo || ""} 
                                onChange={(e) => handleEditChange('invNo', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" 
                              />
                            ) : (row.invNo || "-")}
                          </td>
                          <td className="px-2 py-2.5 font-bold text-indigo-700">
                            {isEditing ? (
                              <select
                                value={editFormData.grade || ""}
                                onChange={(e) => handleEditChange('grade', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                              >
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            ) : (row.grade || "-")}
                          </td>
                          <td className="px-2 py-2.5 text-right font-medium text-gray-700">
                            {isEditing ? (
                              <input 
                                type="number" 
                                value={editFormData.totalBags || ""} 
                                onChange={(e) => handleEditChange('totalBags', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-right" 
                              />
                            ) : (row.totalBags || 0)}
                          </td>
                          <td className="px-2 py-2.5 text-right font-medium text-gray-700">
                            {isEditing ? (
                              <input 
                                type="number" 
                                step="0.1"
                                value={editFormData.bagWt || ""} 
                                onChange={(e) => handleEditChange('bagWt', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-right" 
                              />
                            ) : (row.bagWt?.toFixed(1) || "0.0")}
                          </td>
                          <td className="px-2 py-2.5 text-right font-semibold text-gray-900">
                            {isEditing ? (
                              <input 
                                type="number" 
                                step="0.1"
                                value={editFormData.netWt || ""} 
                                onChange={(e) => handleEditChange('netWt', e.target.value)}
                                className="w-full px-2 py-1 text-sm bg-gray-50 border border-gray-200 rounded outline-none text-right font-semibold text-gray-900" 
                              />
                            ) : (row.netWt?.toFixed(2) || "0.00")}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-600">
                            {formatDate(row.dop)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isEditing ? (
                              <input 
                                type="checkbox" 
                                checked={editFormData.auction || false} 
                                onChange={(e) => handleEditChange('auction', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500" 
                              />
                            ) : (
                              row.auction ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Yes</span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">No</span>
                              )
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              {row.user || "System"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => submitEditRequest(row.id)}
                                  disabled={isSubmittingEdit}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                  title="Submit Edit Request"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={isSubmittingEdit}
                                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : row.soldRate !== null ? (
                              <span 
                                className="text-xs text-gray-500 font-medium whitespace-nowrap bg-gray-100 px-2 py-1 rounded border border-gray-200 cursor-not-allowed"
                                title="Cannot edit a sold item"
                              >
                                Sold
                              </span>
                            ) : (
                              <button
                                onClick={() => startEditing(row)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="Request Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 p-3 px-4 flex justify-between items-center text-sm">
            <span className="font-medium text-gray-700">Showing {filteredStock.length} entr{filteredStock.length === 1 ? 'y' : 'ies'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
