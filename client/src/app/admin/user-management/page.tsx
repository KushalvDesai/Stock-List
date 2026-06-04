"use client";

import React, { useEffect, useState } from "react";
import { LogOut, RefreshCw, Home, Users, ShieldCheck, Terminal, Activity } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { NotificationDropdown } from "@/components/notification-dropdown";

interface AppUser {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}


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
    <div className="w-full h-full flex flex-col font-mono">
        {/* Top Navbar */}
        <header className="bg-yellow-50/80 dark:bg-black/80 backdrop-blur-md border-4 border-current shadow-[4px_4px_0_0_currentColor] border-b border-current sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-none">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-current tracking-tight">User Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-current hover:text-current transition-none"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        <div className="w-full max-w-6xl mx-auto px-8 lg:px-12 pt-8 space-y-8">
          <div className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] shadow-none border border-current rounded-none p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-current flex items-center gap-2">
                  <Users className="text-indigo-500" />
                  All Users
                </h2>
                <p className="text-sm text-current font-medium mt-1">Manage user passwords and assign roles</p>
              </div>
              <button
                onClick={fetchUsers}
                className="p-2 rounded-none hover:bg-transparent text-current transition-none"
                title="Refresh Users"
              >
                <RefreshCw size={20} className={isUsersLoading ? "" : ""} />
              </button>
            </div>

            {isUsersLoading && users.length === 0 ? (
              <div className="text-center py-12 text-current">Loading users...</div>
            ) : (
              <div className="overflow-hidden rounded-none border border-current">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-transparent border-b border-current">
                      <th className="py-4 px-6 font-semibold text-current text-sm uppercase tracking-wider">Username</th>
                      <th className="py-4 px-6 font-semibold text-current text-sm uppercase tracking-wider">Role</th>
                      <th className="py-4 px-6 font-semibold text-current text-sm uppercase tracking-wider">Created</th>
                      <th className="py-4 px-6 font-semibold text-current text-sm uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent border-4 border-current shadow-[4px_4px_0_0_currentColor] divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-transparent transition-none"
                      >
                        <td className="py-4 px-6 text-current font-medium">
                          {u.username}
                        </td>
                        <td className="py-4 px-6">
                          {editingRoleId === u.id ? (
                            <select
                              defaultValue={u.role}
                              onChange={(e) => handleChangeRole(u.id, e.target.value)}
                              onBlur={() => setEditingRoleId(null)}
                              className="px-2 py-1 text-sm border border-current rounded-none outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            >
                              <option value="staff">staff</option>
                              <option value="owner">owner</option>
                              <option value="admin">admin</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingRoleId(u.id)}
                              className={`px-3 py-1 rounded-none text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                  u.role === 'owner' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                }`}
                              title="Click to change role"
                            >
                              {u.role}
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-6 text-current text-sm">
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
                                className="px-3 py-1 text-sm border rounded-none outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleChangePassword(u.id)}
                                className="px-3 py-1 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-none transition-none"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingUserId(null); setNewPassword(""); }}
                                className="px-3 py-1 text-sm text-current bg-transparent hover:bg-gray-200 rounded-none transition-none"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingUserId(u.id)}
                              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-none transition-none"
                            >
                              Reset Password
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
