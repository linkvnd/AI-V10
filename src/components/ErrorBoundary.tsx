import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle className="w-8 h-8 text-rose-600" /></div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Rất tiếc!</h2>
            <p className="text-slate-600 mb-8">Đã có lỗi xảy ra. Vui lòng thử lại.</p>
            <button onClick={this.handleReset} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg"><RefreshCcw className="w-5 h-5" />Tải lại trang</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
