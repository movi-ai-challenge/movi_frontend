"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { getConnectedAccounts } from "@/services/accountService";
import { getAccountBalance } from "@/services/balanceService";
import {
  extractCommandAfterWakeWord,
  globalVoiceCommandExamples,
  parseGlobalVoiceCommand,
  type GlobalVoiceCommand,
} from "@/services/globalVoiceCommandService";
import { getRecentTransactions } from "@/services/transactionService";
import { useBankStore } from "@/store/useBankStore";

type AssistantStatus =
  | "idle"
  | "starting"
  | "waiting-wake-word"
  | "awaiting-command"
  | "processing"
  | "error"
  | "unsupported";

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
}

const statusLabels: Record<AssistantStatus, string> = {
  idle: "음성 대기 꺼짐",
  starting: "마이크 권한 확인 중",
  "waiting-wake-word": "‘모비야’를 기다리는 중",
  "awaiting-command": "명령을 기다리는 중",
  processing: "명령 처리 중",
  error: "음성 인식 오류",
  unsupported: "음성 인식 미지원",
};

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

function getRecognitionErrorMessage(errorCode: string): string {
  if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
    return "마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용하거나 텍스트 명령을 이용해 주세요.";
  }

  if (errorCode === "audio-capture") {
    return "사용할 수 있는 마이크를 찾지 못했습니다. 마이크 연결을 확인하거나 텍스트 명령을 이용해 주세요.";
  }

  if (errorCode === "network") {
    return "음성 인식 서비스에 연결하지 못했습니다. 인터넷 연결을 확인하거나 텍스트 명령을 이용해 주세요.";
  }

  return "음성을 인식하지 못했습니다. 다시 시작하거나 텍스트 명령을 이용해 주세요.";
}

