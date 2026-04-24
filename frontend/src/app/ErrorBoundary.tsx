import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  override componentDidCatch(error: unknown) {
    console.error("AETHERIS render failure", error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="aetheris-root error-fallback">
          <section className="error-card">
            <p className="eyebrow">Recovery</p>
            <h1>The ritual lost cohesion.</h1>
            <p>Reload the environment to restore the renderer boundary and local signal flow.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
