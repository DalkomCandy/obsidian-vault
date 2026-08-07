import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app crash]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="api-key-notice">
        <h2>화면을 표시하는 중 오류가 발생했어요</h2>
        <p>아래 오류 내용을 캡처해서 알려주시면 원인을 확인할 수 있어요.</p>
        <pre>{error.message}</pre>
        <p>Supabase 연동 직후라면 .env의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 값을 다시 확인해보세요.</p>
      </div>
    )
  }
}
