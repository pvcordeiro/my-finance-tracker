"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useOnline } from "@/hooks/use-online";

type GuidedTourStep = {
  path: string;
  targets: string[];
  title: string;
  body: string;
  requiresMultipleGroups?: boolean;
  optional?: boolean;
};

const steps: GuidedTourStep[] = [
  { path: "/manage", targets: ["tour-balance"], title: "guidedTour.balanceTitle", body: "guidedTour.balanceBody" },
  { path: "/manage", targets: ["tour-history"], title: "guidedTour.historyTitle", body: "guidedTour.historyBody" },
  { path: "/manage", targets: ["tour-income", "tour-expenses"], title: "guidedTour.recurringTitle", body: "guidedTour.recurringBody" },
  { path: "/manage", targets: ["tour-pending"], title: "guidedTour.pendingTitle", body: "guidedTour.pendingBody" },
  { path: "/manage", targets: ["tour-privacy"], title: "guidedTour.privacyTitle", body: "guidedTour.privacyBody" },
  { path: "/", targets: ["tour-alert"], title: "guidedTour.alertTitle", body: "guidedTour.alertBody" },
  { path: "/details", targets: ["tour-details-income", "tour-details-expenses"], title: "guidedTour.detailsTitle", body: "guidedTour.detailsBody" },
  { path: "/user", targets: ["tour-appearance"], title: "guidedTour.appearanceTitle", body: "guidedTour.appearanceBody" },
  { path: "/user", targets: ["tour-data-management"], title: "guidedTour.dataTitle", body: "guidedTour.dataBody" },
  { path: "/user", targets: ["tour-active-sessions"], title: "guidedTour.sessionsTitle", body: "guidedTour.sessionsBody" },
  { path: "/user", targets: ["tour-group-selection"], title: "guidedTour.groupsTitle", body: "guidedTour.groupsBody", requiresMultipleGroups: true },
] as const;

const adminTourSteps: GuidedTourStep[] = [
  { path: "/admin", targets: ["admin-tour-users"], title: "guidedTour.adminTourUsersTitle", body: "guidedTour.adminTourUsersBody" },
  { path: "/admin", targets: ["admin-tour-groups"], title: "guidedTour.adminTourGroupsTitle", body: "guidedTour.adminTourGroupsBody" },
  { path: "/admin", targets: ["admin-tour-settings"], title: "guidedTour.adminTourSettingsTitle", body: "guidedTour.adminTourSettingsBody" },
];

type Rect = { top: number; left: number; width: number; height: number };
type PanelOffset = { x: number; y: number };

