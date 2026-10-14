"use client";

import { useEffect, useState } from "react";

export function useGuidedTourMode() {
  const [isGuidedTourActive, setIsGuidedTourActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsGuidedTourActive(root.dataset.guidedTourActive === "true");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-guided-tour-active"] });
    return () => observer.disconnect();
  }, []);

  return isGuidedTourActive;
}
