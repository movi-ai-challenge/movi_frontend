# MOVI Frontend

> 음성 중심 포용 금융과 FDS(Fraud Detection System)를 결합한 접근성 우선 뱅킹 프론트엔드

MOVI는 시각장애인, 저시력 사용자, 운동장애 사용자, 고령자처럼 기존 금융 서비스 이용에 어려움을 겪는 사용자가 음성·키보드·터치 중 편한 방식을 선택해 계좌를 조회하고 안전하게 송금할 수 있도록 설계한 프로젝트입니다.

이 저장소는 **2026 금융 AI Challenge - Voice-First Inclusive Banking & FDS**의 프론트엔드만 관리합니다. 백엔드와 AI 서버는 별도 프로젝트에서 개발합니다.

## 제품 원칙

1. 모든 음성 기능에는 화면과 키보드로 사용할 수 있는 대체 수단을 제공합니다.
2. 음성 인식 결과만으로 로그인, 계좌 연결 해제, 송금을 완료하지 않습니다.
3. 금융 거래는 수취인, 금액, 출금 계좌를 검토하고 사용자가 화면에서 명시적으로 확인해야 합니다.
4. 보호자는 위험 거래 알림만 받으며 계좌·잔액·거래내역 조회 또는 송금 승인·거절·실행·취소 권한을 갖지 않습니다.
5. 프론트엔드의 버튼 비활성화와 URL 숨김은 보안 통제가 아닙니다. 인증, 계좌·거래 소유권, FDS 결과, 중복 방지는 백엔드가 다시 검증해야 합니다.

세부 기준은 [인증·권한·금융 안전 체크리스트](docs/AUTH_SECURITY_CHECKLIST.md)를 따릅니다. 보호자 정책 문서는 PR #3 병합 후 `docs/GUARDIAN_ALERT_POLICY.md`에서 관리합니다.

## 현재 구현 상태

> 기준일: 2026-08-25 · `main` 기준 커밋: `e2ee784`

현재 `main`에는 로그인부터 계좌 조회, 거래내역, 송금 검토, FDS Mock 분기와 결과 확인까지의 핵심 시연 흐름이 구현되어 있습니다. 실제 인증과 금융 거래는 발생하지 않습니다.

| 영역 | 상태 | 설명 |
|---|---|---|
| 인증 진입 | 부분 구현 | PASS·카카오·PIN·생체인증 Mock 화면 구현. 실제 세션 미연동 |
| 계좌 | Mock 완료 | 연결, 등록, 목록, 기본 계좌 설정, 오류 복구 구현 |
| 잔액 | Mock 완료 | 계좌 선택, 잔액 조회, 계좌번호 마스킹 구현 |
| 거래내역 | Mock 완료 | 기간·유형 필터, 상세, 자연어 예시 조회, 최근 거래 TTS 구현 |
| 송금 | Mock 완료 | 입력, 검토, FDS 평가, 저위험 실행, 고위험 차단, 결과, 중복 요청 방지 구현 |
| 보호자 정책 | 변경 반영 중 | 기존 보호자 승인 흐름을 제거하고 위험 거래 알림 전용으로 전환 중 |
| 접근성 | 부분 구현 | 고대비, 큰 글씨, 단순 화면, 키보드 포커스, 일부 TTS 구현. 실기기 QA 필요 |
| 실제 API | 미연동 | 계좌·잔액·거래·수취인·FDS·송금 서비스는 Mock 사용 |
| 자동화 테스트 | 미구현 | lint·typecheck·build와 수동 브라우저 검증을 사용 |

### 리뷰 중인 주요 변경

- PR #3: 보호자 알림 전용 정책
- PR #4: 계좌 연결 해제와 Mock 재인증
- PR #5: Mock 로그인 세션과 금융 경로 보호
- PR #6: 중위험 보호자 승인 제거
- PR #7: 보호자 위험 거래 알림 발송 상태
- PR #8: 잔액 다시 듣기
- PR #9: 송금 검토 정보 다시 듣기

PR 번호는 진행 상황을 설명하기 위한 기록입니다. 구현 여부는 항상 `main`의 현재 코드와 열린 PR을 함께 확인해야 합니다.

## 핵심 시연 흐름

### 계좌 연결과 조회

```text
/login → /accounts/connect → /accounts/register → /accounts → /balance
```

Mock 본인 확인 후 연결 계좌를 등록하고 기본 계좌와 잔액을 확인합니다. 계좌번호는 마스킹하며 인증 만료·인증 실패·통신 실패별 복구 행동을 안내합니다.

### 거래내역 조회

```text
/accounts → /transactions → /transactions/[transactionId]
```

기간과 거래 유형으로 최근 거래를 필터링하고 상세 정보를 확인합니다. 자연어 조회는 예시 명령을 선택하는 Mock이며, 최근 거래 안내는 브라우저 TTS를 사용합니다.

### 송금과 FDS

```text
/transfer → /transfer/review → /transfer/evaluate → /transfer/result
```

수취인과 금액을 입력한 뒤 별도 검토 화면에서 확인합니다. 음성 확인이 인식되어도 화면에서 다시 확인해야 하며, FDS Mock 평가 후 사용자가 실행 버튼을 눌러야 저위험 Mock 송금이 진행됩니다.

