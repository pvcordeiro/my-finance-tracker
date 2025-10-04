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
  UserCog,
  Settings,
  Trash2,
  LogOut,
  UserPlus,
  UserMinus,
  Calendar,
  ChevronDown,
  Calculator,
  User,
  Edit,
  MoreHorizontal,
  ShieldOff,
  Save,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  enable_balance_history: boolean;
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
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [settings, setSettings] = useState<AdminSettings>({
    allow_registration: true,
    enable_balance_history: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [renameGroupDialogOpen, setRenameGroupDialogOpen] = useState(false);
  const [groupToRename, setGroupToRename] = useState<Group | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    if (isMobile) {
      window.scrollTo(0, 0);
    }
  }, [activeTab, isMobile]);

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
    } catch {
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
    } catch {
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
    } catch {
      toast.error("Error loading settings");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadUsers(), loadGroups(), loadSettings()]);
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
    } catch {
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
    } catch {
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
    } catch {
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
        loadUsers();
      } else {
        toast.error("Failed to create group");
      }
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      toast.error("Error renaming group");
    } finally {
      setRenameGroupDialogOpen(false);
      setGroupToRename(null);
      setRenameGroupName("");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  return (
    <div className="min-h-screen finance-gradient">
      <header className="bg-background/90 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer"
              onClick={() => router.push("/")}
            >
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
                    onClick={() => router.push("/user")}
                    className="cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/")}
                    className="cursor-pointer"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Back to App
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/manage?tab=management")}
                    className="cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Backup
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

      <main
        className={`container mx-auto p-2 sm:p-4 space-y-6 ${
          isMobile ? "pb-20" : ""
        }`}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">
                <UserCog className="w-4 h-4 mr-2" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="groups">
                <Users className="w-4 h-4 mr-2" />
                Group Management
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                System Settings
              </TabsTrigger>
            </TabsList>
          )}

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
                    {isMobile ? (
                      <div className="space-y-4 p-4">
                        {users.map((userItem) => (
                          <Card key={userItem.id}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium flex items-center gap-1">
                                    {userItem.username}
                                    {userItem.is_admin ? (
                                      <Shield
                                        className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                        aria-label="Admin user"
                                      />
                                    ) : null}
                                  </h3>
                                  {userItem.id !== 1 && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          aria-label={`Actions for ${userItem.username}`}
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {user?.id === 1 && (
                                          <DropdownMenuItem
                                            onClick={() =>
                                              toggleAdmin(userItem.id)
                                            }
                                            className="cursor-pointer"
                                          >
                                            {userItem.is_admin ? (
                                              <ShieldOff className="w-4 h-4 mr-2" />
                                            ) : (
                                              <Shield className="w-4 h-4 mr-2" />
                                            )}
                                            {userItem.is_admin
                                              ? "Revoke Admin"
                                              : "Make Admin"}
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          onClick={() =>
                                            deleteUser(userItem.id)
                                          }
                                          className="cursor-pointer text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />{" "}
                                          Delete User
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {formatDate(userItem.created_at)}
                                </div>
                                <div>
                                  <div className="text-sm font-medium mb-1">
                                    Groups:
                                  </div>
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
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {users.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            No users found
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-2 sm:p-4 font-medium">
                                Username
                              </th>
                              <th className="text-left p-2 sm:p-4 font-medium hidden sm:table-cell">
                                Created
                              </th>
                              <th className="text-left p-2 sm:p-4 font-medium">
                                Group
                              </th>
                              <th className="text-right p-2 sm:p-4 font-medium">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((userItem) => (
                              <tr key={userItem.id} className="border-b">
                                <td className="p-2 sm:p-4 font-medium">
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <span>{userItem.username}</span>
                                      {userItem.is_admin ? (
                                        <Shield
                                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                          aria-label="Admin user"
                                        />
                                      ) : null}
                                    </div>
                                    <div className="text-xs text-muted-foreground sm:hidden">
                                      <Calendar className="w-3 h-3 inline mr-1" />
                                      {formatDate(userItem.created_at)}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 sm:p-4 text-muted-foreground hidden sm:table-cell">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      {formatDate(userItem.created_at)}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2 sm:p-4">
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
                                  <div className="flex justify-end">
                                    {userItem.id !== 1 && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 hover:bg-muted"
                                            aria-label={`Actions for ${userItem.username}`}
                                          >
                                            <MoreHorizontal className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          {user?.id === 1 && (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                toggleAdmin(userItem.id)
                                              }
                                              className="cursor-pointer"
                                            >
                                              {userItem.is_admin ? (
                                                <ShieldOff className="w-4 h-4 mr-2" />
                                              ) : (
                                                <Shield className="w-4 h-4 mr-2" />
                                              )}
                                              {userItem.is_admin
                                                ? "Revoke Admin"
                                                : "Make Admin"}
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={() =>
                                              deleteUser(userItem.id)
                                            }
                                            className="cursor-pointer text-destructive focus:text-destructive"
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />{" "}
                                            Delete User
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {!isMobile && users.length === 0 && (
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
                    {isMobile ? (
                      <div className="space-y-4 p-4">
                        {groups.map((group) => (
                          <Card key={group.id}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-medium">
                                      {group.name}
                                    </h3>
                                    {group.created_by_admin ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        Admin
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Created: {formatDate(group.created_at)}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">
                                    Members:
                                  </span>
                                  <Badge variant="outline">
                                    {group.member_count}
                                  </Badge>
                                </div>
                                <div className="flex">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <MoreHorizontal className="w-3 h-3 mr-1" />
                                        Manage
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="max-h-80 overflow-y-auto">
                                      <DropdownMenuItem
                                        disabled
                                        className="opacity-70 select-none"
                                      >
                                        Add User
                                      </DropdownMenuItem>
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
                                            className="cursor-pointer"
                                          >
                                            <UserPlus className="w-3 h-3 mr-2" />
                                            {user.username}
                                          </DropdownMenuItem>
                                        ))}
                                      <DropdownMenuItem
                                        disabled
                                        className="opacity-70 mt-1 select-none"
                                      >
                                        Remove User
                                      </DropdownMenuItem>
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
                                            className="cursor-pointer"
                                          >
                                            <UserMinus className="w-3 h-3 mr-2" />
                                            {user.username}
                                          </DropdownMenuItem>
                                        ))}
                                      <DropdownMenuItem
                                        onClick={() => renameGroup(group)}
                                        className="cursor-pointer mt-1"
                                      >
                                        <Edit className="w-3 h-3 mr-2" />
                                        Rename Group
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => deleteGroup(group.id)}
                                        disabled={group.id === 1}
                                        className="cursor-pointer text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="w-3 h-3 mr-2" />
                                        Delete Group
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {groups.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            No groups found
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-2 sm:p-4 font-medium">
                                Group Name
                              </th>
                              <th className="text-left p-2 sm:p-4 font-medium">
                                Members
                              </th>
                              <th className="text-left p-2 sm:p-4 font-medium hidden sm:table-cell">
                                Created
                              </th>
                              <th className="text-right p-2 sm:p-4 font-medium">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {groups.map((group) => (
                              <tr key={group.id} className="border-b">
                                <td className="p-2 sm:p-4 font-medium">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span>{group.name}</span>
                                      {group.created_by_admin ? (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          Admin
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <div className="text-xs text-muted-foreground sm:hidden">
                                      {formatDate(group.created_at)}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 sm:p-4">
                                  <Badge variant="outline">
                                    {group.member_count}
                                  </Badge>
                                </td>
                                <td className="p-2 sm:p-4 text-muted-foreground hidden sm:table-cell">
                                  {formatDate(group.created_at)}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 hover:bg-muted"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="max-h-80 overflow-y-auto"
                                      >
                                        <DropdownMenuItem
                                          disabled
                                          className="opacity-70 select-none"
                                        >
                                          Add User
                                        </DropdownMenuItem>
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
                                              className="cursor-pointer"
                                            >
                                              <UserPlus className="w-3 h-3 mr-2" />
                                              {user.username}
                                            </DropdownMenuItem>
                                          ))}
                                        <DropdownMenuItem
                                          disabled
                                          className="opacity-70 mt-1 select-none"
                                        >
                                          Remove User
                                        </DropdownMenuItem>
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
                                              className="cursor-pointer"
                                            >
                                              <UserMinus className="w-3 h-3 mr-2" />
                                              {user.username}
                                            </DropdownMenuItem>
                                          ))}
                                        <DropdownMenuItem
                                          onClick={() => renameGroup(group)}
                                          className="cursor-pointer mt-1"
                                        >
                                          <Edit className="w-3 h-3 mr-2" />
                                          Rename Group
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => deleteGroup(group.id)}
                                          disabled={group.id === 1}
                                          className="cursor-pointer text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="w-3 h-3 mr-2" />
                                          Delete Group
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {!isMobile && groups.length === 0 && (
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

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="enable-balance-history"
                        className="text-base font-medium"
                      >
                        Show Balance History
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, users can view the balance history card
                        showing all balance adjustments with optional notes.
                        History is always logged regardless of this setting.
                      </p>
                    </div>
                    <Switch
                      id="enable-balance-history"
                      checked={settings.enable_balance_history}
                      onCheckedChange={(checked) =>
                        updateSettings({ enable_balance_history: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
          <div className="flex justify-around items-center h-16 px-4">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors min-h-[44px] ${
                activeTab === "users"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-6 h-6" />
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors min-h-[44px] ${
                activeTab === "groups"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="w-6 h-6" />
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors min-h-[44px] ${
                activeTab === "settings"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </nav>
      )}

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
