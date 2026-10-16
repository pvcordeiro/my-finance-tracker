type InstalledRelatedApp = {
  platform?: string;
  id?: string;
  url?: string;
};

type NavigatorWithInstalledApps = Navigator & {
  standalone?: boolean;
  getInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]>;
};

export async function isPwaInstalled(): Promise<boolean> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const nav = navigator as NavigatorWithInstalledApps;
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  ) {
    return true;
  }

  if (!nav.getInstalledRelatedApps) return false;

  try {
    const relatedApps = await nav.getInstalledRelatedApps();
    return relatedApps.some((app) => app.platform === "webapp");
  } catch {
    return false;
  }
}
