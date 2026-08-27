# MOVI 남은 구현 및 팀 합의 목록

> 정리일: 2026-08-27
>
> 기준: 프런트 `main` `65df24a`, 백엔드 `develop` `b6c9092`
>
> 상위 정책: [IMPLEMENTATION_SOURCE_OF_TRUTH.md](IMPLEMENTATION_SOURCE_OF_TRUTH.md)

## 사용 방법

이 문서는 이미 끝난 기능을 다시 구현하지 않고, 실제 출시까지 남은 일과 외부 합의가 필요한 일을 분리하기 위한 실행 목록이다.

- `프런트`: 현재 계약만으로 바로 구현할 수 있다.
- `합의 필요`: 제품·백엔드·AI·인프라의 결정 전에는 endpoint나 동작을 만들지 않는다.
- `외부 반영`: 계약은 정해졌지만 다른 저장소 또는 환경 변경이 먼저 필요하다.
- `검증`: 구현은 있으나 staging·실기기 증거가 없다.
- 표의 권고안은 제안이며 `확정`으로 표시하기 전에는 계약으로 사용하지 않는다.

## 결론과 우선순위

| 순서 | 작업 | 현재 상태 | 다음 행동 | 담당·의존성 |
| --- | --- | --- | --- | --- |
| P0-1 | 키보드·직접 입력 송금 계약 | 합의 필요 | 수취인 조회, 서버 검토, 확인, 실행 API와 멱등성 계약 확정 | 기획·백엔드·프런트 |
| P0-2 | OpenBanking callback 복귀 | 외부 반영 | callback 공개 허용과 프런트 결과 URL 302 반영 | 백엔드·인프라 |
| P0-3 | Voice/FDS 실제 환경 | 합의 필요 | staging URL, health/version, timeout, MIME과 오류 계약 고정 | AI·백엔드·인프라 |
| P0-4 | 인증·조회·송금 staging E2E | 검증 | 테스트 계정·계좌·Seed 보호자와 시나리오 확보 후 수행 | 전 팀 |
| P1-1 | 직접 입력 화면의 남은 Mock 제거 | 완료 | 미사용 Mock 서비스·타입·store 상태와 가짜 음성 결정을 제거하고 레거시 경로는 안전한 redirect로 유지 | 프런트 |
| P1-2 | 브라우저 통합 테스트 기반 | 합의 필요 | Testing Library·Playwright 도입 승인 후 P0 흐름 자동화 | 프런트 |
| P1-3 | 접근성 완료 검증 | 검증 | 키보드, 포커스, 200%, VoiceOver/TalkBack 실측 및 결함 수정 | 프런트·QA |
| P1-4 | 인증·보안 운영 점검 | 검증 | 다중 탭, secret 이력, CORS, redirect URI, 로그의 민감정보 점검 | 프런트·백엔드·인프라 |
| P2 | 접근성 설정·TTS 정책 | 합의 필요 | 저장 위치와 Google TTS 제외 여부 확정 | 기획·AI·프런트 |

P0 합의가 끝나기 전에도 P1-1의 안전한 Mock 제거와 테스트 설계는 진행할 수 있다. 실제 직접 입력 송금 실행, callback 완료 처리, MP4 업로드는 해당 P0 계약을 기다린다.

## 프런트가 바로 구현할 항목

### 1. 직접 입력 송금 화면 안전 정리

`feature/transfer-input-safety`에서 `/transfer`의 고정 Mock 수취인 목록과 타이머 기반 가짜 음성 입력을 실제 경로에서 제거했다. 화면은 서버 계약이 생기기 전까지 이름·금액 입력과 검토만 제공하고, 서버 수취인 검증이나 실제 이체가 없음을 명시한다.

- [x] 실제 녹음처럼 보이는 타이머 기반 입력을 제거한다.
- [x] 고정 Mock 수취인 목록을 실제 화면에서 제거한다.
- [x] 직접 입력 화면은 계약 확정 전까지 “정보 입력·검토만 가능, 이체 미실행”을 일관되게 표시한다.
- [x] 수취인 이름과 금액을 서버 검증 결과로 오해하지 않도록 안내한다.
- [x] `guardianRiskAlertService`, 이전 transfer result store와 폐기된 Mock route 의존성을 조사하고 소비처가 없는 구현을 제거한다.
- [x] `/accounts/register`와 폐기된 송금·보호자 결과 경로는 기존 북마크 호환을 위한 redirect만 유지한다.
- [x] 서비스 계층의 계좌·거래 Mock은 `NEXT_PUBLIC_USE_MOCK` 개발 모드에서 사용하므로 유지한다.

완료 조건: 실제 경로 어디에서도 프런트가 수취인, FDS 판정, 이체 성공 또는 보호자 발송 결과를 만들어 내지 않는다.

### 2. 자동 테스트 보강

