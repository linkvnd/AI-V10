import { useAuth } from '../context/AuthContext';
import { Bot, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { login, error, loading, theme } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className={`backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-white/20'
        }`}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
            <Bot className="w-10 h-10" />
          </div>
          <h1 className={`text-4xl font-black mb-2 tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>SmartAI</h1>
          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-center font-medium`}>Trợ lý AI thông minh của bạn</p>
        </div>

        <div className="space-y-6">
          <button 
            onClick={() => login('google')} 
            disabled={loading} 
            className={`w-full flex items-center justify-center gap-3 font-bold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 ${
              theme === 'dark' 
                ? 'bg-slate-100 text-slate-900 hover:bg-white' 
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
            Tiếp tục với Google
          </button>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <div className={`p-5 rounded-2xl border-2 border-dashed transition-colors ${theme === 'dark' ? 'border-slate-800 bg-slate-800/30' : 'border-slate-100 bg-slate-50/50'}`}>
            <p className={`text-xs text-center leading-relaxed ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              <span className="font-bold text-indigo-500 uppercase block mb-1">Chính sách bảo mật</span>
              Mỗi thiết bị chỉ được sử dụng một tài khoản duy nhất. Nếu cần khôi phục tài khoản, vui lòng liên hệ Zalo: <span className="font-bold text-slate-500">0347649098</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
