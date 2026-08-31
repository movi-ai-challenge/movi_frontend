"use client";

import Link from "next/link";

import { Amount } from "@/components/common/Amount";
import { AppScreen } from "@/components/common/AppScreen";
import { StatusHero } from "@/components/common/StatusHero";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { useBankStore } from "@/store/useBankStore";

export default function HighRiskBlockedPage() {
  const transferDraft = useBankStore((state) => state.transferDraft);

  if (!transferDraft) {
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
        <h1 className="text-2xl font-extrabold">확인할 거래가 없습니다.</h1>
        <p className="leading-relaxed text-[var(--color-text-muted)]">
          송금 정보를 입력하고 거래 안전 확인을 먼저 진행해 주세요.
        </p>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      className="justify-center gap-6 py-10"
      footer={
        <Link
          href="/accounts"
          className="flex h-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[15px] font-semibold text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          연결된 계좌로 이동
        </Link>
      }
    >
      <StatusHero
        tone="danger"
        symbol="🚫"
        title="이체를 차단했습니다"
        description={
          <>
            평소 거래와 다른 위험 신호가 함께 확인됐습니다.
            <br />
            계좌에서 돈이 빠져나가지 않았습니다.
          </>
        }
      />

      <SurfaceCard as="section" className="w-full p-5" aria-labelledby="blocked-detail-title">
        <h2 id="blocked-detail-title" className="sr-only">
          차단된 거래 정보
        </h2>
        <dl className="flex flex-col gap-3">
          <Row label="받는 사람" value={transferDraft.recipientName} />
          <Row
            label="차단된 금액"
            value={<Amount value={transferDraft.amount} className="text-[var(--color-danger)]" />}
          />
          <Row label="거래 상태" value="차단됨 · 출금되지 않음" />
        </dl>
        <p className="mt-4 text-xs text-[var(--color-text-muted)]" data-secondary-content="true">
          현재 위험 판단은 프론트엔드 시연용 Mock 결과입니다.
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