- 공통 API의 동시 401 요청이 refresh 한 번으로 합쳐지는지 검증한다.
- 로그아웃·refresh 실패 시 인증, 금융, 송금 복구 키가 모두 지워지는지 검증한다.
- 송금 복구 저장소의 잘못된 UUID·손상 JSON·저장소 접근 실패를 검증한다.
- `VOICE_4005`, `VOICE_4006`, FDS 403, 네트워크 timeout 화면 전환을 컴포넌트 테스트로 검증한다.
- Playwright로 로그인 → 계좌 → 잔액 → 거래내역 → 음성 송금 상태 복구를 자동화한다.

Testing Library와 Playwright는 새 개발 의존성이므로 도입 전에 팀 승인을 받는다.

### 3. 접근성·오류 처리 보강

- 각 화면의 첫 오류와 복구 버튼으로 포커스가 이동하는지 키보드로 확인한다.
- 로딩·성공·차단·실패 상태가 화면 읽기 프로그램에서 한 번만 명확하게 안내되는지 확인한다.
- 200% 확대와 320 CSS px 폭에서 잘림·가로 스크롤·버튼 겹침을 수정한다.
- TTS 실패, 마이크 거부, 녹음 미지원, 네트워크 오류에서 금융 상태가 바뀌지 않는지 확인한다.
- 직접 입력 송금 계약이 생기기 전까지는 “모든 음성 금융 작업을 키보드로 완료” 항목을 완료 처리하지 않는다.

## 백엔드·기획과 확정할 계약

### A. 키보드·직접 입력 송금과 수취인

현재 근거:

- 백엔드 공개 Controller에는 등록 수취인 목록 API와 직접 입력 송금 실행 API가 없다.
- 백엔드 송금 실행은 음성 세션의 확인 발화에서만 `TransferExecutionService`로 이어진다.
- 프런트 `/transfer`는 Mock 수취인 노출을 제거했으며, 계약 확정 전까지 검증되지 않은 이름·금액의 입력과 검토만 수행한다.

결정할 질문:

1. 접근성 대안으로 비음성 송금 완료를 MVP 필수 범위에 포함하는가?
2. 등록 수취인 목록의 공개 API와 DTO는 무엇인가? 원문 계좌번호 없이 ID, 이름, 은행명, 마스킹 계좌번호만 제공하는가?
3. 임의 이름 입력을 허용하는가, 서버에 등록된 수취인 선택만 허용하는가?
4. 직접 입력 송금도 서버 검토 응답에서 `confirmationId`를 받고 별도 실행 요청에 UUID `idempotencyKey`를 보내는가?
5. 음성과 직접 입력이 동일한 한도·FDS·상태 조회·보호자 이벤트 정책을 사용하는가?

권고안:

- 비음성 송금은 접근성 정의상 MVP에 포함한다.
- 등록된 수취인만 선택하고 프런트가 계좌나 수취인을 임의 생성하지 않는다.
- 서버 검토 → 화면의 명시적 확인 → 멱등 실행의 2단계로 구성한다.
- FDS를 프런트가 호출하지 않고 현재 백엔드 실행 서비스를 단일 경로로 재사용한다.

완료 산출물: endpoint, request/response 예시, 오류 코드, 소유권·한도 정책, 중복 요청 테스트가 포함된 백엔드 계약 문서.

### B. OpenBanking callback

현재 백엔드 `b6c9092`의 문제:

- `GET /api/openbanking/callback`이 운영 `PUBLIC_ENDPOINTS`에 없어 인증 없이 들어오는 금융결제원 callback이 401로 차단된다.
- callback이 `ApiResponse<ConnectResultResponse>` JSON을 반환해 프런트 `/accounts/connect/callback`으로 돌아오지 않는다.

확정·반영할 내용:

1. callback만 공개하고 `state`를 1회성 신원 증명으로 검증한다.
2. 성공 시 프런트 callback으로 302하고, 프런트가 인증된 계좌 목록을 다시 조회한다.
3. 취소, code 누락, state 누락·불일치·만료·재사용, 외부 통신 오류도 프런트 오류 화면으로 복귀시킬지 확정한다.
4. 프런트 결과 URL에는 토큰, 인가 코드, 계좌정보를 넣지 않는다.
5. 프런트 origin과 callback/redirect URI를 환경별로 고정한다.

권고 결과 URL: 성공·실패 여부와 비민감 오류 식별자만 전달하고 프런트가 즉시 query를 제거한다. 정확한 파라미터 이름은 백엔드 계약 확정 후 반영한다.

### C. 인증 운영 계약

- 카카오 성공·취소·state 오류·카카오 장애가 모두 프런트 callback으로 돌아오는지 확정한다.
- 프런트 일회성 코드 교환 배포 후 `movi.kakao.legacy-token-query=false` 적용 시점을 정한다.
- production CORS origin, 카카오 redirect URI, 프런트 redirect URI를 환경표로 고정한다.
- `users.phone` nullable migration 적용 여부와 테스트 계정 생성 절차를 확인한다.
- 다중 탭에서 한 탭의 logout·refresh token 회전이 다른 탭에 미치는 동작을 정한다.

