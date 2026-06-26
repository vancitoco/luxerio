import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Luxerio] Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
          <span className="inline-block bg-acid px-3 py-1 font-display text-[10px] font-black uppercase tracking-widest text-black">
            Error
          </span>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight text-primary">
            Something went wrong.
          </h2>
          <p className="font-display text-xs uppercase tracking-wider text-secondary">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="border border-hairline px-8 py-3 font-display text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:border-acid hover:text-acid"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
