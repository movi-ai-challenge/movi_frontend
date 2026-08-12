import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AccessibilityProvider } from "@/components/common/AccessibilityProvider";
import { HighContrastToggle } from "@/components/common/HighContrastToggle";
import { LargeTextToggle } from "@/components/common/LargeTextToggle";

import "./globals.css";

export const metadata: Metadata = {
  title: "MOVI | 음성 중심 포용 금융",
  description: "모두가 편리하게 이용하는 음성 중심 금융 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AccessibilityProvider>
          <div className="accessibility-controls" aria-label="접근성 설정">
            <HighContrastToggle />
            <LargeTextToggle />
          </div>
          {children}
        </AccessibilityProvider>
      </body>
    </html>
  );
}
