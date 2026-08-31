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
    router.replace("/accounts/connect");
  }, [session, setSession, router]);

  if (!session) {
    return (
      <AppScreen className="justify-center gap-3">
        <h1 className="text-2xl font-bold">카카오 로그인을 완료하지 못했습니다.</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
          다시 시도해 주세요.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-14 w-fit items-center rounded-2xl border-2 border-transparent bg-[var(--color-primary)] px-5 text-[17px] font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          로그인 화면으로 돌아가기
        </Link>
      </AppScreen>
    );
  }

  return (
    <AppScreen className="justify-center">
      <p className="text-lg font-semibold" aria-live="polite" aria-busy="true">
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
