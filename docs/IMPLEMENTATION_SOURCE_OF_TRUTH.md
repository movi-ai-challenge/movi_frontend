# MOVI 구현 기준 및 통합 로드맵

## 개발 환경 기준

- Node.js `22.6.0` 이상을 사용한다.
- nvm 사용 시 저장소 루트에서 `nvm use`로 기준 버전을 선택한다.
- 의존성 설치와 스크립트 실행은 npm을 사용한다.

> 기준일: 2026-08-25
> 프런트 진행 반영: 2026-08-27
> 기준 스냅샷: 백엔드 `develop` `b6c9092`, 프런트 `main` `65df24a`

## 문서 역할

이 문서는 MOVI MVP를 구현할 때 가장 먼저 확인하는 저장소 내 최상위 실행 기준이다. 2026-08-25 역할별 구현 점검 문서를 저장소에서 계속 참조할 수 있도록 핵심 결정, 현재 상태, 작업 순서와 완료 조건을 정리한다.

현재 남은 작업의 우선순위, 담당과 합의 질문은 [REMAINING_IMPLEMENTATION_AND_AGREEMENTS.md](REMAINING_IMPLEMENTATION_AND_AGREEMENTS.md)에서 관리한다.

문서와 코드가 다르면 다음 순서로 판단한다.

1. 최신 MVP 범위와 이 문서의 확정 정책
2. `docs/backend-frontend-integration-decisions.md`
3. 백엔드 최신 Controller, DTO, Service와 자동 테스트
4. 프런트 최신 서비스, store, 화면과 자동 검증 결과
5. 과거 감사 문서, 회의 준비 문서, 주간 계획

상위 기준끼리 충돌하거나 실제 API가 문서와 다르면 임의로 구현하지 않고 `확인 필요`로 기록한다.

## 현재 판단

프런트 시연용 Mock UX와 백엔드 핵심 도메인은 각각 상당 부분 구현됐지만, 둘을 연결한 실제 사용자 여정은 아직 완성되지 않았다. 새 화면을 늘리는 것보다 인증부터 순서대로 Mock을 실제 API 통합으로 교체하는 것이 우선이다.

상태 표현은 다음 의미로 사용한다.

- `완료`: 실제 코드와 검증이 있고 현재 계약과 일치
- `부분 구현`: UI 또는 일부 계층만 구현됐거나 실연동·운영·실기기 검증이 남음
- `미구현`: 실제 통합 경로가 없음
- `확인 불가`: 담당 저장소, endpoint 또는 배포 근거가 없음
- `범위 제외`: MVP에서 구현하거나 병합하지 않음

## PR과 원격 브랜치 처리 원칙

원격 브랜치가 존재한다고 열린 PR이거나 병합 후보라는 뜻은 아니다. 2026-08-25 점검에서 확인된 열린 프런트 PR은 `#19 feature/kakao-real-login` 하나다. 다른 브랜치의 현재 PR 상태는 별도로 확인해야 한다.

부분 구현 PR을 번호순으로 모두 처리하지 않는다. 다음 기준으로 분류한다.

| 분류 | 처리 |
| --- | --- |
| 현재 통합 단계의 선행 조건 | 최신 계약으로 보완한 뒤 우선 검토 |
| 이후 단계에서 재사용할 수 있는 UI | 닫지 않고 보류하되 지금 병합하지 않음 |
| Mock 계약을 컴포넌트에 고정 | 서비스 경계로 정리하기 전 병합 보류 |
| 최신 정책과 충돌 | 범위 제외 또는 폐기 |
| 백엔드 공개 API가 없는 기능 | 계약을 만들지 말고 보류 또는 제거 |

현재 우선순위는 다음과 같다.

1. `#19` 카카오 일회성 코드 교환과 안전한 토큰 보관
2. 인증 공통 기반: Authorization, `ApiResponse<T>`, refresh 1회 잠금, logout
3. 신규 PIN 등록과 기존 사용자 PIN 로그인
4. OpenBanking callback과 계좌 복귀
5. 계좌·잔액·거래내역 실제 API
6. 음성 녹음·세션·AI 연결
7. 송금 확인·멱등성·상태 복구·FDS·보호자 알림
8. 자동 E2E, 접근성, 보안과 실기기 검증

## 프런트 현재 상태

