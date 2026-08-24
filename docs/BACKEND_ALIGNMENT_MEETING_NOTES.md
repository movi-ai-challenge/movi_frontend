# MOVI 백엔드-프런트엔드 연동 합의 회의록

문서 작성일: 2026-08-25

회의 일시: `YYYY-MM-DD HH:mm`

참석자:

- 프런트엔드: `이름`
- 백엔드: `이름`
- AI: `이름`
- 기획·디자인: `이름`

기록자: `이름`

## 1. 회의 목표

프런트엔드가 추측으로 API·화면·인증 동작을 만들지 않도록 다음 항목을 확정한다.

1. 로그인과 토큰 전달·보관 방식
2. “모비야” 이후 지원할 음성 명령과 세션 계약
3. 송금·FDS·보호자 알림의 사용자 표시 기준
4. 현재 빠진 공개 API와 MVP 범위
5. 통합 환경, 담당자, 완료 일정

회의 종료 전 각 안건에 `결정`, `담당자`, `기한`을 반드시 기록한다. 결정하지 못한 항목은 임시 동작을 만들지 않고 `확인 필요`로 유지한다.

## 2. 사전 공유 자료

- 프런트 계약 감사: [frontend PR #14](https://github.com/movi-ai-challenge/movi_frontend/pull/14), `docs/BACKEND_FRONTEND_CONTRACT_AUDIT.md`
- 인증·금융 안전 점검: [frontend PR #2](https://github.com/movi-ai-challenge/movi_frontend/pull/2), [AUTH_SECURITY_CHECKLIST.md](AUTH_SECURITY_CHECKLIST.md)
- 백엔드 기준: `develop` 커밋 `c769c48`
- 백엔드 통합 계약: `docs/integration-spec.md`
- 백엔드 공통 응답: `docs/api-response.md`, `docs/error-codes.md`
- 백엔드 CORS 변경: [backend PR #64](https://github.com/movi-ai-challenge/movi_backend/pull/64) — 현재 OPEN
- 백엔드 카카오 콜백 변경: [backend PR #65](https://github.com/movi-ai-challenge/movi_backend/pull/65) — 현재 OPEN

## 3. 회의 시작 시 먼저 확인할 원칙

아래 원칙은 최신 통합 계약에서 이미 확정됐다. 변경하려면 세 파트가 계약 문서를 함께 수정해야 한다.

- 프런트는 백엔드만 호출하고 AI 서버를 직접 호출하지 않는다.
- 음성 세션·슬롯·재질문·확인 문장·최종 금융 상태는 백엔드가 소유한다.
- 프런트는 마이크 권한·녹음·업로드 상태·기기 TTS·키보드 대안을 담당한다.
- 음성 인식만으로 금융 거래를 확정하지 않는다.
- LOW는 이체 완료, MEDIUM은 이체 완료 후 보호자 알림, HIGH는 이체 차단 후 보호자 알림이다.
- 보호자는 승인·거절·계좌 조회·거래내역 조회 권한이 없다.
- 계좌 연결 해제는 현재 MVP 범위가 아니다.

## 4. P0 결정 안건

### 안건 1. 카카오 OAuth 완료 후 토큰 전달 방식

현재 상태:

- 현재 backend `develop`의 callback은 로그인 결과 JSON을 반환하고 프런트로 돌아오지 않는다.
- backend PR #65는 프런트로 302 이동하면서 Access/Refresh 토큰을 URL query에 넣는다.
- frontend PR #1은 해당 URL query를 파싱한다.
- 이 방식은 브라우저 기록, 프록시·서버 접근 로그, 공유 URL에 토큰이 남을 수 있다.

권장 합의안:

- URL에는 짧은 수명의 일회성 교환 코드만 전달한다.
- 프런트가 코드를 백엔드에 한 번 교환해 세션을 만든다.
- Access token은 메모리에 두고, Refresh token은 가능하면 `HttpOnly`, `Secure`, 적절한 `SameSite` 쿠키로 관리한다.
- 이 구성이 배포 도메인 때문에 불가능하면 대안을 보안 담당과 명시적으로 결정한다.

결정 질문:

1. callback 최종 URL과 응답 형식은 무엇인가?
2. Access/Refresh token은 각각 어디에 저장하는가?
3. 새 사용자는 어떤 값으로 구분하고 어느 화면으로 이동하는가?
4. callback 실패·state 불일치·사용자 취소 시 프런트 복귀 경로는 무엇인가?
5. 로그아웃 시 서버 토큰 무효화와 클라이언트 정리 순서는 무엇인가?

결정: `미정`

담당자·기한: `미정`

### 안건 2. CORS와 환경별 배포 origin

현재 상태:

- 현재 backend `develop`에는 CORS 설정이 없다.
- backend PR #64가 로컬과 Netlify origin을 허용하도록 추가한다.
- OAuth cookie와 향후 Refresh cookie를 사용한다면 credentials 정책도 일치해야 한다.

결정 질문:

1. local, preview, staging, production의 정확한 프런트·백엔드 origin은 무엇인가?
2. Netlify의 모든 PR preview를 허용할지 고정 staging만 허용할지?
3. `Authorization`, `Content-Type`, multipart 업로드에 필요한 헤더와 메서드는 무엇인가?
4. credentials를 사용할지, 사용한다면 wildcard origin 없이 어떻게 관리할지?
5. 환경변수와 NCP 시크릿 담당자는 누구인가?

결정: `미정`

담당자·기한: `미정`

### 안건 3. “모비야” 이후 지원할 음성 명령 범위

현재 상태:

- 백엔드 `VoiceIntent`는 `BALANCE`, `TRANSFER`, `HISTORY`, `CONFIRM`, `CANCEL`, `UNKNOWN`을 MVP로 설명한다.
- 실제 `VoiceCommandService`는 현재 `TRANSFER` 외 최초 의도를 거부한다.
- 프런트 목표는 특정 송금 화면이 아니라 “모비야” 이후 앱 전반의 주요 기능을 음성으로 조작하는 것이다.
- `GUARDIAN`, `SETTING`은 예약값이며 MVP Voice API가 반환하지 않는다.

권장 MVP 범위:

- 1차: 잔액조회, 최근 거래내역, 등록 수취인 송금
- 공통: 확인, 취소, 다시 듣기, 도움말 또는 지원 명령 안내
- 제외: 보호자 관리, 설정 변경, 새 계좌번호 음성 송금

결정 질문:

1. 이번 MVP에서 실제로 동작할 Intent 목록은 무엇인가?
2. `BALANCE`와 `HISTORY` 처리를 백엔드 음성 세션에 언제 구현하는가?
3. “모비야” 감지는 프런트의 버튼/브라우저 음성 인식/별도 wake-word 엔진 중 무엇인가?
4. 백그라운드 상시 청취는 개인정보·브라우저 제약상 제외할 것인가?
5. 인식된 transcript를 화면에 보여줘야 하는데 현재 응답 DTO에 없으므로 추가할 것인가?
6. 음성 명령 결과가 화면 이동을 요구할 때 백엔드가 action/route를 반환할지, 프런트가 Intent를 route로 매핑할지?

결정: `미정`

담당자·기한: `미정`

### 안건 4. 음성 파일과 세션 상태 계약

현재 계약:

- `POST /api/voice/sessions`
- `POST /api/voice/sessions/{voiceSessionId}/commands`
- WebM/Opus 또는 WAV, 최대 5MB·15초
- 일반 세션 5분, 재질문·확인 60초, 같은 슬롯 재질문 최대 3회

결정 질문:

1. Chrome, Safari, iOS에서 실제 허용할 MIME type 목록은 무엇인가?
2. `MediaRecorder`가 생성한 codec 문자열까지 검증할 것인가?
3. 업로드 진행률과 서버 분석 상태를 한 응답으로 처리할지 polling이 필요한가?
4. `CLARIFYING`, `AWAITING_CONFIRMATION`, `PROCESSING` 중 네트워크가 끊기면 복구 방법은 무엇인가?
5. 세션 만료 시 새 세션 생성과 사용자 안내 문구는 무엇인가?
6. 백엔드 `voiceMessage`와 화면 표시 문구의 단일 원천을 어떻게 유지할 것인가?

결정: `미정`

담당자·기한: `미정`

### 안건 5. 멱등성 키와 송금 결과 복구

현재 계약:

- 프런트가 확인 발화 시 UUID를 한 번 생성한다.
- 같은 거래의 재시도에는 동일한 `idempotencyKey`를 재사용한다.
- `GET /api/transfers/status?idempotencyKey={UUID}`로 결과를 복구한다.

결정 질문:

1. 키 생성 시점은 `AWAITING_CONFIRMATION` 진입 시점인가, 실제 확인 제출 시점인가?
2. 정보가 변경돼 `confirmationId`가 바뀌면 기존 키를 언제 폐기하는가?
3. 새로고침·탭 종료 후 복구를 위해 sessionStorage 사용을 허용하는가?
4. 상태 조회 polling 간격·최대 시간·종료 상태는 무엇인가?
5. 같은 키의 응답 payload가 항상 동일한지?
6. `PENDING` 또는 `RISK_REVIEW`가 장시간 지속될 때 운영 대응은 무엇인가?

권장 프런트 저장값:

- `voiceSessionId`
- `confirmationId`
- `idempotencyKey`
- 현재 UI 상태

계좌번호·토큰·전체 슬롯 원문은 저장하지 않는다.

결정: `미정`

담당자·기한: `미정`

### 안건 6. 공통 응답·오류·TTS 처리

현재 계약:

```json
{
  "code": "SUCCESS",
  "message": "요청이 정상 처리되었습니다.",
  "voiceMessage": "사용자에게 읽어 줄 문장 또는 null",
  "data": {}
}
```

결정 질문:

1. 모든 공개 API가 성공·오류 모두 이 구조를 지키는가?
2. HTTP status와 `code`가 충돌하면 무엇을 기준으로 처리하는가?
3. 사용자 결과·오류에는 `voiceMessage`를 항상 제공하는가?
4. TTS가 실패해도 금융 결과는 유지하는 것이 맞는가?
5. 401 token refresh 실패, 403 소유권 실패, 409 중복 요청의 공통 프런트 동작은 무엇인가?
6. enum·날짜·금액 타입과 nullable 필드를 OpenAPI 또는 JSON 예제로 고정할 수 있는가?

권장 합의안:

- 프런트는 공통 런타임 검증 파서를 하나만 둔다.
- 금융 상태는 `data`와 `code`로 판단하고, TTS 실패로 금융 결과를 실패 처리하지 않는다.
- 기술 오류 문구를 직접 읽지 않고 백엔드 `voiceMessage`를 우선한다.

결정: `미정`

담당자·기한: `미정`

### 안건 7. MEDIUM/HIGH와 보호자 알림 표시

확정 정책:

- MEDIUM + ALLOW_WITH_ALERT: 이체 완료 후 보호자 알림
- HIGH + BLOCK: 이체 차단 후 보호자 긴급 알림
- 보호자는 승인·거절하지 않는다.
- 알림 발송과 최대 3회 재시도는 백엔드 책임이다.

현재 간극:

- 백엔드에 보호자 초대·수락·조회 Controller가 없다.
- 보호자 알림 기록·발송 상태 조회 API도 없다.
- frontend PR #7의 `riskEventId` 조회 모델은 공개 계약이 없는 Mock이다.

결정 질문:

1. MVP 보호자 연결은 실제 API로 구현할지 Seed 데이터로 준비할지?
2. MEDIUM/HIGH 응답에서 “알림 대상”, “큐 등록”, “발송 완료” 중 어디까지 보장하는가?
3. 사용자에게 알림 발송 성공·실패를 보여줄 필요가 있는가?
4. 필요하다면 조회 endpoint, DTO, 인증 주체는 무엇인가?
5. 실 SMS 미연동 상태에서 데모는 Mock sender 기록으로 검증할 것인가?
6. 보호자 SMS 링크에 거래 정보를 어디까지 마스킹해서 제공할 것인가?

결정: `미정`

담당자·기한: `미정`

## 5. P1 결정 안건

### 안건 8. OpenBanking callback 공개 경로

현재 상태:

- Controller는 callback이 인증되지 않은 요청이며 `state`가 신원 증명이라고 설명한다.
- 현재 `SecurityConfig` 공개 경로에는 `/api/openbanking/callback`이 없다.

결정 질문:

1. callback을 명시적으로 permit할 것인가?
2. state의 만료 시간, 1회 사용, 사용자 연결 방식은 무엇인가?
3. 성공·실패 후 프런트 복귀 URL과 query/code 규칙은 무엇인가?
4. 등록된 계좌가 0개·1개·여러 개인 경우 어느 화면으로 이동하는가?

결정: `미정`

담당자·기한: `미정`

### 안건 9. 계좌 DTO와 별칭 변경

현재 상태:

- 백엔드 계좌 DTO: `accountId`, `bankName`, `accountNumMasked`, `accountAlias`, `accountType`, `primary`
- 잔액은 별도 `BalanceResponse`로 제공한다.
- 프런트 Mock `Account`는 잔액을 포함하고 필드명이 다르다.

결정 질문:

1. 프런트가 DTO를 그대로 사용할지 도메인 매퍼를 둘지?
2. 계좌 별칭 길이·허용 문자·중복 규칙은 무엇인가?
3. 기본 계좌가 없거나 계좌가 0개일 때 API 응답과 다음 행동은 무엇인가?
4. 추가 계좌 연결과 연결 해제는 MVP 제외 상태를 유지하는가?

결정: `미정`

담당자·기한: `미정`

### 안건 10. 거래내역·상세 API

현재 상태:

- 목록 API는 계좌, 시작일, 종료일, 단일 `type`, page, size를 지원한다.
- 프런트 Mock은 여러 유형 동시 선택을 지원한다.
- `GET /api/transactions/{transactionId}` 상세 API는 없다.

결정 질문:

1. 유형 필터를 단일 선택으로 맞출지 백엔드가 복수 값을 지원할지?
2. `blocked`는 거래 유형인지 이체 상태인지?
3. 상세 화면은 목록 DTO로 표시할지 상세 endpoint를 추가할지?
4. 음성 HISTORY 요청의 기간·유형 결과를 어떤 응답으로 반환할지?
5. 기본 페이지 크기와 최대 페이지 크기는 무엇인가?

결정: `미정`

담당자·기한: `미정`

### 안건 11. 인증 보호가 필요한 금융·설정 동작

합의가 필요한 동작:

- 기본 계좌 변경
- 계좌 별칭 변경
- PIN 변경·재설정
- 보호자 연락처 연결·해제
- 로그아웃
- 향후 계좌 연결 해제

결정 질문:

1. 로그인 세션만으로 가능한 동작과 재인증이 필요한 동작을 구분할 것인가?
2. 재인증 증명은 어떤 형태이며 몇 분 동안 유효한가?
3. PIN 잠금·재설정·분실 흐름은 MVP에 포함되는가?
4. 금융 확인 modal과 서버 인증 실패 시 포커스·복구 동작은 무엇인가?

결정: `미정`

담당자·기한: `미정`

## 6. 통합 테스트와 일정

### 필요한 환경

| 환경 | 프런트 URL | 백엔드 URL | AI Voice | FDS | OpenBanking | SMS |
|---|---|---|---|---|---|---|
| local | `미정` | `미정` | Mock/실 | Mock/실 | Mock | Mock |
| staging | `미정` | `미정` | `미정` | `미정` | Sandbox/Mock | Mock |
| production demo | `미정` | `미정` | `미정` | `미정` | `미정` | `미정` |

### 최소 통합 시나리오

1. 카카오 또는 PIN 로그인과 token refresh
2. 기본 계좌 잔액조회와 `voiceMessage` TTS
3. “모비야” → 잔액조회
4. “모비야” → 최근 거래내역
5. 송금 수취인 누락 후 재질문
6. 송금 금액 누락 후 재질문
7. 확인 취소
8. LOW 송금 완료
9. MEDIUM 송금 완료와 보호자 알림 기록
10. HIGH 송금 차단과 보호자 알림 기록
11. FDS 장애 시 송금 미실행
12. 같은 멱등성 키 재요청 시 이체 1건
13. 다른 사용자 계좌·세션 접근 거부
14. 로그·URL·응답에 토큰·원문 계좌번호·전화번호 미노출

### 일정 결정

| 작업 | 담당 | 완료 목표 | 선행 조건 | 상태 |
|---|---|---|---|---|
| OAuth·토큰 계약 확정 | `미정` | `미정` | 보안 방식 결정 | 예정 |
| CORS·환경변수 배포 | `미정` | `미정` | origin 확정 | 예정 |
| BALANCE/HISTORY 음성 처리 | `미정` | `미정` | Intent 계약 | 예정 |
| 프런트 공통 API 파서 | `미정` | `미정` | 응답 DTO 고정 | 예정 |
| 음성 녹음·세션 연동 | `미정` | `미정` | MIME·상태 계약 | 예정 |
| 멱등성·상태 복구 | `미정` | `미정` | 키 수명 합의 | 예정 |
| 보호자 Seed/API | `미정` | `미정` | 데모 방식 결정 | 예정 |
| staging E2E | `미정` | `미정` | 위 연동 완료 | 예정 |

## 7. 회의 결정 요약

회의가 끝나면 아래 표만 읽어도 팀원이 구현할 수 있도록 채운다.

| 번호 | 결정 사항 | 프런트 영향 | 백엔드 영향 | 담당 | 기한 |
|---:|---|---|---|---|---|
| 1 | `미정` | `미정` | `미정` | `미정` | `미정` |
| 2 | `미정` | `미정` | `미정` | `미정` | `미정` |
| 3 | `미정` | `미정` | `미정` | `미정` | `미정` |

## 8. 미결 사항과 변경 관리

| 미결 사항 | 필요한 확인 | 확인 담당 | 답변 기한 | 관련 Issue/PR |
|---|---|---|---|---|
| `미정` | `미정` | `미정` | `미정` | `미정` |

파트 간 계약이 바뀌면 다음 순서로 반영한다.

1. 백엔드 `integration-spec.md` 또는 해당 API 계약 수정
2. 백엔드 Controller·DTO·테스트 수정
3. 프런트 계약 감사 및 타입·서비스 수정
4. Mock과 실 API 응답 동기화
5. E2E 재검증

구두 합의만으로 구현을 시작하지 않고 관련 Issue 또는 PR 링크를 남긴다.

## 9. 회의 종료 체크리스트

- [ ] OAuth callback과 토큰 보관 방식이 확정됐다.
- [ ] 환경별 origin과 CORS 담당자가 정해졌다.
- [ ] MVP 음성 Intent 목록과 “모비야” 진입 방식이 확정됐다.
- [ ] BALANCE/HISTORY 음성 처리 담당과 기한이 정해졌다.
- [ ] transcript·route/action 응답 필요 여부가 결정됐다.
- [ ] 멱등성 키 생성·저장·폐기·복구 규칙이 확정됐다.
- [ ] OpenBanking callback 공개 경로가 결정됐다.
- [ ] 보호자 연결과 알림 시연 방식이 결정됐다.
- [ ] 거래 상세와 필터 계약이 결정됐다.
- [ ] staging E2E 날짜와 참여자가 정해졌다.
- [ ] 모든 미결 사항에 담당자와 답변 기한이 있다.
