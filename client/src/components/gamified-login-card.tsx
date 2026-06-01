"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useToasts } from "./toast"

interface ConfettiParticle {
  id: number
  x: number
  y: number
  rotate: number
  color: string
}

const colors = ["#facc15", "#22c55e", "#3b82f6", "#f472b6", "#f97316"]

interface GamifiedLoginCardProps {
  mode: "login" | "signup";
  onSubmit: (data: any) => Promise<void>;
  error?: string | null;
}

function TimerToast() {
  const [timeLeft, setTimeLeft] = React.useState(3600);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const mm = m < 10 ? `0${m}` : m;
  const ss = s < 10 ? `0${s}` : s;

  return (
    <div className="flex flex-col">
      <span className="font-bold">Too many login attempts.</span>
      <span className="text-sm mt-1">Try again after {mm}:{ss}</span>
    </div>
  );
}

export default function GamifiedLoginCard({ mode, onSubmit, error: externalError }: GamifiedLoginCardProps) {
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [role, setRole] = React.useState("staff")
  const [success, setSuccess] = React.useState(false)
  const [particles, setParticles] = React.useState<ConfettiParticle[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [internalError, setInternalError] = React.useState<string | null>(null)
  
  const toast = useToasts();

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setIsLoading(true)
    setInternalError(null)

    try {
      await onSubmit({ username, password, role })
      
      const newParticles: ConfettiParticle[] = Array.from({ length: 30 }).map((_, i) => ({
        id: Date.now() + i,
        x: 0,
        y: 0,
        rotate: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
      setParticles(newParticles)
      setSuccess(true)

      setTimeout(() => setParticles([]), 1000)
    } catch (err: any) {
      if (err.response?.status === 429) {
        toast.error(<TimerToast />, true); // true for preserve so it doesn't auto-dismiss
        setInternalError("Too many attempts. Please wait 1 hour.");
      }
    } finally {
      setIsLoading(false)
    }
  }

  const displayError = internalError || externalError;

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-gray-50">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute z-50 w-3 h-3 rounded-full pointer-events-none"
            style={{ backgroundColor: p.color }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: p.rotate }}
            animate={{
              x: (Math.random() - 0.5) * 150,
              y: -Math.random() * 200,
              scale: 0,
              opacity: 0,
              rotate: p.rotate + Math.random() * 360,
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 flex flex-col gap-6"
      >
        <h2 className="text-3xl font-bold text-center text-gray-900">
          {success ? "Success!" : mode === "login" ? "Sign In" : "Sign Up"}
        </h2>

        <form onSubmit={handleAction} className="flex flex-col gap-4 mt-2">
          {displayError && <div className="text-red-500 text-sm text-center font-medium">{displayError}</div>}
          
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setInternalError(null); }}
              className="hover:scale-105 transition-transform duration-200"
              required
            />
          </div>
          
          {mode === "signup" && (
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:scale-105 transition-transform duration-200"
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setInternalError(null); }}
              className="hover:scale-105 transition-transform duration-200"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !!internalError}
            className="w-full mt-4 hover:scale-110 transition-transform duration-200"
          >
            {success ? (mode === "login" ? "Logged In!" : "Signed Up!") : mode === "login" ? "Login" : "Sign Up"}
          </Button>
        </form>

        {!success && (
          <p className="text-center text-sm text-gray-500 mt-2">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <Link 
              href={mode === "login" ? "/signup" : "/login"} 
              className="text-indigo-600 hover:underline"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  )
}
