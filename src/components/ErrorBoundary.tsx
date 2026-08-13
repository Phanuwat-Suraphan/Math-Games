import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/** กันไม่ให้เกมจอขาวเมื่อเกิดข้อผิดพลาดที่ไม่ได้คาดไว้ */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('เกิดข้อผิดพลาดในเกม:', error, info.componentStack)
  }

  private handleReload = (): void => {
    this.setState({ hasError: false })
    window.location.hash = '#/'
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="surface-card w-full max-w-md p-8 text-center">
          <p aria-hidden="true" className="text-6xl">
            🛠️
          </p>
          <h1 className="mt-4 text-2xl font-bold text-white">
            เกมสะดุดนิดหน่อย
          </h1>
          <p className="mt-2 text-slate-300">
            ไม่ต้องกังวลนะ ข้อมูลของหนูยังถูกบันทึกไว้ ลองกดปุ่มด้านล่างเพื่อเริ่มใหม่
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 min-h-[56px] w-full rounded-2xl border-b-4 border-arcane-600 bg-gradient-to-b from-arcane-400 to-arcane-600 px-6 text-lg font-semibold text-white"
          >
            กลับไปหน้าแรก
          </button>
        </div>
      </div>
    )
  }
}
