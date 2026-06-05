"use client";

import { useState } from "react";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import GamifiedLoginCard from "@/components/gamified-login-card";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: any) => {
    setError(null);
    try {
      const response = await api.post("/auth/login", data);
      const { user, token } = response.data;

      setAuth(user, token);

      // Redirect based on role or to dashboard
      if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "owner") {
        const isMobile = typeof window !== 'undefined' && 
          (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 850);
        
        if (isMobile) {
          router.push("/owner-mobile");
        } else {
          router.push("/owner");
        }
      } else {
        router.push("/staff");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Invalid credentials";
      setError(errMsg);
      throw err;
    }
  };

  return <GamifiedLoginCard mode="login" onSubmit={handleLogin} error={error} />;
}