export function GuidedTour() {
  const { user, completeTour, completeAdminTour } = useAuth();
  const { t } = useLanguage();
  const isOnline = useOnline();
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [adminTourActive, setAdminTourActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rects, setRects] = useState<Rect[]>([]);
  const [panelOffset, setPanelOffset] = useState<PanelOffset | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [saveFailed, setSaveFailed] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const [panelMeasuring, setPanelMeasuring] = useState(false);
  const [targetNotReady, setTargetNotReady] = useState(false);
  const [locateKey, setLocateKey] = useState(0);
  const autoStartedUser = useRef<number | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const availableSteps = user?.groups && user.groups.length > 1
    ? steps
    : steps.filter((step) => !step.requiresMultipleGroups);
  const isAdminTour = active && adminTourActive;
  const tourSteps = isAdminTour ? adminTourSteps : availableSteps;
  const activeStep = tourSteps[stepIndex];

  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || navigator.platform || "";
    setIsAppleMobile(
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)
    );
    setIsPhone(/Android|iPhone|iPod|Mobile/i.test(navigator.userAgent));
  }, []);

  const begin = useCallback(() => {
    setAdminTourActive(false);
    setStepIndex(0);
    setSaveFailed(false);
    setRects([]);
    setPanelOffset(null);
    setPanelMeasuring(true);
    setTargetNotReady(true);
    setActive(true);
    document.documentElement.dataset.guidedTourActive = "true";
    delete document.documentElement.dataset.adminGuidedTourActive;
    if (pathname !== steps[0].path) router.push(steps[0].path);
    else setTimeout(() => window.dispatchEvent(new Event("restartGuidedTourStep")), 0);
  }, [pathname, router]);

  const beginAdminTour = useCallback(() => {
    setAdminTourActive(true);
    setActive(true);
    setStepIndex(0);
    setSaveFailed(false);
    setRects([]);
    setPanelOffset(null);
    setPanelMeasuring(true);
    setTargetNotReady(true);
    document.documentElement.dataset.guidedTourActive = "true";
    document.documentElement.dataset.adminGuidedTourActive = "true";
    window.dispatchEvent(new Event("adminTourStarted"));
    if (pathname !== "/admin") router.push("/admin");
    else setLocateKey((key) => key + 1);
  }, [pathname, router]);

  useEffect(() => {
    if (!user) {
      autoStartedUser.current = null;
      setActive(false);
      delete document.documentElement.dataset.guidedTourActive;
      delete document.documentElement.dataset.adminGuidedTourActive;
      return;
    }
    if (user.is_admin) {
      if (isOnline && user.admin_tour_completed !== true && autoStartedUser.current !== -user.id) {
        autoStartedUser.current = -user.id;
        beginAdminTour();
      }
      return;
    }
    if (
      isOnline &&
      user.tour_completed !== true &&
      autoStartedUser.current !== user.id
    ) {
      autoStartedUser.current = user.id;
      begin();
    }
  }, [user, isOnline, begin, beginAdminTour]);

  useEffect(() => {
    const startTour = () => begin();
    const startAdminTour = () => beginAdminTour();
    const restartStep = () => {
      setLocateKey((key) => key + 1);
      setRects([]);
      setTargetNotReady(false);
      setPanelOffset(null);
      setPanelMeasuring(true);
    };
    window.addEventListener("startGuidedTour", startTour);
    window.addEventListener("startAdminGuidedTour", startAdminTour);
    window.addEventListener("restartGuidedTourStep", restartStep);
    return () => {
      window.removeEventListener("startGuidedTour", startTour);
      window.removeEventListener("startAdminGuidedTour", startAdminTour);
      window.removeEventListener("restartGuidedTourStep", restartStep);
    };
  }, [begin, beginAdminTour]);

  useEffect(() => {
    if (!active || !activeStep || pathname !== activeStep.path) return;
      window.dispatchEvent(new CustomEvent("guidedTourStepChanged", { detail: [...activeStep.targets] }));
  }, [active, activeStep, pathname]);

  useEffect(() => {
    if (!isAdminTour || !activeStep || pathname !== activeStep.path) return;
    window.dispatchEvent(new CustomEvent("adminGuidedTourStepChanged", { detail: [...activeStep.targets] }));
  }, [isAdminTour, activeStep, pathname]);

  useEffect(() => {
    if (!active) return;
    const onKeyDownCapture = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (!panel.contains(event.target as Node)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
        (event.key === "Tab" && event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
        return;
      }
      if (event.key === "Tab") return;
      const target = event.target as HTMLElement;
      if (target.tagName === "BUTTON" && (event.key === "Enter" || event.key === " ")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener("keydown", onKeyDownCapture, true);
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDownCapture, true);
    };
  }, [active, stepIndex, isAdminTour]);

  useEffect(() => {
    if (!active || pathname !== activeStep.path) return;
    const routeReady = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("guidedTourStepReady", { detail: [...activeStep.targets] }));
    }, 120);
    return () => window.clearTimeout(routeReady);
  }, [active, activeStep, pathname]);

  useEffect(() => () => {
    delete document.documentElement.dataset.guidedTourActive;
    delete document.documentElement.dataset.adminGuidedTourActive;
  }, []);

  useEffect(() => {
      if (!active || !activeStep || pathname !== activeStep.path) {
        setRects([]);
        return;
      }

    let cancelled = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;
    const locate = (): void => {
      if (cancelled) return;
      const targets = activeStep.targets.map((name) =>
        Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)).find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && node.getClientRects().length > 0;
        }) ?? null
      );
      let resolvedTargets = targets.filter((target): target is HTMLElement => {
        if (!target) return false;
        const bounds = target.getBoundingClientRect();
        const style = window.getComputedStyle(target);
        const hasVisibleBox = Array.from(target.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0);
        return bounds.width > 0 && bounds.height > 0 && hasVisibleBox && style.visibility !== "hidden" && style.display !== "none";
      });
      if (pathname !== activeStep.path || !resolvedTargets.length || (isAdminTour && resolvedTargets[0].dataset.tour !== activeStep.targets[0])) {
        setTargetNotReady(true);
        frame = window.requestAnimationFrame(locate);
        return;
      }
      setTargetNotReady(false);
      const mobileTargetByStep: Record<string, string> = {
        "guidedTour.balanceTitle": "tour-balance",
        "guidedTour.historyTitle": "tour-history",
        "guidedTour.recurringTitle": "tour-income",
        "guidedTour.pendingTitle": "tour-pending",
        "guidedTour.privacyTitle": "tour-privacy",
        "guidedTour.alertTitle": "tour-alert",
        "guidedTour.detailsTitle": "tour-details-income",
        "guidedTour.appearanceTitle": "tour-appearance",
        "guidedTour.dataTitle": "tour-data-management",
        "guidedTour.sessionsTitle": "tour-active-sessions",
        "guidedTour.groupsTitle": "tour-group-selection",
      };
      const stepTarget = resolvedTargets.find((target) => target.dataset.tour === mobileTargetByStep[activeStep.title]);
      const primaryTarget = stepTarget ?? resolvedTargets[0];
      const mobileLayout = window.innerWidth < 768;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const targetBoundsBeforeScroll = primaryTarget.getBoundingClientRect();
      const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 64;
      const targetPanelHeight = Math.min(panelRef.current?.offsetHeight || 248, window.innerHeight * (mobileLayout ? 0.62 : 0.7));
      const navInset = mobileLayout ? 76 : 16;
      const targetsToPosition = mobileLayout && activeStep.title === "guidedTour.recurringTitle"
        ? resolvedTargets.filter((target) => target.dataset.tour === "tour-income" || target.dataset.tour === "tour-expenses")
        : [primaryTarget];
      const positionBounds = targetsToPosition.reduce((bounds, target) => {
        const rect = target.getBoundingClientRect();
        return {
          top: Math.min(bounds.top, rect.top),
          bottom: Math.max(bounds.bottom, rect.bottom),
        };
      }, { top: Number.POSITIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY });
      const hasAbovePanelRoom = positionBounds.top - targetPanelHeight - 18 >= headerBottom + 8;
      const hasBelowPanelRoom = positionBounds.bottom + targetPanelHeight + 18 <= window.innerHeight - navInset;
      if (mobileLayout && activeStep.title === "guidedTour.dataTitle") {
        const panelBottom = Math.max(headerBottom + 12, 16) + targetPanelHeight + 18;
        window.scrollTo({
          top: Math.max(0, window.scrollY + targetBoundsBeforeScroll.top - panelBottom),
          behavior: reduceMotion ? "auto" : "smooth",
        });
      } else if (mobileLayout && (!hasAbovePanelRoom && !hasBelowPanelRoom || activeStep.title === "guidedTour.recurringTitle")) {
        const visibleAreaTop = headerBottom + 12;
        const visibleAreaBottom = window.innerHeight - navInset;
        const targetCenter = (positionBounds.top + positionBounds.bottom) / 2;
        const desiredCenter = visibleAreaTop + targetPanelHeight + 18 + Math.max(0, visibleAreaBottom - visibleAreaTop - targetPanelHeight - 18) / 2;
        window.scrollTo({
          top: Math.max(0, window.scrollY + targetCenter - desiredCenter),
          behavior: reduceMotion ? "auto" : "smooth",
        });
      } else {
        primaryTarget.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "nearest" });
      }
      const updateRect = () => {
        if (cancelled) return;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        setViewport({ width: viewportWidth, height: viewportHeight });
        const padding = 8;
      const targetsToHighlight = mobileLayout
        ? activeStep.title === "guidedTour.recurringTitle"
          ? resolvedTargets.filter((target) => target.dataset.tour === "tour-income" || target.dataset.tour === "tour-expenses")
          : [primaryTarget]
        : resolvedTargets.filter((target) => {
            const tourTarget = target.dataset.tour;
            if (activeStep.title === "guidedTour.balanceTitle") return tourTarget === "tour-balance";
            if (activeStep.title === "guidedTour.recurringTitle") return tourTarget === "tour-income" || tourTarget === "tour-expenses";
            if (activeStep.title === "guidedTour.detailsTitle") return tourTarget === "tour-details-income" || tourTarget === "tour-details-expenses";
            if (activeStep.title === "guidedTour.appearanceTitle") return tourTarget === "tour-appearance";
            if (activeStep.title === "guidedTour.dataTitle") return tourTarget === "tour-data-management";
            if (activeStep.title === "guidedTour.sessionsTitle") return tourTarget === "tour-active-sessions";
            if (activeStep.title === "guidedTour.groupsTitle") return tourTarget === "tour-group-selection";
            return true;
          });
        const fixedHeaderBottom = document.querySelector<HTMLElement>("[data-tour-fixed-header]")?.getBoundingClientRect().bottom ?? 0;
        const fixedFooterTop = document.querySelector<HTMLElement>("[data-tour-fixed-footer]")?.getBoundingClientRect().top ?? viewportHeight;
        const nextRects = targetsToHighlight.map((target) => {
          const bounds = target.getBoundingClientRect();
          const targetInsideFixedHeader = Boolean(target.closest("[data-tour-fixed-header]"));
          const targetInsideFixedFooter = Boolean(target.closest("[data-tour-fixed-footer]"));
          let visible = {
            left: Math.max(4, bounds.left - padding),
            top: Math.max(4, targetInsideFixedHeader ? 4 : fixedHeaderBottom + 4, bounds.top - padding),
            right: Math.min(viewportWidth - 4, bounds.right + padding),
            bottom: Math.min(viewportHeight - 4, targetInsideFixedFooter ? viewportHeight - 4 : fixedFooterTop - 4, bounds.bottom + padding),
          };
          let ancestor = target.parentElement;
          while (ancestor && ancestor !== document.body) {
            const style = window.getComputedStyle(ancestor);
            const clipX = ["hidden", "clip", "auto", "scroll"].includes(style.overflowX);
            const clipY = ["hidden", "clip", "auto", "scroll"].includes(style.overflowY);
            if (clipX || clipY) {
              const clipBounds = ancestor.getBoundingClientRect();
              if (clipX) {
                visible.left = Math.max(visible.left, clipBounds.left + ancestor.clientLeft);
                visible.right = Math.min(visible.right, clipBounds.left + ancestor.clientLeft + ancestor.clientWidth);
              }
              if (clipY) {
                visible.top = Math.max(visible.top, clipBounds.top + ancestor.clientTop);
                visible.bottom = Math.min(visible.bottom, clipBounds.top + ancestor.clientTop + ancestor.clientHeight);
              }
            }
            ancestor = ancestor.parentElement;
          }
          return {
            top: visible.top,
            left: visible.left,
            width: Math.max(0, visible.right - visible.left),
            height: Math.max(0, visible.bottom - visible.top),
          };
        });
        setRects(nextRects);

        const panel = panelRef.current;
        if (!panel) return;
        const panelWidth = Math.min(448, viewportWidth - 32);
        const measuredHeight = panel.getBoundingClientRect().height || 220;
        const panelHeight = Math.min(measuredHeight, viewportHeight * (mobileLayout ? 0.62 : 0.7));
        const gap = 18;
        const visibleRects = nextRects.filter((rect) => rect.width > 0 && rect.height > 0);
        if (!visibleRects.length) return;
        const placementRects = mobileLayout && activeStep.title === "guidedTour.detailsTitle"
          ? [visibleRects.find((rect) => rect.width > 0 && rect.height > 0) ?? visibleRects[0]]
          : visibleRects;
        const union = placementRects.reduce((bounds, rect) => ({
          left: Math.min(bounds.left, rect.left),
          top: Math.min(bounds.top, rect.top),
          right: Math.max(bounds.right, rect.left + rect.width),
          bottom: Math.max(bounds.bottom, rect.top + rect.height),
        }), {
          left: placementRects[0].left,
          top: placementRects[0].top,
          right: placementRects[0].left + placementRects[0].width,
          bottom: placementRects[0].top + placementRects[0].height,
        });
        const anchor = {
          left: union.left,
          top: union.top,
          width: union.right - union.left,
          height: union.bottom - union.top,
        };
        const anchorCenterX = anchor.left + anchor.width / 2;
        const anchorCenterY = anchor.top + anchor.height / 2;
        const clamp = (value: number, max: number, size: number) =>
          Math.max(16, Math.min(value, max - size - 16));
        if (isAdminTour && stepIndex === 0) {
          const footerTop = document.querySelector<HTMLElement>("[data-tour-fixed-footer]")?.getBoundingClientRect().top ?? viewportHeight;
          const bottom = Math.min(viewportHeight - 16, footerTop - 16);
          const top = Math.max(16, bottom - panelHeight);
          const left = clamp((viewportWidth - panelWidth) / 2, viewportWidth, panelWidth);
          setPanelOffset({
            x: left + panelWidth / 2 - viewportWidth / 2,
            y: top + panelHeight / 2 - viewportHeight / 2,
          });
          return;
        }
        const preferAbove = activeStep.title === "guidedTour.historyTitle" || activeStep.title === "guidedTour.dataTitle" || activeStep.title === "guidedTour.sessionsTitle";
        const preferBelow = activeStep.title === "guidedTour.appearanceTitle";
        const preferBetween = activeStep.title === "guidedTour.recurringTitle" || activeStep.title === "guidedTour.detailsTitle";
        const forcedVerticalSide = preferAbove ? "top" : preferBelow ? "bottom" : null;
        const canFitForcedPosition = forcedVerticalSide &&
          (forcedVerticalSide === "top"
            ? anchor.top - panelHeight - gap >= 16
            : anchor.top + anchor.height + gap + panelHeight <= viewportHeight - (mobileLayout ? 84 : 16));
        if (canFitForcedPosition) {
          const left = clamp(anchorCenterX - panelWidth / 2, viewportWidth, panelWidth);
          const top = clamp(
            forcedVerticalSide === "top" ? anchor.top - panelHeight - gap : anchor.top + anchor.height + gap,
            viewportHeight,
            panelHeight
          );
          setPanelOffset({
            x: left + panelWidth / 2 - viewportWidth / 2,
            y: top + panelHeight / 2 - viewportHeight / 2,
          });
          return;
        }
        const preferredSide = forcedVerticalSide;
        const candidates = [
          ...(preferredSide
            ? [{ side: preferredSide, left: anchorCenterX - panelWidth / 2, top: preferredSide === "top" ? anchor.top - panelHeight - gap : anchor.top + anchor.height + gap }]
            : []),
          { side: anchorCenterX > viewportWidth / 2 ? "left" : "right", left: anchorCenterX > viewportWidth / 2 ? anchor.left - panelWidth - gap : anchor.left + anchor.width + gap, top: anchorCenterY - panelHeight / 2 },
          { side: anchorCenterY > viewportHeight / 2 ? "top" : "bottom", left: anchorCenterX - panelWidth / 2, top: anchorCenterY > viewportHeight / 2 ? anchor.top - panelHeight - gap : anchor.top + anchor.height + gap },
          { side: "left", left: anchor.left - panelWidth - gap, top: anchorCenterY - panelHeight / 2 },
          { side: "right", left: anchor.left + anchor.width + gap, top: anchorCenterY - panelHeight / 2 },
          { side: "top", left: anchorCenterX - panelWidth / 2, top: anchor.top - panelHeight - gap },
          { side: "bottom", left: anchorCenterX - panelWidth / 2, top: anchor.top + anchor.height + gap },
          ...(preferBetween ? [
            { side: "top", left: 16, top: anchor.top - panelHeight - gap },
            { side: "bottom", left: 16, top: anchor.top + anchor.height + gap },
          ] : []),
          { side: "bottom", left: 16, top: viewportHeight - panelHeight - 16 },
          { side: "top", left: 16, top: 16 },
        ];
        const scored = candidates.map((candidate, index) => {
          const left = clamp(candidate.left, viewportWidth, panelWidth);
          const bottomBoundary = mobileLayout ? viewportHeight - 84 : viewportHeight - 16;
          const top = Math.max(16, Math.min(candidate.top, bottomBoundary - panelHeight));
          const panelRect = { left, top, right: left + panelWidth, bottom: top + panelHeight };
          const overlap = visibleRects.reduce((score, target) => {
            const width = Math.max(0, Math.min(panelRect.right, target.left + target.width) - Math.max(panelRect.left, target.left));
            const height = Math.max(0, Math.min(panelRect.bottom, target.top + target.height) - Math.max(panelRect.top, target.top));
            return score + width * height;
          }, 0);
          const sideDistance = candidate.side === "left"
            ? Math.abs(panelRect.right + gap - anchor.left)
            : candidate.side === "right"
              ? Math.abs(panelRect.left - (anchor.left + anchor.width + gap))
              : candidate.side === "top"
                ? Math.abs(panelRect.bottom + gap - anchor.top)
                : candidate.side === "bottom"
                  ? Math.abs(panelRect.top - (anchor.top + anchor.height + gap))
                  : 0;
          const overflow = Math.max(0, 16 - panelRect.left) + Math.max(0, 16 - panelRect.top) + Math.max(0, panelRect.right - viewportWidth + 16) + Math.max(0, panelRect.bottom - viewportHeight + 16);
          const preferredPenalty = preferredSide && candidate.side !== preferredSide ? 500 : 0;
          const lowerThirdBias = mobileLayout && candidate.side === "top" && anchorCenterY > viewportHeight * 0.6
            ? -600
            : 0;
          const targetInBottomHalf = anchorCenterY > viewportHeight * 0.5;
          const desiredSidePenalty = mobileLayout && targetInBottomHalf && candidate.side !== "top" ? 350 : 0;
          const unpreferredBottomPenalty = mobileLayout && !targetInBottomHalf && candidate.side === "top" ? 240 : 0;
          return { left, top, score: overlap * 100 + overflow * 1000 + sideDistance + preferredPenalty + lowerThirdBias + desiredSidePenalty + unpreferredBottomPenalty + index };
        }).sort((a, b) => a.score - b.score);
        const mobileBottomInset = mobileLayout ? 76 : 16;
        const safePosition = {
          left: clamp(scored[0].left, viewportWidth, panelWidth),
          top: Math.max(16, Math.min(scored[0].top, viewportHeight - mobileBottomInset - panelHeight)),
        };
        setPanelOffset({
          x: safePosition.left + panelWidth / 2 - viewportWidth / 2,
          y: safePosition.top + panelHeight / 2 - viewportHeight / 2,
        });
      };
      let settledFrames = 0;
      let previousTop = Number.NaN;
      let scrollSettleFrame = 0;
      let stableFrames = 0;
      let previousPosition = Number.NaN;
      const scrollStartedAt = performance.now();
      const waitForScrollSettle = () => {
        if (cancelled) return;
        const position = primaryTarget.getBoundingClientRect().top;
        stableFrames = Math.abs(position - previousPosition) < 0.5 ? stableFrames + 1 : 0;
        previousPosition = position;
        const elapsed = performance.now() - scrollStartedAt;
        if (reduceMotion || (elapsed > 180 && stableFrames >= 4) || elapsed > 1400) {
          window.addEventListener("resize", updateRect);
          window.addEventListener("scroll", updateRect, true);
          const resizeObserver = new ResizeObserver(updateRect);
          resolvedTargets.forEach((target) => resizeObserver.observe(target));
          if (panelRef.current) resizeObserver.observe(panelRef.current);
          cleanup = () => {
            window.removeEventListener("resize", updateRect);
            window.removeEventListener("scroll", updateRect, true);
            resizeObserver.disconnect();
          };
          setPanelMeasuring(true);
          requestAnimationFrame(() => {
            if (cancelled) return;
            updateRect();
            requestAnimationFrame(() => setPanelMeasuring(false));
          });
          return;
        }
        scrollSettleFrame = requestAnimationFrame(waitForScrollSettle);
      };
      scrollSettleFrame = requestAnimationFrame(waitForScrollSettle);
    };

    const waitFrame = () => {
      locate();
    };
    frame = window.requestAnimationFrame(waitFrame);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [active, activeStep, isAdminTour, locateKey, pathname, stepIndex]);

  const finish = async () => {
    if (!isOnline) {
      setSaveFailed(true);
      return;
    }
    const saved = isAdminTour ? await completeAdminTour() : await completeTour();
    if (saved) {
      setActive(false);
      setSaveFailed(false);
      delete document.documentElement.dataset.guidedTourActive;
      delete document.documentElement.dataset.adminGuidedTourActive;
      window.dispatchEvent(new Event("guidedTourEnded"));
    } else {
      setSaveFailed(true);
    }
  };

  const goNext = () => {
    if (stepIndex >= tourSteps.length - 1) {
      void finish();
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    setRects([]);
    setPanelOffset(null);
    setPanelMeasuring(true);
    if (tourSteps[nextIndex].path !== pathname) router.push(tourSteps[nextIndex].path);
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    const previousIndex = stepIndex - 1;
    setStepIndex(previousIndex);
    setRects([]);
    setPanelOffset(null);
    setPanelMeasuring(true);
    if (tourSteps[previousIndex].path !== pathname) router.push(tourSteps[previousIndex].path);
  };

  if (!active || !activeStep) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] bg-transparent" aria-live="polite">
      <div
        className="pointer-events-auto fixed inset-0 z-[100] touch-none bg-transparent"
        aria-hidden="true"
        onWheel={(event) => {
          if (!panelRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        onTouchMove={(event) => {
          if (!panelRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        onContextMenu={(event) => event.preventDefault()}
      />
      {rects.length ? (
        <svg
          className="pointer-events-none fixed inset-0 h-full w-full"
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <mask id="guided-tour-cutout" maskUnits="userSpaceOnUse">
              <rect width={viewport.width} height={viewport.height} fill="white" />
              {rects.map((rect, index) => (
                <rect
                  key={index}
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  rx="16"
                  fill="black"
                />
              ))}
            </mask>
          </defs>
          <rect
            width={viewport.width}
            height={viewport.height}
            fill="rgba(0,0,0,0.65)"
            mask="url(#guided-tour-cutout)"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-black/65" />
      )}
      {rects.map((rect, index) => pathname === activeStep.path && (
        <div
          key={index}
          className="pointer-events-none fixed z-[101] border-2 border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2)] transition-[top,left,width,height,border-radius] duration-300"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 18 }}
          aria-hidden="true"
        />
      ))}
        <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
          if (!buttons.length) return;
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        className="pointer-events-auto fixed z-[102] max-h-[70dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6"
        style={{
          top: "50%",
          left: "50%",
          transform: `translate3d(calc(-50% + ${panelOffset?.x ?? 0}px), calc(-50% + ${panelOffset?.y ?? 0}px), 0)`,
          transition: "transform 460ms cubic-bezier(0.2, 0.85, 0.25, 1), opacity 160ms ease-out",
          opacity: panelMeasuring ? 0 : 1,
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-contrast">
            {t("guidedTour.step").replace("{current}", String(stepIndex + 1)).replace("{total}", String(tourSteps.length))}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => void finish()} disabled={!isOnline}>
            <X className="h-4 w-4" />
            {t("guidedTour.skip")}
          </Button>
        </div>
        <h2 id="guided-tour-title" className="text-xl font-semibold tracking-tight">
          {t(activeStep.title)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t(activeStep.title === "guidedTour.detailsTitle" && isAppleMobile
            ? "guidedTour.detailsBodyIos"
            : activeStep.title === "guidedTour.detailsTitle" && isPhone && !isAppleMobile
              ? "guidedTour.detailsBodyPhone"
              : activeStep.body)}
        </p>
        {saveFailed && (
          <p role="alert" className="mt-3 text-sm text-destructive">{t("guidedTour.saveFailed")}</p>
        )}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={goBack} disabled={stepIndex === 0}>
            <ArrowLeft className="h-4 w-4" />
            {t("guidedTour.back")}
          </Button>
          <Button type="button" onClick={goNext} disabled={!isOnline || targetNotReady}>
            {stepIndex === tourSteps.length - 1 ? t("guidedTour.finish") : t("guidedTour.next")}
            {stepIndex < tourSteps.length - 1 && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </section>
    </div>
  );
}
