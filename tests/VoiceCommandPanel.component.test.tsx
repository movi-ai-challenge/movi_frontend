import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { VoiceCommandPanel } from "@/components/domain/voice/VoiceCommandPanel";
import { useBankStore } from "@/store/useBankStore";

const mocks = vi.hoisted(() => ({
  getTransferStatus: vi.fn(),
  readTransferRecoveryKey: vi.fn(),
  sendVoiceCommand: vi.fn(),
  startVoiceSession: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/services/api", () => ({
  toApiError: (error: unknown) => error,
}));

vi.mock("@/services/transferRecoveryStorage", () => ({
  clearTransferRecoveryKey: vi.fn(),
  readTransferRecoveryKey: mocks.readTransferRecoveryKey,
  saveTransferRecoveryKey: vi.fn(),
}));

vi.mock("@/services/transferService", () => ({
  getTransferStatus: mocks.getTransferStatus,
}));

vi.mock("@/services/voiceService", () => ({
  MAX_VOICE_AUDIO_BYTES: 5 * 1024 * 1024,
  MAX_VOICE_DURATION_SECONDS: 15,
  selectSupportedVoiceMimeType: () => "audio/webm",
  sendVoiceCommand: mocks.sendVoiceCommand,
  startVoiceSession: mocks.startVoiceSession,
}));

class FakeMediaRecorder {
  static isTypeSupported(): boolean {
    return true;
  }

  readonly mimeType: string;
  state: RecordingState = "inactive";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? "audio/webm";
  }

  start(): void {
    this.state = "recording";
    this.ondataavailable?.({
      data: new Blob(["voice"], { type: this.mimeType }),
    } as BlobEvent);
  }

  stop(): void {
    this.state = "inactive";
    this.onstop?.();
  }
}

const sessionStart = {
  voiceSessionId: "voice-session-1",
  state: "ACTIVE" as const,
  expiresAt: "2026-08-27T12:15:00.000Z",
  voiceMessage: "무엇을 도와드릴까요?",
};

function apiError(code: string | null, message: string) {
  return {
    kind: code === "FDS_403" ? "authorization_failed" : "unknown",
    code,
    message,
    status: code === "FDS_403" ? 403 : null,
  };
}

async function recordAndUploadCommand(): Promise<void> {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "음성 세션 시작하기" }),
  );
  await user.click(await screen.findByRole("button", { name: "말하기 시작" }));
  await user.click(screen.getByRole("button", { name: "녹음 끝내기" }));
  await user.click(
    await screen.findByRole("button", { name: "녹음한 명령 보내기" }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useBankStore.getState().resetBankState();
  mocks.readTransferRecoveryKey.mockReturnValue(null);
  mocks.startVoiceSession.mockResolvedValue(sessionStart);

  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
  });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: vi.fn(), speak: vi.fn() },
  });
});

describe("VoiceCommandPanel 오류 복구", () => {
  test("VOICE_4005는 현재 세션을 폐기하고 새 세션 재시도를 제공한다", async () => {
    mocks.sendVoiceCommand.mockRejectedValue(
      apiError("VOICE_4005", "음성 세션이 만료되었습니다."),
    );
    render(<VoiceCommandPanel />);

    await recordAndUploadCommand();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("음성 세션이 만료되었습니다.");
    expect(
      within(alert).getByRole("button", { name: "다시 시도하기" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "음성 재시도 한도에 도달했습니다" }),
    ).toBeNull();
  });

  test("VOICE_4006은 같은 세션 재시도를 막고 직접 입력 경로를 제공한다", async () => {
    mocks.sendVoiceCommand.mockRejectedValue(
      apiError("VOICE_4006", "음성 재질문 한도를 초과했습니다."),
    );
    render(<VoiceCommandPanel />);

    await recordAndUploadCommand();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("음성 재질문 한도를 초과했습니다.");
    expect(within(alert).queryByRole("button")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "음성 재시도 한도에 도달했습니다" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "송금 정보 직접 입력" })[0]).toHaveProperty(
      "href",
      expect.stringContaining("/transfer"),
    );
  });

  test("FDS 403은 저장된 키를 유지하고 동일 키 상태 확인을 제공한다", async () => {
    mocks.readTransferRecoveryKey.mockReturnValue(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    mocks.getTransferStatus.mockRejectedValue(
      apiError("FDS_403", "송금 상태를 조회할 권한이 없습니다."),
    );
    render(<VoiceCommandPanel />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("송금 상태를 조회할 권한이 없습니다.");
    expect(alert.textContent).toContain("저장된 같은 키로 다시 확인합니다.");
    expect(
      within(alert).getByRole("button", { name: "같은 키로 송금 상태 확인" }),
    ).toBeTruthy();
    expect(mocks.getTransferStatus).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  test("네트워크 timeout은 새 송금으로 진행하지 않고 동일 키 재확인을 제공한다", async () => {
    mocks.readTransferRecoveryKey.mockReturnValue(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    mocks.getTransferStatus.mockRejectedValue(
      apiError(null, "서버 응답 시간이 초과되었습니다."),
    );
    render(<VoiceCommandPanel />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("서버 응답 시간이 초과되었습니다.");
    expect(alert.textContent).toContain("저장된 같은 키로 다시 확인합니다.");
    expect(
      within(alert).getByRole("button", { name: "같은 키로 송금 상태 확인" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "음성 세션 시작하기" }),
    ).toBeNull();
  });
});
