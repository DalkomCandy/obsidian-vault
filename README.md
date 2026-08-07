# 여행 지도 (Travel Map)

구글 내 지도(Google My Maps)와 비슷하게 여행 계획과 위치를 관리할 수 있는 웹 앱입니다.

## 기능

- **지도에서 여행지 추가**: 지도를 클릭하면 이름, 지역, 카테고리, 메모를 입력해 여행지를 등록할 수 있습니다.
- **지역별 관리**: 왼쪽 사이드바에서 지역별로 여행지가 그룹화되어 표시되고, 지역 칩을 눌러 특정 지역만 필터링할 수 있습니다.
- **방문 기억 & 흐리게 표시**: 이미 다녀온 곳을 "방문 완료"로 표시하면, 같은 지역을 다시 볼 때 해당 장소의 마커와 목록이 옅은 색으로 표시되어 이전에 갔던 곳임을 바로 알 수 있습니다. 이 기능은 설정 패널의 토글로 켜고 끌 수 있습니다.
- 모든 데이터는 브라우저의 `localStorage`에 저장됩니다 (별도 서버/DB 불필요).

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
- [React Leaflet](https://react-leaflet.js.org/) + OpenStreetMap 타일 (API 키 불필요)
- [Zustand](https://github.com/pmndrs/zustand)로 상태 관리, `localStorage`로 영속화
