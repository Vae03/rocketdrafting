"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { setActiveProfileId, resetToGuestProfile } from "@/lib/profile-scope";
import type { AuthUser } from "@/components/auth-shared";

type Ctx = {
  user: AuthUser | null | undefined; // undefined = still loading the initial /api/auth/me check
  onAuthed: (user: AuthUser) => void;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => setUser(data.user)).catch(() => setUser(null));
  }, []);

  function onAuthed(u: AuthUser) {
    // Each account owns its own coins/XP/shop/stats/career bucket on this device -- reload so
    // every already-mounted component re-reads from the newly-active bucket instead of staying
    // stale on whatever was showing before (see lib/profile-scope.ts).
    setActiveProfileId(u.id);
    window.location.reload();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    resetToGuestProfile();
    window.location.reload();
  }

  return <AuthContext.Provider value={{ user, onAuthed, logout, updateUser: setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
