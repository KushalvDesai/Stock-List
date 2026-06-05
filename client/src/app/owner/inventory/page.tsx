"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from 'xlsx';
import { Search, FilterX, Edit2, Check, X, LogOut, Home, Building, FileText, ShoppingCart, Gavel, Package, ArrowUpDown, ArrowUp, ArrowDown, Download, Trash2, RefreshCw } from "lucide-react";
import { api } from "@/lib/axios";
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
  user: string | null;
  auction: boolean | null;
  auctionNo: string | null;
  auctionDate: string | null;
  auctionBroker: string | null;
  broker: string | null;
  buyer: string | null;
  soldDate: string | null;
  soldRate: number | null;
  soldInvNo: number | null;
  billNo: string | null;
  biltyNo: string | null;
  purchaseSample: boolean | null;
  purchaseSampleDate: string | null;
  factory?: { name: string } | null;
  mark?: { name: string } | null;
}

const TABLE_COLUMNS = [
  { key: 'factory', label: 'FACTORY' },
  { key: 'mark', label: 'MARK' },
  { key: 'inv', label: 'INV' },
  { key: 'invNo', label: 'INV NO' },
  { key: 'grade', label: 'GRADE' },
  { key: 'totalBags', label: 'BAGS', align: 'right' },
  { key: 'bagWt', label: 'BAG WT (kg)', align: 'right' },
  { key: 'netWt', label: 'NET WT (kg)', align: 'right' },
  { key: 'dop', label: 'DOP', align: 'center' },
  { key: 'auction', label: 'AUCTION', align: 'center', bg: 'bg-indigo-50/50' },
  { key: 'auctionNo', label: 'AUC NO', align: 'center', bg: 'bg-indigo-50/50' },
  { key: 'auctionDate', label: 'AUC DATE', align: 'center', bg: 'bg-indigo-50/50' },
  { key: 'auctionBroker', label: 'AUC BROKER', align: 'center', bg: 'bg-indigo-50/50' },
  { key: 'broker', label: 'BROKER', align: 'center' },
  { key: 'buyer', label: 'BUYER', align: 'center' },
  { key: 'soldDate', label: 'SOLD DATE', align: 'center' },
  { key: 'soldRate', label: 'SOLD RATE', align: 'right' },
  { key: 'soldInvNo', label: 'SOLD INV NO', align: 'center' },
  { key: 'billNo', label: 'BILL NO', align: 'center' },
  { key: 'biltyNo', label: 'BILTY NO', align: 'center' },
  { key: 'purchaseSample', label: 'PUR. SAMPLE', align: 'center' },
  { key: 'purchaseSampleDate', label: 'PUR. DATE', align: 'center' },
  { key: 'user', label: 'USER', align: 'center' }
];

const OWNER_LINKS: SidebarLink[] = [
  { href: "/owner", label: "Dashboard Home", icon: Home },
  { href: "/owner/company-management", label: "Company Management", icon: Building },
  { href: "/owner/private-sale", label: "Private Sale", icon: ShoppingCart },
  { href: "/owner/auction-sale", label: "Auction Sale", icon: Gavel },
  { href: "/owner/inventory", label: "Inventory", icon: Package },
  { href: "#", label: "Reports (Coming Soon)", icon: FileText },
];

