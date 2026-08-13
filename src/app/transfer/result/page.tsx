"use client";

import Link from "next/link";

import { useBankStore } from "@/store/useBankStore";

export default function TransferResultPage() {
  const transferResult = useBankStore((state) => state.transferResult);

  if (!transferResult) {
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

  const isSuccess = transferResult.status === "success";

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <p
        className={`font-bold ${isSuccess ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}
      >
        {isSuccess ? "이체 성공" : "이체 실패"}
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        {isSuccess ? "이체가 완료됐습니다" : "이체하지 못했습니다"}
      </h1>

      <section
        className={`mt-8 rounded-xl border-2 bg-[var(--color-surface)] p-6 ${isSuccess ? "border-[var(--color-success)]" : "border-[var(--color-danger)]"}`}
        aria-labelledby="transfer-result-title"
        role={isSuccess ? "status" : "alert"}
      >
        <h2 id="transfer-result-title" className="text-xl font-bold">
          {transferResult.message}
        </h2>
        <dl className="mt-6 grid gap-5 border-t-2 border-[var(--color-border)] pt-5">
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              받는 사람
            </dt>
            <dd className="mt-1 text-xl font-bold">
              {transferResult.recipientName}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              {isSuccess ? "보낸 금액" : "출금되지 않은 금액"}
            </dt>
            <dd className="mt-1 text-3xl font-bold">
              {transferResult.amount.toLocaleString("ko-KR")}원
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              처리 상태
            </dt>
            <dd className="mt-1 font-bold">
              {isSuccess ? "완료" : "실패 · 출금되지 않음"}
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-sm text-[var(--color-text-muted)]">
          현재 결과는 프론트엔드 시연용 Mock입니다.
        </p>
      </section>

      <Link
        href={isSuccess ? "/accounts" : "/transfer/review"}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        {isSuccess ? "연결된 계좌로 이동" : "송금 정보 다시 확인"}
      </Link>
    </main>
  );
}
