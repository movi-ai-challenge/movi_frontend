import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  getVoiceAudioFileExtension,
  isSupportedVoiceMimeType,
  normalizeVoiceMimeType,
  selectSupportedVoiceMimeType,
  VOICE_STREAM_FINALIZATION_DELAY_MS,
} from "../src/services/voiceAudioContract.ts";

const originalMediaRecorder = globalThis.MediaRecorder;

afterEach(() => {
  Object.defineProperty(globalThis, "MediaRecorder", {
    configurable: true,
    value: originalMediaRecorder,
  });
});

test("MIME 파라미터와 대소문자를 제거해 백엔드와 같은 형식으로 정규화한다", () => {
  assert.equal(
    normalizeVoiceMimeType(" Audio/MP4; codecs=mp4a.40.2 "),
    "audio/mp4",
  );
  assert.equal(
    normalizeVoiceMimeType("audio/webm;codecs=opus"),
    "audio/webm",
  );
});

test("WebM, MP4/M4A와 WAV 별칭만 허용한다", () => {
  for (const mimeType of [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/x-m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
  ]) {
    assert.equal(isSupportedVoiceMimeType(mimeType), true, mimeType);
  }
  assert.equal(isSupportedVoiceMimeType("audio/mpeg"), false);
  assert.equal(isSupportedVoiceMimeType("video/mp4"), false);
});

test("브라우저가 WebM을 지원하지 않으면 MP4를 선택한다", () => {
  Object.defineProperty(globalThis, "MediaRecorder", {
    configurable: true,
    value: class {
      static isTypeSupported(mimeType: string): boolean {
        return mimeType === "audio/mp4";
      }
    },
  });

  assert.equal(selectSupportedVoiceMimeType(), "audio/mp4");
});

test("업로드 파일 확장자를 MIME에 맞게 선택한다", () => {
  assert.equal(getVoiceAudioFileExtension("audio/webm;codecs=opus"), "webm");
  assert.equal(getVoiceAudioFileExtension("audio/mp4"), "m4a");
  assert.equal(getVoiceAudioFileExtension("audio/x-m4a"), "m4a");
  assert.equal(getVoiceAudioFileExtension("audio/x-wav"), "wav");
});

test("스트리밍 종료는 iPhone final 확정을 위한 후행 오디오를 남긴다", () => {
  assert.ok(VOICE_STREAM_FINALIZATION_DELAY_MS >= 300);
  assert.ok(VOICE_STREAM_FINALIZATION_DELAY_MS <= 700);
});
