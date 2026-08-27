# MOVI 프런트엔드 진행 현황

## 개발 환경

- 필수 Node.js 버전: `22.6.0` 이상
- nvm 사용 시 저장소 루트에서 `nvm use`
- 의존성 설치: `npm ci`

> 갱신일: 2026-08-27
> 최상위 구현 기준: [IMPLEMENTATION_SOURCE_OF_TRUTH.md](IMPLEMENTATION_SOURCE_OF_TRUTH.md)
> 최신 확정 결정: [DECISIONS_2026-08-27.md](DECISIONS_2026-08-27.md)
> 현재 브랜치: `feature/error-focus-recovery`

## 현재 목표

접근성 중심 Mock UI를 새로 확장하는 단계가 아니라, 실제 AI Voice/FDS 계약 정합 → OpenBanking 복귀 → 거래 확인·PIN proof → 최소 비음성 송금 → 제한 Streaming 게이트 순서로 통합하는 단계다. 내부 완료 목표는 2026-09-02이며 8/30 이후 신규 기능을 추가하지 않는다.

## 현재 작업

### `feature/error-focus-recovery`

작업 트리에 반영:

- 계좌 목록·잔액·거래 목록·거래 상세의 비동기 API 오류 패널로 포커스 이동
- 공통 계좌 API 오류 패널에 프로그래밍 방식 포커스와 명확한 focus-visible 표시 추가
- 실제 키보드·화면 읽기 프로그램의 이동 순서와 중복 안내 검증은 `확인 필요`로 유지
- 로그아웃 성공·실패와 refresh 실패가 같은 인증 클라이언트 정리 경계를 사용하도록 통합
- 인증 세션·Refresh token·계좌·음성·송금 초안·송금 복구 키의 일괄 제거 검증
- refresh 성공 시 유효한 인증·금융·송금 복구 상태가 유지되는지 검증
- 공통 API의 동시 401 요청이 하나의 refresh 실행 결과를 공유하도록 조정 로직 분리
- refresh 성공·실패 후 잠금을 해제해 다음 인증 만료에서 다시 시도하는 동작 검증
- 송금 복구 키의 유효 UUID 저장·복구 검증
- 잘못된 UUID와 손상된 JSON·시각 데이터의 복구 차단 및 정리 검증
- `sessionStorage` 접근 제한 시 조회·정리·저장 실패 동작 검증
- 소비처가 없는 등록 계좌·수취인·구형 FDS·보호자 알림 Mock 서비스 제거
- 사용되지 않는 Mock 도메인 타입과 이전 송금 결과 store 상태 제거
- `/accounts/register`를 `/accounts` redirect로 축소
- 송금 검토 화면의 타이머 기반 가짜 음성 결정 제거, 화면 확인·취소 대안 유지
- 실제 개발 모드에서 사용하는 계좌·거래 서비스 Mock은 유지
- `/transfer`의 타이머 기반 가짜 음성 입력 제거
- 고정 Mock 수취인 목록을 실제 화면에서 제거
- 직접 입력 화면을 이름·금액 입력과 검토 전용으로 제한
- 서버 수취인 검증과 실제 이체가 없음을 화면과 접근성 설명에 명시
- 수취인 공백, 소수·지수·안전 범위 밖 금액 검증 추가

검증:

- `npm test`: 50개 통과
- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `npm run build`: 통과, 20개 route
- staging 직접 입력 송금: 백엔드 실행·수취인 계약 미확정으로 미검증

남은 작업:

- 실제 AI Voice/FDS Schema·버전·환경과 Adapter 필드 확정
- FDS 0~100 원본 의미, LOW/MEDIUM/HIGH/CRITICAL과 정책 버전 반영
- 백엔드 OpenBanking callback GET 공개와 `result=success|error` 프런트 URL 302
- 6자리·60초·1회·최대 3회 거래 확인 코드와 거래 변경 무효화 구현
- 거래 바인딩 PIN proof와 적용 조건 상세 계약·구현
- 등록 수취인 기반 직접 입력 검토·확인·PIN·멱등 실행 계약과 UI
- 8/29 제한 Streaming 채택 게이트, 실패 시 multipart 유지
- MP4 PR·프런트 MIME·AI 디코딩과 8/30 iOS 실기기 검증
- Playwright 핵심 흐름과 실제 VoiceOver/TalkBack·200%·모바일 검증

## 영역별 상태