| 영역 | 상태 | 남은 핵심 작업 |
| --- | --- | --- |
| 카카오 로그인 | 부분 구현 | 코드 교환·신규 사용자 분기 구현, staging E2E 필요 |
| PIN·refresh·logout | 부분 구현 | 실제 API·세션 기반 구현 완료, staging·다중 탭 E2E 필요 |
| OpenBanking | 부분 구현 | 시작 URL·callback 화면·계좌 수 재조회 구현, 백엔드 공개 callback·302와 staging E2E 필요 |
| 계좌·잔액 | 부분 구현 | 목록·기본 계좌·별칭·잔액 실제 API 완료, staging E2E 필요 |
| 거래내역 | 부분 구현 | 목록·상세·`IN/OUT`·페이지네이션 실제 API 완료, staging E2E 필요 |
| 음성 | 부분 구현 | 세션·MediaRecorder·multipart·재질문 한도·만료·TTS 구현, 실 AI·Safari/iOS E2E 필요 |
| 송금·FDS | 부분 구현 | 음성 확인·동일 멱등키 상태 복구·실제 FDS 결과 표시 완료, staging E2E와 직접 입력 실행 계약 필요 |
| 보호자 알림 | 부분 구현 | `riskEventId` 공개 조회 제거·결과 상태 표시 완료, staging 이벤트 검증 필요 |
| 접근성 | 부분 구현 | 실제 전체 흐름의 키보드·보조기기·200% 검증 |
| 자동 테스트 | 부분 구현 | 계약·인증·store 단위 테스트 37개 존재, 화면 통합·브라우저 E2E 필요 |

## 확정된 MVP 정책

### 인증

- 카카오 callback URL에는 60초·1회용 `code`만 둔다.
- 프런트는 `POST /api/v1/auth/kakao/token`에 `{ code }`를 보내 토큰으로 교환한다.
- URL에서 query를 즉시 제거한다.
- Access token은 메모리에, Refresh token은 `sessionStorage`에 둔다.
- 신규 사용자는 PIN 등록 후 계좌 연결로 진행한다.
- 기존 사용자는 전화번호와 PIN으로 로그인한다.
- PASS와 생체인증은 실제 MVP 지원 여부가 확정되기 전까지 실기능으로 표현하지 않는다.
- 401은 refresh를 한 번만 시도하고 실패하면 안전하게 로그아웃한다.
- 403은 권한 부족으로 처리하며 반복 로그인으로 해결되는 것처럼 안내하지 않는다.

### 계좌와 거래내역

- 최초 OpenBanking 연결만 지원한다. 추가 연결과 연결 해제는 MVP 범위 밖이다.
- 계좌 목록과 잔액은 별도 API 응답으로 관리한다.
- 프런트는 백엔드 DTO를 화면 모델로 변환하는 매퍼를 둔다.
- 거래 유형 필터는 `IN` 또는 `OUT` 단일 선택이다.
- `blocked`는 거래 유형이 아니라 Transfer 상태다.
- 차단된 이체는 거래내역을 만들지 않는다.
- 거래 목록 기본 크기는 20, 최대 100이다.
- 음성 HISTORY는 최근 3건을 안내한다.

### 음성과 송금

- 프런트는 녹음, MIME 탐지, multipart 업로드, 화면 상태와 기기 TTS를 담당한다.
- 프런트는 AI와 FDS를 직접 호출하지 않고 Spring 백엔드를 통한다.
- 백엔드 `voiceMessage`를 화면 안내와 TTS의 단일 원천으로 사용한다.
- 음성 인식만으로 송금을 확정하지 않는다.
- 사용자는 수취인, 금액, 출금 계좌를 검토하고 명시적으로 확인해야 한다.
- 송금은 `confirmationId`와 `idempotencyKey`를 사용한다.
- timeout이나 새로고침 후 같은 멱등성 키로 최종 상태를 복구한다.
- FDS 장애, timeout, 잘못된 응답은 fail-closed로 처리하여 송금을 실행하지 않는다.

### FDS와 보호자

| 위험도 | 결정 | 송금 | 보호자 알림 |
| --- | --- | --- | --- |
| LOW | `ALLOW` | 완료 | 없음 |
| MEDIUM | `ALLOW_WITH_ALERT` | 완료 | 사후 알림 요청 |
| HIGH | `BLOCK` | 차단 | 긴급 알림 요청 |

- 보호자는 금융 정보를 조회하거나 송금을 승인·거절하지 않는다.
- 보호자 초대, 수락, 목록, 연결·해제와 공개 알림 조회 API는 MVP에서 제외한다.
- Seed 보호자를 사용한다.
- SMS는 Mock sender와 DB 기록·재시도로 검증한다.
- 프런트의 guardian `riskEventId` 조회 모델과 SMS 링크는 제거한다.
- 사용자에게는 “보호자에게 알림을 요청했어요.”까지만 보장한다.
- “문자 발송이 완료됐다”는 표현을 사용하지 않는다.

