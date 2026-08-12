import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AccessibilityProvider } from "@/components/common/AccessibilityProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "MOVI | 음성 중심 포용 금융",
  description: "모두가 편리하게 이용하는 음성 중심 금융 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
