# MOVI MVP 실제 통합 실행 계획

> 2026-08-25 최신 통합 점검 기준으로 갱신했다. 과거의 “백엔드 없이 Mock 목업 완성” 계획은 종료됐다.
> 최상위 기준: [IMPLEMENTATION_SOURCE_OF_TRUTH.md](IMPLEMENTATION_SOURCE_OF_TRUTH.md)
> 확정 계약: [backend-frontend-integration-decisions.md](backend-frontend-integration-decisions.md)

## 목표

이미 구현된 접근성 중심 Mock UI를 유지하면서 인증 → 조회 → 음성 → 송금 순서로 실제 백엔드·AI 흐름에 연결한다. 부분 구현 PR을 모두 병합하는 것이 목표가 아니라, 각 통합 단계에 필요한 변경만 최신 계약으로 보완하여 하나씩 완료하는 것이 목표다.

## 작업 단위 원칙

- 한 브랜치에는 한 기능 또는 한 화면만 둔다.
- 현재 단계의 선행 조건이 아닌 PR은 보류한다.
- MVP 범위 밖이거나 공개 API가 없는 기능은 병합하지 않는다.
- 컴포넌트는 Mock 모드로 분기하지 않고 서비스 계층이 Mock/실 API를 선택한다.
- 각 단계는 lint, typecheck, 관련 테스트, build와 접근성 검증을 포함한다.
- staging E2E 전에는 완료로 표시하지 않는다.

## 단계별 실행 순서

### Phase 0 — 계약과 보안 잠금

- [x] 백엔드 `develop b6c9092`의 카카오 일회성 코드 교환 계약 확인
- [x] 최신 정책을 저장소 기준 문서로 반영
- [ ] 프런트·백엔드·AI staging URL과 Mock/실 모드 표 작성
- [ ] production CORS, redirect URI, migration 적용 확인
- [ ] 전체 Git 이력 secret scan과 노출 credential 회전 확인

완료 조건: 환경별 URL, secret 주입, CORS, callback과 Mock/실 모드가 문서로 고정된다.

### Phase 1 — 인증 통합

- [x] `#19`에서 callback `code`를 `POST /api/v1/auth/kakao/token`으로 교환
- [x] callback query 즉시 제거
- [x] Access token 메모리·Refresh token `sessionStorage` 분리
- [ ] `#19` commit·PR 갱신과 staging 카카오 로그인 E2E
- [ ] 공통 `ApiResponse<T>` 파서
- [ ] Authorization 헤더 주입
- [ ] 401 refresh 1회 잠금과 실패 logout
- [ ] 신규 사용자 6자리 PIN 등록
- [ ] 기존 사용자 전화번호+PIN 로그인
- [ ] logout 후 인증·금융 store 초기화
- [ ] 새로고침 후 Refresh token으로 세션 복구

완료 조건: 카카오 성공·취소·오류, 신규 PIN, 기존 PIN, refresh, logout이 staging에서 동작하고 URL에 토큰이 없다.

### Phase 2 — OpenBanking과 조회 통합

- [ ] OpenBanking 시작 URL 이동
- [ ] `/accounts/connect/callback` 성공·취소·오류·state 만료 화면
- [ ] callback 복귀 후 계좌 목록 재조회
- [ ] Account DTO 매퍼
- [ ] 계좌 목록·기본 계좌·별칭 실제 API
- [ ] 잔액 실제 API와 `voiceMessage` TTS
- [ ] 거래 목록·상세·페이지네이션 실제 API
- [ ] `IN`/`OUT` 단일 필터
- [ ] 계좌 0/1/여러 개와 기본 계좌 없음 상태

완료 조건: 로그인부터 잔액과 거래 상세까지 Mock 없이 완료하고 다른 사용자의 리소스 접근이 거부된다.

### Phase 3 — 음성 통합

- [ ] MediaRecorder 녹음과 권한 오류 처리
- [ ] WebM/Opus, WAV, Safari/iOS MP4 MIME 탐지
- [ ] multipart 업로드
- [ ] 음성 세션 상태 머신
- [ ] 수취인·금액 누락 재질문과 기존 slot 유지
- [x] 백엔드 `VOICE_4006` 재질문 한도 초과 후 직접 입력 전환
- [ ] 백엔드 `voiceMessage` 화면·TTS 단일화
- [ ] 다시 듣기, 도움말과 키보드 대안

완료 조건: Chrome, Android, Safari, iOS에서 녹음·업로드하고 마이크 없이도 같은 주요 작업을 완료한다.

### Phase 4 — 송금·FDS·보호자 알림 통합

- [ ] 백엔드 응답으로 수취인·금액·출금 계좌 검토 화면 구성
- [ ] `confirmationId` 확인·취소 연결
- [ ] `idempotencyKey` 생성·보관·재사용
- [ ] timeout·새로고침 후 상태 복구
- [ ] 프런트의 별도 Mock FDS·Mock 송금 제거
- [ ] LOW 완료
- [ ] MEDIUM 완료와 “보호자에게 알림을 요청했어요.” 표시
- [ ] HIGH 차단과 알림 요청 표시
- [ ] FDS 장애 시 이체 미실행
- [ ] guardian `riskEventId` 공개 조회 화면·서비스 제거

완료 조건: 명시적 확인 전에는 이체되지 않고, 중복 요청에도 이체 1건이며, 세 위험도 결과가 백엔드 최종 상태와 일치한다.

### Phase 5 — 품질과 출시 검증

- [ ] Vitest 또는 Jest + Testing Library 도입
- [ ] 서비스 파서·인증 store·refresh 잠금·DTO 매퍼 테스트
- [ ] 송금 확인·멱등성·상태 복구 테스트
- [ ] Playwright 로그인·조회·음성 송금 E2E
- [ ] 키보드 전체 흐름과 포커스 복구
- [ ] VoiceOver/TalkBack
- [ ] 200% 확대와 모바일 reflow
- [ ] URL·로그·응답 민감정보 점검
- [ ] Voice/FDS timeout·5xx·잘못된 payload
- [ ] 운영 모니터링과 rollback 기준
- [ ] 실제 경로의 불필요한 Mock 제거

완료 조건: [통합 결정의 완료 조건](backend-frontend-integration-decisions.md#11-통합-완료-조건)을 모두 통과한다.

## 병합하지 않을 기능

- 계좌 추가 연결·연결 해제
- 보호자 초대·수락·관계 입력·연결·해제
- 보호자 금융정보 조회와 송금 승인·거절
- 보호자 대시보드와 SMS 링크
- 계약에 없는 guardian `riskEventId` 조회
- 실제 계약이 없는 PASS·생체인증

## 확인 필요

- 키보드 전용 비음성 송금 API와 수취인 공개 목록 API 제공 여부
- 접근성 설정의 저장 위치
- Google TTS 제외 여부
- staging Voice/FDS의 실제 endpoint·버전·health check
- 담당자 이름, staging E2E 일시와 실제 완료 날짜

## 기능 완료 보고 형식

| 명세/계약 | 브랜치·화면 | Mock/API | 자동 검증 | 접근성·E2E | 상태 |
| --- | --- | --- | --- | --- | --- |
| 카카오 코드 교환 | `feature/kakao-real-login` | API | lint·typecheck·build | staging 미검증 | 부분 구현 |

상태 변경 시 [TEAM_PROGRESS.md](TEAM_PROGRESS.md)와 [IMPLEMENTATION_SOURCE_OF_TRUTH.md](IMPLEMENTATION_SOURCE_OF_TRUTH.md)를 함께 갱신한다.
