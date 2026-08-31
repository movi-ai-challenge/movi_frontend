import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AccessibilityProvider } from "@/components/common/AccessibilityProvider";
import { MockAuthBoundary } from "@/components/common/MockAuthBoundary";

import "./globals.css";

export const metadata: Metadata = {
  title: "MOVI | 음성 중심 포용 금융",
  description: "모두가 편리하게 이용하는 음성 중심 금융 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {/* 접근성 설정은 모든 화면 상단을 차지하지 않도록 /settings 로 옮겼다.
            (명세 11.x) 로그인 전에도 고대비·큰 글씨가 필요하므로
            /settings 는 인증 보호 대상이 아니며, 첫 화면과 로그인 화면에
            진입점을 둔다. */}
        <AccessibilityProvider>
          <MockAuthBoundary>{children}</MockAuthBoundary>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
