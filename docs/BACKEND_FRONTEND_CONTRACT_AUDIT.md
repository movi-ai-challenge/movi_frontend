# 백엔드-프런트엔드 계약 및 구현 감사

> 역사 자료: 이 문서는 2026-08-25 이전 계약과 당시 PR을 감사한 기록이다. 현재 구현 판단에는 [IMPLEMENTATION_SOURCE_OF_TRUTH.md](IMPLEMENTATION_SOURCE_OF_TRUTH.md)와 [backend-frontend-integration-decisions.md](backend-frontend-integration-decisions.md)를 우선한다. 아래의 PR 번호·API 상태·`확인 필요` 항목을 현재 사실로 단독 인용하지 않는다.

기준일: 2026-08-25

프런트 기준: `movi_frontend` `main` (`e2ee784`) 및 열린 PR #1~#9

백엔드 기준: `movi_backend` `develop` (`c769c48`)

참고한 미병합 백엔드 변경: PR #64(CORS), PR #65(카카오 콜백 프런트 리다이렉트)

## 1. 목적과 판단 기준

이 문서는 백엔드의 최신 정책·공개 API·실제 구현을 프런트 코드와 대조해 팀의 구현 기준과 남은 작업을 고정한다. 백엔드 코드는 이 저장소에서 변경하지 않는다.

계약이 충돌하면 다음 순서로 판단한다.

1. 백엔드 `docs/integration-spec.md`: 파트 간 책임과 MVP 정책
2. 백엔드 최신 실제 Controller·DTO·보안 설정: 현재 호출 가능한 동작
3. 백엔드 `README.md`, `docs/api-response.md`, `docs/error-codes.md`
4. 그 밖의 일정·설계 문서

오래된 일정 문서의 체크리스트나 프런트 Mock이 위 계약과 다르면 구현 근거로 사용하지 않는다. 실제 코드와 최상위 계약도 서로 다르면 `확인 필요`로 기록하고 백엔드 이슈에서 먼저 해소한다.

## 2. 확정된 제품 정책

### 음성 인터페이스

- 프런트는 마이크 권한, 녹음, 업로드 상태, 화면 상태, 기기 TTS를 담당한다.
- 프런트는 AI 서버를 직접 호출하지 않는다. 모든 음성 요청은 Spring 백엔드를 통한다.
- 백엔드가 음성 세션, 슬롯, 재질문, 만료, 확인 문장과 최종 금융 상태의 단일 소유자다.
- 프런트가 보관할 음성 흐름 값은 `voiceSessionId`, `confirmationId`, `idempotencyKey`, 현재 UI 상태로 제한한다.
- 확인 발화 시 프런트가 UUID 멱등성 키를 한 번 만들고, 타임아웃 후 상태 조회와 재시도에도 같은 키를 사용한다.
- 음성 인식만으로 송금을 확정하지 않는다. 화면 또는 음성으로 내용을 검토하고 명시적으로 확인해야 한다.
- 백엔드 `voiceMessage`를 성공·오류 안내의 원문으로 사용한다. 화면 텍스트와 TTS가 서로 다른 결과를 말하면 안 된다.
- 음성 기능에는 항상 보이는 키보드·터치 대안을 제공한다.

### 송금과 FDS

| 위험도 | 백엔드 결정 | 송금 결과 | 보호자 알림 |
|---|---|---|---|
| LOW | `ALLOW` | 완료 | 없음 |
| MEDIUM | `ALLOW_WITH_ALERT` | 완료 | 사후 알림 |
| HIGH | `BLOCK` | 미실행 | 긴급 알림 |

- 보호자는 거래 승인·거절 권한이 없고 계좌나 거래내역도 조회하지 않는다.
- FDS 통신 오류, 타임아웃, 잘못된 응답 및 정의되지 않은 위험도/결정 조합은 모두 fail-closed로 처리한다.
- 이체 금액은 최소 1원, 1회 최대 1,000,000원, 일일 누적 최대 3,000,000원이다.
- 새 계좌번호를 음성으로 불러 송금하는 기능은 MVP 범위가 아니다. 등록 수취인을 사용한다.

### MVP 범위에서 제외된 기능

- 계좌 추가 연결 및 계좌 연결 해제
- 보호자 사전 승인 대기
- 보호자 권한 설정
- 프런트의 보호자 알림 발송·재시도 제어
- Redis 음성 세션, 카드 FDS, SHAP, 고급 TTS 속도 제어