- 저위험: 명시적 실행 후 Mock 결과 표시
- 중위험: 거래를 실행하지 않고 추가 처리 정책 확인 상태 표시
- 고위험: 거래를 실행하지 않고 차단 사유 표시
- 보호자 알림: 거래 처리 권한과 독립된 알림 발송 상태만 표시

## 화면 경로

| 경로 | 역할 |
|---|---|
| `/` | 서비스 소개와 시작 |
| `/login` | 인증 방식 선택과 Mock 인증 |
| `/accounts/connect` | 오픈뱅킹 연결 동의 |
| `/accounts/register` | 연결 계좌 확인과 등록 |
| `/accounts` | 계좌 목록과 기본 계좌 설정 |
| `/balance` | 계좌별 잔액조회 |
| `/transactions` | 기간·유형·자연어 Mock 거래 조회 |
| `/transactions/[transactionId]` | 거래 상세 |
| `/transfer` | 수취인·금액 입력 |
| `/transfer/review` | 송금 내용 최종 검토 |
| `/transfer/evaluate` | FDS 평가와 저위험 실행 |
| `/transfer/evaluate/blocked` | 고위험 송금 차단 |
| `/transfer/result` | 송금 성공·실패 결과 |

`/transfer/evaluate/medium`과 `/alerts/guardian/[riskEventId]`는 관련 PR이 병합된 후 추가됩니다. 기존 `/transfer/evaluate/guardian`은 보호자 승인 기능을 제공하지 않는 호환 경로로 변경될 예정입니다.

## 기술 스택과 구조

- Next.js App Router
- React와 strict TypeScript
- Tailwind CSS와 CSS 디자인 토큰
- Zustand
- Axios
- npm
- Web Speech API

```text
src/
├── app/                 # App Router 화면과 동적 경로
├── components/
│   ├── common/          # 공통 UI와 접근성 기반
│   └── domain/          # 계좌·거래·송금 도메인 UI
├── services/            # API 경계와 Mock 서비스
├── store/               # 인증·금융·접근성 클라이언트 상태
└── types/               # 공통 도메인 타입
```

컴포넌트는 Mock 모드 여부를 판단하지 않습니다. Mock과 실제 API 선택은 서비스 계층에서 담당하고 두 구현은 같은 도메인 타입을 사용해야 합니다.

## 로컬 실행

요구 사항: Node.js와 npm

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_MOCK=true
```

- 백엔드 없이 시연할 때는 `NEXT_PUBLIC_USE_MOCK=true`를 사용합니다.
- 환경변수를 변경한 뒤 개발 서버를 다시 시작합니다.
- `.env.local`, 실제 토큰, 계좌번호, 전화번호와 개인정보는 커밋하지 않습니다.

프로덕션 빌드를 로컬에서 실행할 때는 다음 명령을 사용합니다.

```bash
npm run build
npm run start
```

## 검증

```bash
npm run lint
npm run typecheck
npm run build
```

현재 자동화 테스트 명령은 없습니다. 기능 PR에서는 다음 흐름을 수동으로 함께 검증합니다.

- 키보드만으로 주요 작업 완료
- 제목, 입력 레이블, 로딩·성공·경고·오류 상태의 스크린리더 전달
- 고대비·큰 글씨·단순 화면과 200% 확대
- 음성 기능의 화면·키보드 대체 수단
- 송금 검토 전 거래 미실행
- 음성만으로 금융 동작 미실행
- 중복 클릭과 네트워크 재시도 시 중복 거래 방지

## Mock과 실제 연동의 경계

Mock 화면이 동작해도 실제 인증·인가가 완료된 것은 아닙니다. 실제 API 연결 전 백엔드와 다음 계약을 확정해야 합니다.

- 로그인 세션 전달, 갱신, 만료와 로그아웃
- 401과 403 공통 처리
- 계좌 연결 해제와 송금 재인증 증명
- 계좌·거래 소유권 검증
- FDS 위험도와 처리 규칙
- 송금 중복 방지 키와 최종 상태 조회
- 보호자 본인확인, 일회용·만료 초대 토큰, 알림 수신 동의
- 위험 거래 알림 채널, 최소 데이터와 재시도 정책
- STT·TTS·Intent·Entity API 형식

## Issue와 Pull Request 작업 절차

1. 구현 전에 GitHub Issue를 생성하고 범위와 완료 조건을 기록합니다.
2. 최신 `main`에서 Issue 하나에 대응하는 기능 브랜치를 만듭니다.
3. 한 브랜치와 커밋에는 하나의 기능 또는 화면만 포함합니다.
4. lint·typecheck·build와 관련 접근성 흐름을 검증합니다.
5. 기능 브랜치를 푸시하고 `main` 대상 Pull Request를 생성합니다.
6. PR 본문에 `Closes #이슈번호`를 넣고 Mock 범위와 백엔드 필요사항을 기록합니다.
7. 다른 팀원의 리뷰와 CI 확인 후 병합합니다.
8. 명시적 승인 없이 `main`에 직접 구현하거나 병합·배포하지 않습니다.

## 관련 문서

- [인증·권한·금융 안전 체크리스트](docs/AUTH_SECURITY_CHECKLIST.md)
- [MVP 구현 계획](docs/MVP_WEEK_PLAN.md)
- [이전 진행 기록](docs/TEAM_PROGRESS.md)

정책과 API가 확정되면 관련 문서에 결정일, 참여자, 동작과 예외, API 명세, 반영 PR을 함께 기록합니다.
