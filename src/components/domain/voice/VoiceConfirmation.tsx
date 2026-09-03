"use client";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import type { ConfirmationRecorder } from "@/hooks/useConfirmationRecorder";

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
}

export function VoiceConfirmation({ question, recorder }: Props) {
  return (
    <div className="mt-4 w-full">
      <p className="text-lg font-bold text-[var(--color-accent)]">{question}</p>

      <AccessibleButton
        type="button"
        className="mt-3 w-full"
        onClick={recorder.toggle}
        disabled={recorder.isBusy}
        aria-label={recorder.isRecording ? "대답 끝내기" : "음성으로 대답하기"}
      >
        {recorder.isRecording ? "대답 끝내기" : null}
        {!recorder.isRecording && recorder.isBusy ? "처리 중이에요" : null}
        {!recorder.isRecording && !recorder.isBusy ? "음성으로 대답하기" : null}
      </AccessibleButton>

      {recorder.message ? (
        <p aria-live="polite" className="mt-2 text-base text-[var(--color-muted)]">
          {recorder.message}
        </p>
      ) : null}
    </div>
  );
}
