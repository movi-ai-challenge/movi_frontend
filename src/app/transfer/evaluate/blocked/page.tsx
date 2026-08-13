"use client";

import Link from "next/link";

import { useBankStore } from "@/store/useBankStore";

export default function HighRiskBlockedPage() {
  const transferDraft = useBankStore((state) => state.transferDraft);

  if (!transferDraft) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold">확인할 거래가 없습니다.</h1>
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
          송금 정보를 입력하고 거래 안전 확인을 먼저 진행해 주세요.
        </p>
        <Link
          href="/transfer"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          송금 정보 입력하기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <p className="font-bold text-[var(--color-danger)]">높은 위험</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        안전을 위해 이체를 차단했습니다
      </h1>
      <p className="mt-4 text-lg leading-8">
        계좌에서 돈이 빠져나가지 않았습니다. 이 화면에서는 이체를 다시 실행할
        수 없습니다.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
        aria-labelledby="blocked-reason-title"
        role="alert"
      >
        <h2 id="blocked-reason-title" className="text-xl font-bold">
          차단한 이유
        </h2>
        <p className="mt-3 leading-7">
          평소 거래와 다른 여러 위험 신호가 함께 확인됐습니다.
        </p>
        <dl className="mt-6 grid gap-4 border-t-2 border-[var(--color-border)] pt-5">
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              받는 사람
            </dt>
            <dd className="mt-1 text-lg font-bold">
              {transferDraft.recipientName}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              차단된 금액
            </dt>
            <dd className="mt-1 text-2xl font-bold">
              {transferDraft.amount.toLocaleString("ko-KR")}원
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              거래 상태
            </dt>
            <dd className="mt-1 font-bold">차단됨 · 출금되지 않음</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm text-[var(--color-text-muted)]">
          현재 위험 판단은 프론트엔드 시연용 Mock 결과입니다.
        </p>
      </section>

      <Link
        href="/accounts"
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        연결된 계좌로 이동
      </Link>
    </main>
  );
}
