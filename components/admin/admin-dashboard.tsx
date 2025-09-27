"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Users,
  Settings,
  Trash2,
  LogOut,
  UserPlus,
  Activity,
  Calendar,
  ChevronDown,
  Home,
  User,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
import { useTheme } from "next-themes";

interface User {
  id: number;
  username: string;
  created_at: string;
  entry_count: number;
  last_activity: string | null;
}

interface AdminSettings {
  allow_registration: boolean;
}

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({
    allow_registration: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setError("Failed to load users");
      }
    } catch (error) {
      setError("Error loading users");
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        setError("Failed to load settings");
      }
    } catch (error) {
      setError("Error loading settings");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadUsers(), loadSettings()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const deleteUser = async (userId: number) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/admin/users?userId=${userToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setMessage("User deleted successfully");
        loadUsers();
      } else {
        setError("Failed to delete user");
      }
    } catch (error) {
      setError("Error deleting user");
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const updateSettings = async (newSettings: Partial<AdminSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSettings),
        credentials: "include",
      });

      if (response.ok) {
        setSettings(updatedSettings);
        setMessage("Settings updated successfully");
      } else {
        setError("Failed to update settings");
      }
    } catch (error) {
      setError("Error updating settings");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen finance-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-destructive border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen finance-gradient">
      <header className="bg-background/90 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-destructive rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-destructive-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-destructive">
                  Admin Panel
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Finance Tracker Administration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span>{user?.username}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      setTheme(resolvedTheme === "dark" ? "light" : "dark")
                    }
                    className="cursor-pointer"
                  >
                    {mounted && resolvedTheme === "dark" ? (
                      <Sun className="w-4 h-4 mr-2" />
                    ) : (
                      <Moon className="w-4 h-4 mr-2" />
                    )}
                    {mounted && resolvedTheme === "dark"
                      ? "Light Mode"
                      : "Dark Mode"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/")}
                    className="cursor-pointer"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Back to App
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              System Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage all registered users and their data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium">Total Users</p>
                            <p className="text-2xl font-bold">{users.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">Active Users</p>
                            <p className="text-2xl font-bold">
                              {users.filter((u) => u.entry_count > 0).length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                          <UserPlus className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">Registration</p>
                            <Badge
                              variant={
                                settings.allow_registration
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {settings.allow_registration
                                ? "Enabled"
                                : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="border rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left p-4 font-medium">
                              Username
                            </th>
                            <th className="text-left p-4 font-medium">
                              Created
                            </th>
                            <th className="text-left p-4 font-medium">
                              Entries
                            </th>
                            <th className="text-left p-4 font-medium">
                              Last Activity
                            </th>
                            <th className="text-right p-4 font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id} className="border-b">
                              <td className="p-4 font-medium">
                                {user.username}
                              </td>
                              <td className="p-4 text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatDate(user.created_at)}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge variant="outline">
                                  {user.entry_count}
                                </Badge>
                              </td>
                              <td className="p-4 text-muted-foreground">
                                {user.last_activity
                                  ? formatDate(user.last_activity)
                                  : "Never"}
                              </td>
                              <td className="p-4 text-right">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteUser(user.id)}
                                  className="transition-all duration-200 hover:scale-[1.02]"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {users.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No users found
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings and features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="allow-registration"
                        className="text-base font-medium"
                      >
                        Allow New User Registration
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, new users can create accounts. When
                        disabled, only existing users can log in.
                      </p>
                    </div>
                    <Switch
                      id="allow-registration"
                      checked={settings.allow_registration}
                      onCheckedChange={(checked) =>
                        updateSettings({ allow_registration: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone. All their financial data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
