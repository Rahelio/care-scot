import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/lib/api-url";

const TOKEN_KEY = "care_scot_token";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  organisationId: string;
  staffMemberId: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(json);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          const payload = decodeJwtPayload(stored);
          const exp = payload.exp as number;
          if (exp * 1000 > Date.now()) {
            setToken(stored);
            setUser({
              id: payload.id as string,
              email: payload.email as string,
              role: payload.role as string,
              organisationId: payload.organisationId as string,
              staffMemberId: (payload.staffMemberId as string | null) ?? null,
            });
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        }
      } catch {
        // ignore restore errors
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/api/mobile/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Login failed");
    }

    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
