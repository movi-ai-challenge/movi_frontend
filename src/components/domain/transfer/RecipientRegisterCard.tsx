"use client";

import { useEffect, useId, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { toApiError } from "@/services/api";
import {
  getBanks,
  getRegisteredRecipients,
  registerRecipient,
} from "@/services/recipientService";
import type { Bank } from "@/services/recipientService";
import { speak } from "@/services/speech";
import {
  validateRecipientAccountNumber,
  validateRecipientName,
} from "@/services/transferContract";
import type { RegisteredRecipient } from "@/types";

type Status = "idle" | "loading" | "saving";

/**
 * 상대방 등록.
 *
 * <p>"엄마한테 5만원 보내줘"가 동작하려면 이름과 계좌가 미리 묶여 있어야 한다. 여기 등록하지
 * 않은 사람은 이름으로 부를 수 없고 계좌번호를 전부 말해야 하는데, 그건 화면을 보지 않는
 * 사용자에게 사실상 불가능하다.
 *
 * <p>은행은 목록에서 고른다. 계좌번호 앞자리로 추정하면 앞자리가 같은 다른 은행 계좌가
 * 걸린다. 목록은 백엔드가 주므로 화면과 서버의 코드가 갈리지 않는다.
 *
 * <p>예금주는 입력받지 않는다. 서버가 예금주조회로 확인한 이름을 채운다 — 옮겨 적다 틀린
 * 이름이 확인 복창에서 읽히면, 사용자는 맞는 사람에게 보내는 것으로 듣는다.
 *
 * <p>결과는 화면과 음성 양쪽으로 알린다. 저장된 이름을 그대로 되읽어 주어야 무엇이 등록됐는지
 * 확인할 수 있다.
 */
export function RecipientRegisterCard() {
  const nameFieldId = useId();
  const bankFieldId = useId();
  const accountFieldId = useId();

  const [name, setName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [recipients, setRecipients] = useState<RegisteredRecipient[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [loaded, loadedBanks] = await Promise.all([
          getRegisteredRecipients(),
          getBanks(),
        ]);
        if (!cancelled) {
          setRecipients(loaded);
          setBanks(loadedBanks);
        }
      } catch {
        // 목록을 못 불러와도 등록은 할 수 있어야 한다. 조용히 비워 둔다.
        if (!cancelled) {
          setRecipients([]);
        }
      } finally {
        if (!cancelled) {
          setStatus("idle");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const announce = (text: string) => {
    setMessage(text);
    setErrorMessage("");
    speak(text);
  };

  const fail = (text: string) => {
    setErrorMessage(text);
    setMessage("");
    speak(text);
  };

  const handleSubmit = async () => {
    const validName = validateRecipientName(name);
    if (validName === null) {
      fail("이름을 입력해 주세요.");
      nameInputRef.current?.focus();
      return;
    }

    if (bankCode === "") {
      fail("은행을 골라 주세요.");
      return;
    }

    const validAccountNumber = validateRecipientAccountNumber(accountNumber);
    if (validAccountNumber === null) {
      fail("계좌번호를 숫자 여섯 자리 이상 입력해 주세요.");
      return;
    }

    setStatus("saving");
    try {
      const saved = await registerRecipient({
        name: validName,
        bankCode,
        accountNumber: validAccountNumber,
      });
      setRecipients((previous) =>
        [...previous, saved].sort((left, right) =>
          left.nickname.localeCompare(right.nickname, "ko"),
        ),
      );
      setName("");
      setBankCode("");
      setAccountNumber("");
      /*
       * 저장된 예금주를 함께 읽는다. 사용자가 적은 이름이 아니라 은행이 확인해 준 이름이라
       * 여기서 처음 듣는다 — 다른 사람의 계좌를 적었다면 이 문장에서 알아챈다.
       */
      announce(
        `${saved.nickname} 님을 저장했어요. 예금주는 ${saved.holderName} 님이에요. ` +
          "이제 이름만 부르셔도 보낼 수 있어요.",
      );
      nameInputRef.current?.focus();
    } catch (error) {
      // 서버 메시지를 그대로 읽는다. 화면을 못 보는 사용자에게는 이 문장이 무엇이
      // 잘못됐는지 알려 주는 유일한 수단이다.
      const apiError = toApiError(error);
      fail(apiError.message || "저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section
      className="mt-8 rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-6"
      aria-labelledby="recipient-register-title"
    >
      <h2 id="recipient-register-title" className="text-2xl font-bold">
        상대방 등록
      </h2>
      <p
        className="mt-3 text-base leading-7 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        이름과 은행, 계좌번호를 저장하면 &ldquo;엄마한테 5만원
        보내줘&rdquo;처럼 이름만 불러 송금할 수 있어요. 등록하지 않은 분께도
        은행과 계좌번호를 말하면 보낼 수 있습니다.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={nameFieldId} className="text-lg font-semibold">
            이름
          </label>
          <input
            id={nameFieldId}
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            maxLength={50}
            placeholder="엄마"
            aria-describedby={`${nameFieldId}-hint`}
            className="mt-1 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          />
          <p
            id={`${nameFieldId}-hint`}
            className="text-sm text-[var(--color-text-muted)]"
            data-secondary-content="true"
          >
            음성으로 부를 이름이에요.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={bankFieldId} className="text-lg font-semibold">
            은행
          </label>
          <select
            id={bankFieldId}
            value={bankCode}
            onChange={(event) => setBankCode(event.target.value)}
            aria-describedby={`${bankFieldId}-hint`}
            className="mt-1 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            <option value="">은행을 골라 주세요</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
          <p
            id={`${bankFieldId}-hint`}
            className="text-sm text-[var(--color-text-muted)]"
            data-secondary-content="true"
          >
            계좌번호만으로는 어느 은행인지 알 수 없어요.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={accountFieldId} className="text-lg font-semibold">
            계좌번호
          </label>
          <input
            id={accountFieldId}
            type="text"
            inputMode="numeric"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            autoComplete="off"
            maxLength={30}
            placeholder="12345678901234"
            aria-describedby={`${accountFieldId}-hint`}
            className="mt-1 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          />
          <p
            id={`${accountFieldId}-hint`}
            className="text-sm text-[var(--color-text-muted)]"
            data-secondary-content="true"
          >
            하이픈은 넣지 않아도 돼요.
          </p>
        </div>

        <AccessibleButton
          onClick={() => void handleSubmit()}
          isLoading={status === "saving"}
          loadingLabel="저장하고 있어요"
          className="self-start"
        >
          상대방 저장하기
        </AccessibleButton>
      </div>

      <div className="mt-4" aria-live="assertive" role="status">
        {message ? (
          <p className="text-base font-semibold text-[var(--color-accent)]">
            {message}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="text-base font-semibold text-[var(--color-danger)]">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="mt-6" aria-live="polite">
        <h3 className="text-lg font-bold">
          등록된 상대 {recipients.length}명
        </h3>
        {status === "loading" ? (
          <p className="mt-3 text-base text-[var(--color-text-muted)]">
            등록된 상대를 불러오고 있어요.
          </p>
        ) : recipients.length === 0 ? (
          <p
            className="mt-3 text-base text-[var(--color-text-muted)]"
            data-secondary-content="true"
          >
            아직 등록한 상대가 없어요. 등록하면 이름만 불러 송금할 수 있어요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {recipients.map((recipient) => (
              <li
                key={recipient.id}
                className="rounded-xl border-2 border-[var(--color-border)] px-4 py-3"
              >
                <span className="text-lg font-semibold">
                  {recipient.nickname}
                </span>
                <span
                  className="ml-2 text-base text-[var(--color-text-muted)]"
                  data-secondary-content="true"
                >
                  {recipient.holderName} · {recipient.maskedAccountNumber}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
