import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-paper px-4">
          <div className="rounded-lg border border-line bg-white p-8 text-center shadow-soft">
            <p className="text-sm font-black uppercase text-primary">Something broke</p>
            <h1 className="mt-2 text-3xl font-black">Reload the page and try again.</h1>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
