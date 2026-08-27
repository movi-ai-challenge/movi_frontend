# MOVI 백엔드·프런트엔드·AI 통합 결정

> API 구현 기준: 2026-08-25 역할별 구현 점검
> 최신 범위·정책 결정: [DECISIONS_2026-08-27.md](DECISIONS_2026-08-27.md)
> 실행 우선순위와 현재 상태: [IMPLEMENTATION_SOURCE_OF_TRUTH.md](IMPLEMENTATION_SOURCE_OF_TRUTH.md)

## 1. 문서 우선순위

제품 범위와 정책은 2026-08-27 결정문을 우선하며, 이 문서는 기존 API 구현 계약과 앞으로 확정할 상세 계약을 기록한다. 결정문에 없는 endpoint·DTO·환경 변수 값을 임의로 만들지 않고 `상세 계약 필요`로 기록한다. 실제 최신 백엔드 Controller·DTO가 다르면 담당 팀과 계약을 다시 확정한다.

## 2. 공통 API 계약

모든 JSON 성공·실패 응답은 다음 구조를 사용한다.

```ts
interface ApiResponse<T> {
  code: string;
  message: string;
  voiceMessage: string | null;
  data: T | null;
}
```

- 성공 여부는 `code === "SUCCESS"`와 HTTP 상태를 함께 확인한다.
- 외부 응답은 `unknown`으로 받은 뒤 런타임 검증한다.
- `message`는 화면·로그용, `voiceMessage`는 사용자 TTS용이다.
- 기술 오류와 민감정보를 TTS로 읽지 않는다.
- 401 발생 시 refresh는 한 번만 수행하고 실패하면 로그아웃한다.
- 403은 권한 부족이며 반복 로그인으로 해결되는 것처럼 안내하지 않는다.

## 3. 인증

### 3.1 카카오 로그인

- 시작: `GET /api/v1/auth/kakao/authorize`로 전체 페이지 이동
- callback: 백엔드가 `/login/callback?code={handoffCode}`로 302 이동
- `code`는 60초·1회용이며 토큰이 아니다.
- 교환: `POST /api/v1/auth/kakao/token`에 `{ "code": string }`
- 교환 응답 data:
  - `userId`
  - `newUser`
  - `accessToken`
  - `refreshToken`
  - `tokenType`
  - `accessTokenExpiresIn`
- 프런트는 callback query를 즉시 제거한다.
- Access token은 메모리, Refresh token은 `sessionStorage`에 보관한다.
- URL, 브라우저 기록, 로그와 오류 추적 도구에 토큰을 남기지 않는다.
- 교환 응답의 `newUser`를 최종 기준으로 사용한다.
- 신규 사용자는 PIN 등록 후 계좌 연결, 기존 사용자는 계좌 화면으로 진행한다.
- 프런트 코드 교환 배포 후 백엔드는 `movi.kakao.legacy-token-query=false`로 전환한다.

완료 조건:

- URL에 Access/Refresh token이 없다.
- 코드 누락·만료·재사용이 안전하게 실패한다.
- 성공·취소·OAuth 오류가 모두 프런트 화면으로 복귀한다.

### 3.2 PIN·refresh·logout

- PIN 최초 등록: `POST /api/v1/auth/pin/register`
- 기존 사용자 로그인: `POST /api/v1/auth/pin/login`
- token refresh: `POST /api/v1/auth/token/refresh`
- logout: `POST /api/v1/auth/logout`
- PIN 최초 등록은 카카오 로그인 직후 인증된 신규 사용자만 수행한다.
- PIN 변경·재설정·분실 복구와 생체인증은 MVP에서 제외한다.
- 로그아웃 시 서버 토큰 무효화와 프런트 금융 상태 초기화를 함께 수행한다.

## 4. OpenBanking과 계좌

### 4.1 callback

