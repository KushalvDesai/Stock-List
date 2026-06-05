"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import { Building2, Factory, Tag, Users, KeyRound, Trash2, Check } from "lucide-react";
import { useToasts } from "@/components/toast";

export default function MobileCompanyManagementPage() {
  const toast = useToasts();
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'staff'>('staff');
  const [companies, setCompanies] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Forms
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newFactoryName, setNewFactoryName] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newMarkName, setNewMarkName] = useState("");
  const [selectedFactoryId, setSelectedFactoryId] = useState("");
  
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");

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
      console.error(error);
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

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffUsername || !newStaffPassword) return;
    try {
      await api.post("/company/staff", { username: newStaffUsername, password: newStaffPassword });
      toast.success("Staff created!");
      setNewStaffUsername("");
      setNewStaffPassword("");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create staff");
    }
  };

  const handleAssignFactory = async (staffId: string, factoryIds: string[]) => {
    try {
      await api.put(`/company/staff/${staffId}/factories`, { factoryIds });
      toast.success("Assigned successfully!");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to assign staff");
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Delete this staff member?")) return;
    try {
      await api.delete(`/company/staff/${staffId}`);
      toast.success("Deleted!");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete");
    }
  };

  const handleResetPassword = async (staffId: string) => {
    const newPwd = prompt("Enter new password:");
    if (!newPwd || newPwd.length < 5) return toast.error("Too short");
    try {
      await api.put(`/company/staff/${staffId}/password`, { newPassword: newPwd });
      toast.success("Password updated!");
    } catch (error: any) {
      toast.error("Failed to reset");
    }
  };

  const allFactories = companies.flatMap(c => c.factories || []);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Top Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex w-full">
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${
              activeTab === 'staff' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
            }`}
          >
            Staff Accounts
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${
              activeTab === 'hierarchy' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
            }`}
          >
            Company Hierarchy
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : activeTab === 'staff' ? (
          <div className="space-y-6">
            {/* Create Staff Form */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Users size={18} className="text-indigo-500"/> Add Staff Member</h3>
              <form onSubmit={handleCreateStaff} className="space-y-3">
                <input 
                  type="text" 
                  value={newStaffUsername} 
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newStaffPassword} 
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="Password"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                  <button type="button" onClick={() => setNewStaffPassword(Math.random().toString(36).slice(-8))} className="bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold active:bg-slate-300">
                    GEN
                  </button>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl active:bg-indigo-700">
                  Create Account
                </button>
              </form>
            </div>

            {/* Staff List */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider ml-1">Existing Staff</h3>
              {staff.length === 0 && <p className="text-sm text-gray-500 ml-1">No staff created yet.</p>}
              
              {staff.map(user => (
                <div key={user.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                    <div className="font-bold text-gray-800">{user.username}</div>
                    <div className="flex gap-2">
                      <button onClick={() => handleResetPassword(user.id)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg active:bg-indigo-100">
                        <KeyRound size={16} />
                      </button>
                      <button onClick={() => handleDeleteStaff(user.id)} className="p-2 bg-red-50 text-red-600 rounded-lg active:bg-red-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-gray-800 uppercase mb-3">Assign Factories</p>
                    <div className="space-y-2">
                      {allFactories.map(f => {
                        const isAssigned = user.factories?.some((uf: any) => uf.id === f.id);
                        return (
                          <label key={f.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                            isAssigned ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}>
                            <span className={`text-sm font-bold ${isAssigned ? 'text-indigo-900' : 'text-gray-700'}`}>
                              {f.name}
                            </span>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              isAssigned ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300'
                            }`}>
                              {isAssigned && <Check size={14} className="stroke-[3]" />}
                            </div>
                            <input 
                              type="checkbox" 
                              checked={isAssigned || false}
                              onChange={(e) => {
                                const currentIds = user.factories?.map((uf: any) => uf.id) || [];
                                const newIds = e.target.checked ? [...currentIds, f.id] : currentIds.filter((id: string) => id !== f.id);
                                handleAssignFactory(user.id, newIds);
                              }}
                              className="hidden"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Forms */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <form onSubmit={handleCreateCompany} className="flex gap-2">
                <input 
                  type="text" 
                  value={newCompanyName} 
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="New Company"
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button type="submit" className="bg-indigo-600 text-white font-bold px-4 rounded-xl active:bg-indigo-700">Add</button>
              </form>
              
              <form onSubmit={handleCreateFactory} className="flex gap-2">
                <select 
                  value={selectedCompanyId} 
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-1/3 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs"
                >
                  <option value="">Company...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input 
                  type="text" 
                  value={newFactoryName} 
                  onChange={(e) => setNewFactoryName(e.target.value)}
                  placeholder="New Factory"
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button type="submit" className="bg-indigo-600 text-white font-bold px-4 rounded-xl active:bg-indigo-700">Add</button>
              </form>
              
              <form onSubmit={handleCreateMark} className="flex gap-2">
                <select 
                  value={selectedFactoryId} 
                  onChange={(e) => setSelectedFactoryId(e.target.value)}
                  className="w-1/3 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs"
                >
                  <option value="">Factory...</option>
                  {allFactories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <input 
                  type="text" 
                  value={newMarkName} 
                  onChange={(e) => setNewMarkName(e.target.value)}
                  placeholder="New Mark"
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button type="submit" className="bg-indigo-600 text-white font-bold px-4 rounded-xl active:bg-indigo-700">Add</button>
              </form>
            </div>

            {/* Tree */}
            <div className="space-y-3 pb-8">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider ml-1">Current Hierarchy</h3>
              {companies.map(company => (
                <div key={company.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-3">
                    <Building2 size={18} /> {company.name}
                  </h4>
                  <div className="space-y-3 pl-2 border-l-2 border-indigo-100 ml-2">
                    {company.factories.map((factory: any) => (
                      <div key={factory.id}>
                        <h5 className="font-bold text-gray-700 flex items-center gap-2 mb-2 text-sm">
                          <Factory size={14} className="text-gray-400" /> {factory.name}
                        </h5>
                        <div className="flex flex-wrap gap-1.5 pl-5">
                          {factory.marks.map((mark: any) => (
                            <span key={mark.id} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">
                              <Tag size={10} className="inline mr-1" />{mark.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
