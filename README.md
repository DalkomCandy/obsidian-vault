# 여행 지도 (Travel Map)

구글 지도(Google Maps) 기반으로 여행 계획과 위치를 관리할 수 있는 웹 앱입니다.

## 기능

- **구글 지도 기반**: Google Maps를 베이스로 사용합니다.
- **장소 검색**: 지도 위 검색창에서 장소를 검색하면 해당 위치로 이동하고 핀이 찍힙니다. "여행지로 추가" 버튼을 눌러야 실제로 등록돼요.
- **전체 → 지역 → 여행(날짜) 폴더 구조**: 사이드바에서 지역(예: 도쿄)을 고르고, 그 안에서 여행(날짜, 예: 26.06.30)을 선택하거나 새로 만듭니다.
- **빠른 장소 추가**: 여행을 선택한 상태에서 지도를 클릭하면 이름과 아이콘(카테고리)만 고르고 바로 저장할 수 있어요. 카테고리/메모/방문 여부 등 자세한 내용은 마커를 클릭해서 나중에 수정하면 됩니다. 여행을 먼저 선택하지 않으면 지도를 클릭해도 안내 문구만 뜹니다.
- **다른 여행은 흐리게 표시**: 특정 여행을 선택하면, 같은 지역의 다른 날짜 여행 장소들은 옅게, 이번 여행 장소만 진하게 표시됩니다. 방문 완료로 표시한 장소를 흐리게 보여주는 기존 기능도 그대로 있고, 설정 패널에서 켜고 끌 수 있습니다.
- **카테고리 필터**: 카테고리 칩을 켜고 끄면 지도와 목록에서 해당 카테고리만 보이도록 필터링됩니다. 여행(날짜)과 조합하면 "이번 여행의 음식점만 보기" 같은 것도 가능해요.
- **마커 커스터마이징**: 여행지를 수정할 때 마커 색상과 모양(핀/별/하트/깃발/원)을 직접 고를 수 있습니다. 지정하지 않으면 카테고리 기본 색을 사용해요.
- 모든 데이터는 브라우저의 `localStorage`에 저장됩니다 (별도 서버/DB 불필요).

## Google Maps API 키 설정

1. [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)에서 프로젝트를 만들고 **Maps JavaScript API**, **Places API**를 활성화합니다.
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
