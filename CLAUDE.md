# TABI 프로젝트 — Claude 개발 지침

## 프로젝트 개요
한국 20-30대 대상 일본 여행 앱. Vercel 배포, Vanilla JS + CSS, 백엔드는 Vercel Serverless Functions(`/api`).

---

## 브랜치 & 배포 규칙

- **작업 브랜치**: `claude/update-design-MfdDa`
- **배포 브랜치**: `main` (Vercel이 main을 자동 배포)
- **작업 완료 후 반드시**: feature 브랜치 → main 머지 → main 푸시
- main에 머지하지 않으면 사용자 화면에 반영되지 않음

---

## 아키텍처

```
tabi-app/
├── index.html        # HTML 껍데기만 (CSS/JS 링크, meta 태그)
├── styles.css        # 전체 CSS (디자인 토큰, 컴포넌트, 다크모드)
├── data.js           # 전역 데이터 상수 (CITIES, CATS, BKP, COORDS 등) — IIFE 밖
├── app.js            # 앱 로직 전체 — IIFE 패턴 (function(){ 'use strict'; ... })()
├── sw.js             # Service Worker (정적 캐시 전략)
├── manifest.json     # PWA 메타
├── vercel.json       # 배포·보안 헤더 설정
└── api/
    ├── itinerary.js  # Claude AI 일정 생성 프록시 (ANTHROPIC_API_KEY)
    ├── places.js     # Google Places Text Search 프록시 (GOOGLE_PLACES_API_KEY)
    ├── photo.js      # Google Places 사진 프록시
    └── analytics.js  # 경량 이벤트 트래킹
```

### 핵심 원칙
- **단일 책임**: HTML = 구조, CSS = 스타일, data.js = 데이터, app.js = 로직
- **API 키는 서버에만**: 모든 외부 API 키는 Vercel 환경변수 → `/api/*.js` 서버에서만 사용
- **프론트엔드에 키 없음**: 브라우저 소스에서 API 키가 절대 보이면 안 됨
- **파일 추가 최소화**: 기존 파일 수정 우선, 새 파일은 꼭 필요할 때만

---

## 보안 지침 (필수 체크)

### 절대 금지
- `/api/` 엔드포인트에서 환경변수 키를 응답 body에 포함 (`{ key: process.env.XXX }` 형태)
- 프론트엔드 JS에 API 키 하드코딩
- 외부 API를 프론트에서 직접 호출 (반드시 `/api/` 프록시 경유)

### 배포 전 보안 체크리스트
- [ ] `api/` 폴더에 키를 반환하는 엔드포인트 없는지 확인
- [ ] `data.js`, `app.js`에 `key=`, `apiKey`, `API_KEY` 문자열 없는지 확인
- [ ] `vercel.json`에 보안 헤더(X-Frame-Options 등) 포함 확인

---

## Google Maps 사용 규칙

### embed iframe (지도 표시)
```js
// ✅ 올바른 방법: 텍스트 검색어 사용
var src = 'https://maps.google.com/maps?q=' + encodeURIComponent(장소명 + ' ' + 도시 + ' Japan') + '&output=embed&hl=ko&z=16';

// ❌ 절대 금지: place_id: 접두사는 embed q= 파라미터에서 작동 안 함 → 세계지도 표시됨
var src = 'https://maps.google.com/maps?q=place_id:ChIJxxx&output=embed'; // 작동 안 함
```

### 외부 링크 (Google 지도에서 보기)
```js
// ✅ place_id 있을 때
var url = 'https://www.google.com/maps/place/?q=place_id:' + place_id;

// ✅ place_id 없을 때
var url = 'https://maps.google.com/?q=' + encodeURIComponent(장소명 + ' ' + 도시 + ' Japan');

// ❌ 금지: ?api=1&query_place_id= 형식 (일부 환경에서 오작동)
var url = 'https://www.google.com/maps/search/?api=1&query=...&query_place_id=...';
```

---

## CSS / 디자인 토큰

```css
/* 라이트 모드 기본값 (styles.css :root) */
--bg, --w, --sf, --sf2   /* 배경 계층 */
--bd, --bd2              /* 테두리 */
--tx, --tx2, --tx3       /* 텍스트 계층 */
--ac, --ac2, --acbg      /* 브랜드 컬러 (#00c896) */
--nav: 60px              /* 하단 네비 높이 */
--safe: env(safe-area-inset-bottom)  /* iPhone 노치 대응 */
```

- 다크모드: `@media(prefers-color-scheme:dark)` 로 토큰만 재정의
- 인라인 style 최소화: 반복 스타일은 CSS 클래스로 추출

---

## app.js 코딩 패턴

```js
// DOM 헬퍼
function mk(tag, cls, txt) { ... }   // createElement 래퍼
function $e(id) { ... }              // 캐싱 getElementById

// 상태 (STATE 섹션)
var city, cityEn, cat, foodSubCat, sortBy, onlyOpen;
var saved, _places, _tdays, _tcity;

// 진동 피드백
buzz(8);          // 8ms 단타
buzz([12,60,12]); // 패턴

// 토스트
showToast('메시지');
```

---

## Service Worker

- 버전 변경 시 `CACHE_NAME = 'tabi-vN'` 숫자 증가 필수
- `sw.js` 수정 시 `vercel.json`의 `Cache-Control: no-cache` 헤더가 즉시 반영 보장

---

## Wikipedia API (장소 설명)

우선순위: `editorial_summary` → 한국어 위키 직접 → 한국어 위키 검색 → 영어 위키 → 섹션 숨김

```
ko.wikipedia.org/api/rest_v1/page/summary/{장소명}
ko.wikipedia.org/w/api.php?action=query&list=search&srsearch={장소명}
en.wikipedia.org/api/rest_v1/page/summary/{장소명}
```
