import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError, OperationType } from '../context/AuthContext';
import { MessageSquare, Trash2, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatSession { id: string; title: string; lastMessage: string; updatedAt: Timestamp; }

export default function ChatHistory({ onSelectSession }: { onSelectSession: (id: string) => void }) {
  const { user, theme, language } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats', user.uid, 'sessions'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatSession[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <header className="mb-8">
        <h1 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
          {language === 'vi' ? 'Lịch sử trò chuyện' : 'Chat History'}
        </h1>
      </header>
      <div className="grid gap-3 scrollbar-hide">
        {sessions.length === 0 ? (
          <div className={`text-center py-20 rounded-[2.5rem] border-2 border-dashed ${theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{language === 'vi' ? 'Chưa có cuộc trò chuyện nào' : 'No conversations yet'}</p>
          </div>
        ) : (
          sessions.map((session) => (
            <motion.div 
              key={session.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onSelectSession(session.id)} 
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                theme === 'dark' 
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700' 
                  : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className={`font-bold truncate text-sm ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                    {session.title || (language === 'vi' ? 'Cuộc trò chuyện mới' : 'New Chat')}
                  </h3>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {session.updatedAt?.toDate?.() ? session.updatedAt.toDate().toLocaleDateString() : '...'}
                  </span>
                </div>
                <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {session.lastMessage || (language === 'vi' ? 'Chưa có tin nhắn' : 'No messages')}
                </p>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
