import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Send, Bot, User, Loader2, Image as ImageIcon, X, Paperclip, Zap, Crown, Diamond, FileText, Upload, Menu, StopCircle, Download, Maximize2, Trash2 } from 'lucide-react';
import { useAuth, handleFirestoreError, OperationType } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import PremiumModal from './PremiumModal';
import ConfirmModal from './ConfirmModal';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  imageUrl?: string;
  createdAt?: any;
}

interface ChatProps {
  sessionId?: string;
  onBack?: () => void;
  onUpgrade?: () => void;
  onToggleSidebar?: () => void;
}

export default function Chat({ sessionId, onBack, onUpgrade, onToggleSidebar }: ChatProps) {
  const { user, theme, language } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string | null; type: string } | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedImageForModal, setSelectedImageForModal] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentSessionId(sessionId);
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user || !currentSessionId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', user.uid, 'sessions', currentSessionId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${user.uid}/sessions/${currentSessionId}/messages`);
    });

    return () => unsubscribe();
  }, [user, currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setSelectedFile({
          name: file.name,
          content: file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') ? content : null,
          type: file.type
        });
      };
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !selectedFile) || isLoading || !user) return;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'undefined') {
      console.error('GEMINI_API_KEY is missing or undefined');
      const errorMsg = {
        id: Date.now().toString(),
        role: 'model' as const,
        content: 'Lỗi: Chưa cấu hình API Key cho AI. Vui lòng kiểm tra tệp .env hoặc cài đặt môi trường.',
        createdAt: serverTimestamp()
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);

    const userMsg = input.trim();
    const currentImage = selectedImage;
    const currentFile = selectedFile;
    
    setInput('');
    removeImage();
    removeFile();
    setIsLoading(true);

    try {
      let activeSessionId = currentSessionId;

      if (!activeSessionId) {
        const sessionRef = await addDoc(collection(db, 'chats', user.uid, 'sessions'), {
          title: userMsg.substring(0, 50) || (currentImage ? 'Hình ảnh mới' : currentFile ? `Tệp: ${currentFile.name}` : 'Cuộc trò chuyện mới'),
          lastMessage: userMsg || (currentImage ? 'Hình ảnh' : 'Tệp đính kèm'),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        activeSessionId = sessionRef.id;
        setCurrentSessionId(activeSessionId);
      }

      const userMessageData = {
        role: 'user',
        content: userMsg || (currentImage ? "Phân tích hình ảnh này" : currentFile ? `Phân tích tệp: ${currentFile.name}` : ""),
        imageUrl: currentImage || null,
        fileName: currentFile?.name || null,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'chats', user.uid, 'sessions', activeSessionId, 'messages'), userMessageData);

      const parts: any[] = [];
      if (userMsg) parts.push({ text: userMsg });
      
      if (currentImage) {
        const base64Data = currentImage.split(',')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: imageFile?.type || 'image/jpeg'
          }
        });
      }

      if (currentFile) {
        if (currentFile.content) {
          parts.push({ text: `Nội dung tệp ${currentFile.name}:\n\n${currentFile.content}` });
        } else {
          parts.push({ text: `Người dùng đã gửi tệp: ${currentFile.name} (Loại: ${currentFile.type}). Hãy hỗ trợ người dùng dựa trên thông tin này.` });
        }
      }

      let modelName = 'gemini-3-flash-preview';
      let temperature = 0.7;
      let thinkingConfig = undefined;

      if (user.premiumLevel === 1) {
        modelName = 'gemini-3-flash-preview';
        temperature = 0.6;
      } else if (user.premiumLevel === 2) {
        modelName = 'gemini-3.1-pro-preview';
        temperature = 0.5;
      } else if (user.premiumLevel === 3) {
        modelName = 'gemini-3.1-pro-preview';
        temperature = 0.8;
        thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const systemInstruction = `
        Bạn là AI TM3 - một trợ lý AI đa năng, thông minh và có tư duy logic sắc bén.
        NGÔN NGỮ PHẢN HỒI: ${language === 'vi' ? 'Tiếng Việt' : 'English'}
        CẤP ĐỘ HIỆN TẠI CỦA NGƯỜI DÙNG: ${user.premiumLevel === 0 ? 'FREE' : 'PREMIUM'}
        
        NHIỆM VỤ CHÍNH:
        1. TRẢ LỜI TRỰC TIẾP: Hãy trả lời thẳng vào vấn đề mà người dùng hỏi. TUYỆT ĐỐI KHÔNG hỏi lại những câu như "Bạn cần giải gì?" hay "Tôi có thể giúp gì?". Hãy bắt đầu trả lời ngay lập tức dựa trên thông tin nhận được.
        2. MỞ RỘNG CÂU TRẢ LỜI: Hãy cung cấp thông tin chi tiết, giải thích cặn kẽ và mở rộng thêm các kiến thức liên quan để người dùng hiểu sâu hơn về vấn đề.
        3. GIẢI QUYẾT VẤN ĐỀ: Xử lý các vấn đề phức tạp (toán học, lập trình, phân tích dữ liệu) một cách chính xác và tối ưu.
        4. NHẬN DIỆN HÌNH ẢNH: Khi người dùng gửi ảnh, bạn phải phân tích cực kỳ chi tiết. Nếu ảnh hơi mờ, hãy sử dụng khả năng suy luận để đoán các ký tự hoặc nội dung dựa trên ngữ cảnh. TUYỆT ĐỐI KHÔNG ĐƯỢC TRẢ LỜI SAI các câu hỏi có trong ảnh.
        5. PHÂN TÍCH TỆP: Khi người dùng gửi tệp (PDF, tài liệu, mã nguồn), hãy đọc kỹ toàn bộ nội dung được cung cấp và hỗ trợ theo yêu cầu cụ thể.
        6. PHONG CÁCH TRẢ LỜI: Chuyên nghiệp, thân thiện, sử dụng Markdown để định dạng câu trả lời (bảng, danh sách, mã nguồn).
        
        QUY TẮC AN TOÀN: Tuyệt đối không hỗ trợ các yêu cầu vi phạm pháp luật, bạo lực hoặc gây hại.
        
        MÀU SẮC CHỦ ĐẠO CỦA APP: Xanh dương (Blue). Hãy thể hiện sự chuyên nghiệp và hiện đại.
      `;

      const aiMsgRef = await addDoc(collection(db, 'chats', user.uid, 'sessions', activeSessionId, 'messages'), {
        role: 'model',
        content: '',
        createdAt: serverTimestamp()
      });

      const result = await ai.models.generateContentStream({
        model: modelName,
        contents: { parts },
        config: {
          systemInstruction,
          temperature,
          topP: 0.9,
          topK: 40,
          thinkingConfig,
        }
      });

      let fullResponse = '';
      for await (const chunk of result) {
        if (controller.signal.aborted) break;
        const text = chunk.text;
        fullResponse += text;
        await updateDoc(aiMsgRef, { content: fullResponse });
      }

      await updateDoc(doc(db, 'chats', user.uid, 'sessions', activeSessionId), {
        lastMessage: fullResponse.substring(0, 100),
        updatedAt: serverTimestamp()
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation aborted');
      } else {
        console.error('AI Error:', error);
        // Thêm tin nhắn lỗi vào chat để người dùng biết
        const errorMsg = {
          id: Date.now().toString(),
          role: 'model' as const,
          content: `Lỗi AI: ${error.message || 'Đã có lỗi xảy ra khi kết nối với máy chủ AI. Vui lòng kiểm tra API Key.'}`,
          createdAt: serverTimestamp()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const clearHistory = async () => {
    if (!user || !currentSessionId) return;
    try {
      const messagesRef = collection(db, 'chats', user.uid, 'sessions', currentSessionId, 'messages');
      const snapshot = await getDocs(messagesRef);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      setShowClearModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chats/${user.uid}/sessions/${currentSessionId}/messages`);
    }
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `tm3-ai-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] w-full max-w-screen-2xl mx-auto relative">
      <ConfirmModal 
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={clearHistory}
        title="Xóa lịch sử"
        message="Bạn có chắc chắn muốn xóa tất cả tin nhắn trong phiên này? Hành động này không thể hoàn tác."
        confirmText="Xóa hết"
        cancelText="Hủy"
      />

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
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImageForModal} 
              alt="Full view" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <header className="mb-6 shrink-0 flex items-center justify-between gap-4 px-4 md:px-0">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar} 
              className={`p-2 rounded-xl transition-colors md:hidden ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          {onBack && (
            <button onClick={onBack} className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <X className="w-6 h-6" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className={`text-xl md:text-2xl font-bold flex items-center gap-2 truncate ${theme === 'dark' ? 'text-slate-100' : 'text-blue-900'}`}>
              AI TM3
              {user?.premiumLevel === 1 && <span className="bg-blue-400 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shrink-0"><Zap className="w-3 h-3" /> SILVER</span>}
              {user?.premiumLevel === 2 && <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shrink-0"><Crown className="w-3 h-3" /> GOLD</span>}
              {user?.premiumLevel === 3 && <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shrink-0"><Diamond className="w-3 h-3" /> DIAMOND</span>}
            </h1>
            <p className={`text-xs md:text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-blue-500'}`}>Giải bài tập, lập trình và phân tích tệp tin</p>
          </div>
        </div>
          <button
            onClick={() => setShowClearModal(true)}
            className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            title="Xóa lịch sử"
          >
            <Trash2 className="w-6 h-6" />
          </button>
          {!user?.isPro && (
          <button 
            onClick={onUpgrade || (() => setShowPremiumModal(true))} 
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-blue-200 hover:scale-105 transition-all shrink-0"
          >
            <Zap className="w-4 h-4 fill-current" /> <span className="hidden sm:inline">Nâng cấp Pro</span><span className="sm:hidden">Nâng cấp</span>
          </button>
        )}
      </header>

      <div className={`flex-1 rounded-2xl shadow-sm border flex flex-col overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-blue-100'}`}>
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center">
                <Bot className="w-10 h-10 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h2 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Chào mừng bạn!</h2>
                <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Tôi là AI TM3, trợ lý thông minh của bạn. Hãy bắt đầu cuộc trò chuyện bằng cách nhập nội dung bên dưới.</p>
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-md' : theme === 'dark' ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none shadow-sm' : 'bg-blue-50 text-slate-800 border border-blue-100 rounded-tl-none shadow-sm'}`}>
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="User upload" 
                    className="mb-2 rounded-lg max-w-[200px] max-h-[150px] object-contain shadow-lg cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => setSelectedImageForModal(msg.imageUrl!)}
                  />
                )}
                {(msg as any).fileName && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${theme === 'dark' ? 'bg-slate-700' : 'bg-white border border-blue-100'}`}>
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="text-xs truncate">{(msg as any).fileName}</span>
                  </div>
                )}
                <div className={`markdown-body prose prose-sm max-w-none text-[13px] leading-relaxed ${theme === 'dark' ? 'prose-invert text-slate-200' : 'prose-slate text-slate-800'}`}>
                  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</Markdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-600/10 text-emerald-600">
                <Bot className="w-5 h-5" />
              </div>
              <div className="rounded-2xl rounded-tl-none p-4 flex items-center gap-3 shadow-sm border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-full h-full border-2 border-blue-600/20 border-t-blue-600 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                      className="w-1 h-1 bg-blue-600 rounded-full"
                    />
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: 0.3 }}
                      className="w-1 h-1 bg-blue-600 rounded-full"
                    />
                  </div>
                </div>
                <span className="text-slate-500 text-sm font-bold tracking-tight">AI TM3 đang xử lý...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {(selectedImage || selectedFile) && (
          <div className={`px-4 py-2 border-t flex items-center gap-3 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50/50 border-blue-100'}`}>
            {selectedImage && (
              <div className={`relative w-16 h-16 rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-blue-200'}`}>
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={removeImage} className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-bl-lg hover:bg-rose-600 transition-colors"><X className="w-3 h-3" /></button>
              </div>
            )}
            {selectedFile && (
              <div className={`relative px-3 py-2 rounded-lg border flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-blue-200'}`}>
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium truncate max-w-[100px]">{selectedFile.name}</span>
                <button onClick={removeFile} className="text-rose-500 hover:text-rose-600"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        <div className={`p-4 border-t transition-colors duration-300 ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-blue-100'}`}>
          <div className="flex items-end gap-2 max-w-6xl mx-auto">
            <div className={`flex-1 border rounded-2xl flex flex-col focus-within:ring-2 focus-within:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Nhập câu hỏi hoặc dán code tại đây..."
                className={`w-full bg-transparent border-none rounded-2xl px-4 py-3 resize-none max-h-32 focus:ring-0 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}
                rows={1}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex gap-1">
                  <button onClick={() => fileInputRef.current?.click()} title="Gửi ảnh" className={`p-2 transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-blue-400' : 'text-slate-500 hover:text-blue-600'}`}><ImageIcon className="w-5 h-5" /></button>
                  <button onClick={() => docInputRef.current?.click()} title="Gửi tệp" className={`p-2 transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-blue-400' : 'text-slate-500 hover:text-blue-600'}`}><Paperclip className="w-5 h-5" /></button>
                  <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                  <input type="file" ref={docInputRef} onChange={handleFileSelect} accept=".pdf,.txt,.doc,.docx,.md,.js,.ts,.py,.cpp,.java" className="hidden" />
                </div>
                <button onClick={handleSend} disabled={(!input.trim() && !selectedImage && !selectedFile) || isLoading} className={`p-2 rounded-xl transition-all ${(!input.trim() && !selectedImage && !selectedFile) || isLoading ? 'text-slate-300' : 'text-white bg-blue-600 hover:bg-blue-700 shadow-lg'}`}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
                {isLoading && (
                  <button 
                    onClick={stopGeneration} 
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    title="Dừng trả lời"
                  >
                    <StopCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  );
}
