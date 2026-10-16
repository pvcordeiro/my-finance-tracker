"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface User {
  id: number;
  username: string;
  is_admin?: boolean;
  groups?: Array<{ group_id: number; name: string }>;
  current_group_id?: number | null;
  language?: string;
  currency?: string;
  minimum_balance_alert?: number | null;
  tour_completed?: boolean;
  admin_tour_completed?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (
    username: string,
    password: string,
    email: string,
    language?: string,
    currency?: string
  ) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  completeTour: () => Promise<boolean>;
  completeAdminTour: () => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const source = new EventSource("/api/auth/session/stream", { withCredentials: true });
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "group-changed") {
          void refreshUser();
          window.dispatchEvent(new CustomEvent("userGroupChanged", { detail: payload }));
        }
        if (payload.type === "group-access-added") {
          void refreshUser();
          window.dispatchEvent(new CustomEvent("userGroupAccessAdded", { detail: payload }));
        }
      } catch (error) {
        console.error("Failed to process account update:", error);
      }
    };
    return () => source.close();
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (isMounted) {
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            // Persist user identity for offline fallback
            try {
              localStorage.setItem(
                "finance-tracker-user",
                JSON.stringify(data.user)
              );
            } catch {}
          } else {
            setUser(null);
            try {
              localStorage.removeItem("finance-tracker-user");
            } catch {}
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        // If we're offline, use the cached user identity so the app still renders
        if (!navigator.onLine) {
          try {
            const cached = localStorage.getItem("finance-tracker-user");
            if (cached && isMounted) {
              setUser(JSON.parse(cached));
            } else if (isMounted) {
              setUser(null);
            }
          } catch {
            if (isMounted) setUser(null);
          }
        } else {
          if (error instanceof Error && error.name === "AbortError") {
            console.warn("Session check timed out - API may still be starting");
          } else {
            console.error("Session check error:", error);
          }
          if (isMounted) setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  const login = async (
    identifier: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
        credentials: "include",
      });

      if (response.ok) {
        const { user: userData } = await response.json();
        setUser(userData);
        try {
          localStorage.setItem(
            "finance-tracker-user",
            JSON.stringify(userData)
          );
        } catch {}

        window.dispatchEvent(new Event("userLoggedIn"));

        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const register = async (
    username: string,
    password: string,
    email: string,
    language: string = "en",
    currency: string = "EUR"
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, ...(email ? { email } : {}), language, currency }),
        credentials: "include",
      });

      if (response.ok) {
        await response.json();
        return true;
      } else {
        const data = await response.json();
        throw new Error(data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      try {
        localStorage.removeItem("finance-tracker-user");
      } catch {}
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      window.dispatchEvent(new Event("userLoggedOut"));
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
      try {
        localStorage.removeItem("finance-tracker-user");
      } catch {}

      window.dispatchEvent(new Event("userLoggedOut"));
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        try { localStorage.setItem("finance-tracker-user", JSON.stringify(data.user)); } catch {}
      }
    } catch (error) {
      console.error("Refresh user error:", error);
    }
  };

  const completeTour = async () => {
    try {
      const response = await fetch("/api/user/tour", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) return false;
      setUser((current) => current ? { ...current, tour_completed: true } : current);
      try {
        const cached = localStorage.getItem("finance-tracker-user");
        if (cached) {
          localStorage.setItem(
            "finance-tracker-user",
            JSON.stringify({ ...JSON.parse(cached), tour_completed: true })
          );
        }
      } catch {}
      return true;
    } catch (error) {
      console.error("Failed to save guided tour completion:", error);
      return false;
    }
  };

  const completeAdminTour = async () => {
    try {
      const response = await fetch("/api/user/admin-tour", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) return false;
      setUser((current) => current ? { ...current, admin_tour_completed: true } : current);
      try {
        const cached = localStorage.getItem("finance-tracker-user");
        if (cached) {
          localStorage.setItem(
            "finance-tracker-user",
            JSON.stringify({ ...JSON.parse(cached), admin_tour_completed: true })
          );
        }
      } catch {}
      return true;
    } catch (error) {
      console.error("Failed to save admin tour completion:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, refreshUser, completeTour, completeAdminTour, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