- `/api/openbanking/callback`은 인증 없이 접근 가능한 공개 경로다.
- state는 사용자와 연결하며 5분 만료·1회 사용이다.
- 성공: `/accounts/connect/callback?result=success`로 302 이동
- 실패: `/accounts/connect/callback?result=error&error={errorCode}`로 302 이동
- 프런트는 복귀 후 인증된 계좌 목록을 다시 조회한다.
- 계좌 0개는 연결 재시도, 1개는 계좌 홈, 여러 개는 계좌 목록으로 이동한다.
- 기본 계좌가 없으면 백엔드가 첫 번째 활성 계좌를 기본 계좌로 지정한다.

### 4.2 계좌 DTO와 범위

- 프런트는 백엔드 Account DTO를 화면 모델로 변환하는 매퍼를 둔다.
- 계좌 목록에 잔액을 합치지 않고 잔액 API를 별도로 호출한다.
- 별칭은 trim 후 1~50자이며 활성 계좌 간 중복을 허용하지 않는다.
- 프런트가 같은 규칙으로 사전 검증해도 최종 판단은 백엔드가 한다.
- 최초 동의에서 여러 계좌가 등록될 수 있다.
- 별도 추가 연결과 연결 해제는 MVP에서 제외한다.

## 5. 거래내역

- 목록은 기본 20건, 최대 100건이다.
- 거래 유형은 `IN` 또는 `OUT` 단일 선택이다.
- `blocked`는 거래 유형이 아니라 Transfer 상태다.
- 차단된 이체는 실제 거래내역을 생성하지 않는다.
- 상세는 `GET /api/transactions/{transactionId}`를 사용한다.
- 음성 HISTORY는 최근 3건만 읽고 나머지는 총 건수로 안내한다.
- 모든 조회에서 로그인 사용자 소유권을 백엔드가 검증한다.

## 6. 음성

- 프런트: 마이크 권한, 녹음, MIME 탐지, multipart 업로드, UI 상태와 기기 TTS
- 백엔드: 음성 세션, slot, 재질문, 만료, 확인 문장과 최종 금융 상태
- AI: 디코딩, STT, Intent/Entity와 FDS 분석
- 프런트는 AI/FDS endpoint를 직접 호출하지 않는다.
- AI intent는 `transfer_money`, `check_balance`, `check_history`, `confirm`, `deny`, `cancel`, `unknown`을 백엔드 명령으로 변환한다. `deny`는 현재 확인 거절·수정, `cancel`은 전체 흐름 취소다.
- AI context는 언어 해석에만 사용하고 계좌·금액·확인·실행 상태는 백엔드가 소유한다.
- 지원 형식은 WebM/Opus, WAV, Safari/iOS MP4를 실기기로 검증한다.
- 프런트는 `voiceSessionId`, `confirmationId`, `idempotencyKey`와 UI 상태만 보관한다.
- 재질문 중 이미 확인한 slot을 유지하고 3회 실패 시 직접 입력으로 전환한다.
- `voiceMessage`를 화면 안내와 TTS의 단일 원천으로 사용한다.
- 모든 음성 동작에 키보드·터치 대안을 제공한다.
- Streaming은 인증된 백엔드 WebSocket, 세션당 한 발화, interim 표시 전용·final 금융 처리 조건을 8월 29일 게이트에서 통과할 때만 채택한다. 실패하면 multipart를 유지한다.

## 7. 송금·멱등성·FDS

- 사용자는 수취인, 금액, 출금 계좌를 화면에서 검토하고 명시적으로 확인한다.
- 비음성 송금은 등록 수취인 선택 → 서버 검토 → 명시적 확인 → 필요 시 기존 PIN 기반 거래 결속 proof → 멱등 실행으로 완료한다.
- 음성 인식만으로 거래를 확정하지 않는다.
- 서버 확인 코드는 무작위 6자리, 60초, 1회용, 최대 3회 시도다. 거래 내용이 바뀌면 `confirmationId`, 코드와 PIN proof를 모두 무효화한다.
- 송금은 `confirmationId`와 `idempotencyKey`를 검증한다.
- `AWAITING_CONFIRMATION`부터 멱등성 키를 보관한다.
- timeout, 새로고침과 재시도에도 같은 키로 최종 상태를 복구한다.
- 프런트는 FDS를 별도로 호출하거나 위험도를 지정하지 않는다.

