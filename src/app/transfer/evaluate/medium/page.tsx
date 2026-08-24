"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/common/PageBackLink";
import { useBankStore } from "@/store/useBankStore";

export default function MediumRiskReviewPage() {
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
      <PageBackLink href="/transfer/review">송금 확인으로</PageBackLink>

      <p className="font-bold text-[var(--color-warning)]">중간 위험</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        추가 확인이 필요한 거래입니다
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        평소와 다른 거래 신호가 확인됐습니다. 현재 이체는 실행되지 않았습니다.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-6"
        aria-labelledby="medium-risk-transaction-title"
      >
        <h2 id="medium-risk-transaction-title" className="text-xl font-bold">
          거래 정보
        </h2>
        <dl className="mt-5 grid gap-4 border-t-2 border-[var(--color-border)] pt-5">
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
              보낼 금액
            </dt>
            <dd className="mt-1 text-2xl font-bold">
              {transferDraft.amount.toLocaleString("ko-KR")}원
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              현재 상태
            </dt>
            <dd className="mt-1 font-bold">
              이체 실행 전 · 추가 처리 정책 확인 필요
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-xl font-bold">보호자는 거래를 승인하지 않습니다.</h2>
        <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
          보호자는 정해진 위험 기준에 해당할 때 알림만 받습니다. 계좌와
          거래내역을 조회하거나 이체를 승인·거절할 수 없습니다.
        </p>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          중간 위험 거래의 실행·보류·추가 인증 규칙과 보호자 알림 기준은
          기획·백엔드 협의 후 확정합니다. 이 화면에서는 알림을 발송하지 않습니다.
        </p>
      </section>

      <Link
        href="/transfer"
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        송금 정보 수정하기
      </Link>
    </main>
  );
}