권고안: URL에는 60초·1회용 교환 코드만 허용하며 JWT를 query로 전달하는 호환 모드는 배포 확인 직후 끈다.

## AI·백엔드·인프라와 확정할 계약

### D. Voice API

- staging base URL, `/health`, `/version` 또는 동등한 확인 방법
- 지원 MIME: WebM/Opus, WAV, Safari/iOS의 `audio/mp4` 포함 여부
- 최대 5MB·15초, 실제 디코딩 기준과 손상 파일 오류
- intent enum, nullable slot, confidence 범위, 날짜·금액 단위
- 연결·응답 timeout과 백엔드 오류 코드 매핑
- 낮은 신뢰도, 알 수 없는 intent, 같은 슬롯 3회 재질문의 회귀 fixture

현재 프런트와 백엔드는 WebM/Opus·WAV만 허용한다. MP4는 양쪽 지원이 확정될 때 함께 추가한다.

### E. FDS와 보호자 이벤트

- FDS staging URL, health/version, `riskLevel`, `decision`, `score`, `reasonCodes`, `policyVersion`
- LOW=`ALLOW`, MEDIUM=`ALLOW_WITH_ALERT`, HIGH=`BLOCK` 회귀 fixture
- timeout·5xx·잘못된 payload 시 fail-closed와 최종 Transfer 상태
- MEDIUM/HIGH 보호자 이벤트 생성, Seed 보호자, Mock SMS sender와 최대 3회 재시도 검증 방법
- SMS 실패가 완료된 MEDIUM 이체를 되돌리지 않는다는 정책

프런트 계약은 현재 상태 조회 결과까지만 사용한다. 공개 guardian 조회 API, SMS 링크, 발송 완료 문구는 추가하지 않는다.

## 기획과 확정할 정책

### F. 접근성 설정 저장 위치

현재 고대비·큰 글씨·단순 모드는 Zustand 메모리에만 있어 새로고침하면 초기화된다.

- 기기별 브라우저 저장인지 사용자 계정 저장인지 결정한다.
- 권고안: MVP는 민감정보가 아닌 설정만 브라우저에 저장하고, 계정 간 공유가 필요해질 때 별도 백엔드 API를 합의한다.

### G. TTS

현재는 브라우저 `speechSynthesis`가 서버 `voiceMessage`를 읽는다.

- Google TTS가 MVP 필수인지 결정한다.
- 권고안: MVP에서는 제외하고 브라우저 TTS와 화면 문구를 유지한다. 도입 시 API 키 노출 방지와 백엔드 프록시 계약을 먼저 정한다.

## staging·출시 검증표

| 영역 | 필수 시나리오 | 필요한 준비 | 완료 증거 |
| --- | --- | --- | --- |
| 카카오 | 성공, 취소, state 누락·불일치, 코드 만료·재사용, 신규·기존 사용자 | 테스트 앱·계정, redirect URI | 실행 일시·환경·결과 캡처 |
| PIN·세션 | 등록, 로그인, 오입력 잠금, refresh 회전, 동시 401, logout, 다중 탭 | 테스트 사용자, 만료 시간 조절 | 서버 로그 식별자와 화면 결과 |
| OpenBanking | 성공, 취소, state 만료·재사용, 계좌 0/1/여러 개 | 공개 callback·302, 테스트 계좌 | DB 계좌 수와 프런트 결과 |
| 조회 | 다른 사용자 계좌·거래 ID, IN/OUT, 페이지 경계, 빈 목록 | 사용자 2명과 fixture | 403/404와 화면 결과 |
| Voice | 권한 거부, WebM/WAV, 재질문 3회, 만료, 낮은 confidence, timeout | AI staging·fixture | 요청 ID·오류 코드·화면 전환 |
| 송금/FDS | 확인 전 미실행, 중복·동시 요청, timeout 복구, LOW/MEDIUM/HIGH, FDS 장애 | 테스트 잔액·Seed 보호자 | Transfer 1건, 상태·이벤트 DB 결과 |
| 접근성 | 키보드, 200%, 모바일 reflow, VoiceOver, TalkBack | 실제 브라우저·iOS·Android | 체크리스트·결함/수정 기록 |
| 보안 | URL·기록·로그 민감정보, CORS, secret 이력 | 배포 설정·로그 접근 | 점검 결과와 회전 기록 |

## 합의 회의 종료 조건

각 항목은 구두 합의로 끝내지 않고 다음을 남긴다.

- 결정일과 참여 팀
- 확정 동작과 제외 범위
- endpoint·DTO·오류 코드 또는 환경 변수 이름
- 담당자와 반영 브랜치
- staging 검증 시나리오와 목표 일시
- 미결 항목은 `확인 필요`로 유지하고 프런트 Mock으로 대체하지 않는다.
