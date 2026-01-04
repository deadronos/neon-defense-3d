import React, { Component, type ReactNode } from 'react';

/**
 * Specialized error boundary for the 3D Canvas/WebGL context.
 * Displays a fallback if the 3D renderer crashes.
 */
interface CanvasErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  CanvasErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): CanvasErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[CANVAS] 3D Renderer Error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#03030b]">
          <div className="text-center p-8 max-w-lg">
            <div className="text-5xl mb-4">🎮</div>
            <h1 className="text-xl font-bold text-[#e94560] mb-3">3D Renderer Error</h1>
            <p className="text-gray-400 mb-4 text-sm">
              The WebGL canvas encountered an error. This may be due to graphics driver issues or
              unsupported hardware.
            </p>
            <div className="bg-black/50 p-3 rounded mb-4 text-left overflow-auto max-h-24 text-xs font-mono text-gray-400">
              {this.state.errorMessage || 'Unknown WebGL error'}
            </div>
            <button
              onClick={this.handleRetry}
              className="bg-[#00f2ff] hover:bg-[#4dffff] text-black font-bold py-2 px-6 rounded transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CanvasErrorBoundary;
