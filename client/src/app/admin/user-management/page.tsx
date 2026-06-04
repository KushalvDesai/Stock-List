"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, RefreshCw, Home, Users, ShieldCheck, Terminal, Activity } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { AppSidebar, SidebarLink } from "@/components/app-sidebar";

interface AppUser {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

const ADMIN_LINKS: SidebarLink[] = [
  { href: "/admin", label: "Security Dashboard", icon: Home },
  { href: "/admin/user-management", label: "User Management", icon: Users },
  { href: "/admin/log-display", label: "System Logs", icon: Terminal },
  { href: "/admin/telemetry", label: "Telemetry", icon: Activity },
];

export default function UserManagementPage() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const toast = useToasts();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 5) {
      toast.error("Password must be at least 5 characters long");
      return;
    }
    try {
      await api.post(`/admin/users/${userId}/password`, { newPassword });
      setEditingUserId(null);
      setNewPassword("");
      toast.success("Password updated successfully");
    } catch (error: any) {
      console.error("Failed to change password:", error);
      toast.error(error.response?.data?.message || "Failed to update password");
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await api.post(`/admin/users/${userId}/role`, { role: newRole });
      toast.success("Role updated successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to update role:", error);
      toast.error(error.response?.data?.message || "Failed to update role");
    } finally {
      setEditingRoleId(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
      <AppSidebar title="Admin Panel" links={ADMIN_LINKS} />

      <div className="flex-1 flex flex-col min-w-0 ml-20 pb-12">
        {/* Top Navbar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">User Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        <div className="w-full max-w-6xl mx-auto px-8 lg:px-12 pt-8 space-y-8">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users className="text-indigo-500" />
                  All Users
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Manage user passwords and assign roles</p>
              </div>
              <button
                onClick={fetchUsers}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                title="Refresh Users"
              >
                <RefreshCw size={20} className={isUsersLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {isUsersLoading && users.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Loading users...</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-4 px-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">Username</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">Role</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">Created</th>
                      <th className="py-4 px-6 font-semibold text-gray-600 text-sm uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {users.map((u) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-6 text-gray-800 font-medium">
                          {u.username}
                        </td>
                        <td className="py-4 px-6">
                          {editingRoleId === u.id ? (
                            <select
                              defaultValue={u.role}
                              onChange={(e) => handleChangeRole(u.id, e.target.value)}
                              onBlur={() => setEditingRoleId(null)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            >
                              <option value="staff">staff</option>
                              <option value="owner">owner</option>
                              <option value="admin">admin</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingRoleId(u.id)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                  u.role === 'owner' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                }`}
                              title="Click to change role"
                            >
                              {u.role}
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-6 text-gray-500 text-sm">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {editingUserId === u.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="password"
                                placeholder="New password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="px-3 py-1 text-sm border rounded outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleChangePassword(u.id)}
                                className="px-3 py-1 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingUserId(null); setNewPassword(""); }}
                                className="px-3 py-1 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingUserId(u.id)}
                              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                              Reset Password
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
