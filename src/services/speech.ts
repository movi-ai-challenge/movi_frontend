"use client";

/**
 * 안내 문구 낭독.
 *
 * 화면을 보지 않는 사용자에게는 들리는 문장이 유일한 안내다. 재질문("누구에게
 * 보낼까요?")이 화면에만 뜨면 그 사용자는 대화를 이어갈 수 없다.
 *
 * 문구는 백엔드가 만든 voiceMessage 를 그대로 읽는다. 금액이 한국어로 바뀌어 오는
 * 것도 그 때문이다 -- 낭독기가 "53000원"을 어떻게 읽을지 보장할 수 없다.
 */

const LANGUAGE = "ko-KR";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * iOS 는 사용자 조작과 이어진 흐름에서만 첫 발화를 허용한다. 마이크를 누르는
 * 시점에 빈 문장을 한 번 흘려 두면, 나중에 도착하는 안내가 조용히 막히지 않는다.
 */
export function primeSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    const utterance = new SpeechSynthesisUtterance("");
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  } catch {
    // 낭독을 준비하지 못해도 나머지 기능은 그대로 쓴다.
  }
}

export function speak(text: string): void {
  if (!isSpeechSupported()) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    // 앞선 안내를 끊는다. 겹쳐 읽으면 두 문장이 섞여 무슨 말인지 알 수 없다.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = LANGUAGE;
    window.speechSynthesis.speak(utterance);
  } catch {
    // 낭독이 실패해도 화면 안내는 남는다.
  }
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // 무시한다.
  }
}
