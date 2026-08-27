# MOVI 프런트엔드 진행 현황

## 개발 환경

- 필수 Node.js 버전: `22.6.0` 이상
- nvm 사용 시 저장소 루트에서 `nvm use`
- 의존성 설치: `npm ci`

> 갱신일: 2026-08-27
> 최상위 구현 기준: [IMPLEMENTATION_SOURCE_OF_TRUTH.md](IMPLEMENTATION_SOURCE_OF_TRUTH.md)
> 현재 브랜치: `chore/remaining-implementation-plan`

## 현재 목표

접근성 중심 Mock UI를 새로 확장하는 단계가 아니라, 인증 → 조회 → 음성 → 송금 순서로 실제 백엔드·AI 흐름에 연결하는 단계다. 부분 구현 브랜치는 현재 단계에 필요한 것만 최신 계약으로 보완해 검토한다.

## 현재 작업

### `chore/remaining-implementation-plan`

작업 트리에 반영:

- 남은 작업을 프런트 단독 구현, 외부 반영, 합의 필요, staging·실기기 검증으로 분류
- 직접 입력 송금·수취인, OpenBanking callback, Voice/FDS 환경의 계약 공백 기록
- 백엔드·AI·인프라·기획별 결정 질문과 권고안 정리
- 출시 전 staging·접근성·보안 시나리오와 완료 증거 정의

검증:

- `npm test`: 단위 37개·컴포넌트 4개 통과
- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `npm run build`: 통과, 20개 route
- 문서 변경만 수행하므로 직전 기능 검증 결과를 유지

남은 작업:

- 백엔드 `/api/openbanking/callback` 공개 경로 허용
- 백엔드 callback JSON을 프런트 결과 URL 302로 변경
- 성공·취소·state 만료·재사용 staging E2E
- Voice/FDS staging URL·health/version과 실제 AI 응답 E2E
- Safari/iOS `audio/mp4` 백엔드 허용 전 실기기 녹음 보류
- 직접 입력 송금의 명시적 실행 API 계약 확정
- 실제 LOW·MEDIUM·HIGH, timeout 직후 조회, 새로고침 복구 staging E2E
- 남은 구현·합의 목록 검토와 팀별 담당·일정 확정

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
| 테스트 | 단위 테스트 37개·음성 오류 컴포넌트 테스트 4개와 정적 검사 존재 | Playwright 브라우저 E2E 도입 |

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

1. 음성 재시도 직접 입력 전환 commit·PR
2. 실 AI·FDS·권한·MIME·timeout staging E2E
3. OpenBanking 백엔드 302 반영 후 staging E2E
4. 직접 입력 송금 실행 계약 확정 후 키보드 대안 완성
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
