"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/ui/states";

function CrashScreen() {
  const t = useTranslations("States");
  return (
    <main className="apex-bg flex min-h-screen items-center px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <ErrorState
          title={t("crashTitle")}
          description={t("crashDescription")}
          actionLabel={t("reload")}
          onAction={() => window.location.reload()}
        />
      </div>
    </main>
  );
}

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
        this.props.fallback ?? <CrashScreen />
      );
    }
    return this.props.children;
  }
}
