# 여행 지도 (Travel Map)

구글 지도(Google Maps) 기반으로 여행 계획과 위치를 관리할 수 있는 웹 앱입니다.

## 기능

- **구글 지도 기반**: Google Maps를 베이스로 사용합니다.
- **장소 검색**: 지도 위 검색창에서 장소를 검색하면 해당 위치로 이동하고 핀이 찍힙니다. "여행지로 추가" 버튼을 눌러야 실제로 등록돼요.
- **전체 → 지역 → 여행(날짜) 폴더 구조**: 사이드바에서 지역(예: 도쿄)을 고르고, 그 안에서 여행(날짜, 예: 26.06.30)을 선택하거나 새로 만듭니다.
- **빠른 장소 추가**: 여행을 선택한 상태에서 지도를 클릭하면 이름과 아이콘(카테고리)만 고르고 바로 저장할 수 있어요. 카테고리/메모/방문 여부 등 자세한 내용은 마커를 클릭해서 나중에 수정하면 됩니다. 여행을 먼저 선택하지 않으면 지도를 클릭해도 안내 문구만 뜹니다.
- **다른 여행은 흐리게 표시**: 특정 여행을 선택하면, 같은 지역의 다른 날짜 여행 중 지금 보는 여행과 겹치는 카테고리를 가진 장소만 옅게 참고용으로 보이고(겹치지 않는 카테고리는 숨겨짐), 이번 여행 장소는 진하게 표시됩니다.
- **카테고리 필터**: 카테고리 칩을 켜고 끄면 지도와 목록에서 해당 카테고리만 보이도록 필터링됩니다. 여행(날짜)과 조합하면 "이번 여행의 음식점만 보기" 같은 것도 가능해요.
- **완전히 직접 만드는 카테고리**: 기본 제공되는 카테고리는 없어요. 사이드바의 "+ 카테고리 추가"로 원하는 만큼 만들고, 이름/색/아이콘을 자유롭게 바꿀 수 있습니다. 아이콘은 직접 그린 도형이나 Google Material Symbols 아이콘 중에서 검색해서 고를 수 있어요.
- **마커 커스터마이징**: 카테고리별로 마커 색상과 모양(핀/별/하트/깃발/원 등)을 일괄 지정할 수 있습니다.
- **기기 간 동기화 (선택)**: Supabase를 연결하면 컴퓨터/모바일 등 여러 기기에서 같은 데이터를 볼 수 있습니다. 연결하지 않으면 기존처럼 브라우저의 `localStorage`에만 저장됩니다.
- **로컬 AI로 장소 정리 (선택)**: 저장된 장소 팝업의 "🤖 AI 정리" 버튼을 누르면 이 컴퓨터에서 돌아가는 Ollama에게 물어서 카테고리 자동 분류, 한 줄 설명, 영업시간을 채워줍니다. (아래 "로컬 AI로 장소 정리하기" 참고)
- **앱처럼 설치 (PWA)**: 배포된 주소를 모바일 브라우저로 열고 "홈 화면에 추가"를 하면 아이콘이 생기고, 브라우저 주소창 없이 전체화면 앱처럼 실행됩니다. (아래 "홈 화면에 추가하기" 참고)

## Google Maps API 키 설정

1. [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)에서 프로젝트를 만들고 **Maps JavaScript API**, **Places API**, **Directions API**를 활성화합니다. (Directions API는 저장한 두 장소 간 경로 찾기 기능에 필요합니다. 활성화하지 않으면 경로 화면에서 모든 이동수단이 "정보 없음"으로 표시됩니다.)
2. API 키를 발급받습니다.
3. 프로젝트 루트에 `.env` 파일을 만들고 (`.env.example` 참고):

   ```bash
   cp .env.example .env
   ```

4. `.env`에 키를 입력합니다.

   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

   `VITE_GOOGLE_MAPS_MAP_ID`는 선택 사항이며, 비워두면 Google이 제공하는 테스트용 `DEMO_MAP_ID`를 사용합니다. 마커 스타일을 커스터마이징하려면 Cloud Console에서 Map ID를 만들어 넣어주세요.

API 키가 설정되지 않으면 앱 실행 시 안내 화면이 표시됩니다.

## Supabase로 기기 간 동기화 설정 (선택)

