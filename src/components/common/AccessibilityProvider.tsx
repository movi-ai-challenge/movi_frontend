"use client";

import { useEffect, type ReactNode } from "react";

import { useAccessibilityStore } from "@/store/useAccessibilityStore";

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({
  children,
}: AccessibilityProviderProps) {
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  const largeText = useAccessibilityStore((state) => state.largeText);
  const simpleMode = useAccessibilityStore((state) => state.simpleMode);

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.highContrast = String(highContrast);
    root.dataset.largeText = String(largeText);
    root.dataset.simpleMode = String(simpleMode);
  }, [highContrast, largeText, simpleMode]);

  return children;
}
