"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import {
  getGuardianConnectionInvitation,
  reviewGuardianConnectionInvitation,
} from "@/services/guardianInvitationService";
import type { GuardianConnectionInvitation } from "@/types";

type PageStatus =
  | "loading"
  | "ready"
  | "reviewing"
  | "reviewed"
  | "expired"
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

export default function GuardianRequestReviewPage() {
  const params = useParams<{ requestId: string }>();
  const [invitation, setInvitation] =
    useState<GuardianConnectionInvitation | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const reviewInProgressRef = useRef(false);

  const loadInvitation = async () => {
    setStatus("loading");

    try {
      const loadedInvitation = await getGuardianConnectionInvitation(
        params.requestId,
      );

      if (!loadedInvitation) {
        setInvitation(null);
        setStatus("not-found");
        return;
      }

      setInvitation(loadedInvitation);
      setStatus(
        loadedInvitation.status === "expired"
          ? "expired"
          : loadedInvitation.status === "reviewed"
            ? "reviewed"
            : "ready",
      );
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    let isActive = true;

    void getGuardianConnectionInvitation(params.requestId)
      .then((loadedInvitation) => {
        if (!isActive) return;

        if (!loadedInvitation) {
          setInvitation(null);
          setStatus("not-found");
          return;
        }

        setInvitation(loadedInvitation);
        setStatus(
          loadedInvitation.status === "expired"
            ? "expired"
            : loadedInvitation.status === "reviewed"
              ? "reviewed"
              : "ready",
        );
      })
      .catch(() => {
        if (isActive) setStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [params.requestId]);

  const reviewInvitation = async () => {
    if (!invitation || reviewInProgressRef.current) return;

    reviewInProgressRef.current = true;
    setStatus("reviewing");

    try {
      const reviewedInvitation =
        await reviewGuardianConnectionInvitation(invitation);
      setInvitation(reviewedInvitation);
      setStatus("reviewed");
    } catch {
      setStatus("error");
    } finally {
      reviewInProgressRef.current = false;
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <p
        className="font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        보호자 연결 요청
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        연결 요청을 확인해 주세요
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        요청 내용을 확인해도 바로 보호자로 연결되거나 금융 정보가 공개되지
        않습니다. 승인과 권한 설정은 다음 단계에서 별도로 진행합니다.
      </p>

      <div
        className="mt-8"
        aria-live="polite"
        aria-atomic="true"
        aria-busy={status === "loading" || status === "reviewing"}
      >
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            보호자 연결 요청을 불러오고 있어요.
          </p>
        ) : null}

        {status === "error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">
              연결 요청을 불러오지 못했습니다.
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              인터넷 연결을 확인하고 다시 시도해 주세요. 요청은 승인되지
              않았습니다.
            </p>
            <AccessibleButton
              className="mt-5"
              onClick={() => void loadInvitation()}
            >
              다시 불러오기
            </AccessibleButton>
          </section>
        ) : null}

        {status === "not-found" ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">연결 요청을 찾지 못했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              링크가 정확한지 확인해 주세요. 새 요청이 필요하면 요청을 보낸
              사용자에게 알려 주세요.
            </p>
          </section>
        ) : null}

        {status === "expired" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">연결 요청 시간이 만료됐습니다.</h2>
            <p className="mt-2 leading-7">
              안전을 위해 이 링크로는 요청을 확인할 수 없습니다. 요청을 보낸
              사용자에게 새 연결 요청을 부탁해 주세요.
            </p>
          </section>
        ) : null}

        {(status === "ready" || status === "reviewing") && invitation ? (
          <article
            className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            aria-labelledby="guardian-requester-name"
          >
            <p className="font-bold text-[var(--color-primary)]">
              확인 대기 중인 요청
            </p>
            <h2 id="guardian-requester-name" className="mt-2 text-2xl font-bold">
              {invitation.requesterDisplayName}님의 보호자 연결 요청
            </h2>
            <dl className="mt-6 grid gap-5 border-t-2 border-[var(--color-border)] pt-5">
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  요청한 시각
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  {dateFormatter.format(new Date(invitation.requestedAt))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  현재 상태
                </dt>
                <dd className="mt-1 text-lg font-semibold">내용 확인 전</dd>
              </div>
            </dl>
            <div className="mt-6 rounded-lg border-2 border-[var(--color-warning)] p-4">
              <p className="font-bold">아직 보호자 연결 승인이 아닙니다.</p>
              <p className="mt-2 leading-7">
                아래 버튼은 요청 내용을 읽었다는 상태만 저장합니다. 계좌 조회나
                송금 승인 권한은 생기지 않습니다.
              </p>
            </div>
            <AccessibleButton
              className="mt-6 w-full"
              isLoading={status === "reviewing"}
              loadingLabel="요청 확인을 저장하고 있어요"
              onClick={() => void reviewInvitation()}
            >
              연결 요청 내용 확인하기
            </AccessibleButton>
          </article>
        ) : null}

        {status === "reviewed" && invitation ? (
          <section className="rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">요청 내용을 확인했습니다.</h2>
            <p className="mt-2 leading-7">
              {invitation.requesterDisplayName}님의 요청을 확인한 상태입니다. 아직
              보호자 연결을 승인하지 않았고 금융 정보도 볼 수 없습니다.
            </p>
            <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
              승인·가족 관계·권한 설정은 후속 명세에서 연결합니다. 현재 결과는
              프론트엔드 시연용 Mock입니다.
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
