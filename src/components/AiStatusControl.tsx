import { useState } from 'react'
import { OLLAMA_MODEL, OLLAMA_URL, diagnoseOllama, type OllamaDiagnosis } from '../lib/ollama'

export function AiStatusControl() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<OllamaDiagnosis | null>(null)

  const handleCheck = async () => {
    setChecking(true)
    setResult(null)
    setResult(await diagnoseOllama())
    setChecking(false)
  }

  return (
    <div className="ai-status">
      <div className="icon-size-header">
        <span>로컬 AI</span>
        <button type="button" className="ai-status-btn" onClick={handleCheck} disabled={checking}>
          {checking ? '확인 중…' : '연결 확인'}
        </button>
      </div>
      <div className="ai-status-target">
        {OLLAMA_URL} · {OLLAMA_MODEL}
      </div>
      {result && <div className={result.ok ? 'ai-status-msg ok' : 'ai-status-msg fail'}>{result.message}</div>}
    </div>
  )
}
