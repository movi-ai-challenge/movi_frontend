"use client";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import type { ConfirmationRecorder } from "@/hooks/useConfirmationRecorder";
import { speak } from "@/services/speech";

/**
 * 확인 질문과 대답 버튼.
 *
 * <p>녹음과 전송은 {@link ConfirmationRecorder} 가 맡는다. 이 화면은 그 상태를 보여
 * 주기만 한다 -- 같은 녹음을 홈 화면의 큰 마이크 버튼에서도 시작해야 해서, 로직을
 * 화면 안에 두면 두 곳이 각자 녹음을 들고 서로 다른 확인을 보내게 된다.
 *
 * <p>버튼을 남겨 두는 이유는 마이크를 이미 눌러 본 적 없는 사용자와, 화면을 보고
 * 쓰는 사용자를 위해서다. 둘 중 무엇을 눌러도 같은 동작을 한다.
 */

interface Props {
  /** 백엔드가 만든 확인 질문. 화면과 낭독이 같은 문장을 쓴다. */
  question: string;
  recorder: ConfirmationRecorder;
  onCanceled: () => void;
}

export function VoiceConfirmation({ question, recorder, onCanceled }: Props) {
  return (
    <div className="mt-4 w-full">
      <p className="text-lg font-bold text-[var(--color-accent)]">{question}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <AccessibleButton
          type="button"
          variant="secondary"
          onClick={() => speak(question)}
          disabled={recorder.isBusy}
        >
          확인 내용 다시 듣기
        </AccessibleButton>
        <AccessibleButton
          type="button"
          variant="secondary"
          onClick={onCanceled}
          disabled={recorder.isBusy || recorder.isRecording}
        >
          송금 취소
        </AccessibleButton>
      </div>

      {recorder.isRecording ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <AccessibleButton type="button" onClick={recorder.toggle}>
            대답 끝내기
          </AccessibleButton>
          <AccessibleButton type="button" variant="secondary" onClick={recorder.cancel}>
            녹음 취소
          </AccessibleButton>
        </div>
      ) : (
        <AccessibleButton
          type="button"
          className="mt-3 w-full"
          onClick={recorder.toggle}
          disabled={recorder.isBusy}
          aria-label="음성으로 대답하기"
        >
          {recorder.isBusy ? "처리 중이에요" : "음성으로 대답하기"}
        </AccessibleButton>
      )}

      {recorder.message ? (
        <p aria-live="polite" className="mt-2 text-base text-[var(--color-muted)]">
          {recorder.message}
        </p>
      ) : null}
    </div>
  );
}
