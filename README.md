# MOVI Frontend

음성 중심 포용 금융과 FDS를 결합한 접근성 우선 뱅킹 프런트엔드입니다. 이 저장소는 Next.js 프런트엔드만 관리하며 백엔드와 AI 서버는 별도 프로젝트에서 개발합니다.

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
