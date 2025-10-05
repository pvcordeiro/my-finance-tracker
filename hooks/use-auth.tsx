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
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

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
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          console.warn("Session check timed out - API may still be starting");
        } else {
          console.error("Session check error:", error);
        }
        if (isMounted) setUser(null);
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
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (response.ok) {
        const { user: userData } = await response.json();
        setUser(userData);

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
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (response.ok) {
        const { user: userData } = await response.json();
        setUser(userData);

        window.dispatchEvent(new Event("userLoggedIn"));

        return true;
      }

      if (response.status === 403) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration is disabled");
      }

      return false;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      window.dispatchEvent(new Event("userLoggedOut"));
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);

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
      }
    } catch (error) {
      console.error("Refresh user error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, refreshUser, isLoading }}
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
