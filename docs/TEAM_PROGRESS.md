# MOVI 프런트엔드 진행 현황

## 개발 환경

- 필수 Node.js 버전: `22.6.0` 이상
- nvm 사용 시 저장소 루트에서 `nvm use`
- 의존성 설치: `npm ci`

> 갱신일: 2026-08-27
> 최상위 구현 기준: [IMPLEMENTATION_SOURCE_OF_TRUTH.md](IMPLEMENTATION_SOURCE_OF_TRUTH.md)
> 현재 브랜치: `feature/session-recovery-safety-tests`

## 현재 목표

접근성 중심 Mock UI를 새로 확장하는 단계가 아니라, 인증 → 조회 → 음성 → 송금 순서로 실제 백엔드·AI 흐름에 연결하는 단계다. 부분 구현 브랜치는 현재 단계에 필요한 것만 최신 계약으로 보완해 검토한다.

## 현재 작업

### `feature/session-recovery-safety-tests`

작업 트리에 반영:

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

- `npm test`: 46개 통과
- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `npm run build`: 통과, 20개 route
- staging 직접 입력 송금: 백엔드 실행·수취인 계약 미확정으로 미검증

남은 작업:

- 백엔드 `/api/openbanking/callback` 공개 경로 허용
- 백엔드 callback JSON을 프런트 결과 URL 302로 변경
- 성공·취소·state 만료·재사용 staging E2E
- Voice/FDS staging URL·health/version과 실제 AI 응답 E2E
- Safari/iOS `audio/mp4` 백엔드 허용 전 실기기 녹음 보류
- 직접 입력 송금의 명시적 실행 API 계약 확정
- 실제 LOW·MEDIUM·HIGH, timeout 직후 조회, 새로고침 복구 staging E2E
- 직접 입력 송금·등록 수취인 API 계약 확정

## 영역별 상태

| 영역 | 현재 상태 | 다음 완료 조건 |
| --- | --- | --- |
| 인증 | 카카오·PIN·refresh·logout 실제 API 구현 | 신규·기존 로그인과 잠금 staging E2E |
| OpenBanking | 시작·callback·계좌 수 재조회 구현 | 백엔드 공개 callback·302와 staging E2E |
| 계좌·잔액 | 목록·기본 계좌·별칭·잔액 실제 API | 소유권·오류·다계좌 staging E2E |
| 거래내역 | 목록·상세·`IN/OUT`·페이징 실제 API | 소유권·필터·페이징 staging E2E |
| 음성 | 세션·녹음·multipart·재질문 한도·만료·TTS 실제 API | 실 AI·Safari/iOS·권한·timeout E2E |
| 송금·FDS | 음성 확인·동일 키 상태 복구·실제 FDS 결과 표시 | 실 AI/FDS staging E2E와 직접 입력 실행 계약 |
| 보호자 알림 | 공개 Mock 조회 경로 제거·FDS 결과 안내 | Seed·백엔드 이벤트 staging E2E |
| 접근성 | 큰 글씨·고대비·단순 모드·TTS 기반 | 실제 P0 흐름의 보조기기 E2E |
| 테스트 | 계약·인증 refresh·store·송금 복구 단위 테스트 46개와 정적 검사 존재 | 화면 통합·브라우저 E2E 도입 |

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
| `/transfer`·`/transfer/review` | 직접 입력 송금 정보·검토 | 실행 API 확인 필요, 실제 이체 미실행 |
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

1. 직접 입력 화면 안전 정리 commit·PR
2. 직접 입력 송금·등록 수취인 API 계약 확정
3. 실 AI·FDS·권한·MIME·timeout staging E2E
4. OpenBanking 백엔드 302 반영 후 staging E2E
5. 전체 접근성·장애 시나리오 E2E

이후 순서는 [MVP_WEEK_PLAN.md](MVP_WEEK_PLAN.md)를 따른다.

## 범위 제외

- 계좌 추가 연결·연결 해제
- PIN 변경·재설정·분실 복구
- 보호자 초대·수락·관계 입력·연결·해제
- 보호자 금융정보 조회와 송금 승인·거절
- 보호자 대시보드, SMS 링크와 공개 알림 조회
- 계약에 없는 guardian `riskEventId` 모델

## 검증 명령

```bash
npm run lint
npm run typecheck
npm run build
```

실제 금융·음성 기능은 위 명령만으로 완료 처리하지 않고 staging·실기기·접근성 E2E 결과를 함께 기록한다.
