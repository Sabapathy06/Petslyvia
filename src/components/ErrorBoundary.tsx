import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Petslyvia Caught Unhandled UI Exception:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/app';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] flex items-center justify-center p-6 w-full">
          <div className="bg-white rounded-3xl border border-[#e2ece5] p-8 max-w-lg w-full text-center shadow-card space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle size={28} />
            </div>

            <div>
              <h2 className="text-xl font-black text-[#1b382b]">
                {this.props.fallbackTitle || 'Section Transition Recovered'}
              </h2>
              <p className="text-xs sm:text-sm text-[#5b7566] mt-1.5 font-medium leading-relaxed">
                A temporary rendering glitch was safely isolated to keep your pet adventure running smoothly.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-[#f4f8f5] p-3 rounded-2xl border border-[#d8e5dc] text-[11px] font-mono text-[#2d6a4f] text-left truncate">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-[#2d6a4f] text-white font-bold text-xs flex items-center gap-2 hover:bg-[#23533e] transition-all cursor-pointer shadow-soft active:scale-95"
              >
                <RotateCcw size={14} /> Try Reloading Section
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2.5 rounded-xl bg-[#eaf2ec] text-[#1b382b] font-bold text-xs flex items-center gap-2 hover:bg-[#d8e5dc] transition-all cursor-pointer active:scale-95"
              >
                <Home size={14} /> World Map
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