export default function OwnerInventoryPage() {
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

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterInv, setFilterInv] = useState("");
  const [filterInvNo, setFilterInvNo] = useState("");
  const [filterGrade, setFilterGrade] = useState("");

  // Delete & Recycle Bin State
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRecycleBin, setIsRecycleBin] = useState(false);

  const fetchStock = async () => {
    setIsLoading(true);
    try {
      const endpoint = isRecycleBin ? "/stock/recycle-bin" : "/stock";
      const response = await api.get(endpoint);
      setStockData(response.data);
      setSelectedIds([]); // Clear selections on reload
    } catch (error) {
      console.error("Failed to fetch stock:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [isRecycleBin]);

  const filteredStock = useMemo(() => {
    let result = stockData.filter((item) => {
      // Filter DOP Range
      if (filterDateFrom || filterDateTo) {
        const itemDateStr = item.dop ? new Date(item.dop).toISOString().split('T')[0] : "";
        if (!itemDateStr) return false;
        if (filterDateFrom && itemDateStr < filterDateFrom) return false;
        if (filterDateTo && itemDateStr > filterDateTo) return false;
      }
      // Filter Inv
      if (filterInv && (!item.inv || item.inv.toLowerCase().indexOf(filterInv.toLowerCase()) === -1)) return false;
      // Filter InvNo
      if (filterInvNo && item.invNo?.toString() !== filterInvNo) return false;
      // Filter Grade
      if (filterGrade && item.grade !== filterGrade) return false;
      
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
  }, [stockData, filterDateFrom, filterDateTo, filterInv, filterInvNo, filterGrade, sortConfig]);

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterInv("");
    setFilterInvNo("");
    setFilterGrade("");
  };

  // Export State & Logic
  const [selectedExportColumns, setSelectedExportColumns] = useState<Record<string, boolean>>(
    TABLE_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  const handleExport = () => {
    const dataToExport = filteredStock.map(row => {
      const rowData: any = {};
      TABLE_COLUMNS.forEach(col => {
        if (selectedExportColumns[col.key]) {
          let value: any = row[col.key as keyof StockEntry];
          if (col.key === 'factory') value = row.factory?.name;
          if (col.key === 'mark') value = row.mark?.name;
          
          if (col.key === 'dop' || col.key === 'auctionDate' || col.key === 'soldDate' || col.key === 'purchaseSampleDate') {
            rowData[col.label] = formatDate(value as string | null);
          } else if (col.key === 'auction' || col.key === 'purchaseSample') {
            rowData[col.label] = value ? "Yes" : "No";
          } else {
            rowData[col.label] = value !== null && value !== undefined ? value : "";
          }
        }
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, `Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      // Direct update for owners! (Since owners bypass OTP)
      await api.put(`/stock/${id}`, {
        INV: editFormData.inv,
        INV_NO: editFormData.invNo,
        GRADE: editFormData.grade,
        TOTAL_BAGS: editFormData.totalBags,
        BAG_WT: editFormData.bagWt,
        NET_WT: editFormData.netWt,
      });
      toast.success("Stock updated successfully!");
      setEditingRowId(null);
      setEditFormData({});
      
      // Refresh stock data
      const response = await api.get("/stock");
      setStockData(response.data);
    } catch (error) {
      console.error("Failed to update stock", error);
      toast.error("Failed to update stock.");
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

  // Selection Handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStock.length && filteredStock.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStock.map(s => s.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} items? They will be moved to the recycle bin.`)) return;
    
    try {
      await api.post("/stock/delete-batch", { ids: selectedIds });
      toast.success(`${selectedIds.length} items moved to recycle bin`);
      fetchStock();
      setIsDeleteMode(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete items");
    }
  };

  const handleRecoverSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.post("/stock/recover-batch", { ids: selectedIds });
      toast.success(`${selectedIds.length} items recovered successfully`);
      fetchStock();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to recover items");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex">
      <AppSidebar title="Owner Panel" links={OWNER_LINKS} />

      <div className="flex-1 flex flex-col min-w-0 ml-20 pb-12">
        {/* Top Navbar */}
        <header className="bg-slate-50 border-b border-slate-300 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-none">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-700 tracking-tight">{isRecycleBin ? "Recycle Bin" : "Full Inventory"}</h1>
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

        <div className="w-full max-w-[1600px] mx-auto px-8 lg:px-12 pt-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 bg-slate-50 shadow-none px-6 py-4 rounded-none border border-slate-300 gap-4">
            <div>
              <p className="text-sm text-gray-500 font-medium">Browse and search the entire stock inventory.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Date (DOP) Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-none outline-none transition-colors text-sm w-[130px]"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-none outline-none transition-colors text-sm w-[130px]"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Inv Mark</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Inv"
                    value={filterInv}
                    onChange={(e) => setFilterInv(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-28 bg-slate-100 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-none outline-none transition-colors text-sm"
                  />
                </div>
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

              <div className="flex flex-col justify-end h-full mt-5 gap-2 flex-row">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent rounded-none transition-colors text-sm font-medium h-fit"
                  title="Clear all filters"
                >
                  <FilterX size={16} />
                  Clear
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-none transition-colors text-sm font-medium h-fit"
                  title="Export selected columns to Excel"
                >
                  <Download size={16} />
                  Export
                </button>
                <button
                  onClick={() => {
                    setIsRecycleBin(!isRecycleBin);
                    setIsDeleteMode(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-none transition-colors text-sm font-medium h-fit ${isRecycleBin ? 'bg-indigo-600 text-white border-indigo-600' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                >
                  <RefreshCw size={16} />
                  {isRecycleBin ? "Exit Recycle Bin" : "Recycle Bin"}
                </button>

                {!isRecycleBin && (
                  <button
                    onClick={() => {
                      setIsDeleteMode(!isDeleteMode);
                      if (isDeleteMode) setSelectedIds([]);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-none transition-colors text-sm font-medium h-fit ${isDeleteMode ? 'bg-slate-200 text-slate-700' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                  >
                    <Trash2 size={16} />
                    {isDeleteMode ? "Cancel" : "Delete Items"}
                  </button>
                )}

                {isDeleteMode && selectedIds.length > 0 && !isRecycleBin && (
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white border border-transparent rounded-none transition-colors text-sm font-medium h-fit"
                  >
                    Confirm Delete ({selectedIds.length})
                  </button>
                )}

                {isRecycleBin && selectedIds.length > 0 && (
                  <button
                    onClick={handleRecoverSelected}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white border border-transparent rounded-none transition-colors text-sm font-medium h-fit"
                  >
                    Recover ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-none shadow-none border border-slate-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-200 text-gray-700 font-semibold border-b border-slate-300 uppercase text-xs tracking-wider">
                  <tr>
                    {(isDeleteMode || isRecycleBin) && (
                      <th className="px-4 py-3 w-12 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.length === filteredStock.length && filteredStock.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded-none cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    {TABLE_COLUMNS.map((col: any) => (
                      <th 
                        key={col.key}
                        className={`px-4 py-3 group hover:bg-gray-200 transition-colors ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''} ${col.bg || ''} whitespace-nowrap`}
                      >
                        <div className={`flex items-center gap-1.5 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selectedExportColumns[col.key] ?? true}
                            onChange={(e) => setSelectedExportColumns({ ...selectedExportColumns, [col.key]: e.target.checked })}
                            className="w-3.5 h-3.5 rounded-none border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            title={`Include ${col.label} in export`}
                          />
                          <span onClick={() => handleSort(col.key)} className="flex items-center gap-1 cursor-pointer select-none">
                            {col.label}
                            <SortIcon columnKey={col.key} />
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center w-24">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={25} className="px-4 py-12 text-center text-gray-500 font-medium">
                        Loading stock database...
                      </td>
                    </tr>
                  ) : filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={25} className="px-4 py-12 text-center text-gray-500 font-medium">
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
                            className={`hover:bg-indigo-50/30 transition-colors ${selectedIds.includes(row.id) ? 'bg-indigo-50/50' : ''}`}
                          >
                            {(isDeleteMode || isRecycleBin) && (
                              <td className="px-4 py-2.5 text-center">
                                <input 
                                  type="checkbox" 
                                  checked={selectedIds.includes(row.id)}
                                  onChange={() => toggleSelection(row.id)}
                                  className="w-4 h-4 rounded-none cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="px-4 py-2.5 text-center text-gray-400 font-medium">
                              {index + 1}
                            </td>
                            <td className="px-2 py-2.5 font-bold text-slate-800 bg-slate-100/50">
                              {row.factory?.name || "-"}
                            </td>
                            <td className="px-2 py-2.5 font-bold text-slate-800 bg-slate-100/50">
                              {row.mark?.name || "-"}
                            </td>
                            <td className="px-2 py-2.5 font-medium text-slate-700">
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={editFormData.inv || ""} 
                                  onChange={(e) => handleEditChange('inv', e.target.value.toUpperCase())}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none" 
                                />
                              ) : (row.inv || "-")}
                            </td>
                            <td className="px-2 py-2.5 font-medium text-slate-700">
                              {isEditing ? (
                                <input 
                                  type="number" 
                                  value={editFormData.invNo || ""} 
                                  onChange={(e) => handleEditChange('invNo', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none" 
                                />
                              ) : (row.invNo || "-")}
                            </td>
                            <td className="px-2 py-2.5 font-bold text-indigo-700">
                              {isEditing ? (
                                <select
                                  value={editFormData.grade || ""}
                                  onChange={(e) => handleEditChange('grade', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none"
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
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none text-right" 
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
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-none focus:ring-1 focus:ring-indigo-500 outline-none text-right" 
                                />
                              ) : (row.bagWt?.toFixed(1) || "0.0")}
                            </td>
                            <td className="px-2 py-2.5 text-right font-semibold text-slate-800">
                              {isEditing ? (
                                <input 
                                  type="number" 
                                  step="0.1"
                                  value={editFormData.netWt || ""} 
                                  onChange={(e) => handleEditChange('netWt', e.target.value)}
                                  className="w-full px-2 py-1 text-sm bg-slate-100 border border-slate-300 rounded-none outline-none text-right font-semibold text-slate-800" 
                                />
                              ) : (row.netWt?.toFixed(2) || "0.00")}
                            </td>
                            <td className="px-4 py-2.5 text-center text-gray-600 whitespace-nowrap">
                              {formatDate(row.dop)}
                            </td>
                            <td className="px-4 py-2.5 text-center bg-indigo-50/20">
                              {isEditing ? (
                                <input 
                                  type="checkbox" 
                                  checked={editFormData.auction || false} 
                                  onChange={(e) => handleEditChange('auction', e.target.checked)}
                                  className="w-4 h-4 text-indigo-600 bg-slate-200 border-gray-300 rounded-none focus:ring-indigo-500" 
                                />
                              ) : (
                                row.auction ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Yes</span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium bg-slate-200 text-gray-600 border border-slate-300">No</span>
                                )
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center text-indigo-800 font-medium bg-indigo-50/20">
                              {row.auctionNo || "-"}
                            </td>
                            <td className="px-4 py-2.5 text-center text-indigo-800 whitespace-nowrap bg-indigo-50/20">
                              {formatDate(row.auctionDate)}
                            </td>
                            <td className="px-4 py-2.5 text-center text-indigo-800 font-medium bg-indigo-50/20">
                              {row.auctionBroker?.replace(/_/g, " ") || "-"}
                            </td>
                            <td className="px-4 py-2.5 text-center text-gray-700">
                              {row.broker || "-"}
                            </td>
                            <td className="px-4 py-2.5 text-center text-gray-700">
                              {row.buyer || "-"}
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
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium bg-slate-200 text-slate-700 border border-slate-300">
                                {row.user || "System"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => submitEditRequest(row.id)}
                                    disabled={isSubmittingEdit}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-none transition-colors disabled:opacity-50"
                                    title="Save Edit"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    disabled={isSubmittingEdit}
                                    className="p-1.5 text-gray-400 hover:bg-slate-200 rounded-none transition-colors disabled:opacity-50"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : row.soldRate !== null ? (
                                <span 
                                  className="text-xs text-gray-500 font-medium whitespace-nowrap bg-slate-200 px-2 py-1 rounded-none border border-slate-300 cursor-not-allowed"
                                  title="Cannot edit a sold item"
                                >
                                  Sold
                                </span>
                              ) : isRecycleBin ? (
                                <span className="text-xs text-red-500 font-medium">Deleted</span>
                              ) : (
                                <button
                                  onClick={() => startEditing(row)}
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-none transition-colors"
                                  title="Edit Stock"
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
            <div className="bg-slate-100 border-t border-slate-300 p-3 px-4 flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">Showing {filteredStock.length} entr{filteredStock.length === 1 ? 'y' : 'ies'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
