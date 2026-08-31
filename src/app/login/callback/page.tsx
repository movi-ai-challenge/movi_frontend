"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { AppScreen } from "@/components/common/AppScreen";
import { parseKakaoLoginResult } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";

function KakaoLoginCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const session = parseKakaoLoginResult(searchParams);

  useEffect(() => {
    if (!session) return;
    setSession(session);

    // 홈으로 보낸다. 홈이 연결된 계좌 유무를 보고 잔액 카드를 띄우거나
    // 계좌 연결을 안내하므로 신규·재방문 두 경우가 모두 처리된다.
    // 전에는 /accounts/connect 로 고정되어 있어, 이미 계좌를 연결한
    // 사용자도 카카오로 로그인하면 매번 연결 화면으로 떨어졌다.
    router.replace("/");
  }, [session, setSession, router]);

  if (!session) {
    return (
      <AppScreen className="justify-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">카카오 로그인을 완료하지 못했습니다.</h1>
        <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          다시 시도해 주세요.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-flex h-14 w-fit items-center rounded-2xl bg-[var(--color-primary)] px-5 text-[15px] font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          로그인 화면으로 돌아가기
        </Link>
      </AppScreen>
    );
  }

  return (
    <AppScreen className="justify-center">
      <p className="text-[15px] font-semibold" aria-live="polite" aria-busy="true">
        카카오 로그인을 완료하고 있어요.
      </p>
    </AppScreen>
  );
}

export default function KakaoLoginCallbackPage() {
  return (
    <Suspense fallback={null}>
      <KakaoLoginCallback />
    </Suspense>
  );
}