이 앱은 기본적으로 브라우저의 `localStorage`에만 데이터를 저장합니다. 여러 기기(예: 회사 컴퓨터의 Codespaces + 휴대폰)에서 같은 데이터를 보고 싶다면 Supabase를 연결하세요. 개인용으로 혼자 쓰는 걸 전제로 한 가장 간단한 설정입니다.

1. [supabase.com](https://supabase.com)에서 무료 계정으로 새 프로젝트를 만듭니다.
2. 프로젝트의 **SQL Editor**에서 아래 스크립트를 실행해 테이블을 만듭니다.

   ```sql
   create table app_state (
     id text primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );

   alter table app_state enable row level security;

   -- 개인용 앱이라 익명(anon) 키로 전체 읽기/쓰기를 허용합니다.
   create policy "allow anon read" on app_state
     for select using (true);
   create policy "allow anon write" on app_state
     for insert with check (true);
   create policy "allow anon update" on app_state
     for update using (true);
   ```

3. **Project Settings > API**에서 `Project URL`과 `anon public` 키를 복사합니다.
4. `.env`에 아래 두 값을 추가합니다.

   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

5. 앱을 다시 시작하면 자동으로 연결됩니다. 데이터를 바꿀 때마다 자동으로 Supabase에 저장되고, 다른 기기에서 앱을 열면 저장된 최신 데이터를 불러옵니다.

두 값을 비워두면 이 기능은 완전히 비활성화되고 기존처럼 `localStorage`만 사용합니다.

## 로컬 AI로 장소 정리하기 (선택)

저장된 장소 팝업의 **"🤖 AI 정리"** 버튼을 누르면, 이 브라우저를 실행 중인 컴퓨터의 [Ollama](https://ollama.com)로 요청을 보내서 카테고리 자동 분류(내가 만든 카테고리 중에서 고름), 한 줄 설명, 영업시간을 채워줍니다. 서버 없이 브라우저가 `localhost:11434`로 직접 요청합니다.

1. 이 브라우저가 실행되는 바로 그 컴퓨터에 [Ollama](https://ollama.com)를 설치하고 원하는 모델을 받습니다 (예: `ollama pull qwen3.5-hermes`).
2. Ollama는 기본적으로 브라우저(다른 origin)에서의 요청을 막아두기 때문에, **CORS를 열어서 실행**해야 합니다.

   ```bash
   OLLAMA_ORIGINS=* ollama serve
   ```

   (보안을 더 신경 쓰고 싶다면 `*` 대신 실제 쓰는 주소만 콤마로 나열해도 됩니다. 예: `OLLAMA_ORIGINS=https://your-codespace-url.app.github.dev`)

3. 필요하면 `.env`에 아래 값을 추가합니다. 비워두면 `http://localhost:11434`와 `qwen3.5-hermes` 모델을 기본으로 사용합니다.

   ```
   VITE_OLLAMA_URL=http://localhost:11434
   VITE_OLLAMA_MODEL=qwen3.5-hermes
   ```

주의: Codespaces처럼 브라우저와 앱이 서로 다른 컴퓨터에서 돌아가는 구조라면, `localhost`는 항상 **브라우저가 실행 중인 기기**를 가리킵니다. 즉 Ollama도 그 브라우저와 같은 컴퓨터에서 돌고 있어야 연결됩니다.

## 홈 화면에 추가하기 (PWA)

이 앱은 PWA(Progressive Web App)라 브라우저 주소창 없이 아이콘을 눌러 여는 앱처럼 설치할 수 있습니다.

- **iPhone (Safari)**: 배포된 주소로 접속 → 공유 버튼 → "홈 화면에 추가"
- **Android (Chrome)**: 배포된 주소로 접속 → 메뉴(⋮) → "앱 설치" 또는 "홈 화면에 추가"

GitHub Codespaces에서 포트를 공개(Public)로 포워딩한 주소나, 실제로 배포한 주소(예: Vercel, GitHub Pages)처럼 `https://`로 시작하는 주소여야 설치됩니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

## 빌드

```bash
npm run build
```

## 기술 스택

- React 19 + TypeScript + Vite
- [@vis.gl/react-google-maps](https://visgl.github.io/react-google-maps/) (Google Maps JavaScript API + Places API)
- [Zustand](https://github.com/pmndrs/zustand)로 상태 관리, `localStorage`로 영속화
- [Supabase](https://supabase.com) (선택) — 기기 간 동기화용 백엔드
