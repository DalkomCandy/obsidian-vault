// Talks to a local Ollama instance running on the same machine as the
// browser (localhost is exempt from mixed-content blocking even when this
// page is served over https, so this works from a Codespaces-hosted tab as
// long as Ollama is running on that same computer). Ollama blocks
// cross-origin requests by default, so it must be started with an
// OLLAMA_ORIGINS env var that allows this page's origin -- see README.

export const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'
export const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'qwen3.5-hermes'

export interface PlaceSummary {
  category?: string
  description?: string
  hours?: string
}

export interface OllamaDiagnosis {
  ok: boolean
  message: string
}

/**
 * Walks the same path a real request takes, stopping at the first thing that
 * breaks, so "AI가 안 돼요" turns into a specific cause: server unreachable
 * (or CORS-blocked), model name wrong, or generation itself failing.
 */
export async function diagnoseOllama(): Promise<OllamaDiagnosis> {
  let tagsRes: Response
  try {
    tagsRes = await fetch(`${OLLAMA_URL}/api/tags`)
  } catch {
    return {
      ok: false,
      message: `${OLLAMA_URL} 에 연결할 수 없어요. Ollama가 실행 중인지, 그리고 OLLAMA_ORIGINS 환경변수를 설정한 뒤 Ollama를 완전히 종료했다가 다시 켰는지 확인해주세요.`,
    }
  }
  if (!tagsRes.ok) {
    return { ok: false, message: `Ollama가 ${tagsRes.status} 응답을 보냈어요. 서버 상태를 확인해주세요.` }
  }

  let installed: string[] = []
  try {
    const data = await tagsRes.json()
    installed = Array.isArray(data?.models)
      ? data.models.map((m: { name?: string }) => m?.name).filter((n: unknown): n is string => typeof n === 'string')
      : []
  } catch {
    return { ok: false, message: 'Ollama 응답을 읽지 못했어요.' }
  }

  // Ollama reports tags as "name:tag"; a bare configured name should still match.
  const hasModel = installed.some((n) => n === OLLAMA_MODEL || n.split(':')[0] === OLLAMA_MODEL.split(':')[0])
  if (!hasModel) {
    return {
      ok: false,
      message: `연결은 됐지만 "${OLLAMA_MODEL}" 모델이 없어요. 설치된 모델: ${installed.join(', ') || '(없음)'} — .env의 VITE_OLLAMA_MODEL을 이 중 하나로 바꿔주세요.`,
    }
  }

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: 'ping', stream: false }),
    })
    if (!res.ok) {
      return { ok: false, message: `모델 실행 요청이 실패했어요 (${res.status}).` }
    }
  } catch {
    return {
      ok: false,
      message:
        '모델 목록은 읽었는데 생성 요청이 막혔어요. OLLAMA_ORIGINS가 이 페이지 주소를 허용하는지 확인해주세요 (POST 요청만 CORS 사전확인을 거칩니다).',
    }
  }

  return { ok: true, message: `정상이에요. "${OLLAMA_MODEL}" 모델로 연결됐어요.` }
}

function buildPrompt(name: string, address: string | undefined, categoryLabels: string[]): string {
  const categoryLine =
    categoryLabels.length > 0
      ? `가능한 카테고리 목록: ${categoryLabels.join(', ')}\n"category" 값은 반드시 이 목록 중 하나이거나, 맞는 게 없으면 빈 문자열이어야 합니다.`
      : `"category" 값은 항상 빈 문자열로 응답하세요.`

  return `다음 장소에 대한 정보를 JSON으로만 응답하세요. 설명 없이 JSON 객체만 출력하세요.

장소 이름: ${name}
${address ? `주소: ${address}` : ''}

${categoryLine}

응답 형식 (모든 값은 한국어, 모르는 값은 빈 문자열 ""):
{"category": "", "description": "이 장소에 대한 한 줄 설명, 20자 이내", "hours": "일반적인 영업시간, 모르면 빈 문자열"}`
}

/** Throws with a Korean message describing what went wrong -- callers show it directly to the user. */
export async function summarizePlace(
  name: string,
  address: string | undefined,
  categoryLabels: string[],
): Promise<PlaceSummary> {
  let res: Response
  try {
    res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildPrompt(name, address, categoryLabels),
        stream: false,
        format: 'json',
      }),
    })
  } catch {
    throw new Error(
      `로컬 AI(${OLLAMA_URL})에 연결할 수 없어요. Ollama가 실행 중인지, OLLAMA_ORIGINS 설정을 했는지 확인해주세요.`,
    )
  }

  if (!res.ok) {
    throw new Error(`로컬 AI 요청이 실패했어요 (${res.status}). 모델 이름(${OLLAMA_MODEL})이 맞는지 확인해주세요.`)
  }

  const data = await res.json()
  const raw = typeof data?.response === 'string' ? data.response : ''
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('로컬 AI 응답을 이해하지 못했어요. 다시 시도해주세요.')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('로컬 AI 응답을 이해하지 못했어요. 다시 시도해주세요.')
  }

  const obj = parsed as Record<string, unknown>
  return {
    category: typeof obj.category === 'string' ? obj.category.trim() : undefined,
    description: typeof obj.description === 'string' ? obj.description.trim() : undefined,
    hours: typeof obj.hours === 'string' ? obj.hours.trim() : undefined,
  }
}

/** Finds the category id whose label matches the AI's guess exactly (case-insensitive). */
export function matchCategoryId(labelGuess: string | undefined, categoryLabels: Record<string, string>): string | undefined {
  const target = labelGuess?.trim().toLowerCase()
  if (!target) return undefined
  for (const [id, label] of Object.entries(categoryLabels)) {
    if (label.toLowerCase() === target) return id
  }
  return undefined
}

const AI_SUMMARY_MARKER = '--- AI 요약 ---'

/** Replaces any previous AI-summary block in the memo with a fresh one, or appends if there wasn't one. */
export function applySummaryToMemo(currentMemo: string, summary: PlaceSummary): string {
  const lines: string[] = []
  if (summary.description) lines.push(`설명: ${summary.description}`)
  if (summary.hours) lines.push(`영업시간: ${summary.hours}`)
  if (lines.length === 0) return currentMemo

  const block = `${AI_SUMMARY_MARKER}\n${lines.join('\n')}`
  const markerIndex = currentMemo.indexOf(AI_SUMMARY_MARKER)
  const base = (markerIndex >= 0 ? currentMemo.slice(0, markerIndex) : currentMemo).trimEnd()
  return base ? `${base}\n\n${block}` : block
}