| 위험도 | FDS 결정 | 송금 결과 | 보호자 알림 |
| --- | --- | --- | --- |
| LOW | `ALLOW` | 완료 | 없음 |
| MEDIUM | `ALLOW_WITH_ALERT` | 완료 | 사후 알림 |
| HIGH | `BLOCK` | 미실행 | 긴급 알림 |
| CRITICAL | `BLOCK` | 미실행 | 긴급 알림 |

- FDS 점수는 원본 0~100 의미와 정책 버전을 보존한다. 프런트는 이를 사기 확률로 표현하거나 임의로 정규화하지 않는다.
- FDS timeout, 5xx, 잘못된 payload와 정의되지 않은 조합은 fail-closed다.
- HIGH·CRITICAL 차단은 PIN 등 추가 인증으로 우회할 수 없다.
- SMS 실패는 이미 완료된 MEDIUM 이체를 롤백하지 않는다.

## 8. 보호자 알림

- 보호자는 위험 거래 알림만 받는다.
- 보호자는 계좌·잔액·거래내역을 조회하거나 이체를 승인·거절하지 않는다.
- Seed 보호자를 사용한다.
- 초대, 수락, 관계 입력, 목록, 연결·해제와 공개 알림 조회 API는 MVP에서 제외한다.
- SMS는 Mock sender를 사용하고 DB 알림 기록과 재시도 상태로 검증한다.
- 프런트의 guardian `riskEventId` 조회 모델과 SMS 링크는 실 API 경로에서 제거한다.
- 메시지에는 계좌번호를 넣지 않고 금액과 완료/차단 여부만 포함한다.
- 프런트 안내는 “보호자에게 알림을 요청했어요.”로 통일한다.
- “문자 발송이 완료됐다”는 문구를 사용하지 않는다.

## 9. 접근성과 저장

- 큰 글씨, 고대비, 단순 모드, 키보드와 화면 읽기 프로그램을 지원한다.
- 금융 주요 조작 영역은 최소 44×44 CSS px다.
- 상태를 색상만으로 전달하지 않는다.
- 중요한 비동기 결과는 live region으로 안내한다.
- 200% 확대와 모바일 reflow를 검증한다.
- 고대비·큰 글씨·단순 모드만 기기 `localStorage`에 저장한다. 인증·금융 정보는 저장하지 않는다.

## 10. 범위 제외

- PASS 실제 인증과 생체인증
- 계좌 추가 연결·연결 해제
- PIN 변경·재설정·분실 복구
- 보호자 초대·수락·연결·해제·권한 설정
- 보호자 금융 대시보드와 거래 승인
- 보호자 공개 알림 조회와 SMS 링크
- 프런트의 직접 AI/FDS 호출
- Google TTS, 생체인증·Passkey, SHAP, 디자인 전면 개편과 신규 배포 체계
- 현재 MVP 안내는 브라우저 TTS·화면 문구·재생·키보드 대안을 사용한다.

## 11. 통합 완료 조건

1. 카카오 코드 교환, 신규 PIN 등록, refresh와 logout
2. OpenBanking 성공·취소·state 만료 후 화면 복귀
3. 계좌·잔액·거래내역 Mock 없는 실제 조회
4. 음성 누락 slot 재질문과 confirm·deny·cancel 구분
5. LOW 완료, MEDIUM 완료+알림, HIGH·CRITICAL 차단+알림
6. FDS/Voice 장애 시 금융 동작 미실행
7. 같은 멱등성 키의 순차·동시 요청에서 이체 1건
8. timeout 후 최종 상태 복구
9. 다른 사용자 계좌·세션·거래 접근 거부
10. URL·로그·응답에 토큰과 민감정보 원문 미노출
11. Chrome, Android, Safari, iOS 음성 업로드
12. 키보드, VoiceOver/TalkBack와 200% 확대에서 P0 흐름 완료
13. 등록 수취인 기반 비음성 송금의 검토·확인 코드·필요 시 PIN proof·멱등 실행
14. 은행 성공 후 응답 유실을 별도 상태 조회로 복구하고 같은 키에 새 이체를 만들지 않음