| 영역 | 현재 상태 | 다음 완료 조건 |
| --- | --- | --- |
| 인증 | 카카오·PIN·refresh·logout 실제 API 구현 | 신규·기존 로그인과 잠금 staging E2E |
| OpenBanking | 시작·callback·계좌 수 재조회 구현 | 백엔드 공개 callback·302와 staging E2E |
| 계좌·잔액 | 목록·기본 계좌·별칭·잔액 실제 API | 소유권·오류·다계좌 staging E2E |
| 거래내역 | 목록·상세·`IN/OUT`·페이징 실제 API | 소유권·필터·페이징 staging E2E |
| 음성 | 세션·녹음·multipart·재질문 한도·만료·TTS 실제 API | AI Adapter·제한 Streaming·MP4/iOS·timeout E2E |
| 송금·FDS | 음성 확인·동일 키 상태 복구·실제 FDS 결과 표시 | 확인 코드·PIN proof·직접 입력·CRITICAL과 응답 유실 E2E |
| 보호자 알림 | 공개 Mock 조회 경로 제거·FDS 결과 안내 | Seed·백엔드 이벤트 staging E2E |
| 접근성 | 큰 글씨·고대비·단순 모드·TTS 기반 | 실제 P0 흐름의 보조기기 E2E |
| 테스트 | 계약·인증 refresh·store·송금 복구 단위 테스트 50개와 정적 검사 존재 | 화면 통합·브라우저 E2E 도입 |

## 구현된 화면

화면 존재는 실 API 통합 완료를 의미하지 않는다.

| 경로 | 현재 역할 | 연동 상태 |
| --- | --- | --- |
| `/` | 서비스 시작 | UI |
| `/login` | 인증 진입 | 카카오와 PIN 실제 경로 |
| `/login/callback` | 카카오 코드 교환 | 실 API |
| `/login/pin` | 기존 사용자 PIN 로그인 | 실 API |
| `/pin/register` | 신규 사용자 PIN 등록 | 실 API |
| `/accounts/connect` | 최초 계좌 연결 시작 | 실 API |
| `/accounts/connect/callback` | OpenBanking 결과·계좌 수 확인 | 실 API, 백엔드 302 대기 |
| `/accounts/register` | 이전 Mock 연결 계좌 확인 | 실 경로에서 사용하지 않음 |
| `/accounts` | 계좌 목록·기본 계좌·별칭·공통 음성 진입 | 실 API |
| `/balance` | 현재·출금 가능 잔액 조회와 TTS | 실 API |
| `/transactions` | 기간·입출금 필터·페이징 거래 목록 | 실 API |
| `/transactions/[transactionId]` | 거래 상세와 TTS | 실 API |
| `/transfer`·`/transfer/review` | 직접 입력 송금 정보·검토 | P0 완료 경로로 확정, 등록 수취인·검토·PIN·실행 상세 계약 필요 |
| `/transfer/evaluate` 이하·`/transfer/result` | 이전 Mock 결과 경로 | 실제 결과 생성 중단, `/accounts` 복귀 |
| `/alerts/guardian/[riskEventId]` | 이전 공개 보호자 조회 | 실제 조회 제거, `/accounts` 복귀 |

## 접근성 기반

- semantic HTML과 접근 가능한 이름
- 키보드 포커스와 44px 이상 조작 영역
- `aria-live` 기반 중요 상태 안내
- 고대비·큰 글씨·단순 화면 모드
- 색상 외 텍스트·금액 부호를 통한 상태 구분
- 브라우저 `speechSynthesis` 기반 다시 듣기

아직 VoiceOver/TalkBack, 200% 확대와 실제 전체 P0 흐름 E2E가 남아 있다.

## 바로 다음 작업

1. 실제 AI Voice/FDS Schema·버전·환경과 기존 도메인 Adapter 계약 고정
2. OpenBanking 공개 callback·302 반영과 staging 예외 E2E
3. 거래 확인 코드·PIN proof 상세 계약과 구현
4. 등록 수취인 기반 직접 입력 송금 완료 경로 구현
5. 제한 Streaming·MP4 게이트와 접근성·안전 시나리오 E2E

이후 순서는 [MVP_WEEK_PLAN.md](MVP_WEEK_PLAN.md)를 따른다.

## 범위 제외

- 계좌 추가 연결·연결 해제
- PIN 변경·재설정·분실 복구
- 보호자 초대·수락·관계 입력·연결·해제
- 보호자 금융정보 조회와 송금 승인·거절
- 보호자 대시보드, SMS 링크와 공개 알림 조회
- 계약에 없는 guardian `riskEventId` 모델
- 적금 조회와 준비된 Sandbox 계약이 없는 미등록 계좌번호 송금
- 실제 SMS 전환, 생체인증·Passkey와 SHAP 화면
- 새 디자인 전면 개편과 새 배포 시스템

## 검증 명령

```bash
npm run lint
npm run typecheck
npm run build
```

실제 금융·음성 기능은 위 명령만으로 완료 처리하지 않고 staging·실기기·접근성 E2E 결과를 함께 기록한다.
