import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { api } from "@/lib/axios";
import { useToasts } from "@/components/toast";
import { NotificationButton } from "@/components/ui/notification-button";

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const toast = useToasts();

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

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const handleToggleNotificationStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/notifications/${id}/status`, { isRead: !currentStatus });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !currentStatus } : n));
    } catch (error) {
      console.error("Failed to toggle notification status:", error);
      toast.error("Failed to update notification");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete("/notifications/clear-all");
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Failed to clear notifications:", error);
      toast.error("Failed to clear notifications");
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <NotificationButton 
        count={notifications.filter(n => !n.isRead).length} 
        onClick={handleToggleOpen}
        className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 shadow-sm"
      />
      {isNotifOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                >
                  Clear All
                </button>
              )}
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                {notifications.length} Total
              </span>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No notifications yet!
              </div>
            ) : (
              notifications.map((notif) => {
                const metadata = notif.metadata as any;
                const expiresAt = metadata?.expiresAt ? new Date(metadata.expiresAt) : null;
                const timeRemaining = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60000)) : 0;
                
                return (
                  <div key={notif.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-800">{notif.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                        {timeRemaining > 0 && (
                          <p className="text-xs text-red-500 font-medium mt-2">
                            Ban expires in: {timeRemaining} mins
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-2">
                          {new Date(notif.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button 
                          onClick={() => handleToggleNotificationStatus(notif.id, notif.isRead)}
                          className={`p-1.5 rounded-md hover:bg-gray-200 transition-colors ${notif.isRead ? 'text-green-600' : 'text-gray-600'}`}
                          title={notif.isRead ? "Mark as unread" : "Mark as read"}
                        >
                          {notif.isRead ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteNotification(notif.id)}
                          className="p-1.5 rounded-md hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 size={16} />
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
    </div>
  );
}