현재 백엔드는 최초 오픈뱅킹 연결 API는 제공하지만 계좌 연결 해제 API는 제공하지 않는다. 기존 프런트 PR #4는 시연용 Mock으로 구현돼 있어도 현 계약상 병합 대상이 아니다.

## 3. 공통 API 계약

모든 JSON 성공·실패 응답은 다음 구조를 사용한다.

```ts
interface ApiResponse<T> {
  code: string;
  message: string;
  voiceMessage: string | null;
  data: T | null;
}
```

- 성공 여부는 `code === "SUCCESS"`로 판단한다.
- HTTP 상태 코드도 함께 처리한다.
- `message`는 화면·로그용이고 `voiceMessage`는 사용자 TTS용이다.
- 오류도 동일한 응답 구조를 사용하므로 하나의 검증 파서가 필요하다.
- 불확실한 외부 데이터는 `unknown`으로 받은 뒤 런타임 검증한다.

목록 페이징은 `content`, `page`, `size`, `totalElements`, `totalPages`, `hasNext`를 사용한다.

## 4. 현재 공개 API와 필요한 프런트 화면·서비스

| 영역 | 실제 공개 API | 프런트에서 필요한 처리 | 현재 상태 |
|---|---|---|---|
| 카카오 로그인 | `GET /api/v1/auth/kakao/authorize`, `GET /api/v1/auth/kakao/callback` | 백엔드 authorize로 전체 페이지 이동, 콜백 응답 및 신규 사용자 분기 | 실 API 미연결 |
| PIN | `POST /api/v1/auth/pin/register`, `POST /api/v1/auth/pin/login` | 6자리 PIN 등록 화면, 전화번호+PIN 로그인, 잠금·오류 안내 | Mock 진입만 존재 |
| 토큰 | `POST /api/v1/auth/token/refresh`, `POST /api/v1/auth/logout` | Bearer 주입, 401 단일 갱신, 실패 시 세션 종료, 안전한 보관 정책 | 미구현 |
| 오픈뱅킹 | `POST /api/openbanking/connect`, `GET /api/openbanking/callback` | `authorizationUrl` 이동, 콜백 성공·실패 화면 | Mock 화면만 존재 |
| 계좌 | `GET /api/accounts`, `PATCH /api/accounts/{id}/primary`, `PATCH /api/accounts/{id}/alias` | 목록 매핑, 기본 계좌 변경, 별칭 편집 | 목록·기본 계좌 Mock, 별칭 UI 없음 |
| 잔액 | `GET /api/accounts/balance?accountAlias=` | 실시간 조회와 `voiceMessage` 다시 듣기 | Mock, 열린 PR #8에 음성 가이드 |
| 음성 세션 | `POST /api/voice/sessions` | “모비야” 이후 세션 생성, `voiceMessage` 안내 | 실 API 미구현 |
| 음성 명령 | `POST /api/voice/sessions/{id}/commands` | WebM/Opus 또는 WAV, 15초·5MB 제한, 재질문·확인·취소 상태 표시 | 백엔드 방식 미구현 |
| 송금 상태 | `GET /api/transfers/status?idempotencyKey=` | 타임아웃·화면 복귀 후 동일 키로 결과 복구 | 미구현 |
| 거래내역 | `GET /api/transactions` | 계좌·기간·단일 유형·페이지 매핑 | 화면/필터 Mock, 실 API·페이징 미구현 |

`GET /api/transactions/{transactionId}`는 현재 공개되지 않았다. 따라서 프런트 거래 상세 화면을 실 API에 연결하려면 목록 응답만으로 표시할지, 백엔드 상세 API를 추가할지 협의해야 한다.

## 5. 주요 응답 모델 매핑

### 계좌

백엔드는 `accountId`, `bankName`, `accountNumMasked`, `accountAlias`, `accountType`, `primary`를 반환한다. 현재 프런트 `Account`는 문자열 ID, 잔액 포함 모델이어서 그대로 호환되지 않는다.

필요한 변경:

- 계좌 정보와 잔액 응답을 분리한다.
- `accountId`를 API 경계에서는 숫자로 유지하거나 일관된 변환 계층을 둔다.
- `accountAlias`와 `accountNumMasked` 이름을 백엔드 DTO에 맞춰 매핑한다.
- 목록 응답의 `totalCount`와 `accounts`를 처리한다.

