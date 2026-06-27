"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
            <div className="max-w-md text-center">
              <h2 className="mb-2 text-xl font-semibold text-red-400">
                Algo salió mal
              </h2>
              <p className="mb-4 text-zinc-400">
                Ocurrió un error inesperado. Por favor, recarga la página.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-[#a6ff00] px-4 py-2 text-black font-black"
              >
                Recargar
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
