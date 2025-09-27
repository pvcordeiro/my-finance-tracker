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
  Edit,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { toast } from "sonner";

interface User {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
  groups: Array<{ id: number; name: string }>;
}

interface AdminSettings {
  allow_registration: boolean;
}

interface Group {
  id: number;
  name: string;
  created_at: string;
  member_count: number;
  created_by_admin?: boolean;
}

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [settings, setSettings] = useState<AdminSettings>({
    allow_registration: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [renameGroupDialogOpen, setRenameGroupDialogOpen] = useState(false);
  const [groupToRename, setGroupToRename] = useState<Group | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");

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
        toast.error("Failed to load users");
      }
    } catch (error) {
      toast.error("Error loading users");
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch("/api/admin/groups", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      } else {
        toast.error("Failed to load groups");
      }
    } catch (error) {
      toast.error("Error loading groups");
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
        toast.error("Failed to load settings");
      }
    } catch (error) {
      toast.error("Error loading settings");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadUsers(), loadGroups(), loadSettings()]);
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

    if (userToDelete === 1) {
      toast.error("Cannot delete the primary admin user");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?userId=${userToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("User deleted successfully");
        loadUsers();
      } else {
        toast.error("Failed to delete user");
      }
    } catch (error) {
      toast.error("Error deleting user");
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
        toast.success("Settings updated successfully");
      } else {
        toast.error("Failed to update settings");
      }
    } catch (error) {
      toast.error("Error updating settings");
    }
  };

  const toggleAdmin = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "PATCH",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Admin status updated successfully");
        loadUsers();
      } else {
        toast.error("Failed to update admin status");
      }
    } catch (error) {
      toast.error("Error updating admin status");
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const response = await fetch("/api/admin/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newGroupName.trim() }),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Group created successfully");
        setNewGroupName("");
        loadGroups();
        loadUsers(); // Refresh users to show updated group info
      } else {
        toast.error("Failed to create group");
      }
    } catch (error) {
      toast.error("Error creating group");
    }
  };

  const assignUserToGroup = async (userId: number, groupId: number) => {
    try {
      const response = await fetch("/api/admin/user-groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, groupId }),
        credentials: "include",
      });

      if (response.ok) {
        toast.success("User assigned to group successfully");
        loadGroups();
        loadUsers();
      } else {
        toast.error("Failed to assign user to group");
      }
    } catch (error) {
      toast.error("Error assigning user to group");
    }
  };

  const removeUserFromGroup = async (userId: number, groupId: number) => {
    try {
      const response = await fetch(
        `/api/admin/user-groups?userId=${userId}&groupId=${groupId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("User removed from group successfully");
        loadGroups();
        loadUsers();
      } else {
        toast.error("Failed to remove user from group");
      }
    } catch (error) {
      toast.error("Error removing user from group");
    }
  };

  const deleteGroup = async (groupId: number) => {
    setGroupToDelete(groupId);
    setDeleteGroupDialogOpen(true);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      const response = await fetch(
        `/api/admin/groups?groupId=${groupToDelete}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Group deleted successfully");
        loadGroups();
        loadUsers();
      } else {
        toast.error("Failed to delete group");
      }
    } catch (error) {
      toast.error("Error deleting group");
    } finally {
      setDeleteGroupDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  const renameGroup = async (group: Group) => {
    setGroupToRename(group);
    setRenameGroupName(group.name);
    setRenameGroupDialogOpen(true);
  };

  const confirmRenameGroup = async () => {
    if (!groupToRename || !renameGroupName.trim()) return;

    try {
      const response = await fetch(
        `/api/admin/groups?groupId=${groupToRename.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: renameGroupName.trim() }),
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Group renamed successfully");
        loadGroups();
      } else {
        toast.error("Failed to rename group");
      }
    } catch (error) {
      toast.error("Error renaming group");
    } finally {
      setRenameGroupDialogOpen(false);
      setGroupToRename(null);
      setRenameGroupName("");
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
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Shield className="w-4 h-4 mr-2" />
              Group Management
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                            <th className="text-left p-4 font-medium">Group</th>
                            <th className="text-right p-4 font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((userItem) => (
                            <tr key={userItem.id} className="border-b">
                              <td className="p-4 font-medium">
                                {userItem.username}
                              </td>
                              <td className="p-4 text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatDate(userItem.created_at)}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1">
                                  {userItem.groups.length > 0 ? (
                                    userItem.groups.map((group) => (
                                      <Badge key={group.id} variant="outline">
                                        {group.name}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="outline">No Groups</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  {user?.id === 1 && userItem.id !== 1 && (
                                    <Button
                                      variant={
                                        userItem.is_admin
                                          ? "default"
                                          : "outline"
                                      }
                                      size="sm"
                                      onClick={() => toggleAdmin(userItem.id)}
                                      className="transition-all duration-200 hover:scale-[1.02]"
                                    >
                                      <Shield className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {userItem.id !== 1 && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => deleteUser(userItem.id)}
                                      className="transition-all duration-200 hover:scale-[1.02]"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
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

          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Group Management</CardTitle>
                <CardDescription>
                  Create groups and assign users to them
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="New group name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                    <Button
                      onClick={createGroup}
                      disabled={!newGroupName.trim()}
                    >
                      Create Group
                    </Button>
                  </div>
                  <div className="border rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left p-4 font-medium">
                              Group Name
                            </th>
                            <th className="text-left p-4 font-medium">
                              Members
                            </th>
                            <th className="text-left p-4 font-medium">
                              Created
                            </th>
                            <th className="text-right p-4 font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map((group) => (
                            <tr key={group.id} className="border-b">
                              <td className="p-4 font-medium">
                                <div className="flex items-center space-x-2">
                                  <span>{group.name}</span>
                                  {group.created_by_admin && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge variant="outline">
                                  {group.member_count}
                                </Badge>
                              </td>
                              <td className="p-4 text-muted-foreground">
                                {formatDate(group.created_at)}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        Assign User
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      {users
                                        .filter(
                                          (u) =>
                                            !u.groups.some(
                                              (g) => g.id === group.id
                                            )
                                        )
                                        .map((user) => (
                                          <DropdownMenuItem
                                            key={user.id}
                                            onClick={() =>
                                              assignUserToGroup(
                                                user.id,
                                                group.id
                                              )
                                            }
                                          >
                                            {user.username}
                                          </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        Remove User
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      {users
                                        .filter((u) =>
                                          u.groups.some(
                                            (g) => g.id === group.id
                                          )
                                        )
                                        .map((user) => (
                                          <DropdownMenuItem
                                            key={user.id}
                                            onClick={() =>
                                              removeUserFromGroup(
                                                user.id,
                                                group.id
                                              )
                                            }
                                          >
                                            {user.username}
                                          </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => renameGroup(group)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteGroup(group.id)}
                                    disabled={group.id === 1}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {groups.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No groups found
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

      <AlertDialog
        open={deleteGroupDialogOpen}
        onOpenChange={setDeleteGroupDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? All associated data
              will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGroupToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={renameGroupDialogOpen}
        onOpenChange={setRenameGroupDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Group</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              placeholder="Group name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={renameGroupName}
              onChange={(e) => setRenameGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  confirmRenameGroup();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setGroupToRename(null);
                setRenameGroupName("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRenameGroup}
              disabled={
                !renameGroupName.trim() ||
                renameGroupName.trim() === groupToRename?.name
              }
            >
              Rename Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
