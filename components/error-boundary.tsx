"use client";

import {
  Component,
  type ReactNode,
  type ComponentType,
  type ErrorInfo,
} from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<{ error: Error }>;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          We apologize for the inconvenience. Please try refreshing the page.
        </p>
        <details className="text-sm text-gray-500">
          <summary className="cursor-pointer">Error details</summary>
          <pre className="mt-2 text-left bg-gray-100 p-2 rounded overflow-auto">
            {error.message}
          </pre>
        </details>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
