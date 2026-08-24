"use client";

import Link from "next/link";

import { useBankStore } from "@/store/useBankStore";

export default function MediumRiskReviewPage() {
  const transferResult = useBankStore((state) => state.transferResult);
  const unlockTransferRequest = useBankStore(
    (state) => state.unlockTransferRequest,
  );

  if (
    !transferResult ||
    transferResult.status !== "success" ||
    transferResult.riskLevel !== "medium"
  ) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold">확인할 이체 결과가 없습니다.</h1>
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
          송금 정보를 입력하고 거래 안전 확인을 진행해 주세요.
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
      <p className="font-bold text-[var(--color-warning)]">중간 위험</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        이체가 완료됐습니다
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        평소와 다른 거래 신호가 확인됐지만 이체는 완료됐습니다. 백엔드가
        연결된 보호자에게 사후 알림을 처리합니다.
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
              {transferResult.recipientName}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              보낼 금액
            </dt>
            <dd className="mt-1 text-2xl font-bold">
              {transferResult.amount.toLocaleString("ko-KR")}원
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              현재 상태
            </dt>
            <dd className="mt-1 font-bold">
              완료 · 보호자 사후 알림 대상
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-xl font-bold">보호자 승인은 필요하지 않습니다.</h2>
        <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
          보호자는 정해진 위험 기준에 해당할 때 알림만 받습니다. 계좌와
          거래내역을 조회하거나 이체를 승인·거절할 수 없습니다.
        </p>
        <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
          알림 발송과 재시도는 백엔드가 담당합니다. 현재 공개된 알림 상태 조회
          API가 없으므로 이 화면은 발송 성공 여부를 임의로 표시하지 않습니다.
        </p>
      </section>

      <Link
        href="/accounts"
        onClick={unlockTransferRequest}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        연결된 계좌로 이동
      </Link>
    </main>
  );
}
