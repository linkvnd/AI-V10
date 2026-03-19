import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type?: 'danger' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        >
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{message}</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "flex-1 py-3 text-white rounded-xl font-bold transition-all text-sm",
                  type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
