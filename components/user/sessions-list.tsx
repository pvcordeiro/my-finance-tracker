"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Chrome,
  X,
  Clock,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";

interface Session {
  id: number;
  token: string;
  user_agent: string;
  ip_address: string;
  device_name: string;
  created_at: string;
  last_accessed: string;
  expires_at: string;
  is_current: boolean;
}

export function SessionsList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/user/sessions", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        toast.error("Failed to load sessions");
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const revokeSession = async (sessionId: number) => {
    setRevoking(sessionId);

    try {
      const response = await fetch(`/api/user/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Session revoked successfully");
        setSessions(sessions.filter((s) => s.id !== sessionId));
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to revoke session");
      }
    } catch (error) {
      console.error("Error revoking session:", error);
      toast.error("Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (deviceName: string) => {
    const name = deviceName?.toLowerCase() || "";
    if (name.includes("mobile") || name.includes("android")) {
      return <Smartphone className="w-5 h-5" />;
    } else if (name.includes("tablet") || name.includes("ipad")) {
      return <Tablet className="w-5 h-5" />;
    } else if (
      name.includes("mac") ||
      name.includes("windows") ||
      name.includes("linux")
    ) {
      return <Laptop className="w-5 h-5" />;
    }
    return <Monitor className="w-5 h-5" />;
  };

  const getBrowserName = (userAgent: string) => {
    if (!userAgent) return "Unknown Browser";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
      return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    if (userAgent.includes("Opera")) return "Opera";
    return "Unknown Browser";
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active sessions found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={`flex items-start gap-4 p-4 rounded-lg border ${
            session.is_current
              ? "border-primary/50 bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <div className="text-muted-foreground mt-1">
            {getDeviceIcon(session.device_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm">
                {session.device_name || "Unknown Device"}
              </h3>
              {session.is_current && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  Current
                </span>
              )}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Chrome className="w-3 h-3" />
                <span>{getBrowserName(session.user_agent)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                <span>{session.ip_address || "Unknown location"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Last active: {formatDate(session.last_accessed)}</span>
              </div>
            </div>
          </div>
          {!session.is_current && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => revokeSession(session.id)}
              disabled={revoking === session.id}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