## 확인 필요 목록

확정 전에는 프런트가 동작이나 계약을 임의로 보완하지 않는다.

| 항목 | 현재 근거와 불일치 | 확인 주체 | 구현 영향 |
| --- | --- | --- | --- |
| OpenBanking callback 공개·복귀 | 합의는 공개 callback과 프런트 결과 URL 302지만 백엔드 `develop@b6c9092`는 운영 경로 공개·302가 반영되지 않음 | 백엔드 | 실제 OpenBanking E2E 차단 |
| OAuth 예외 복귀 | 취소·state 오류·카카오 오류가 모두 프런트 callback으로 복귀하는지 staging 미검증 | 백엔드·프런트 | 로그인 예외 E2E 미완료 |
| Voice/FDS 실 연동 | staging URL·health/version·지원 MIME·timeout·Intent/slot 계약의 최종 환경값 미확정 | AI·백엔드 | 음성 녹음·분석·FDS 실 E2E 차단 |
| 키보드·직접 입력 송금 실행 | 백엔드 `develop@b6c9092`의 공개 송금 실행은 음성 확인 흐름에만 있고 직접 입력 검토를 완료하는 별도 API가 없음 | 기획·백엔드·프런트 | 직접 입력 화면은 검토까지만 제공하며 실제 이체를 실행하지 않음 |
| 접근성 설정 저장 위치 | 브라우저 유지인지 계정 저장인지 미확정 | 기획·백엔드·프런트 | 새로고침 후 설정 유지 방식 보류 |
| Google TTS 사용 | 현재는 브라우저 기기 TTS 기준이며 Google TTS 도입 여부 미확정 | 기획·AI·프런트 | 별도 TTS SDK·API를 추가하지 않음 |
| staging·실기기 검증 | 카카오·OpenBanking·소유권·다중 탭·VoiceOver/TalkBack·200% 확대 결과 없음 | 전 팀 | 정적 검사 통과만으로 완료 처리하지 않음 |

위 표의 구체적인 결정 질문, 권고안, 담당과 완료 증거는 [남은 구현 및 팀 합의 목록](REMAINING_IMPLEMENTATION_AND_AGREEMENTS.md)을 따른다.

## 역할별 선행 조건

### 백엔드·인프라

- OAuth 취소·state 오류·카카오 오류도 프런트 callback으로 복귀
- 프런트 배포 후 `movi.kakao.legacy-token-query=false`
- OpenBanking callback 공개 경로와 프런트 302 복귀
- production 고정 CORS origin과 환경별 redirect URI
- `users.phone` nullable migration 적용
- Safari/iOS `audio/mp4` 허용과 길이 검증
- AI Voice/FDS URL과 Mock/실 모드 확정

### AI

- Voice/FDS staging endpoint, health check와 버전 제공
- WebM/Opus, WAV, MP4 디코딩 지원 확인
- Intent enum, slot nullable, confidence, timeout 계약
- FDS `riskLevel`, `decision`, `score`, `reasonCodes`, `policyVersion` 고정
- LOW/MEDIUM/HIGH 및 장애 fail-closed 회귀 결과 공유

## 작업 완료 기준

기능은 다음 조건을 모두 만족해야 완료로 표시한다.

- 명세 또는 이 문서에 근거가 있다.
- Mock과 실제 API 선택은 서비스 계층이 담당한다.
- 외부 응답은 `unknown`으로 받고 런타임 검증한다.
- 인증, 소유권, 한도와 금융 상태는 백엔드가 최종 검증한다.
- 음성 기능에 보이는 키보드·터치 대안이 있다.
- 금융 동작은 검토와 명시적 최종 확인을 거친다.
- URL·로그·응답에 토큰, 원문 계좌번호와 전화번호가 없다.
- loading, success, warning, error를 색상만으로 표현하지 않는다.
- lint, typecheck, 관련 테스트와 build를 통과한다.
- staging E2E 또는 아직 수행하지 못한 이유가 기록돼 있다.

## 변경 기록 규칙

- 작업 시작 전 이 문서와 `backend-frontend-integration-decisions.md`를 확인한다.
- 확정되지 않은 내용은 `확인 필요`로 기록하고 계약을 발명하지 않는다.
- 상태가 바뀌면 `TEAM_PROGRESS.md`와 이 문서의 상태 표를 함께 갱신한다.
- 정책이나 API 계약이 바뀌면 결정일, 참여 팀, API, 브랜치와 검증 결과를 남긴다.
- 과거 문서는 삭제하지 않되 최신 기준으로 오해하지 않도록 상단에 역사 자료임을 표시한다.