### 음성 명령

백엔드 응답에는 다음 값이 포함될 수 있다.

- `voiceSessionId`, `state`, `intent`, `missingSlots`, `expiresAt`
- `confirmationId`, `fromAccount`, `recipient`, `amount`
- `transferId`, `status`, `riskLevel`, `completedAt`

프런트 UI 상태는 `IDLE`, `LISTENING`, `UPLOADING`, `ANALYZING`, `CLARIFYING`, `AWAITING_CONFIRMATION`, `CHECKING_RISK`, `TRANSFERRING`, `COMPLETED`, `BLOCKED`, `ERROR`로 관리한다. 현재 `idle/listening/processing/speaking/error`만 있는 store는 이 계약을 표현하지 못한다.

### 거래내역

백엔드는 `transactionId`, `accountId`, `type`, `amount`, `balanceAfter`, `counterpartyName`, `category`, `transactedAt`, `memo`, `source`를 반환한다. 현재 프런트의 `description`, `occurredAt`, `blocked` 유형은 실제 DTO와 다르므로 서비스 매퍼 또는 도메인 타입 개편이 필요하다.

## 6. 프런트 구현 상태 감사

### `main`에 있는 것

- Next.js App Router, strict TypeScript, Tailwind, Zustand, Axios 기반
- 로그인 진입, 계좌 연결·등록·목록·기본 계좌·잔액 화면
- 송금 입력·검토·FDS Mock·결과 화면
- 거래내역 목록·기간·유형·상세 Mock 화면
- 고대비·큰 글씨·단순 화면 및 키보드 접근성 기반

위 기능의 서비스는 현재 모두 Mock이다. `NEXT_PUBLIC_USE_MOCK` 플래그는 존재하지만 컴포넌트와 서비스에서 실제 API로 전환하는 구현은 아직 없다.

### 공통 기반에서 남은 것

1. `ApiResponse<T>` 런타임 검증 및 오류 코드 파서
2. 백엔드 DTO와 화면 도메인을 분리하는 매퍼
3. Access/Refresh 토큰 저장·갱신·로그아웃 정책
4. 모든 요청의 Bearer 헤더 및 동시 401 갱신 잠금
5. `voiceMessage` 공통 TTS 큐, 중복 발화 방지, 다시 듣기
6. Mock/실 API가 같은 서비스 인터페이스를 사용하도록 서비스 재구성
7. 라우트 보호를 실제 인증 세션에 연결

### 사용자 흐름에서 남은 것

1. 카카오 로그인 콜백과 신규 사용자 PIN 등록
2. 기존 사용자 전화번호+PIN 로그인 및 PIN 잠금 안내
3. 오픈뱅킹 콜백 결과 화면
4. 계좌 별칭 편집
5. 전역 음성 진입 후 백엔드 음성 세션 생성
6. 녹음 권한 거부·미지원·15초·5MB·업로드 실패 처리
7. 누락 슬롯 재질문과 60초 만료·3회 제한 표시
8. 송금 확인 시 UUID 생성 및 같은 키 재사용
9. LOW/MEDIUM/HIGH 결과 화면을 백엔드 응답으로 통합
10. 송금 상태 복구
11. 거래내역 실 API·단일 유형 필터·페이징
12. 키보드, 스크린리더, 200% 확대, 실제 보조기기 E2E 검증

## 7. 열린 PR 병합 전 조치

