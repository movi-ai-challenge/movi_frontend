import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { isSpeechSupported, primeSpeech, speak, stopSpeaking } from "../src/services/speech.ts";

interface SpokenUtterance {
  text: string;
  lang: string;
  volume: number;
}

const spoken: SpokenUtterance[] = [];
let cancelCount = 0;

class FakeUtterance {
  lang = "";
  volume = 1;
  text: string;

  constructor(text: string) {
    this.text = text;
  }
}

Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
  configurable: true,
  value: FakeUtterance,
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    SpeechSynthesisUtterance: FakeUtterance,
    speechSynthesis: {
      speak: (u: FakeUtterance) => spoken.push({ text: u.text, lang: u.lang, volume: u.volume }),
      cancel: () => {
        cancelCount += 1;
      },
    },
  },
});

beforeEach(() => {
  spoken.length = 0;
  cancelCount = 0;
});

test("안내 문구를 한국어로 읽는다", () => {
  speak("누구에게 보낼까요?");

  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, "누구에게 보낼까요?");
  assert.equal(spoken[0].lang, "ko-KR");
});

test("새 안내 전에 읽던 것을 끊는다", () => {
  // 겹쳐 읽으면 두 문장이 섞여 무슨 말인지 알 수 없다.
  speak("얼마를 보낼까요?");

  assert.equal(cancelCount, 1);
});

test("빈 문구는 읽지 않는다", () => {
  speak("");
  speak("   ");

  assert.equal(spoken.length, 0);
});

test("낭독 준비는 소리 없이 한 번 흘린다", () => {
  // iOS 는 사용자 조작과 이어진 흐름에서만 첫 발화를 허용한다.
  primeSpeech();

  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].volume, 0);
});

test("지원 여부를 판단한다", () => {
  assert.equal(isSpeechSupported(), true);
});

test("멈추면 읽던 것을 끊는다", () => {
  stopSpeaking();

  assert.equal(cancelCount, 1);
});
