"use client";

import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";

type RecorderStatus =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "error";

interface VoiceRecorderControlProps {
  onRecordingComplete: (recording: Blob) => Promise<void>;
  onStatusChange?: (
    status: "idle" | "listening" | "processing" | "error",
    errorMessage?: string,
  ) => void;
  startLabel?: string;
}

function getRecorderErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "마이크 사용 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용하거나 아래 입력란을 이용해 주세요.";
    }

    if (error.name === "NotFoundError") {
      return "사용할 수 있는 마이크를 찾지 못했습니다. 마이크 연결을 확인하거나 아래 입력란을 이용해 주세요.";
    }

    if (error.name === "NotReadableError") {
      return "다른 앱이 마이크를 사용 중입니다. 잠시 후 다시 시도하거나 아래 입력란을 이용해 주세요.";
    }
  }

  return "음성 입력을 시작하지 못했습니다. 잠시 후 다시 시도하거나 아래 입력란을 이용해 주세요.";
}

export function VoiceRecorderControl({
  onRecordingComplete,
  onStatusChange,
  startLabel = "음성 입력 시작",
}: VoiceRecorderControlProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isMountedRef = useRef(true);
  const wasCancelledRef = useRef(false);
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
    onStatusChangeRef.current = onStatusChange;
  }, [onRecordingComplete, onStatusChange]);

  const releaseMicrophone = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      releaseMicrophone();
    };
  }, []);

  const showError = (message: string) => {
    if (!isMountedRef.current) return;
    setErrorMessage(message);
    setStatus("error");
    onStatusChangeRef.current?.("error", message);
  };

  const startRecording = async () => {
    const isSupported =
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined";
    if (!isSupported) {
      showError(
        "이 브라우저에서는 음성 녹음을 지원하지 않습니다. 아래 입력란을 이용해 주세요.",
      );
      return;
    }

    setErrorMessage("");
    setStatus("requesting-permission");
    onStatusChangeRef.current?.("listening");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      wasCancelledRef.current = false;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("error", () => {
        releaseMicrophone();
        showError(
          "녹음 중 문제가 발생했습니다. 다시 시도하거나 아래 입력란을 이용해 주세요.",
        );
      });
      recorder.addEventListener("stop", () => {
        if (wasCancelledRef.current) {
          wasCancelledRef.current = false;
          releaseMicrophone();
          return;
        }

        const recording = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        releaseMicrophone();

        if (!isMountedRef.current) return;
        onStatusChangeRef.current?.("processing");
        void onRecordingCompleteRef.current(recording).catch((error: unknown) => {
          showError(getRecorderErrorMessage(error));
        });
      });

      recorder.start();
      setStatus("recording");
      onStatusChangeRef.current?.("listening");
    } catch (error: unknown) {
      releaseMicrophone();
      showError(getRecorderErrorMessage(error));
    }
  };

  const finishRecording = () => {
    if (recorderRef.current?.state !== "recording") return;
    recorderRef.current.stop();
  };

  const cancelRecording = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      wasCancelledRef.current = true;
      recorder.stop();
    }
    releaseMicrophone();
    setStatus("idle");
    setErrorMessage("");
    onStatusChangeRef.current?.("idle");
  };

  if (status === "error") {
    return (
      <div role="alert">
        <p className="font-bold">음성 입력을 사용할 수 없습니다.</p>
        <p className="mt-2 leading-7">{errorMessage}</p>
        <AccessibleButton
          className="mt-4"
          variant="secondary"
          onClick={() => {
            setStatus("idle");
            setErrorMessage("");
            onStatusChangeRef.current?.("idle");
          }}
        >
          음성 입력 다시 시도
        </AccessibleButton>
      </div>
    );
  }

  if (status === "requesting-permission") {
    return (
      <p className="text-lg font-bold" aria-busy="true">
        마이크 사용 권한을 확인하고 있어요.
      </p>
    );
  }

  if (status === "recording") {
    return (
      <div>
        <p className="text-lg font-bold">듣고 있어요.</p>
        <p className="mt-2 leading-7">
          녹음이 끝나면 완료를 눌러 주세요. 녹음 내용은 기기에 저장하지 않습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <AccessibleButton onClick={finishRecording}>말하기 완료</AccessibleButton>
          <AccessibleButton variant="secondary" onClick={cancelRecording}>
            녹음 취소
          </AccessibleButton>
        </div>
      </div>
    );
  }

  return (
    <AccessibleButton onClick={() => void startRecording()}>
      {startLabel}
    </AccessibleButton>
  );
}