| PR | 판단 | 병합 전 조치 |
|---|---|---|
| #1 카카오 로그인 | 병합 보류 | 현재 `develop`의 콜백은 JSON 응답이다. 미병합 백엔드 PR #65와는 URL query 토큰 방식으로 호환되지만 양쪽 PR 모두 브라우저 기록·접근 로그 노출 위험을 인정한다. 더 안전한 일회성 코드 또는 HttpOnly 쿠키 계약을 확정하고, 백엔드 PR #64의 CORS 설정까지 반영된 뒤 병합한다. |
| #2 인증·보안 문서 | 병합 후보 | 최신 백엔드 계약 감사 문서와 용어가 충돌하지 않는지 최종 확인한다. |
| #3 보호자 정책 문서 | 수정 필수 | MEDIUM은 이체 완료+사후 알림, HIGH는 차단+알림으로 확정 표현한다. 보호자 연결 공개 API는 아직 없음을 표시한다. |
| #4 계좌 연결 해제 | 병합 보류 | 백엔드 MVP 비범위이고 DELETE API가 없다. 닫거나 후속 범위로 보관할지는 팀 결정이 필요하다. |
| #5 Mock 인증 보호 | 병합 후보 | Mock 전용임을 유지한다. 실 토큰 저장 방식으로 확대 해석하지 않는다. |
| #6 중위험 화면 | 수정 필수 | “이체 미실행·정책 확인 필요”를 “이체 완료·보호자 사후 알림”으로 변경하고 완료 결과 데이터에 기반해 표시한다. |
| #7 보호자 알림 상태 | 병합 보류 | 백엔드에 알림 기록 조회 API가 없다. 현재 프런트가 `riskEventId` 조회 계약을 발명하므로 API 합의 전 병합하지 않는다. |
| #8 잔액 음성 가이드 | 수정 권장 | 화면이 만든 문장보다 백엔드 `voiceMessage`를 우선 읽도록 실 API 연결 단계에서 변경한다. |
| #9 송금 검토 음성 가이드 | 수정 권장 | 브라우저 직접 의도 판정은 접근성 보조로 한정하고, 최종 CONFIRM/CANCEL은 녹음 파일을 백엔드 세션으로 보내도록 통합한다. |

## 8. 백엔드에 확인하거나 수정 요청할 사항

### 우선 확인

1. 현재 `develop`의 카카오 콜백은 JSON 토큰 응답이다. 미병합 백엔드 PR #65는 프런트로 302 이동하며 Access/Refresh 토큰을 URL query에 담는데, 브라우저 기록·접근 로그 노출 위험이 있다. 일회성 교환 코드 또는 HttpOnly 쿠키 등 안전한 전달 방식을 확정해야 한다.
2. `SecurityConfig`는 `/api/openbanking/callback`을 공개 경로로 두지 않지만 Controller 주석은 인증되지 않은 콜백이며 `state`가 신원 증명이라고 설명한다.
3. 현재 `develop`에는 CORS 설정이 없다. 미병합 백엔드 PR #64가 허용 origin과 credentials 정책을 추가하므로 실제 API 연동 전에 검토·병합·배포가 필요하다.
4. 보호자 연결 엔티티와 내부 알림 처리는 있지만 보호자 초대·수락·조회 Controller는 없다. MVP 시연에서 연결 데이터를 어떻게 준비할지 확인해야 한다.
5. 거래 상세 공개 API가 없다.

### 문서 정리 요청

- 백엔드 `domain-guide.md` 일부는 “대부분 미구현” 또는 예전 보안 상태를 설명하지만 실제 최신 코드는 구현 완료 상태다.
- 프런트 `MVP_WEEK_PLAN.md`의 보호자 승인 대기, 권한 설정, 계좌 연결 해제 항목은 최신 통합 계약과 충돌한다.

## 9. 권장 구현 순서

각 항목은 별도 Issue와 별도 기능 브랜치로 진행한다.

1. P0: 공통 API 응답·오류·`voiceMessage` 파서
2. P0: 안전한 인증 콜백·토큰 정책을 백엔드와 확정
3. P0: 열린 PR #3·#6의 MEDIUM/HIGH 정책 수정
4. P0: 음성 녹음 업로드와 백엔드 세션 상태 머신
5. P0: 멱등성 키와 송금 상태 복구
6. P1: 계좌·잔액·기본 계좌·별칭 실 API 연결
7. P1: 거래내역 실 API·페이징 연결
8. P1: 오픈뱅킹 콜백 화면
9. P1: 인증·금융·음성 E2E와 보조기기 QA

PR #4와 #7은 공개 백엔드 계약이 생기기 전까지 구현 순서에서 제외한다.

## 10. 완료 정의

기능은 화면이 보이는 것만으로 완료하지 않는다.

- Mock과 실 API 모드 모두 같은 컴포넌트 계약을 사용한다.
- 성공·오류의 `voiceMessage`를 화면과 기기 TTS가 일관되게 전달한다.
- 네트워크 실패, 권한 거부, 세션 만료, 중복 요청 복구가 가능하다.
- 음성 외 키보드·터치 대안과 명시적 금융 확인 단계가 있다.
- 민감한 계좌번호, 전화번호, 토큰을 URL·로그·커밋에 남기지 않는다.
- lint, typecheck, build 및 해당 기능 테스트가 통과한다.
