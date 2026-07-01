import { Component, ErrorInfo, ReactNode } from 'react';
import ptBR from '@/shared/i18n/pt-BR';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <p className="text-5xl">⚠️</p>
          <h1 className="text-2xl font-bold text-text">{ptBR.common.error}</h1>
          <p className="max-w-md text-text-muted">
            Algo inesperado aconteceu. Recarregue a página ou volte ao início.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Recarregar página
            </button>
            <a href="/" className="btn-outline">
              {ptBR.common.backToHome}
            </a>
          </div>
          {import.meta.env.DEV && (
            <details className="mt-4 max-w-2xl text-left">
              <summary className="cursor-pointer text-sm text-text-muted">Detalhes do erro</summary>
              <pre className="mt-2 overflow-auto rounded bg-surface p-4 text-xs text-red-600">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
