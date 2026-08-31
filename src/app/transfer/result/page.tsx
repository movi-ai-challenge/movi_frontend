"use client";

import Link from "next/link";

import { Amount } from "@/components/common/Amount";
import { AppScreen } from "@/components/common/AppScreen";
import { StatusHero } from "@/components/common/StatusHero";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { useBankStore } from "@/store/useBankStore";

export default function TransferResultPage() {
  const transferResult = useBankStore((state) => state.transferResult);
  const unlockTransferRequest = useBankStore((state) => state.unlockTransferRequest);

  if (!transferResult) {
    return (
      <AppScreen
        className="justify-center gap-3"
        footer={
          <Link
            href="/transfer"
            className="flex h-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[15px] font-bold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            송금 정보 입력하기
          </Link>
        }
      >
        <h1 className="text-2xl font-extrabold">확인할 이체 결과가 없습니다.</h1>
        <p className="leading-relaxed text-[var(--color-text-muted)]">
          송금 정보를 입력하고 거래 안전 확인을 진행해 주세요.
        </p>
      </AppScreen>
    );
  }

  const isSuccess = transferResult.status === "success";

  return (
    <AppScreen
      className="justify-center gap-6 py-10"
      footer={
        <Link
          href={isSuccess ? "/accounts" : "/transfer/review"}
          onClick={unlockTransferRequest}
          className={`flex h-14 items-center justify-center rounded-2xl text-[15px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 ${
            isSuccess
              ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
          }`}
        >
          {isSuccess ? "연결된 계좌로 이동" : "송금 정보 다시 확인"}
        </Link>
      }
    >
      <StatusHero
        tone={isSuccess ? "success" : "danger"}
        symbol={isSuccess ? "✅" : "⚠️"}
        title={isSuccess ? "이체 완료" : "이체하지 못했습니다"}
        description={transferResult.message}
      />

      <SurfaceCard
        as="section"
        className="w-full p-5"
        aria-labelledby="transfer-result-detail-title"
      >
        <h2 id="transfer-result-detail-title" className="sr-only">
          이체 결과 상세
        </h2>
        <dl className="flex flex-col gap-3">
          <Row label="받는 사람" value={transferResult.recipientName} />
          <Row
            label={isSuccess ? "보낸 금액" : "출금되지 않은 금액"}
            value={
              <Amount
                value={transferResult.amount}
                className={`text-lg ${isSuccess ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}
              />
            }
          />
          <Row label="처리 상태" value={isSuccess ? "완료" : "실패 · 출금되지 않음"} />
        </dl>
        <p className="mt-4 text-xs text-[var(--color-text-muted)]" data-secondary-content="true">
          현재 결과는 프론트엔드 시연용 Mock입니다.
        </p>
      </SurfaceCard>
    </AppScreen>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[13px] text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-right text-[15px] font-bold">{value}</dd>
    </div>
  );
}
