"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Chrome,
  XCircleIcon,
  Clock,
  MapPin,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

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

export function SessionsList({ tourPreview = false }: { tourPreview?: boolean }) {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/user/sessions", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        toast.error(t("settings.failedToLoadSessions"));
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error(t("settings.failedToLoadSessions"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revokeSession = async (sessionId: number) => {
    setRevoking(sessionId);
    setDeleteDialogOpen(false);

    try {
      const response = await fetch(`/api/user/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok || response.status === 404) {
        setSessions((currentSessions) =>
          currentSessions.filter((session) => session.id !== sessionId)
        );

        if (response.status === 404) {
          toast.success(t("settings.sessionAlreadyRemoved"));
        } else {
          toast.success(t("settings.sessionRevokedSuccessfully"));
        }
      } else {
        const data = await response.json();
        toast.error(data.error || t("settings.failedToRevokeSession"));
      }
    } catch (error) {
      console.error("Error revoking session:", error);
      toast.error(t("settings.failedToRevokeSession"));
    } finally {
      setRevoking(null);
      setSessionToRevoke(null);
    }
  };

  const handleRevokeClick = (session: Session) => {
    setSessionToRevoke(session);
    setDeleteDialogOpen(true);
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

  const getDeviceName = (deviceName: string) => {
    if (!deviceName) return t("settings.unknownDevice");

    const name = deviceName.toLowerCase();

    if (name.includes("mobile") && name.includes("android")) {
      return t("settings.androidMobile");
    }
    if (name.includes("mobile") && name.includes("iphone")) {
      return t("settings.iPhoneMobile");
    }
    if (name.includes("mobile")) {
      return t("settings.mobile");
    }

    if (name.includes("ipad")) {
      return t("settings.iPad");
    }
    if (name.includes("tablet")) {
      return t("settings.tablet");
    }

    if (name.includes("mac")) {
      return t("settings.macComputer");
    }
    if (name.includes("windows")) {
      return t("settings.windowsComputer");
    }
    if (name.includes("linux")) {
      return t("settings.linuxComputer");
    }

    return deviceName;
  };

  const tourSessions: Session[] = [
    {
      id: -1,
      token: "tour-current-session",
      user_agent: "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36",
      ip_address: "192.168.1.24",
      device_name: "Mac",
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      is_current: true,
    },
    {
      id: -2,
      token: "tour-phone-session",
      user_agent: "Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile Safari/537.36",
      ip_address: "192.168.1.37",
      device_name: "Mobile Device",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      last_accessed: new Date(Date.now() - 3600000).toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      is_current: false,
    },
  ];
  const visibleSessions = tourPreview ? tourSessions : sessions;

  const getBrowserName = (userAgent: string) => {
    if (!userAgent) return t("settings.unknownBrowser");
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
      return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    if (userAgent.includes("Opera")) return "Opera";
    return t("settings.unknownBrowser");
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const locale = language === "pt" ? "pt-BR" : "en-US";

      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    } catch {
      return t("settings.unknown");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (sessions.length === 0 && !tourPreview) {
    return (
      <div className="space-y-3">
        <div className="text-center py-5 text-sm text-muted-foreground">
          {t("settings.noActiveSessions")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleSessions.map((session, index) => (
        <div
          key={session.id}
          data-tour={tourPreview && index === 0 ? "tour-active-session-item" : undefined}
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
                {getDeviceName(session.device_name)}
              </h3>
              {session.is_current && (
                <span className="text-xs bg-primary/20 text-primary-contrast px-2 py-0.5 rounded-full">
                  {t("settings.current")}
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
                <span>
                  {session.ip_address || t("settings.unknownLocation")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>
                  {t("settings.lastActive")}:{" "}
                  {formatDate(session.last_accessed)}
                </span>
              </div>
            </div>
          </div>
          {!session.is_current && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { if (!tourPreview) handleRevokeClick(session); }}
              disabled={tourPreview || revoking === session.id}
              className="text-muted-foreground hover:text-destructive"
              aria-label={t("settings.revokeSession")}
            >
              <XCircleIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}

      {/* Revoke Session Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.revokeSession")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.revokeSessionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sessionToRevoke) {
                  revokeSession(sessionToRevoke.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("settings.revokeSession")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
