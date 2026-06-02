"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { Check, X, LogOut, TrendingUp, Package, Clock, Menu, Building, FileText, Settings, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";
import { useAuthStore } from "@/store/authStore";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { AppSidebar, SidebarLink } from "@/components/app-sidebar";
import Link from "next/link";

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

const COLORS = ['#10b981', '#f43f5e']; // Sold, Unsold

const OWNER_LINKS: SidebarLink[] = [
  { href: "/owner", label: "Dashboard Home", icon: Home },
  { href: "/owner/company-management", label: "Company Management", icon: Building },
  { href: "#", label: "Reports (Coming Soon)", icon: FileText },
  { href: "#", label: "Settings (Coming Soon)", icon: Settings },
];

export default function OwnerDashboard() {
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
    let sold = 0;
    let unsold = 0;
    stockData.forEach(s => {
      if (s.soldRate !== null && s.soldRate > 0) sold++;
      else unsold++;
    });
    return [
      { name: 'Sold', value: sold },
      { name: 'Unsold', value: unsold }
    ];
  }, [stockData]);

  const lineData = useMemo(() => {
    const monthsMap: Record<string, { month: string, production: number, sales: number }> = {};
    
    // Process Production (DOP)
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
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
      
      <AppSidebar title="Owner Panel" links={OWNER_LINKS} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 ml-20">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-8 h-16 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Overview</h1>
          </div>
        <div className="flex items-center gap-4">
          <NotificationDropdown />
          <button 
            onClick={() => {
              useAuthStore.getState().logout();
              window.location.href = '/login';
            }}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>

      <div className="w-full px-8 pt-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded border border-gray-200 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Stock Entries</p>
              <p className="text-2xl font-bold text-gray-900">{stockData.length}</p>
            </div>
            <div className="w-12 h-12 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package size={24} />
            </div>
          </div>
          <div className="bg-white rounded border border-gray-200 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Production (Kg)</p>
              <p className="text-2xl font-bold text-gray-900">{totalProduction.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="bg-white rounded border border-gray-200 p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pending Edits</p>
              <p className="text-2xl font-bold text-gray-900">{editRequests.length}</p>
            </div>
            <div className="w-12 h-12 rounded bg-orange-50 flex items-center justify-center text-orange-600">
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Pie Chart */}
          <div className="bg-white rounded border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-wide">Stock Status (Entries)</h2>
            <div className="h-64 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                    contentStyle={{ borderRadius: '4px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart */}
          <div className="bg-white rounded border border-gray-200 p-6 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 uppercase tracking-wide">Production vs Sales (Kg)</h2>
            <div className="h-64 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: '#6b7280' }} 
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '4px', border: '1px solid #e5e7eb', padding: '10px' }}
                    labelStyle={{ fontWeight: 600, color: '#374151', marginBottom: '5px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="plainline" wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="production" name="Production" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="sales" name="Sales" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pending Edit Requests */}
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Pending Edit Requests</h2>
            <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-orange-200">
              {editRequests.length} Pending
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Requested By</th>
                  <th className="px-6 py-3 font-semibold">Original Entry (INV/NO)</th>
                  <th className="px-6 py-3 font-semibold">Proposed Changes</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {editRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">
                      No pending edit requests at this time.
                    </td>
                  </tr>
                ) : (
                  sortedEditRequests.map((req) => {
                    const isHighPriority = req.newData && req.newData.auction !== undefined && String(req.newData.auction) !== String(req.stock.auction || false);
                    return (
                    <tr key={req.id} className={`hover:bg-gray-50 transition-colors ${isHighPriority ? 'bg-red-50/50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {req.requestedBy}
                      </td>
                      <td className="px-6 py-4">
                        {req.stock.inv || 'N/A'} - {req.stock.invNo || 'N/A'} (Grade: {req.stock.grade})
                        {isHighPriority && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-wider">High Priority</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {Object.entries(req.newData).map(([key, val]) => {
                            const original = (req.stock as any)[key];
                            if (val != original && val !== '') {
                              return (
                                <div key={key} className="flex gap-2 items-center text-xs">
                                  <span className="font-semibold text-gray-700 capitalize">{key}:</span>
                                  <span className="text-red-500 line-through">{original || 'empty'}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-emerald-600 font-bold">{String(val)}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(req.id)}
                            className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded transition-colors font-medium text-xs shadow-sm"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button 
                            onClick={() => handleReject(req.id)}
                            className="flex items-center gap-1 bg-white text-red-600 hover:bg-red-50 border border-gray-300 px-3 py-1.5 rounded transition-colors font-medium text-xs shadow-sm"
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
