import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-4 text-center dark:bg-stone-950">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
            Something went wrong.
          </h1>
          <p className="max-w-md text-stone-600 dark:text-stone-400">
            We hit an unexpected error. Try reloading the page — if the problem continues, please
            check back later.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-700"
          >
            Back to home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
