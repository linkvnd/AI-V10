import { useState, useEffect } from 'react';
import { X, Copy, Check, Loader2, QrCode, Info } from 'lucide-react';
import { useAuth, handleFirestoreError, OperationType } from '../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  level?: number;
  levelName?: string;
  price?: string;
}

export default function PremiumModal({ isOpen, onClose, level = 1, levelName = 'Silver', price = '20.000đ' }: PremiumModalProps) {
  const { user, requestPremium } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [paymentCode, setPaymentCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setPaymentCode(`PREMIUM L${level} ${user?.uid?.substring(0, 5)} ${random}`);

    const unsub = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setQrCodeUrl(docSnap.data().qrCodeUrl);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system/config');
    });

    return () => unsub();
  }, [isOpen, user, level]);

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await requestPremium(paymentCode, level);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting premium request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          {!submitted ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Nâng cấp {levelName}</h2>
                <p className="text-slate-500 mt-2">Chỉ với <span className="text-indigo-600 font-bold">{price} / tháng</span></p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-600 mb-3 text-sm font-medium">
                  <Info className="w-4 h-4" /> Hướng dẫn thanh toán
                </div>
                <ol className="text-xs text-slate-500 space-y-2 list-decimal pl-4">
                  <li>Quét mã QR bên dưới để chuyển khoản.</li>
                  <li>Nhập chính xác <strong>Nội dung chuyển khoản</strong>.</li>
                  <li>Nhấn "Tôi đã chuyển khoản" để gửi yêu cầu.</li>
                  <li>Admin sẽ kiểm tra và kích hoạt trong vòng 5-30 phút.</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div className="w-48 h-48 mx-auto bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden p-2 shadow-inner">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Payment QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center p-4">
                      <Loader2 className="w-8 h-8 text-slate-300 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Đang tải mã QR...</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nội dung chuyển khoản</label>
                  <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100 group">
                    <code className="flex-1 font-mono text-indigo-700 font-bold text-sm">{paymentCode}</code>
                    <button 
                      onClick={handleCopy}
                      className="p-2 text-indigo-600 hover:bg-white rounded-lg transition-all"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !qrCodeUrl}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tôi đã chuyển khoản"}
              </button>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Yêu cầu đã gửi!</h2>
              <p className="text-slate-500">
                Cảm ơn bạn! Admin đang kiểm tra giao dịch của bạn. 
                Vui lòng đợi trong giây lát, AI Premium sẽ được kích hoạt sớm.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold mt-4"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
