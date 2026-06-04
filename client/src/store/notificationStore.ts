import { create } from 'zustand';
import { api } from '@/lib/axios';

interface NotificationState {
  notifications: any[];
  lastFetched: number | null;
  isLoading: boolean;
  fetchNotifications: (force?: boolean) => Promise<void>;
  setNotifications: (updater: any[] | ((prev: any[]) => any[])) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  lastFetched: null,
  isLoading: false,
  
  fetchNotifications: async (force = false) => {
    const { lastFetched, isLoading } = get();
    const now = Date.now();
    
    // Cache for 60 seconds. Don't fetch if currently loading or within cache time (unless forced)
    if (!force && (isLoading || (lastFetched && now - lastFetched < 60000))) {
      return;
    }

    set({ isLoading: true });
    try {
      const res = await api.get('/notifications');
      set({ notifications: res.data, lastFetched: Date.now(), isLoading: false });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({ isLoading: false });
    }
  },
  
  setNotifications: (updater) => {
    set((state) => ({
      notifications: typeof updater === 'function' ? updater(state.notifications) : updater
    }));
  }
}));
