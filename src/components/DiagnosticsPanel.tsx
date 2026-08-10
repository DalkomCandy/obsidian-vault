import { useCallback, useEffect, useState } from 'react'
import { APILoadingStatus, useApiLoadingStatus } from '@vis.gl/react-google-maps'
import { usePlaceStore } from '../store/usePlaceStore'
import { getSyncStatus, subscribeSyncStatus } from '../store/sync'
import { getPlaceLookupStatus, subscribePlaceLookupStatus } from '../lib/placeLookupStatus'
import { isSupabaseConfigured, supabaseInitError } from '../lib/supabase'
import { OLLAMA_MODEL, OLLAMA_URL, diagnoseOllama } from '../lib/ollama'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

type Level = 'ok' | 'warn' | 'fail' | 'info'

interface Row {
  label: string
  value: string
  level: Level
  /** What to actually do about it, shown only when something is wrong. */
  hint?: string
}

function ago(at: number | null): string {
  if (!at) return '아직 없음'
  const seconds = Math.round((Date.now() - at) / 1000)
  if (seconds < 60) return `${seconds}초 전`
  if (seconds < 3600) return `${Math.round(seconds / 60)}분 전`
  return `${Math.round(seconds / 3600)}시간 전`
}

/** Below 1KB, rounding to whole kilobytes reads as "nothing is saved". */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  return `${Math.round(bytes / 1024)}KB`
}

function mapsRow(status: APILoadingStatus, stalled: boolean): Row {
  switch (status) {
    case APILoadingStatus.LOADED:
      return { label: '지도 API', value: '정상', level: 'ok' }
    case APILoadingStatus.LOADING:
      // A load that never resolves looks identical to one still in progress,
      // so after a while say so instead of spinning forever.
      return stalled
        ? {
            label: '지도 API',
            value: '응답 없음',
            level: 'fail',
            hint: '10초 넘게 응답이 없어요. 네트워크 차단(방화벽·광고 차단기)이나 오프라인 상태일 수 있어요.',
          }
        : { label: '지도 API', value: '불러오는 중…', level: 'info' }
    case APILoadingStatus.AUTH_FAILURE:
      return {
        label: '지도 API',
        value: '키가 거부됨',
        level: 'fail',
        hint: '키 자체가 틀렸거나, 이 주소가 키의 HTTP 리퍼러 제한에 없거나, 결제가 비활성 상태예요. Cloud Console에서 이 세 가지를 확인해주세요.',
      }
    case APILoadingStatus.FAILED:
      return {
        label: '지도 API',
        value: '불러오지 못함',
        level: 'fail',
        hint: '네트워크 문제일 가능성이 높아요. 오프라인이 아닌지 확인해주세요.',
      }
    default:
      return { label: '지도 API', value: '시작 전', level: 'info' }
  }
}