export function GlobalVoiceAssistant() {
  const router = useRouter();
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [message, setMessage] = useState(
    "음성 사용 시작을 누른 뒤 ‘모비야’라고 불러 주세요.",
  );
  const [lastTranscript, setLastTranscript] = useState("");
  const [textCommand, setTextCommand] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const isAwaitingCommandRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const commandInProgressRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const statusResetTimerRef = useRef<number | null>(null);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.95;
    utterance.onstart = () => {
      isSpeakingRef.current = true;
    };
    utterance.onend = () => {
      isSpeakingRef.current = false;
    };
    utterance.onerror = () => {
      isSpeakingRef.current = false;
    };
    window.speechSynthesis.speak(utterance);
  };

  const returnToWakeWord = (nextMessage: string) => {
    setMessage(nextMessage);
    if (shouldKeepListeningRef.current) {
      setStatus("waiting-wake-word");
      return;
    }
    setStatus("idle");
  };

  const getTargetAccountId = async (): Promise<string | null> => {
    const accounts = await getConnectedAccounts();
    const targetAccount =
      accounts.find((account) => account.id === defaultAccountId) ??
      accounts[0] ??
      null;
    return targetAccount?.id ?? null;
  };

  const announceBalance = async () => {
    const targetAccountId = await getTargetAccountId();
    if (!targetAccountId) {
      const feedback =
        "조회할 계좌가 없습니다. 먼저 계좌 연결 화면으로 이동할게요.";
      speak(feedback);
      returnToWakeWord(feedback);
      router.push("/accounts/connect");
      return;
    }

    const account = await getAccountBalance(targetAccountId);
    const feedback = `${account.accountName}의 현재 잔액은 ${currencyFormatter.format(account.balance)}입니다.`;
    speak(feedback);
    returnToWakeWord(feedback);
  };

  const announceRecentTransactions = async () => {
    const targetAccountId = await getTargetAccountId();
    if (!targetAccountId) {
      const feedback =
        "조회할 계좌가 없습니다. 먼저 계좌 연결 화면으로 이동할게요.";
      speak(feedback);
      returnToWakeWord(feedback);
      router.push("/accounts/connect");
      return;
    }

    const transactions = await getRecentTransactions(targetAccountId);
    if (transactions.length === 0) {
      const feedback = "최근 거래내역이 없습니다.";
      speak(feedback);
      returnToWakeWord(feedback);
      return;
    }

    const latestTransaction = transactions[0];
    const feedback = `최근 거래는 ${latestTransaction.description}, ${currencyFormatter.format(latestTransaction.amount)}입니다. 전체 거래내역 화면으로 이동할게요.`;
    speak(feedback);
    setMessage(feedback);
    router.push("/transactions");
  };

  const executeCommand = async (command: GlobalVoiceCommand) => {
    if (commandInProgressRef.current) return;
    commandInProgressRef.current = true;
    setStatus("processing");
    setMessage(command.feedback);
    isAwaitingCommandRef.current = false;

    try {
      if (command.intent === "balance") {
        await announceBalance();
        return;
      }

      if (command.intent === "transactions") {
        await announceRecentTransactions();
      } else {
        speak(command.feedback);
        router.push(command.route);
      }

      if (statusResetTimerRef.current) {
        window.clearTimeout(statusResetTimerRef.current);
      }
      statusResetTimerRef.current = window.setTimeout(() => {
        if (!shouldKeepListeningRef.current) return;
        setStatus("waiting-wake-word");
        setMessage("다음 명령은 ‘모비야’라고 부른 뒤 말씀해 주세요.");
      }, 1_200);
    } catch {
      const feedback =
        "요청한 정보를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 말씀해 주세요.";
      speak(feedback);
      returnToWakeWord(feedback);
    } finally {
      commandInProgressRef.current = false;
    }
  };

  const processCommandText = (commandText: string) => {
    const command = parseGlobalVoiceCommand(commandText);
    if (!command) {
      isAwaitingCommandRef.current = true;
      setStatus("awaiting-command");
      setMessage(
        "명령을 이해하지 못했습니다. 잔액조회, 거래내역, 송금, 계좌 중 하나를 말씀해 주세요.",
      );
      speak("명령을 이해하지 못했습니다. 다시 말씀해 주세요.");
      return;
    }

    void executeCommand(command);
  };

  const processTranscript = (transcript: string) => {
    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript || isSpeakingRef.current) return;

    setLastTranscript(trimmedTranscript);
    const wakeWordResult = extractCommandAfterWakeWord(trimmedTranscript);

    if (wakeWordResult.hasWakeWord) {
      if (wakeWordResult.commandText) {
        processCommandText(wakeWordResult.commandText);
        return;
      }

      isAwaitingCommandRef.current = true;
      setStatus("awaiting-command");
      setMessage("네, 무엇을 도와드릴까요?");
      speak("네, 무엇을 도와드릴까요?");
      return;
    }

    if (isAwaitingCommandRef.current) {
      processCommandText(trimmedTranscript);
    }
  };

  const scheduleRecognitionRestart = () => {
    if (!shouldKeepListeningRef.current) return;
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);

    restartTimerRef.current = window.setTimeout(() => {
      if (!shouldKeepListeningRef.current) return;
      try {
        recognitionRef.current?.start();
      } catch {
        setStatus("error");
        setMessage("음성 대기를 다시 시작하지 못했습니다. 다시 시도해 주세요.");
        shouldKeepListeningRef.current = false;
      }
    }, 300);
  };

  const startVoiceAssistant = () => {
    const speechWindow = window as SpeechRecognitionWindow;
    const RecognitionConstructor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      setStatus("unsupported");
      setMessage(
        "이 브라우저에서는 음성 인식을 지원하지 않습니다. 아래 텍스트 명령과 바로가기를 이용해 주세요.",
      );
      return;
    }

    const recognition = new RecognitionConstructor();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart = () => {
      setStatus("waiting-wake-word");
      setMessage("음성 대기 중입니다. ‘모비야’라고 불러 주세요.");
    };
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result?.[0];
        if (result?.isFinal && alternative) {
          processTranscript(alternative.transcript);
        }
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      shouldKeepListeningRef.current = false;
      isAwaitingCommandRef.current = false;
      setStatus("error");
      setMessage(getRecognitionErrorMessage(event.error));
    };
    recognition.onend = () => {
      scheduleRecognitionRestart();
    };

    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;
    isAwaitingCommandRef.current = false;
    setStatus("starting");
    setMessage("마이크 사용 권한을 확인하고 있어요.");

    try {
      recognition.start();
    } catch {
      shouldKeepListeningRef.current = false;
      setStatus("error");
      setMessage("음성 인식을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const stopVoiceAssistant = () => {
    shouldKeepListeningRef.current = false;
    isAwaitingCommandRef.current = false;
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    if (statusResetTimerRef.current) {
      window.clearTimeout(statusResetTimerRef.current);
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setStatus("idle");
    setMessage("음성 대기를 중지했습니다. 언제든 다시 시작할 수 있어요.");
  };

  useEffect(
    () => () => {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.abort();
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      if (statusResetTimerRef.current) {
        window.clearTimeout(statusResetTimerRef.current);
      }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const submitTextCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!textCommand.trim()) {
      setMessage("이동할 화면이나 할 일을 입력해 주세요.");
      return;
    }

    setLastTranscript(textCommand.trim());
    processCommandText(textCommand);
    setTextCommand("");
  };

  const isListening =
    status === "starting" ||
    status === "waiting-wake-word" ||
    status === "awaiting-command" ||
    status === "processing";

  return (
    <section
      className="global-voice-assistant-shell"
      aria-labelledby="global-voice-assistant-title"
    >
      <div className="global-voice-assistant-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-bold text-[var(--color-primary)]">MOVI Voice</p>
            <h2 id="global-voice-assistant-title" className="mt-1 text-xl font-bold">
              “모비야” 전역 음성 도우미
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              한 번 시작하면 어느 화면에서든 “모비야”라고 부른 뒤 명령할 수
              있습니다.
            </p>
          </div>
          {isListening ? (
            <AccessibleButton variant="secondary" onClick={stopVoiceAssistant}>
              음성 대기 중지
            </AccessibleButton>
          ) : (
            <AccessibleButton onClick={startVoiceAssistant}>
              음성 사용 시작
            </AccessibleButton>
          )}
        </div>

        <div
          className="mt-4 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] p-4"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="font-bold">현재 상태: {statusLabels[status]}</p>
          <p className="mt-2 leading-7">{message}</p>
          {lastTranscript ? (
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              최근 인식 또는 입력: “{lastTranscript}”
            </p>
          ) : null}
        </div>

        <details className="mt-4 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <summary className="min-h-11 cursor-pointer font-bold">
            텍스트 명령과 바로가기 사용
          </summary>
          <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
            마이크를 사용할 수 없거나 음성이 잘 인식되지 않을 때 같은 명령을
            입력하거나 버튼으로 선택하세요.
          </p>
          <form className="mt-4" onSubmit={submitTextCommand}>
            <label htmlFor="global-voice-text-command" className="font-bold">
              이동할 화면 또는 할 일
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                id="global-voice-text-command"
                value={textCommand}
                onChange={(event) => setTextCommand(event.target.value)}
                placeholder="예: 잔액 보여줘"
                className="min-h-14 flex-1 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
              />
              <AccessibleButton type="submit">명령 실행</AccessibleButton>
            </div>
          </form>
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="전역 명령 바로가기"
          >
            {globalVoiceCommandExamples
              .filter((command) =>
                ["balance", "transactions", "transfer", "accounts"].includes(
                  command.intent,
                ),
              )
              .map((command) => (
                <AccessibleButton
                  key={command.intent}
                  className="px-4"
                  variant="secondary"
                  onClick={() => void executeCommand(command)}
                >
                  {command.label}
                </AccessibleButton>
              ))}
          </div>
        </details>
      </div>
    </section>
  );
}
