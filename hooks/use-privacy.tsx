"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";

interface PrivacyContextType {
  privacyMode: boolean;
  isRevealed: boolean;
  revealTemporarily: () => void;
  isLoading: boolean;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchPrivacyMode = async () => {
      try {
        const response = await fetch("/api/user/privacy-mode", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setPrivacyMode(data.privacyMode || false);
        }
      } catch (error) {
        console.error("Failed to fetch privacy mode:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrivacyMode();

    const handlePrivacyUpdate = (event: CustomEvent) => {
      if (event.detail.privacyMode !== undefined) {
        setPrivacyMode(event.detail.privacyMode);
      }
    };

    window.addEventListener(
      "privacyModeUpdated",
      handlePrivacyUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "privacyModeUpdated",
        handlePrivacyUpdate as EventListener
      );
      if (revealTimeout.current) clearTimeout(revealTimeout.current);
    };
  }, []);

  const revealTemporarily = () => {
    if (!privacyMode) return;

    if (revealTimeout.current) clearTimeout(revealTimeout.current);
    setIsRevealed(true);
    revealTimeout.current = setTimeout(() => {
      setIsRevealed(false);
      revealTimeout.current = null;
    }, 5000);
  };

  return (
    <PrivacyContext.Provider
      value={{ privacyMode, isRevealed, revealTemporarily, isLoading }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
}
