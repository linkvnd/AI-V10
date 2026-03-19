import { useState } from 'react';
import { motion } from 'motion/react';
import { Crown, Zap, Shield, Check, Star, Sparkles, Diamond, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PremiumModal from './PremiumModal';

const PACKAGES = [
  {
    level: 1,
    name: 'AI Nâng Cao',
    price: '50.000đ',
    period: '/tháng',
    description: 'Mở khóa toàn bộ sức mạnh trí tuệ nhân tạo.',
    icon: <Crown className="w-8 h-8 text-amber-400" />,
    color: 'from-amber-400 to-orange-500',
    features: [
      'Model: Gemini Pro Advanced',
      'Tư duy logic chuyên sâu',
      'Code & Debug phức tạp',
      'Phân tích hình ảnh & Tệp tin',
      'Lưu lịch sử vĩnh viễn',
      'Ưu tiên xử lý cao nhất'
    ],
    buttonText: 'Nâng cấp ngay',
    popular: true
  }
];

export default function UpgradeTab({ onBack }: { onBack?: () => void }) {
  const { user, theme } = useAuth();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUpgradeClick = (level: number) => {
    setSelectedLevel(level);
    setIsModalOpen(true);
  };

  const getLevelName = (level: number) => {
    return 'AI Nâng Cao';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all bg-slate-800 text-slate-300 hover:bg-slate-700"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Quay lại
        </button>
      )}
      <header className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider bg-indigo-900/30 text-indigo-400"
        >
          <Sparkles className="w-4 h-4" /> Nâng tầm trí tuệ
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-100">
          Chọn gói <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Premium</span> của bạn
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-400">
          Mở khóa sức mạnh AI với mô hình ngôn ngữ tiên tiến nhất, được tinh chỉnh cho mọi nhu cầu của bạn.
        </p>
      </header>

      {user?.isPro && (
        <div className="p-6 rounded-3xl flex items-center justify-between max-w-3xl mx-auto border bg-emerald-900/20 border-emerald-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-900/30">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-lg text-emerald-100">Bạn đang sử dụng gói {getLevelName(user.premiumLevel)}</div>
              <p className="text-emerald-400/70 text-sm">Tận hưởng các đặc quyền dành riêng cho bạn.</p>
            </div>
          </div>
          <Star className="w-8 h-8 fill-current animate-pulse text-emerald-500/50" />
        </div>
      )}

      <div className="flex justify-center">
        {PACKAGES.map((pkg) => (
          <motion.div
            key={pkg.level}
            whileHover={{ y: -10 }}
            className="relative rounded-[2.5rem] p-8 shadow-xl border-2 transition-all flex flex-col bg-slate-900 border-indigo-500 max-w-md w-full"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
              Phổ biến nhất
            </div>

            <div className="mb-8">
              <div className={`w-16 h-16 bg-gradient-to-br ${pkg.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                {pkg.icon}
              </div>
              <h3 className="text-2xl font-black mb-2 text-slate-100">{pkg.name}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{pkg.description}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-100">{pkg.price}</span>
                <span className="text-slate-400 font-medium">{pkg.period}</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {pkg.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-slate-300">
                  <div className="p-1 rounded-full bg-indigo-100 text-indigo-600">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleUpgradeClick(pkg.level)}
              disabled={user?.premiumLevel === pkg.level}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                user?.premiumLevel === pkg.level
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              {user?.premiumLevel === pkg.level ? 'Đang sử dụng' : pkg.buttonText}
              {user?.premiumLevel !== pkg.level && <ArrowRight className="w-4 h-4" />}
            </button>
          </motion.div>
        ))}
      </div>

      <footer className="text-center text-sm max-w-xl mx-auto text-slate-500">
        <p>Giá trên đã bao gồm thuế. Bạn có thể hủy gói dịch vụ bất cứ lúc nào. Liên hệ hỗ trợ nếu bạn gặp vấn đề về thanh toán.</p>
      </footer>

      {selectedLevel && (
        <PremiumModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          level={selectedLevel}
          levelName={getLevelName(selectedLevel)}
          price={PACKAGES.find(p => p.level === selectedLevel)?.price || ''}
        />
      )}
    </div>
  );
}
