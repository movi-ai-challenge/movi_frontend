"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import {
  getGuardianRelationshipSetup,
  saveGuardianRelationship,
} from "@/services/guardianRelationshipService";
import type { GuardianRelationshipSetup } from "@/types";

type PageStatus =
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "approval-required"
  | "expired"
  | "not-found"
  | "error";

function getPageStatus(setup: GuardianRelationshipSetup): PageStatus {
  if (setup.status === "awaiting-approval") return "approval-required";
  if (setup.status === "expired") return "expired";
  if (setup.status === "relationship-saved") return "saved";
  return "ready";
}

export default function GuardianRelationshipPage() {
  const params = useParams<{ requestId: string }>();
  const [setup, setSetup] = useState<GuardianRelationshipSetup | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const [relationship, setRelationship] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const saveInProgressRef = useRef(false);
  const validationRef = useRef<HTMLDivElement>(null);
  const savedHeadingRef = useRef<HTMLHeadingElement>(null);

  const loadSetup = async () => {
    setStatus("loading");
    setValidationMessage("");

    try {
      const loadedSetup = await getGuardianRelationshipSetup(params.requestId);
      if (!loadedSetup) {
        setSetup(null);
        setStatus("not-found");
        return;
      }

      setSetup(loadedSetup);
      setRelationship(loadedSetup.relationship ?? "");
      setStatus(getPageStatus(loadedSetup));
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    let isActive = true;

    void getGuardianRelationshipSetup(params.requestId)
      .then((loadedSetup) => {
        if (!isActive) return;

        if (!loadedSetup) {
          setSetup(null);
          setStatus("not-found");
          return;
        }

        setSetup(loadedSetup);
        setRelationship(loadedSetup.relationship ?? "");
        setStatus(getPageStatus(loadedSetup));
      })
      .catch(() => {
        if (isActive) setStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [params.requestId]);

  const submitRelationship = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!setup || saveInProgressRef.current || status !== "ready") return;

    const normalizedRelationship = relationship.trim();
    if (!normalizedRelationship) {
      setValidationMessage("요청한 사용자와의 가족 관계를 입력해 주세요.");
      window.setTimeout(() => validationRef.current?.focus(), 0);
      return;
    }

    saveInProgressRef.current = true;
    setValidationMessage("");
    setStatus("saving");

    try {
      const savedSetup = await saveGuardianRelationship(
        setup,
        normalizedRelationship,
      );
      setSetup(savedSetup);
      setRelationship(savedSetup.relationship ?? "");
      setStatus("saved");
      window.setTimeout(() => savedHeadingRef.current?.focus(), 0);
    } catch {
      setStatus("error");
    } finally {
      saveInProgressRef.current = false;
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <p
        className="font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        보호자 가족 관계
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        요청한 사용자와 어떤 관계인가요?
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        승인한 사용자와의 가족 관계를 직접 입력해 주세요. 입력한 관계만으로
        금융 정보 조회나 송금 승인 권한이 생기지는 않습니다.
      </p>

      <div
        className="mt-8"
        aria-live="polite"
        aria-atomic="true"
        aria-busy={status === "loading" || status === "saving"}
      >
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            보호자 연결 상태를 확인하고 있어요.
          </p>
        ) : null}

        {status === "error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">가족 관계를 저장하지 못했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              인터넷 연결을 확인하고 다시 불러와 주세요. 입력한 관계는 저장되지
              않았습니다.
            </p>
            <AccessibleButton className="mt-5" onClick={() => void loadSetup()}>
              다시 불러오기
            </AccessibleButton>
          </section>
        ) : null}

        {status === "not-found" ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">보호자 연결 요청을 찾지 못했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              링크가 정확한지 확인하거나 요청을 보낸 사용자에게 문의해 주세요.
            </p>
          </section>
        ) : null}

        {status === "approval-required" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">보호자 연결 승인이 먼저 필요합니다.</h2>
            <p className="mt-2 leading-7">
              연결 요청을 승인한 뒤 가족 관계를 입력할 수 있습니다. 이 화면에서는
              승인 절차를 건너뛸 수 없습니다.
            </p>
          </section>
        ) : null}

        {status === "expired" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">보호자 연결 요청이 만료됐습니다.</h2>
            <p className="mt-2 leading-7">
              이 링크로는 가족 관계를 저장할 수 없습니다. 요청을 보낸 사용자에게
              새 연결 요청을 부탁해 주세요.
            </p>
          </section>
        ) : null}

        {(status === "ready" || status === "saving") && setup ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-2xl font-bold">
              {setup.requesterDisplayName}님과의 가족 관계
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              관계 종류는 백엔드 정책 확정 전까지 자유 입력으로 받습니다.
            </p>

            <form className="mt-6" onSubmit={(event) => void submitRelationship(event)} noValidate>
              <label htmlFor="guardian-relationship" className="font-bold">
                가족 관계
              </label>
              <input
                id="guardian-relationship"
                value={relationship}
                maxLength={30}
                autoComplete="off"
                disabled={status === "saving"}
                aria-invalid={validationMessage ? "true" : undefined}
                aria-describedby={
                  validationMessage
                    ? "guardian-relationship-help guardian-relationship-error"
                    : "guardian-relationship-help"
                }
                onChange={(event) => {
                  setRelationship(event.target.value);
                  setValidationMessage("");
                }}
                className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p
                id="guardian-relationship-help"
                className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]"
              >
                예: 부모, 자녀, 배우자. 30자 이내로 입력해 주세요.
              </p>

              {validationMessage ? (
                <div
                  id="guardian-relationship-error"
                  ref={validationRef}
                  tabIndex={-1}
                  role="alert"
                  className="mt-4 rounded-lg border-2 border-[var(--color-danger)] p-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
                >
                  {validationMessage}
                </div>
              ) : null}

              <AccessibleButton
                className="mt-6 w-full"
                type="submit"
                isLoading={status === "saving"}
                loadingLabel="가족 관계를 저장하고 있어요"
              >
                가족 관계 저장하기
              </AccessibleButton>
            </form>
          </section>
        ) : null}

        {status === "saved" && setup?.relationship ? (
          <section className="rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6">
            <h2
              ref={savedHeadingRef}
              tabIndex={-1}
              className="text-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              가족 관계를 저장했습니다.
            </h2>
            <dl className="mt-4 grid gap-4">
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  연결 사용자
                </dt>
                <dd className="mt-1 text-lg font-bold">
                  {setup.requesterDisplayName}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  가족 관계
                </dt>
                <dd className="mt-1 text-lg font-bold">{setup.relationship}</dd>
              </div>
            </dl>
            <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
              다음 단계에서 계좌 조회와 송금 승인 권한을 별도로 설정합니다. 현재
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
