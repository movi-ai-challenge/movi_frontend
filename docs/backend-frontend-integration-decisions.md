- SMS는 Mock sender를 사용하고 DB 알림 기록과 재시도 상태로 검증한다.
- 보호자 초대, 수락, 목록, 알림 상태 조회 공개 API는 MVP에서 제외한다.
- 프런트의 `riskEventId` 조회 모델은 실 API 계약에서 제거한다.
- MEDIUM은 이체 완료와 `riskLevel=MEDIUM`을 표시한다.
- HIGH는 이체 차단과 `riskLevel=HIGH`를 표시한다.
- 사용자 안내는 “보호자에게 알림을 요청했어요.”까지 보장한다.
- “문자 발송이 완료됐다”는 문구를 사용하지 않는다.
- SMS 링크는 MVP에서 제외한다. 메시지에는 계좌번호를 넣지 않고 금액과 완료/차단 여부만 넣는다.

완료 조건:

- MEDIUM/HIGH에서 Seed 보호자별 알림 레코드가 생성된다.
- SMS 실패가 이미 완료된 이체를 롤백하지 않는다.

### 2.8 OpenBanking callback

결정:

- `/api/openbanking/callback`을 인증 없이 접근 가능한 공개 경로로 등록한다.
- state는 사용자와 연결하며 5분 만료, 1회 사용으로 유지한다.
- MVP 단일 서버에서는 메모리 저장소를 사용하고 다중 인스턴스 전환 시 Redis로 옮긴다.
- 성공 시 `/accounts/connect/callback?result=success`로 302 이동한다.
- 실패 시 `/accounts/connect/callback?result=error&error={errorCode}`로 302 이동한다.
- 프런트는 복귀 후 인증된 `GET /api/accounts`로 실제 계좌 목록을 조회한다.
- 계좌가 0개면 연결 재시도, 1개면 계좌 홈, 여러 개면 계좌 목록으로 이동한다.
- 기본 계좌가 없으면 백엔드가 첫 번째 활성 계좌를 기본 계좌로 지정한다.

완료 조건:

- 운영 인증 모드에서 외부 OpenBanking callback이 401로 차단되지 않는다.
- state 누락, 만료, 재사용 시 계좌가 연결되지 않는다.

### 2.9 계좌 DTO와 별칭

결정:

- 프런트는 백엔드 Account DTO를 화면 모델로 변환하는 매퍼를 둔다.
- 계좌 목록에 잔액을 합치지 않고 `GET /api/accounts/balance`를 별도로 호출한다.
- 별칭은 앞뒤 공백 제거 후 1~50자다.
- 같은 사용자의 활성 계좌에서 같은 별칭을 중복 사용할 수 없다.
- 프런트는 백엔드와 같은 규칙으로 사전 검증하되 최종 판단은 백엔드가 한다.
- 계좌 0개면 계좌 연결 화면을, 기본 계좌가 없으면 기본 계좌 선택 화면을 표시한다.
- 최초 OpenBanking 동의에서 여러 계좌가 등록되는 것은 허용한다.
- 사용자가 별도의 추가 연결 또는 연결 해제를 수행하는 기능은 MVP에서 제외한다.

### 2.10 거래내역과 상세

결정:

- 거래 유형 필터는 `IN` 또는 `OUT` 단일 선택이다.
- `blocked`는 거래 유형이 아니라 Transfer 상태다.
- 차단된 이체는 실제 거래내역을 생성하지 않는다.
- 상세 화면은 `GET /api/transactions/{transactionId}`를 사용한다.
- REST 목록의 기본 페이지 크기는 20, 최대 크기는 100이다.
- 음성 HISTORY는 최근 3건을 읽고 나머지는 총 건수로 안내한다.
- 현재 백엔드의 음성 조회 5건 제한은 3건으로 맞춘다.

### 2.11 추가 인증과 MVP 범위

결정:

