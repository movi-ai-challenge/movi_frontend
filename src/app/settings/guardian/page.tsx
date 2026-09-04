"use client";

import { type FormEvent, useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { toApiError } from "@/services/api";
import {
  getGuardianLinks,
  registerGuardianLink,
  type GuardianLinkSummary,
} from "@/services/guardianService";

export default function GuardianSettingsPage() {
  const [links, setLinks] = useState<GuardianLinkSummary[]>([]);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [message, setMessage] = useState("보호자 연결 상태를 확인하고 있어요.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;
    getGuardianLinks()
      .then((currentLinks) => {
        if (!isActive) return;
        setLinks(currentLinks);
        setMessage(currentLinks.length ? "" : "등록된 보호자가 없습니다.");
      })
      .catch((error: unknown) => {
        if (isActive) setMessage(toApiError(error).message);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!guardianName.trim() || !guardianPhone.trim()) {
      setMessage("보호자 이름과 휴대전화 번호를 입력해 주세요.");
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    try {
      const registered = await registerGuardianLink({
        guardianName,
        guardianPhone,
        relation,
      });
      setLinks((current) => [...current, registered]);
      setGuardianName("");
      setGuardianPhone("");
      setRelation("");
      setMessage(`${registered.guardianName} 님을 보호자로 등록했어요.`);
    } catch (error: unknown) {
      setMessage(toApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <PageBackLink href="/settings">설정으로</PageBackLink>
      <h1 className="text-3xl font-bold">내 보호자 연락처</h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        주의 또는 고위험 송금이 감지되면 등록한 번호로 문자를 보냅니다.
        보호자는 MOVI 회원이 아니어도 됩니다.
      </p>

      <section className="mt-8" aria-labelledby="guardian-list-title">
        <h2 id="guardian-list-title" className="text-xl font-bold">연결 상태</h2>
        {links.length ? (
          <ul className="mt-3 grid gap-3">
            {links.map((link) => (
              <li key={link.linkId} className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="font-bold">{link.guardianName}</p>
                <p className="mt-1 text-[var(--color-text-muted)]">
                  {link.relation ? `${link.relation} · ` : ""}알림 연결됨
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <form className="mt-8 grid gap-5" onSubmit={submit}>
        <h2 className="text-xl font-bold">보호자 등록</h2>
        <label className="grid gap-2 font-semibold">
          보호자 이름
          <input className="min-h-12 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4" value={guardianName} onChange={(event) => setGuardianName(event.target.value)} maxLength={50} />
        </label>
        <label className="grid gap-2 font-semibold">
          보호자 휴대전화 번호
          <input className="min-h-12 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4" value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} inputMode="tel" autoComplete="tel" />
        </label>
        <label className="grid gap-2 font-semibold">
          관계 (선택)
          <input className="min-h-12 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4" value={relation} onChange={(event) => setRelation(event.target.value)} maxLength={30} placeholder="예: 자녀, 배우자" />
        </label>
        <AccessibleButton type="submit" isLoading={isSubmitting} loadingLabel="등록하고 있어요">
          보호자 등록하기
        </AccessibleButton>
      </form>

      {message ? <p className="mt-5 rounded-xl border-2 border-[var(--color-border)] p-4 font-semibold" role="status">{message}</p> : null}
      <p className="mt-5 leading-7 text-[var(--color-text-muted)]">
        문자를 받으면 송금한 분에게 직접 연락해 내용을 확인해 주세요. 보호자에게 송금 승인 권한은 없습니다.
      </p>
    </main>
  );
}
