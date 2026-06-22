"use client";

import React, { useEffect, useState, useRef } from "react";
import { Bell, CheckCircle2, Circle, Trash2, X } from "lucide-react";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { useNotificationStore } from "@/store/notificationStore";

export function MobileNotificationDropdown() {
  const { notifications, fetchNotifications, setNotifications } = useNotificationStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const toast = useToasts();
  
  // Track seen IDs to send push notifications only for new ones
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Request Notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Polling & Push Notifications logic
  useEffect(() => {
    fetchNotifications(true); // Initial fetch
    
    const interval = setInterval(async () => {
      await fetchNotifications(true);
    }, 15000); // 15 seconds polling for mobile

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Trigger push notifications when `notifications` changes
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    
    // Check for any completely new notifications we haven't seen before
    let newUnreadFound = false;
    
    notifications.forEach((notif: any) => {
      if (!seenIdsRef.current.has(notif.id)) {
        seenIdsRef.current.add(notif.id);
        
        // Only push if it's currently unread
        if (!notif.isRead) {
          newUnreadFound = true;
          try {
            new Notification(notif.title || "New Notification", {
              body: notif.message || "",
              icon: "/icon-192x192.png" // Standard PWA icon path
            });
          } catch (err) {
            console.error("Failed to trigger push notification", err);
          }
        }
      }
    });
    
    // Optional: play a subtle sound if newUnreadFound, though browser Notification usually does it
  }, [notifications]);

  const handleToggleOpen = async () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen) {
      const hasUnread = notifications.some(n => !n.isRead);
      if (hasUnread) {
        try {
          await api.put("/notifications/read-all");
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
          console.error("Failed to mark notifications as read:", error);
        }
      }
    }
  };

  const handleToggleNotificationStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/notifications/${id}/status`, { isRead: !currentStatus });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !currentStatus } : n));
    } catch (error) {
      toast.error("Failed to update notification");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete("/notifications/clear-all");
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <button 
        onClick={handleToggleOpen}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Full Screen Modal */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
          <div className="flex-none bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
            <div className="flex items-center gap-4">
              {notifications.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-xs font-bold text-slate-800 hover:text-red-600"
                >
                  Clear All
                </button>
              )}
              <button 
                onClick={() => setIsNotifOpen(false)}
                className="p-2 bg-gray-100 text-gray-600 rounded-full active:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-800">
                <Bell size={40} className="text-gray-300 mb-3" />
                <p className="font-medium">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const metadata = notif.metadata as any;
                const expiresAt = metadata?.expiresAt ? new Date(metadata.expiresAt) : null;
                const timeRemaining = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60000)) : 0;
                
                return (
                  <div key={notif.id} className={`p-4 rounded-2xl border transition-colors shadow-sm ${!notif.isRead ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-gray-100'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-gray-800">{notif.title}</h4>
                        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{notif.message}</p>
                        {timeRemaining > 0 && (
                          <p className="text-xs text-red-500 font-bold mt-2">
                            Ban expires in: {timeRemaining} mins
                          </p>
                        )}
                        <p className="text-[10px] text-slate-700 font-medium mt-3">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleToggleNotificationStatus(notif.id, notif.isRead)}
                          className={`p-2 rounded-xl transition-colors ${notif.isRead ? 'bg-emerald-50 text-emerald-600' : 'bg-white border border-gray-200 text-slate-700'}`}
                        >
                          {notif.isRead ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteNotification(notif.id)}
                          className="p-2 rounded-xl bg-red-50 text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
