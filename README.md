# MOVI Frontend

음성 중심 포용 금융과 FDS를 결합한 접근성 우선 뱅킹 프런트엔드입니다. 이 저장소는 Next.js 프런트엔드만 관리하며 백엔드와 AI 서버는 별도 프로젝트에서 개발합니다.

## 프로젝트 전체 현황

> 갱신일: 2026-08-28 · 마감: 2026-08-31
>
> 프런트 `main` · 백엔드 `develop` · AI `main@2026-08-26`

세 파트 모두 **각자의 기능은 구현이 끝났고, 서로 연결하는 일이 남았습니다.**

| 파트 | 구현 | 연동 | 지금 막고 있는 것 |
|---|---|---|---|
| 프런트 | 완료 (열린 PR 없음) | 백엔드 계약 반영 완료 | staging 검증 미수행 |
| 백엔드 | 완료 (293개 테스트) | Mock 기준 완주 | AI staging URL 없음 |
| AI | Voice·FDS 각각 동작 | 미연결 | 배포 주소·응답 계약 |

### 파트 간 의존 관계

```text
AI staging URL ─────────┐
                        ▼
              백엔드 실 연동 ──────┐
                                    ▼
배포 서버에 시드 적용 ──────────► staging E2E ──► 시연
                        ▲
OpenBanking callback 공개 ┘
```

**AI 응답이 유일한 외부 의존입니다.** 나머지는 팀 내부에서 처리할 수 있습니다.

### 남은 일과 담당

| 우선순위 | 할 일 | 담당 | 상태 |
|:---:|---|---|---|
| P0 | 배포 서버 yml에 `movi.seed.enabled: true` | 인프라 | 서버 접근 필요 |
| P0 | AI Voice·FDS staging URL과 계약 확정 | AI | [movi_ai#1](https://github.com/movi-ai-challenge/movi_ai/issues/1) 미응답 |
| P0 | `/api/openbanking/callback` 공개 경로 + 프런트 302 복귀 | 백엔드 | 미착수 — 계좌 연결 흐름이 막혀 있음 |
| P1 | AI 계약 확정 후 백엔드 실 연동 전환 | 백엔드 | [movi_backend#104](https://github.com/movi-ai-challenge/movi_backend/issues/104) |
| P1 | 오픈뱅킹 Sandbox 실 이체 1건 종단 검증 | 백엔드 | Adapter는 구현 완료 |
| P1 | staging E2E (인증 → 조회 → 송금 → 보호자 알림) | 전원 | 위 P0가 선행 |
| P2 | 국내 SMS provider 연동 | 백엔드 | 현재 Mock sender |
| P2 | 접근성 실측 (200% 확대·VoiceOver·TalkBack) | 프런트 | |
| P2 | 폐기 라우트 정리 (`/alerts/guardian/*`, `/transfer/evaluate/*`) | 프런트 | 실제 경로에서 미사용 |

**대안**: 8/30까지 AI staging이 준비되지 않으면 백엔드 Mock 어댑터로 시연하되 화면과 음성에 Sandbox·시연임을 표시합니다.

## 핵심 원칙

- 모든 음성 기능에는 보이는 키보드·터치 대안을 제공한다.
- 음성 인식만으로 인증, 계좌 연결 또는 송금을 완료하지 않는다.
- 송금은 수취인, 금액, 출금 계좌 검토와 명시적 확인을 거친다.
- 프런트는 AI와 FDS를 직접 호출하지 않고 Spring 백엔드를 통한다.
- 인증, 소유권, 한도, FDS 판정과 멱등성은 백엔드가 최종 검증한다.
- 보호자는 위험 거래 알림만 받으며 금융 정보 조회나 송금 승인 권한을 갖지 않는다.
- 확정되지 않은 API와 동작은 Mock으로 발명하지 않는다.

## 기술 스택

- Next.js App Router, React, strict TypeScript
- Tailwind CSS, Zustand, Axios
- npm, Node.js 22.6.0 이상

```text
src/
├── app/                 # App Router 화면
├── components/common/   # 공통 UI와 접근성 기반
├── components/domain/   # 도메인 UI
├── services/            # API 계약, 매퍼와 Mock/실 API 경계
├── store/               # 클라이언트 상태
└── types/               # 도메인 타입
```

## 로컬 실행

```bash
npm ci
cp .env.example .env.local
npm run dev
```

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_USE_MOCK=true
```

환경변수 변경 후 개발 서버를 다시 시작합니다. `.env.local`, 토큰, 원문 계좌번호, 전화번호와 개인정보는 커밋하지 않습니다.

## 검증

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

정적 검사만으로 실제 금융·음성 흐름을 완료 처리하지 않습니다. staging E2E, 키보드, 200% 확대, VoiceOver/TalkBack와 실제 기기 검증 결과가 필요합니다.

### staging 시드 계정

백엔드가 `movi.seed.enabled=true`로 만든 데모 데이터입니다.

| 항목 | 값 |
|---|---|
| 데모 사용자 | `01012345678` / PIN `135790` |
| 소유권 검증용 타인 | `01099998888` / 같은 PIN |
| 계좌 | 생활비 통장(53만원, 기본) · 비상금 통장(120만원) |
| 수취인 | 엄마·아들(거래 이력 있음) · 김영희(첫 거래) |

세 위험도를 이렇게 재현합니다.

| 위험도 | 방법 |
|---|---|
| LOW | 엄마에게 10만원 이하 — 완료, 알림 없음 |
| MEDIUM | 김영희에게 송금 또는 10만원 초과 — 완료 + 보호자 알림 |
| HIGH | **비상금 통장에서** 70만원 이상 — 차단 + 보호자 알림 |

HIGH는 반드시 비상금 통장에서 보내야 합니다. 기본 계좌는 53만원이라 FDS가 아니라 잔액 부족에서 먼저 막힙니다.

LOW가 나오려면 **PIN 로그인을 한 번 거쳐야 합니다.** 백엔드는 PIN 인증을 통과한 기기를 신뢰 기기로 올리고, 신뢰 기기가 아니면 소액·기존 수취인이어도 MEDIUM이 됩니다. 프런트는 `deviceIdentity`가 만든 UUID를 인증·음성·송금 요청에 자동으로 실어 보냅니다.

## 작업 절차

1. 최신 `main`에서 작업 하나에 대응하는 브랜치를 만든다.
2. 기능은 `feature/<name>`, 문서·설정 정리는 `chore/<name>`을 사용한다.
3. 한 브랜치와 커밋에는 하나의 기능 또는 화면만 포함한다.
4. 관련 테스트, 타입 검사, 린트와 빌드를 실행한다.
5. 기능 브랜치를 푸시하고 리뷰 후 명시적 승인으로 병합한다.

## 기준 문서

문서는 아래 세 개만 현재 기준으로 사용합니다.

1. [구현 기준 및 완료 조건](docs/IMPLEMENTATION_SOURCE_OF_TRUTH.md)
2. [확정된 백엔드·프런트엔드·AI 계약](docs/backend-frontend-integration-decisions.md)
3. [현재 남은 구현과 합의 항목](docs/REMAINING_IMPLEMENTATION_AND_AGREEMENTS.md)

문서와 코드가 다르면 최상위 구현 기준의 우선순위를 따르며, 미확정 사항은 `확인 필요`로 유지합니다.