- MVP에서는 범용 `reauthProof`를 도입하지 않는다.
- 기본 계좌 변경, 계좌 별칭 변경, 로그아웃은 유효한 Access token으로 처리한다.
- 계좌 연결은 OpenBanking 본인 인증과 1회용 state로 보호한다.
- PIN 최초 등록은 카카오 로그인 직후 인증 사용자만 수행한다.
- 송금은 `confirmationId`와 `idempotencyKey` 검증을 적용한다.
- HIGH 차단은 PIN 등 추가 인증으로 우회할 수 없다.
- PIN 변경·재설정·분실 복구와 보호자 연결·해제는 MVP에서 제외한다.

## 3. 구현 작업과 담당

| 우선순위 | 작업                             | 담당          | 기한                  | 완료 조건                        |
| -------- | -------------------------------- | ------------- | --------------------- | -------------------------------- |
| P0       | 카카오 교환 코드로 프런트 전환   | 프런트        | staging E2E 전        | URL에 토큰 없음                  |
| P0       | OAuth 실패 프런트 리다이렉트     | 백엔드        | staging E2E 전        | 성공·취소·오류 모두 화면 복귀    |
| P0       | `legacy-token-query=false` 전환  | 백엔드/프런트 | 코드 교환 배포 직후   | 기존 쿼리 토큰 제거              |
| P0       | 운영 CORS origin 고정            | 백엔드/인프라 | staging 배포 전       | production preview wildcard 제거 |
| P0       | iOS `audio/mp4` 지원             | 백엔드/AI     | 음성 실기기 테스트 전 | Safari/iOS 녹음 처리             |
| P0       | OpenBanking callback 공개·복귀   | 백엔드        | 계좌 연결 E2E 전      | 운영 모드 callback 성공          |
| P0       | `users.phone` nullable migration | 백엔드/인프라 | 백엔드 배포 전        | `ddl-auto=validate` 기동 성공    |
| P1       | 마스킹 transcript 응답           | 백엔드/프런트 | 음성 UI 통합 전       | 민감정보 원문 미노출             |
| P1       | 음성 HISTORY 3건 정합화          | 백엔드        | 음성 E2E 전           | 코드와 계약 모두 3건             |
| P1       | 공통 API 파서·refresh 처리       | 프런트        | 인증 E2E 전           | 401 refresh 1회                  |
| P1       | 멱등성 상태 복구                 | 프런트        | 송금 E2E 전           | 타임아웃 후 중복 이체 없음       |
| P1       | 보호자 Mock/Seed 시연            | 백엔드/프런트 | FDS E2E 전            | MEDIUM/HIGH 알림 기록 확인       |

## 4. 배포 전 확인

- `docs/migrations/20260823_users_phone_nullable.sql`을 대상 DB에 적용한다.
- production에서 `movi.auth.dev-mode=false`를 확인한다.
- production CORS는 고정 프런트 origin만 허용한다.
- 카카오 Redirect URI와 OpenBanking Redirect URI가 실제 백엔드 주소와 일치한다.
- `legacy-token-query=false` 전환 후 URL, 브라우저 기록, Netlify 로그에 토큰이 없는지 확인한다.
- Mock/실 연동 모드를 staging 환경표에 기록한다.

## 5. 최소 통합 테스트

1. 카카오 로그인, 코드 교환, 신규 사용자 PIN 등록, token refresh, 로그아웃
2. 기본 계좌 잔액조회와 `voiceMessage` TTS
3. 음성 잔액조회와 최근 거래내역
4. 송금 수취인/금액 누락 재질문과 확인 취소
5. LOW 완료, MEDIUM 완료와 알림 기록, HIGH 차단과 알림 기록
6. FDS 장애 시 이체 미실행
7. 같은 멱등성 키의 순차·동시 요청에서 이체 1건
8. 네트워크 타임아웃 후 상태 복구
9. 다른 사용자 계좌·세션·거래 접근 거부
10. URL·로그·응답에 토큰, 계좌번호, 전화번호 원문 미노출
11. Chrome, Android, Safari, iOS 음성 업로드
12. OpenBanking 성공·취소·state 만료 후 프런트 복귀

## 6. 회의에서 추가할 정보

- 프런트 담당자 이름
- 백엔드 담당자 이름
- AI 담당자 이름
- staging URL과 production URL
- staging E2E 일시와 참석자
- 각 작업의 실제 완료 날짜
