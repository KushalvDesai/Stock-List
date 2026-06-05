"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { Check, X, TrendingUp, Package, Clock } from "lucide-react";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";

// Suppress Recharts ResponsiveContainer warning
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("The width(-1) and height(-1) of chart")) {
      return;
    }
    originalWarn(...args);
  };
}

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
  soldDate: string | null;
  auction: boolean | null;
}

interface EditRequest {
  id: string;
  stockId: string;
  status: string;
  requestedBy: string;
  newData: any;
  createdAt: string;
  stock: StockEntry;
}

const COLORS = ['#10b981', '#f43f5e', '#6366f1', '#f59e0b']; // Sold-Pvt, Unsold, Sold-Auction, Unsold-Auction

export default function MobileOwnerDashboard() {
  const toast = useToasts();
  const [stockData, setStockData] = useState<StockEntry[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stockRes, reqRes] = await Promise.all([
        api.get("/stock"),
        api.get("/stock/edit-requests/pending")
      ]);
      setStockData(stockRes.data);
      setEditRequests(reqRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/stock/edit-requests/${id}/approve`);
      toast.success("Edit request approved and applied.");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve edit request.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/stock/edit-requests/${id}/reject`);
      toast.success("Edit request rejected.");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject edit request.");
    }
  };

  // Analytics Computation
  const pieData = useMemo(() => {
    let soldPvt = 0;
    let unsoldPvt = 0;
    let soldAuction = 0;
    let unsoldAuction = 0;
    
    stockData.forEach(s => {
      const isSold = s.soldRate !== null && s.soldRate > 0;
      const isAuction = !!s.auction;
      
      if (isAuction && isSold) soldAuction++;
      else if (isAuction && !isSold) unsoldAuction++;
      else if (!isAuction && isSold) soldPvt++;
      else unsoldPvt++;
    });

    return [
      { name: 'Sold-Pvt', value: soldPvt },
      { name: 'Unsold', value: unsoldPvt },
      { name: 'Sold-Auction', value: soldAuction },
      { name: 'Unsold-Auction', value: unsoldAuction }
    ].filter(item => item.value > 0);
  }, [stockData]);

  const lineData = useMemo(() => {
    const monthsMap: Record<string, { month: string, production: number, sales: number }> = {};
    
    stockData.forEach(s => {
      if (s.dop) {
        const d = new Date(s.dop);
        const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthsMap[monthYear]) monthsMap[monthYear] = { month: monthYear, production: 0, sales: 0 };
        monthsMap[monthYear].production += s.netWt || 0;
      }
      if (s.soldDate && s.soldRate) {
        const d = new Date(s.soldDate);
        const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthsMap[monthYear]) monthsMap[monthYear] = { month: monthYear, production: 0, sales: 0 };
        monthsMap[monthYear].sales += s.netWt || 0;
      }
    });

    return Object.values(monthsMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [stockData]);

  const sortedEditRequests = useMemo(() => {
    return [...editRequests].sort((a, b) => {
      const aHasAuction = a.newData && a.newData.auction !== undefined && String(a.newData.auction) !== String(a.stock.auction || false);
      const bHasAuction = b.newData && b.newData.auction !== undefined && String(b.newData.auction) !== String(b.stock.auction || false);
      if (aHasAuction && !bHasAuction) return -1;
      if (!aHasAuction && bHasAuction) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [editRequests]);

  const totalProduction = lineData.reduce((acc, val) => acc + val.production, 0);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50 min-h-full pb-20">
      
      {/* Header section (if page-specific title needed) */}
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Overview</h2>
        <p className="text-gray-500 text-sm mt-1">Welcome back to the dashboard.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Entries</p>
            <p className="text-2xl font-bold text-gray-900">{stockData.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Package size={24} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Prod (Kg)</p>
            <p className="text-2xl font-bold text-gray-900">{totalProduction.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={24} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pending Edits</p>
            <p className="text-2xl font-bold text-gray-900">{editRequests.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Stock Status</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 600 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm overflow-hidden">
          <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Production vs Sales</h2>
          <div className="h-64 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  labelStyle={{ fontWeight: 700, color: '#374151', marginBottom: '4px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="plainline" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Line type="monotone" dataKey="production" name="Production" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="#10b981" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pending Edit Requests - Mobile Optimized Cards */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Pending Edits</h2>
          <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded border border-orange-200">
            {editRequests.length}
          </span>
        </div>
        
        <div className="divide-y divide-gray-100">
          {editRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-medium">
              No pending edit requests.
            </div>
          ) : (
            sortedEditRequests.map((req) => {
              const isHighPriority = req.newData && req.newData.auction !== undefined && String(req.newData.auction) !== String(req.stock.auction || false);
              
              return (
                <div key={req.id} className={`p-4 sm:p-5 transition-colors ${isHighPriority ? 'bg-red-50/30' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-sm">{req.stock.inv || 'N/A'} - {req.stock.invNo || 'N/A'}</span>
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{req.stock.grade}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        By {req.requestedBy} • {new Date(req.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    {isHighPriority && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-wider">
                        Priority
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 space-y-2">
                    {Object.entries(req.newData).map(([key, val]) => {
                      const original = (req.stock as any)[key];
                      if (val != original && val !== '') {
                        return (
                          <div key={key} className="flex gap-2 items-center text-xs justify-between">
                            <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">{key}</span>
                            <div className="flex gap-2 items-center">
                              <span className="text-red-500 line-through font-medium">{original || 'empty'}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-emerald-600 font-bold">{String(val)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleReject(req.id)}
                      className="flex-1 flex justify-center items-center gap-1.5 bg-white text-red-600 hover:bg-red-50 border border-red-200 py-2.5 rounded-xl transition-colors font-bold text-xs shadow-sm"
                    >
                      <X size={16} /> Reject
                    </button>
                    <button 
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 flex justify-center items-center gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600 border border-emerald-600 py-2.5 rounded-xl transition-colors font-bold text-xs shadow-sm"
                    >
                      <Check size={16} /> Approve
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
