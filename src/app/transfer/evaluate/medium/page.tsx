"use client";

import Link from "next/link";

import { Amount } from "@/components/common/Amount";
import { AppScreen } from "@/components/common/AppScreen";
import { StatusHero } from "@/components/common/StatusHero";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { useBankStore } from "@/store/useBankStore";

/**
 * 중위험 거래 결과 (명세 5.7)
 *
 * 목업은 이 단계를 "보호자 승인 대기"로 그리지만, 확정된 보호자 정책
 * (docs/GUARDIAN_ALERT_POLICY.md, 2026-08-24)은 보호자에게 이체 승인·거절
 * 권한을 주지 않는다. 중위험 거래는 완료되고 보호자는 사후 알림만 받는다.
 * 돈이 이미 나갔는데 "대기 중"이라고 표시하면 사용자가 거래 상태를
 * 잘못 판단하므로, 목업의 시각 언어만 가져오고 문구는 정책을 따른다.
 */
export default function MediumRiskReviewPage() {
  const transferResult = useBankStore((state) => state.transferResult);
  const unlockTransferRequest = useBankStore((state) => state.unlockTransferRequest);

  if (
    !transferResult ||
    transferResult.status !== "success" ||
    transferResult.riskLevel !== "medium"
  ) {
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

  return (
    <AppScreen
      className="justify-center gap-6 py-10"
      footer={
        <Link
          href="/accounts"
          onClick={unlockTransferRequest}
          className="flex h-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[15px] font-bold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          연결된 계좌로 이동
        </Link>
      }
    >
      <StatusHero
        tone="warning"
        symbol="⚠️"
        title="이체가 완료됐습니다"
        description={
          <>
            평소와 다른 거래 신호가 확인됐습니다.
            <br />
            연결된 보호자에게 알림이 전달됩니다.
          </>
        }
      />

      <SurfaceCard as="section" className="w-full p-5" aria-labelledby="medium-risk-detail-title">
        <h2 id="medium-risk-detail-title" className="sr-only">
          거래 정보
        </h2>
        <dl className="flex flex-col gap-3">
          <Row label="받는 사람" value={transferResult.recipientName} />
          <Row
            label="보낸 금액"
            value={<Amount value={transferResult.amount} className="text-lg text-[var(--color-warning)]" />}
          />
          <Row label="현재 상태" value="완료 · 보호자 사후 알림 대상" />
        </dl>
      </SurfaceCard>

      <SurfaceCard as="section" className="w-full p-5" data-secondary-content="true">
        <h2 className="text-[15px] font-bold">보호자 승인은 필요하지 않습니다.</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          보호자는 정해진 위험 기준에 해당할 때 알림만 받습니다. 계좌와 거래내역을 조회하거나
          이체를 승인·거절할 수 없습니다.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          알림 발송과 재시도는 백엔드가 담당합니다. 현재 공개된 알림 상태 조회 API가 없으므로 이
          화면은 발송 성공 여부를 임의로 표시하지 않습니다.
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
