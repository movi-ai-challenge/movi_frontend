# MOVI 프런트엔드 진행 현황

## 개발 환경

- 필수 Node.js 버전: `22.6.0` 이상
- nvm 사용 시 저장소 루트에서 `nvm use`
- 의존성 설치: `npm ci`

> 갱신일: 2026-08-27
> 최상위 구현 기준: [IMPLEMENTATION_SOURCE_OF_TRUTH.md](IMPLEMENTATION_SOURCE_OF_TRUTH.md)
> 현재 브랜치: `feature/openbanking-callback`

## 현재 목표

접근성 중심 Mock UI를 새로 확장하는 단계가 아니라, 인증 → 조회 → 음성 → 송금 순서로 실제 백엔드·AI 흐름에 연결하는 단계다. 부분 구현 브랜치는 현재 단계에 필요한 것만 최신 계약으로 보완해 검토한다.

## 현재 작업

### `feature/openbanking-callback`

작업 트리에 반영:

- `POST /api/openbanking/connect`로 실제 인증 URL 요청
- 검증된 HTTPS 인증 URL로만 전체 페이지 이동
- `/accounts/connect/callback` 성공·취소·오류 화면
- callback query 즉시 제거
- 성공 복귀 후 인증된 `GET /api/accounts`로 계좌 수 재조회
- 계좌 0개 재연결, 연결 성공, 조회 실패 재시도 상태 분리

검증:

- `npm test`: 17개 통과
- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `npm run build`: 통과, 20개 route
- staging 실제 OpenBanking E2E: 미검증

남은 작업:

- 백엔드 `/api/openbanking/callback` 공개 경로 허용
- 백엔드 callback JSON을 프런트 결과 URL 302로 변경
- 성공·취소·state 만료·재사용 staging E2E
- 실제 Account DTO 매퍼와 계좌 목록 화면 전환
- 변경 commit과 PR 생성

## 영역별 상태

| 영역 | 현재 상태 | 다음 완료 조건 |
| --- | --- | --- |
| 인증 | 카카오·PIN·refresh·logout 실제 API 구현 | 신규·기존 로그인과 잠금 staging E2E |
| OpenBanking | 시작·callback·계좌 수 재조회 구현 | 백엔드 공개 callback·302와 staging E2E |
| 계좌·잔액 | Mock UI와 서비스 경계 | DTO 매퍼와 실제 API |
| 거래내역 | Mock 목록·필터·상세 | 실제 목록·상세·`IN/OUT`·페이징 |
| 음성 | 타이머/입력 보조 UI | 녹음·multipart·세션·실 AI |
| 송금·FDS | Mock 검토·위험도·결과 | 백엔드 단일 흐름과 상태 복구 |
| 보호자 알림 | 오래된 Mock 조회 경로 존재 | Seed·백엔드 이벤트만 사용, 공개 조회 제거 |
| 접근성 | 큰 글씨·고대비·단순 모드·TTS 기반 | 실제 P0 흐름의 보조기기 E2E |
| 테스트 | 인증 단위 테스트 14개와 정적 검사 존재 | 화면 통합·브라우저 E2E 도입 |

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
| `/accounts/register` | 연결 계좌 확인 | Mock |
| `/accounts` | 계좌 목록·기본 계좌 | Mock |
| `/balance` | 잔액조회 | Mock |
| `/transactions` | 거래 목록 | Mock |
| `/transactions/[transactionId]` | 거래 상세 | Mock |
| `/transfer` 이하 | 송금·FDS 결과 | Mock |
| `/alerts/guardian/[riskEventId]` | 계약 없는 보호자 조회 | MVP 실 경로에서 제거 대상 |

## 접근성 기반

- semantic HTML과 접근 가능한 이름
- 키보드 포커스와 44px 이상 조작 영역
- `aria-live` 기반 중요 상태 안내
- 고대비·큰 글씨·단순 화면 모드
- 색상 외 텍스트·금액 부호를 통한 상태 구분
- 브라우저 `speechSynthesis` 기반 다시 듣기

아직 VoiceOver/TalkBack, 200% 확대와 실제 전체 P0 흐름 E2E가 남아 있다.

## 바로 다음 작업

1. OpenBanking 변경 commit·PR 및 백엔드 302 staging E2E
2. 계좌·잔액·거래내역 실제 API
3. 음성 녹음·세션·AI 연결
4. 송금 확인·상태 복구·FDS 통합
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
