import Link from "next/link";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import type { ApiError } from "@/services/api";

interface AccountApiErrorProps {
  error: ApiError;
  onRetry: () => void;
}

const errorContent: Record<
  ApiError["kind"],
  { title: string; description: string }
> = {
  authentication_expired: {
    title: "인증 시간이 만료되었습니다.",
    description: "안전을 위해 다시 로그인한 뒤 계좌를 확인해 주세요.",
  },
  authentication_failed: {
    title: "계좌 인증을 완료하지 못했습니다.",
    description: "인증 정보를 다시 확인하고 계좌 연결을 시도해 주세요.",
  },
  network: {
    title: "계좌 정보를 불러오지 못했습니다.",
    description: "인터넷 연결을 확인한 뒤 다시 불러와 주세요.",
  },
  unknown: {
    title: "계좌 정보를 불러오지 못했습니다.",
    description: "잠시 후 다시 시도해 주세요.",
  },
};

export function AccountApiError({ error, onRetry }: AccountApiErrorProps) {
  const content = errorContent[error.kind];
  const requiresLogin = error.kind === "authentication_expired";
  const requiresReconnection = error.kind === "authentication_failed";

  return (
    <section
      className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
      aria-labelledby="account-api-error-title"
      role="alert"
    >
      <h2 id="account-api-error-title" className="text-xl font-bold">
        {content.title}
      </h2>
      <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
        {content.description}
      </p>

      {requiresLogin ? (
        <Link
          href="/login"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          다시 로그인하기
        </Link>
      ) : null}

      {requiresReconnection ? (
        <Link
          href="/accounts/connect"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          계좌 다시 연결하기
        </Link>
      ) : null}

      {!requiresLogin && !requiresReconnection ? (
        <AccessibleButton className="mt-5" onClick={onRetry}>
          다시 불러오기
        </AccessibleButton>
      ) : null}
    </section>
  );
}
