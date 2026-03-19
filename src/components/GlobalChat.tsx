import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError, OperationType } from '../context/AuthContext';
import { Send, Image as ImageIcon, Loader2, Globe, Download, Maximize2, Trash2, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface GlobalMessage {
  id: string;
  uid: string;
  name: string;
  photoURL: string;
  text: string;
  image?: string;
  createdAt: any;
}

export default function GlobalChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImageForModal, setSelectedImageForModal] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [worldName, setWorldName] = useState('Trò chuyện Thế giới');
  const [isEditingWorldName, setIsEditingWorldName] = useState(false);
  const [newWorldName, setNewWorldName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const q = query(
      collection(db, 'global_messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GlobalMessage[]);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'global_messages');
    });

    // Fetch world name
    const fetchWorldName = async () => {
      try {
        const docRef = doc(db, 'settings', 'world');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWorldName(docSnap.data().name);
        }
      } catch (err) {
        console.error('Error fetching world name:', err);
      }
    };
    fetchWorldName();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !image) || !user || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'global_messages'), {
        uid: user.uid,
        name: user.name,
        photoURL: user.photoURL,
        text: inputText.trim(),
        image: image,
        createdAt: serverTimestamp()
      });
      setInputText('');
      setImage(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'global_messages');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setMessageToDelete(messageId);
    setShowDeleteModal(true);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await deleteDoc(doc(db, 'global_messages', messageToDelete));
      showToast('Đã xóa tin nhắn');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `global_messages/${messageToDelete}`);
    } finally {
      setMessageToDelete(null);
    }
  };

  const handleStartEdit = (msg: GlobalMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editText.trim()) return;
    try {
      await updateDoc(doc(db, 'global_messages', editingMessageId), {
        text: editText.trim()
      });
      setEditingMessageId(null);
      setEditText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `global_messages/${editingMessageId}`);
    }
  };

  const handleUpdateWorldName = async () => {
    if (!newWorldName.trim()) return;
    try {
      await setDoc(doc(db, 'settings', 'world'), { name: newWorldName.trim() }, { merge: true });
      setWorldName(newWorldName.trim());
      setIsEditingWorldName(false);
    } catch (err) {
      console.error('Error updating world name:', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Ảnh quá lớn (tối đa 2MB)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `tm3-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-400 font-bold animate-pulse">Đang kết nối thế giới...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full max-w-screen-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl relative">
      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteMessage}
        title="Xóa tin nhắn"
        message="Bạn có chắc chắn muốn xóa tin nhắn này? Hành động này không thể hoàn tác."
        confirmText="Xóa ngay"
        cancelText="Hủy"
      />

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[150] font-bold text-white text-xs ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImageForModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImageForModal(null)}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 md:p-10 cursor-zoom-out"
          >
            <div className="absolute top-6 right-6 flex gap-4" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => downloadImage(selectedImageForModal)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                title="Tải về"
              >
                <Download className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setSelectedImageForModal(null)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                title="Đóng"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={selectedImageForModal} 
              alt="Full view" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            {isEditingWorldName && user?.role === 'admin' ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newWorldName} 
                  onChange={(e) => setNewWorldName(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
                <button onClick={handleUpdateWorldName} className="text-emerald-500 hover:text-emerald-600"><Check className="w-4 h-4" /></button>
                <button onClick={() => setIsEditingWorldName(false)} className="text-rose-500 hover:text-rose-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{worldName}</h2>
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => { setIsEditingWorldName(true); setNewWorldName(worldName); }}
                    className="text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Kết nối cộng đồng AI TM3</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.uid === user?.uid ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-3 ${msg.uid === user?.uid ? 'flex-row-reverse' : ''}`}
          >
            <div className="shrink-0">
              {msg.photoURL ? (
                <img src={msg.photoURL} alt={msg.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-800 shadow-md" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold border-2 border-slate-200 dark:border-slate-700">
                  {msg.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={`flex flex-col max-w-[85%] ${msg.uid === user?.uid ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {msg.name}
                </span>
                {(msg.uid === user?.uid || user?.role === 'admin') && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {msg.uid === user?.uid && (
                      <button onClick={() => handleStartEdit(msg)} className="text-slate-400 hover:text-blue-500 p-0.5"><Edit2 className="w-2.5 h-2.5" /></button>
                    )}
                    <button onClick={() => handleDeleteMessage(msg.id)} className="text-slate-400 hover:text-rose-500 p-0.5"><Trash2 className="w-2.5 h-2.5" /></button>
                  </div>
                )}
              </div>
              <div className={`p-2 rounded-2xl shadow-sm group relative ${
                msg.uid === user?.uid 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none'
              }`}>
                {msg.image && (
                  <div className="relative group cursor-pointer" onClick={() => setSelectedImageForModal(msg.image!)}>
                    <img src={msg.image} alt="Shared" className="max-w-[180px] max-h-[140px] object-contain rounded-xl mb-1 shadow-lg transition-transform group-hover:scale-[1.02]" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
                {editingMessageId === msg.id ? (
                  <div className="flex flex-col gap-2 min-w-[150px]">
                    <textarea 
                      value={editText} 
                      onChange={(e) => setEditText(e.target.value)}
                      className="bg-white/10 border-none rounded-lg p-2 text-xs focus:ring-1 focus:ring-white outline-none resize-none"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingMessageId(null)} className="text-[10px] font-bold opacity-70 hover:opacity-100">Hủy</button>
                      <button onClick={handleSaveEdit} className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-md hover:bg-white/30">Lưu</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                )}
                
                {/* Hover actions for desktop */}
                <div className={`absolute top-0 ${msg.uid === user?.uid ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                   {msg.uid === user?.uid && (
                      <button onClick={() => handleStartEdit(msg)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 shadow-sm"><Edit2 className="w-3 h-3" /></button>
                    )}
                    {(msg.uid === user?.uid || user?.role === 'admin') && (
                      <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 shadow-sm"><Trash2 className="w-3 h-3" /></button>
                    )}
                </div>
              </div>
              <span className="text-[8px] text-slate-500 mt-1 px-1">
                {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </motion.div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <AnimatePresence>
          {image && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="relative inline-block mb-4"
            >
              <img src={image} alt="Preview" className="w-20 h-20 object-cover rounded-2xl border-2 border-blue-500 shadow-xl" />
              <button 
                onClick={() => setImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-700 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <label className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-all shadow-lg">
            <ImageIcon className="w-6 h-6" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhắn gì đó..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-0 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={(!inputText.trim() && !image) || sending}
            className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
          >
            {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          </button>
        </form>
      </div>
    </div>
  );
}

