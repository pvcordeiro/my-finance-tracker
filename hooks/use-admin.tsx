"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface AdminUser {
  isAdmin: boolean;
}

interface AdminContextType {
  adminUser: AdminUser | null;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing admin session
    const savedAdmin = localStorage.getItem("finance-admin");
    if (savedAdmin) {
      setAdminUser(JSON.parse(savedAdmin));
    }
    setIsLoading(false);
  }, []);

  const loginAdmin = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const adminData = { isAdmin: true };
        setAdminUser(adminData);
        localStorage.setItem("finance-admin", JSON.stringify(adminData));
        localStorage.setItem(
          "admin-auth",
          Buffer.from(`${username}:${password}`).toString("base64")
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Admin login error:", error);
      return false;
    }
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    localStorage.removeItem("finance-admin");
    localStorage.removeItem("admin-auth");
  };

  return (
    <AdminContext.Provider
      value={{ adminUser, loginAdmin, logoutAdmin, isLoading }}
    >
      {children}
    </AdminContext.Provider>
  );
}
