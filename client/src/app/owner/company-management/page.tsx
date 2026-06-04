"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { LogOut, Building2, Factory, Tag, Users, Gavel } from "lucide-react";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { useAuthStore } from "@/store/authStore";
import { AppSidebar, SidebarLink } from "@/components/app-sidebar";
import { Home, Building, FileText, ShoppingCart } from "lucide-react";
import Link from "next/link";

const OWNER_LINKS: SidebarLink[] = [
  { href: "/owner", label: "Dashboard Home", icon: Home },
  { href: "/owner/company-management", label: "Company Management", icon: Building },
  { href: "/owner/private-sale", label: "Private Sale", icon: ShoppingCart },
  { href: "/owner/auction-sale", label: "Auction Sale", icon: Gavel },
  { href: "#", label: "Reports (Coming Soon)", icon: FileText },
];

export default function CompanyManagement() {
  const toast = useToasts();
  const [companies, setCompanies] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newCompanyName, setNewCompanyName] = useState("");
  const [newFactoryName, setNewFactoryName] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newMarkName, setNewMarkName] = useState("");
  const [selectedFactoryId, setSelectedFactoryId] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [compRes, staffRes] = await Promise.all([
        api.get("/company"),
        api.get("/company/staff"),
      ]);
      setCompanies(compRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load company data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName) return;
    try {
      await api.post("/company", { name: newCompanyName });
      toast.success("Company created!");
      setNewCompanyName("");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create company");
    }
  };

  const handleCreateFactory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactoryName || !selectedCompanyId) return;
    try {
      await api.post("/company/factory", { name: newFactoryName, companyId: selectedCompanyId });
      toast.success("Factory created!");
      setNewFactoryName("");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create factory");
    }
  };

  const handleCreateMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarkName || !selectedFactoryId) return;
    try {
      await api.post("/company/mark", { name: newMarkName, factoryId: selectedFactoryId });
      toast.success("Mark created!");
      setNewMarkName("");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create mark");
    }
  };

  const handleAssignFactory = async (staffId: string, factoryIds: string[]) => {
    try {
      await api.put(`/company/staff/${staffId}/factories`, { factoryIds });
      toast.success("Staff assigned successfully!");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to assign staff");
    }
  };

  const allFactories = companies.flatMap(c => c.factories);

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
      <AppSidebar title="Owner Panel" links={OWNER_LINKS} />
      <div className="flex-1 flex flex-col min-w-0 ml-20 pb-12">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Company Management</h1>
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

      <div className="w-full max-w-[1800px] mx-auto px-8 lg:px-12 pt-8 space-y-8">
        
        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Forms */}
          <div className="space-y-6">
            
            {/* Create Company */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Building2 size={20} className="text-indigo-500" /> Add Company</h2>
              <form onSubmit={handleCreateCompany} className="flex gap-2">
                <input 
                  type="text" 
                  value={newCompanyName} 
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Company Name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                  Add
                </button>
              </form>
            </div>

            {/* Create Factory */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Factory size={20} className="text-indigo-500" /> Add Factory</h2>
              <form onSubmit={handleCreateFactory} className="space-y-3">
                <select 
                  value={selectedCompanyId} 
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select Company...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newFactoryName} 
                    onChange={(e) => setNewFactoryName(e.target.value)}
                    placeholder="Factory Name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                    Add
                  </button>
                </div>
              </form>
            </div>

            {/* Create Mark */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Tag size={20} className="text-indigo-500" /> Add Mark</h2>
              <form onSubmit={handleCreateMark} className="space-y-3">
                <select 
                  value={selectedFactoryId} 
                  onChange={(e) => setSelectedFactoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select Factory...</option>
                  {allFactories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMarkName} 
                    onChange={(e) => setNewMarkName(e.target.value)}
                    placeholder="Mark Name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                    Add
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* Middle Column: Architecture View */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-1">
            <h2 className="text-lg font-bold mb-6 border-b pb-2">Hierarchy</h2>
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
              {companies.map(company => (
                <div key={company.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                    <Building2 size={16} className="text-gray-400" /> {company.name}
                  </h3>
                  {company.factories.length === 0 ? (
                    <p className="text-xs text-gray-500 italic pl-6">No factories</p>
                  ) : (
                    <div className="space-y-4 pl-4 border-l-2 border-indigo-100 ml-2">
                      {company.factories.map((factory: any) => (
                        <div key={factory.id} className="relative">
                          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-2">
                            <Factory size={14} className="text-indigo-400" /> {factory.name}
                          </h4>
                          {factory.marks.length === 0 ? (
                            <p className="text-xs text-gray-500 italic pl-6">No marks</p>
                          ) : (
                            <div className="flex flex-wrap gap-2 pl-6">
                              {factory.marks.map((mark: any) => (
                                <span key={mark.id} className="inline-flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-md text-xs font-medium text-gray-600 shadow-sm">
                                  <Tag size={10} /> {mark.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {companies.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">No companies registered yet.</p>
              )}
            </div>
          </div>

          {/* Right Column: Staff Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-1">
             <h2 className="text-lg font-bold flex items-center gap-2 mb-6 border-b pb-2"><Users size={20} className="text-indigo-500" /> Staff Assignment</h2>
             
             <div className="space-y-3">
               {staff.map(user => (
                 <div key={user.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex flex-col gap-3">
                   <div className="flex justify-between items-center">
                     <span className="font-medium text-gray-800">{user.username}</span>
                     {user.factories && user.factories.length > 0 ? (
                       <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-green-100 text-green-800 rounded">Assigned ({user.factories.length})</span>
                     ) : (
                       <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Unassigned</span>
                     )}
                   </div>
                   
                   <div className="bg-white border border-gray-200 rounded p-3 max-h-40 overflow-y-auto space-y-2">
                     <p className="text-xs text-gray-500 font-semibold mb-2">Assign Factories:</p>
                     {allFactories.map(f => {
                       const isAssigned = user.factories?.some((uf: any) => uf.id === f.id);
                       return (
                         <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                           <input 
                             type="checkbox" 
                             checked={isAssigned || false}
                             onChange={(e) => {
                               const currentIds = user.factories?.map((uf: any) => uf.id) || [];
                               const newIds = e.target.checked 
                                 ? [...currentIds, f.id] 
                                 : currentIds.filter((id: string) => id !== f.id);
                               handleAssignFactory(user.id, newIds);
                             }}
                             className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                           />
                           {f.name}
                         </label>
                       );
                     })}
                     {allFactories.length === 0 && <p className="text-xs text-gray-400">No factories available</p>}
                   </div>
                 </div>
               ))}
               {staff.length === 0 && (
                 <p className="text-sm text-gray-500 text-center py-8">No staff members found.</p>
               )}
             </div>
          </div>

        </div>
      </div>
    </div>
    </div>
  );
}
