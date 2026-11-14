# misterworld-client

Mr. World 테마 투어 프론트엔드 (React + Vite + TypeScript + styled-components).
화면 디자인은 Claude Design 캔버스(Mr. World 홈)를, 업무 규칙은 분석산출물(SE-2026-001)·설계산출물(SE-2026-002)·BE 결정 기록(misterworld-server/docs/REVIEW.md)을 따른다.

## 실행

```powershell
npm install
copy .env.example .env   # 열어서 VITE_PROXY_TARGET에 실제 BE 주소 입력
npm run dev              # http://localhost:5173
```

- 개발 중 `/api` 요청은 Vite 프록시가 `.env`의 `VITE_PROXY_TARGET`으로 전달한다(CORS 불필요).
- `.env`는 커밋하지 않는다. BE 주소·테스트 계정 등 환경값은 전부 `.env`에만 둔다.

## 빌드·검증

```powershell
npm run build   # tsc --noEmit + vite build
```

## 배포 (Vercel)

`vercel.json`의 rewrite가 `/api/*`를 BE 서버로 서버 측 프록시한다(CORS·혼합 콘텐츠 불필요).
배포 전에 `vercel.json`의 `<BE-서버-주소>`를 실제 주소로 바꾼다. 저장소를 공개로 둘 경우 이 주소도 공개된다는 점에 유의한다.

## 구조

```
src/
  api/        fetch 래퍼(토큰·refresh·오류 계약), BE DTO 타입, 기능별 API 함수
  auth/       AuthProvider(세션 복구·로그인·로그아웃), RequireRole 가드
  domain/     상태 Enum→라벨·색, 업무 규칙 상수(정원·확정 기준·D-7), 표기 형식
  styles/     디자인 토큰, 전역 스타일, Wanted Sans 자체 호스팅
  components/ console(직원 콘솔 공통 UI), customer(고객 화면 공통 UI)
  pages/      staff(상품·일정/예약 현황/물품·재고), customer(홈·테마·로그인·예약·내 예약)
```

## 구현 상태

| 단계 | 내용 | 상태 |
|---|---|---|
| M0 | 기반(라우팅·인증·API 클라이언트·토큰·글꼴) + 로그인/회원가입 | 완료 |
| M1 | 직원 · 상품·일정 관리 (+ 상품/일정 등록·수정 폼) | 완료 |
| M2 | 직원 · 예약 현황 조회 (일정+신청+알림 FE 조합, BE 요청 3 반영 전) | 완료 |
| M3 | 직원 · 물품·재고 관리 (상품 연결 등록·수량 수정·재고 부족 필터) | 완료 |
| M4 | 홈 · 여행 테마 | 완료 |
| M5 | 예약 5단계(견적→신청→World Pay 모의 결제) + 완료 | 완료 |
| M6 | 음성 선택 (녹음→transcriptions→interpretations→선택 적용) | 완료 |
| M7 | 내 예약 (신청 내역·결제·취소, 여행 이력) | 완료 |

## 화면 경로

| 경로 | 화면 | 권한 |
|---|---|---|
| `/` | 홈 | 공개 (시작 가격은 로그인 후 표시) |
| `/themes` | 여행 테마 | 공개 |
| `/login` | 로그인·회원가입 | 공개 |
| `/booking` | 예약 5단계 (`?theme=허니문` 등) | MEMBER |
| `/my` | 내 예약 | MEMBER |
| `/staff/products` · `/staff/reservations` · `/staff/inventory` | 직원 콘솔 | STAFF |

## 보안 수칙

- 토큰·비밀번호·개인정보를 console, URL, 커밋에 남기지 않는다.
- 액세스 토큰은 메모리, 리프레시 토큰은 sessionStorage에만 둔다(탭 종료 시 재로그인).
- 외부 CDN을 쓰지 않는다. 글꼴은 저장소에 포함해 자체 호스팅한다.
