# 여행 지도 (Travel Map)

구글 지도(Google Maps) 기반으로 여행 계획과 위치를 관리할 수 있는 웹 앱입니다.

## 기능

- **구글 지도 기반**: Google Maps를 베이스로 사용합니다.
- **장소 검색**: 지도 위 검색창에서 장소를 검색하면 해당 위치로 이동하고, 바로 여행지로 등록할 수 있습니다.
- **지도에서 여행지 추가**: 지도를 클릭하면 이름, 지역, 카테고리, 메모를 입력해 여행지를 등록할 수 있습니다.
- **지역별 관리**: 사이드바의 지역 드롭다운에서 지역(예: 도쿄)을 선택하면 해당 지역의 여행 기록만 필터링되어 표시되고, 지도도 그 지역으로 이동합니다.
- **방문 기억 & 흐리게 표시**: 이미 다녀온 곳을 "방문 완료"로 표시하면, 같은 지역을 다시 볼 때 해당 장소의 마커와 목록이 옅은 색으로 표시되어 이전에 갔던 곳임을 바로 알 수 있습니다. 이 기능은 설정 패널의 토글로 켜고 끌 수 있습니다.
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
