import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  role: 'staff' | 'owner' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string, isMobile?: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token, isMobile = false) => {
        // Save token to cookies so Next.js middleware can read it
        if (typeof window !== 'undefined') {
          const maxAge = (user.role === 'owner' && isMobile) ? 8640000 : 86400; // 100 days vs 1 day
          document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Strict`;
        }
        set({ user, token });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