export function DiagnosticsPanel() {
  const apiStatus = useApiLoadingStatus()
  const online = useOnlineStatus()
  const { session, phase } = useSupabaseAuth()
  const trips = usePlaceStore((s) => s.trips)
  const places = usePlaceStore((s) => s.places)
  const routes = usePlaceStore((s) => s.routes)
  const categoryOrder = usePlaceStore((s) => s.categoryOrder)

  const [, forceUpdate] = useState(0)
  useEffect(() => subscribeSyncStatus(() => forceUpdate((n) => n + 1)), [])
  useEffect(() => subscribePlaceLookupStatus(() => forceUpdate((n) => n + 1)), [])

  const [mapsStalled, setMapsStalled] = useState(false)
  useEffect(() => {
    if (apiStatus !== APILoadingStatus.LOADING) {
      setMapsStalled(false)
      return
    }
    const timer = window.setTimeout(() => setMapsStalled(true), 10000)
    return () => window.clearTimeout(timer)
  }, [apiStatus])

  const [permission, setPermission] = useState<string>('확인 중')
  useEffect(() => {
    if (!navigator.permissions?.query) {
      setPermission('확인 불가')
      return
    }
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((p) => setPermission(p.state))
      .catch(() => setPermission('확인 불가'))
  }, [])

  const [aiRow, setAiRow] = useState<Row | null>(null)
  const [checkingAi, setCheckingAi] = useState(false)
  const checkAi = useCallback(async () => {
    setCheckingAi(true)
    const result = await diagnoseOllama()
    setAiRow({
      label: '로컬 AI',
      value: result.ok ? '정상' : '연결 안 됨',
      level: result.ok ? 'ok' : 'warn',
      hint: result.ok ? undefined : result.message,
    })
    setCheckingAi(false)
  }, [])

  const sync = getSyncStatus()
  const placeLookup = getPlaceLookupStatus()
  const storageBytes = (() => {
    try {
      let total = 0
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('travel-map.')) total += (localStorage.getItem(key) ?? '').length
      }
      return total
    } catch {
      return 0
    }
  })()

  const installed = window.matchMedia('(display-mode: standalone)').matches

  const syncRow = ((): Row => {
    if (!isSupabaseConfigured) {
      return {
        label: '동기화',
        value: supabaseInitError ? '설정 오류' : '사용 안 함',
        level: supabaseInitError ? 'fail' : 'info',
        hint: supabaseInitError ?? '이 기기에만 저장돼요. 여러 기기에서 쓰려면 로그인하세요.',
      }
    }
    if (phase !== 'signed-in' || !session) {
      return { label: '동기화', value: '로그아웃 상태', level: 'warn', hint: '이 기기에만 저장되고 있어요.' }
    }
    if (sync.state === 'error') {
      return { label: '동기화', value: `실패 (${ago(sync.at)})`, level: 'fail', hint: sync.message ?? undefined }
    }
    if (sync.state === 'ok') return { label: '동기화', value: `정상 · ${ago(sync.at)}`, level: 'ok' }
    return { label: '동기화', value: '로그인됨 · 대기 중', level: 'info' }
  })()

  const rows: Row[] = [
    { label: '빌드', value: `${__BUILD_COMMIT__} · ${new Date(__BUILD_TIME__).toLocaleString('ko-KR')}`, level: 'info' },
    {
      label: '실행 모드',
      value: `${installed ? '설치된 앱' : '브라우저'} · ${online ? '온라인' : '오프라인'}`,
      level: online ? 'info' : 'warn',
    },
    mapsRow(apiStatus, mapsStalled),
    ...(placeLookup.state === 'idle'
      ? []
      : [
          placeLookup.state === 'ok'
            ? { label: '장소 정보 조회', value: `정상 · ${ago(placeLookup.at)}`, level: 'ok' as const }
            : {
                label: '장소 정보 조회',
                value: `실패 · ${ago(placeLookup.at)}`,
                level: 'fail' as const,
                hint: placeLookup.message ?? undefined,
              },
        ]),
    {
      label: '위치 권한',
      value: permission === 'granted' ? '허용' : permission === 'denied' ? '거부됨' : permission === 'prompt' ? '아직 안 물어봄' : permission,
      level: permission === 'denied' ? 'warn' : 'info',
      hint: permission === 'denied' ? '주소창의 자물쇠 아이콘에서 위치를 허용해주세요.' : undefined,
    },
    syncRow,
    ...(aiRow ? [aiRow] : []),
    {
      label: '저장 데이터',
      value: `여행 ${trips.length} · 장소 ${places.length} · 경로 ${routes.length} · 카테고리 ${categoryOrder.length} · ${formatBytes(storageBytes)}`,
      level: 'info',
    },
  ]

  const copyReport = () => {
    const text = [
      '[여행 지도 진단]',
      ...rows.map((r) => `- ${r.label}: ${r.value}${r.hint ? ` (${r.hint})` : ''}`),
      `- 계정: ${session?.user.email ?? '로그아웃'}`,
      `- AI 설정: ${OLLAMA_URL} / ${OLLAMA_MODEL}`,
      `- 화면: ${window.innerWidth}x${window.innerHeight}`,
      `- UA: ${navigator.userAgent}`,
    ].join('\n')
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <div className="diagnostics">
      <div className="icon-size-header">
        <span>진단</span>
        <div className="diagnostics-actions">
          <button type="button" className="ai-status-btn" disabled={checkingAi} onClick={() => void checkAi()}>
            {checkingAi ? '확인 중…' : 'AI 확인'}
          </button>
          <button type="button" className="ai-status-btn" onClick={copyReport}>
            복사
          </button>
        </div>
      </div>

      <ul className="diagnostics-list">
        {rows.map((row) => (
          <li key={row.label} className="diagnostics-row">
            <span className={`diagnostics-dot ${row.level}`} />
            <span className="diagnostics-label">{row.label}</span>
            <span className="diagnostics-value">{row.value}</span>
            {row.hint && row.level !== 'ok' && row.level !== 'info' && (
              <span className="diagnostics-hint">{row.hint}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
