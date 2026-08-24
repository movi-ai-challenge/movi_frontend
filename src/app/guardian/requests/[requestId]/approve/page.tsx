"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import {
  approveGuardianConnection,
  getGuardianConnectionApprovalRequest,
} from "@/services/guardianApprovalService";
import type { GuardianConnectionApprovalRequest } from "@/types";

type PageStatus =
  | "loading"
  | "ready"
  | "approving"
  | "approved"
  | "already-approved"
  | "expired"
  | "verification-required"
  | "not-found"
  | "error";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

function getRequestStatus(
  request: GuardianConnectionApprovalRequest,
): PageStatus {
  if (!request.identityVerified) return "verification-required";
  if (request.status === "expired") return "expired";
  if (request.status === "approved") return "already-approved";
  return "ready";
}

export default function GuardianConnectionApprovalPage() {
  const params = useParams<{ requestId: string }>();
  const [request, setRequest] =
    useState<GuardianConnectionApprovalRequest | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const approvalInProgressRef = useRef(false);
  const approvedHeadingRef = useRef<HTMLHeadingElement>(null);

  const loadRequest = async () => {
    setStatus("loading");
    setHasAcknowledged(false);

    try {
      const loadedRequest = await getGuardianConnectionApprovalRequest(
        params.requestId,
      );

      if (!loadedRequest) {
        setRequest(null);
        setStatus("not-found");
        return;
      }

      setRequest(loadedRequest);
      setStatus(getRequestStatus(loadedRequest));
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    let isActive = true;

    void getGuardianConnectionApprovalRequest(params.requestId)
      .then((loadedRequest) => {
        if (!isActive) return;

        if (!loadedRequest) {
          setRequest(null);
          setStatus("not-found");
          return;
        }

        setRequest(loadedRequest);
        setStatus(getRequestStatus(loadedRequest));
      })
      .catch(() => {
        if (isActive) setStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [params.requestId]);

  const approveRequest = async () => {
    if (
      !request ||
      !hasAcknowledged ||
      status !== "ready" ||
      approvalInProgressRef.current
    ) {
      return;
    }

    approvalInProgressRef.current = true;
    setStatus("approving");

    try {
      const approvedRequest = await approveGuardianConnection(request);
      setRequest(approvedRequest);
      setStatus("approved");
      window.setTimeout(() => approvedHeadingRef.current?.focus(), 0);
    } catch {
      setStatus("error");
    } finally {
      approvalInProgressRef.current = false;
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <p
        className="font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        보호자 연결 승인
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        보호자 연결을 승인할까요?
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        요청한 사람과 연결 범위를 확인한 뒤 직접 승인해 주세요. 승인만으로 계좌
        조회나 송금 승인 권한이 생기지는 않습니다.
      </p>

      <div
        className="mt-8"
        aria-live="polite"
        aria-atomic="true"
        aria-busy={status === "loading" || status === "approving"}
      >
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            보호자 연결 요청을 확인하고 있어요.
          </p>
        ) : null}

        {status === "error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">연결 승인을 처리하지 못했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              인터넷 연결을 확인하고 다시 불러와 주세요. 보호자 연결은 승인되지
              않았습니다.
            </p>
            <AccessibleButton className="mt-5" onClick={() => void loadRequest()}>
              다시 불러오기
            </AccessibleButton>
          </section>
        ) : null}

        {status === "not-found" ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">승인할 요청을 찾지 못했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              링크가 정확한지 확인하거나 요청을 보낸 사용자에게 새 링크를
              요청해 주세요.
            </p>
          </section>
        ) : null}

        {status === "verification-required" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">본인 확인이 필요합니다.</h2>
            <p className="mt-2 leading-7">
              보호자 본인 확인이 완료되지 않아 연결을 승인할 수 없습니다. 실제
              인증 방식은 백엔드 계약 확정 후 연결합니다.
            </p>
          </section>
        ) : null}

        {status === "expired" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">승인 요청 시간이 만료됐습니다.</h2>
            <p className="mt-2 leading-7">
              이 링크로는 보호자 연결을 승인할 수 없습니다. 요청을 보낸
              사용자에게 새 연결 요청을 부탁해 주세요.
            </p>
          </section>
        ) : null}

        {status === "already-approved" && request ? (
          <section className="rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">이미 승인한 연결 요청입니다.</h2>
            <p className="mt-2 leading-7">
              {request.requesterDisplayName}님의 보호자 연결 요청은 이미 승인되어
              중복 처리하지 않았습니다.
            </p>
          </section>
        ) : null}

        {(status === "ready" || status === "approving") && request ? (
          <article
            className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            aria-labelledby="guardian-approval-requester"
          >
            <p className="font-bold text-[var(--color-primary)]">
              본인 확인 완료 · Mock
            </p>
            <h2
              id="guardian-approval-requester"
              className="mt-2 text-2xl font-bold"
            >
              {request.requesterDisplayName}님의 보호자 연결 요청
            </h2>
            <dl className="mt-6 grid gap-5 border-t-2 border-[var(--color-border)] pt-5">
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  요청 확인 시각
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  {dateFormatter.format(new Date(request.reviewedAt))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  승인 후 상태
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  가족 관계와 권한 설정 대기
                </dd>
              </div>
            </dl>

            <label className="mt-6 flex min-h-16 cursor-pointer items-start gap-4 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <input
                type="checkbox"
                checked={hasAcknowledged}
                disabled={status === "approving"}
                onChange={(event) => setHasAcknowledged(event.target.checked)}
                className="mt-1 h-7 w-7 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
              />
              <span>
                <span className="block font-bold">
                  요청한 사람을 알고 있으며 보호자 연결에 동의합니다.
                </span>
                <span className="mt-2 block leading-7 text-[var(--color-text-muted)]">
                  조회·송금 승인 권한은 다음 단계에서 별도로 선택합니다.
                </span>
              </span>
            </label>

            <AccessibleButton
              className="mt-6 w-full"
              isLoading={status === "approving"}
              loadingLabel="보호자 연결을 승인하고 있어요"
              disabled={!hasAcknowledged}
              onClick={() => void approveRequest()}
            >
              보호자 연결 승인하기
            </AccessibleButton>
            {!hasAcknowledged ? (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                동의 항목을 확인하면 승인할 수 있습니다.
              </p>
            ) : null}
          </article>
        ) : null}

        {status === "approved" && request ? (
          <section className="rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6">
            <h2
              ref={approvedHeadingRef}
              tabIndex={-1}
              className="text-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              보호자 연결을 승인했습니다.
            </h2>
            <p className="mt-2 leading-7">
              {request.requesterDisplayName}님과의 연결을 승인했습니다. 아직 금융
              정보 조회나 송금 승인 권한은 설정되지 않았습니다.
            </p>
            <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
              다음 단계에서 가족 관계와 필요한 권한을 각각 설정합니다. 현재
              결과는 프론트엔드 시연용 Mock입니다.
            </p>
          </section>
        ) : null}
      </div>

      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        MOVI 처음 화면으로
      </Link>
    </main>
  );
}
