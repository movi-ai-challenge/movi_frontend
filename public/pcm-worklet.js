/**
 * 마이크 입력을 Google STT 스트리밍이 요구하는 형식으로 바꾼다.
 *
 * MediaRecorder 는 WebM/Opus 컨테이너를 내놓는데, 스트리밍 인식 설정은
 * PCM16 / 16kHz / mono 원본을 기대한다. 그래서 녹음기가 아니라 오디오 그래프에서
 * 원본 샘플을 직접 받아 변환한다.
 *
 * 두 가지를 한다.
 *   1) 브라우저 샘플레이트(보통 48kHz)를 16kHz 로 낮춘다
 *   2) Float32(-1~1) 를 16비트 정수로 바꾼다
 *
 * 128 샘플씩 들어오는 것을 그대로 보내면 초당 수백 번 전송이 되어 낭비가 크다.
 * 100ms 어치를 모아 한 번에 넘긴다.
 */

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_DURATION_MS = 100;
const SAMPLES_PER_CHUNK = (TARGET_SAMPLE_RATE * CHUNK_DURATION_MS) / 1000;

class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(SAMPLES_PER_CHUNK);
    this.filled = 0;
    // 원본 샘플 몇 개당 하나를 쓸지. 48000/16000 이면 3 이다.
    this.ratio = sampleRate / TARGET_SAMPLE_RATE;
    this.position = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    /*
     * 정수 배수가 아닐 수 있어(예: 44100/16000 = 2.75625) 소수 위치를 누적하며
     * 뽑는다. 버리는 방식이라 앨리어싱이 남지만, 음성 인식 품질에는 영향이 작고
     * 워클릿 안에서 필터를 돌리는 비용이 더 크다.
     */
    while (this.position < channel.length) {
      const sample = channel[Math.floor(this.position)];
      this.buffer[this.filled] = sample;
      this.filled += 1;
      this.position += this.ratio;

      if (this.filled === SAMPLES_PER_CHUNK) {
        this.port.postMessage(this.toPcm16(this.buffer), []);
        this.filled = 0;
      }
    }
    this.position -= channel.length;

    return true;
  }

  toPcm16(samples) {
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      // 범위를 벗어난 값은 잘라낸다. 넘치면 부호가 뒤집혀 잡음이 된다.
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    return pcm.buffer;
  }
}

registerProcessor("pcm-worklet", PcmWorklet);
