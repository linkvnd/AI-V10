import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, handleFirestoreError, OperationType, UserProfile } from '../context/AuthContext';
import { ShieldCheck, User, Mail, Clock, QrCode, Upload, Check, X, Loader2, Users, Crown, Trash2, Calendar, Diamond, Zap, Search, MessageCircle } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc, updateDoc, Timestamp, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PremiumRequest {
  id: string;
  uid: string;
  email: string;
  name: string;
  paymentCode: string;
  level: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export default function AdminPanel({ onBack }: { onBack?: () => void }) {
  const { user, upgradeToLevel, language } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [newQrUrl, setNewQrUrl] = useState('');
  const [isUpdatingQr, setIsUpdatingQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'users' | 'settings'>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{ isOpen: boolean, uid: string, name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setQrCodeUrl(docSnap.data().qrCodeUrl);
        setNewQrUrl(docSnap.data().qrCodeUrl);
      }
    });

    const q = query(collection(db, 'premium_requests'), orderBy('createdAt', 'desc'));
    const unsubRequests = onSnapshot(q, (snapshot) => {
      const requestData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PremiumRequest[];
      setRequests(requestData);
      setLoadingRequests(false);
    });
    
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ ...doc.data() })) as UserProfile[];
      setUsers(userData);
      setLoadingUsers(false);
    });

    return () => { unsubConfig(); unsubRequests(); unsubUsers(); };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewQrUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateQr = async () => {
    if (!newQrUrl.trim()) return;
    setIsUpdatingQr(true);
    try {
      await setDoc(doc(db, 'system', 'config'), { qrCodeUrl: newQrUrl, updatedAt: serverTimestamp() }, { merge: true });
      showToast(language === 'vi' ? 'Đã cập nhật mã QR thành công!' : 'QR code updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system/config');
      showToast(language === 'vi' ? 'Lỗi cập nhật mã QR' : 'Error updating QR code', 'error');
    } finally {
      setIsUpdatingQr(false);
    }
  };

  const handleApprove = async (request: PremiumRequest) => {
    try {
      await upgradeToLevel(request.uid, request.level);
      await updateDoc(doc(db, 'premium_requests', request.id), { status: 'approved', updatedAt: serverTimestamp() });
      showToast(language === 'vi' ? `Đã kích hoạt gói ${getLevelName(request.level)} cho ${request.email}` : `Activated ${getLevelName(request.level)} for ${request.email}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `premium_requests/${request.id}`);
      showToast(language === 'vi' ? 'Lỗi phê duyệt yêu cầu' : 'Error approving request', 'error');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'premium_requests', requestId), { status: 'rejected', updatedAt: serverTimestamp() });
      showToast(language === 'vi' ? 'Đã từ chối yêu cầu' : 'Request rejected');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `premium_requests/${requestId}`);
      showToast(language === 'vi' ? 'Lỗi từ chối yêu cầu' : 'Error rejecting request', 'error');
    }
  };

  const handleCancelPremium = async (uid: string, name: string) => {
    try {
      await upgradeToLevel(uid, 0);
      showToast(language === 'vi' ? `Đã hủy gói Premium của ${name}` : `Cancelled Premium for ${name}`);
    } catch (error) {
      showToast(language === 'vi' ? 'Lỗi khi hủy gói' : 'Error cancelling plan', 'error');
    }
  };

  const fetchUserSessions = async (uid: string) => {
    setLoadingSessions(true);
    try {
      const q = query(collection(db, 'chats', uid, 'sessions'), orderBy('updatedAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserSessions(sessions);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `chats/${uid}/sessions`);
    } finally {
      setLoadingSessions(false);
    }
  };

  const getLevelName = (level: number) => {
    switch(level) {
      case 1: return 'Silver';
      case 2: return 'Gold';
      case 3: return 'Diamond';
      default: return 'Free';
    }
  };

  const stats = {
    totalUsers: users.length,
    premiumUsers: users.filter(u => u.premiumLevel > 0).length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[110] font-bold text-white",
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
          >
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{language === 'vi' ? 'Xác nhận hủy' : 'Confirm Cancellation'}</h3>
              <p className="text-slate-500 dark:text-slate-400">{language === 'vi' ? `Bạn có chắc chắn muốn hủy gói Premium của ${showConfirmModal.name}?` : `Are you sure you want to cancel Premium for ${showConfirmModal.name}?`}</p>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowConfirmModal(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button 
                  onClick={() => { handleCancelPremium(showConfirmModal.uid, showConfirmModal.name); setShowConfirmModal(null); }}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all"
                >
                  {language === 'vi' ? 'Xác nhận' : 'Confirm'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
              <X className="w-6 h-6" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{language === 'vi' ? 'Bảng quản trị' : 'Admin Panel'}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{language === 'vi' ? 'Quản lý hệ thống, người dùng và thanh toán Premium' : 'Manage system, users and Premium payments'}</p>
          </div>
        </div>
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <button onClick={() => setActiveTab('overview')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200')}>{language === 'vi' ? 'Tổng quan' : 'Overview'}</button>
          <button onClick={() => setActiveTab('requests')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200')}>{language === 'vi' ? 'Yêu cầu' : 'Requests'}</button>
          <button onClick={() => setActiveTab('users')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200')}>{language === 'vi' ? 'Người dùng' : 'Users'}</button>
          <button onClick={() => setActiveTab('settings')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200')}>{language === 'vi' ? 'Cài đặt' : 'Settings'}</button>
        </div>
      </header>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={<Users className="w-6 h-6" />} label={language === 'vi' ? 'Tổng người dùng' : 'Total Users'} value={stats.totalUsers} color="bg-blue-500" />
            <StatCard icon={<Crown className="w-6 h-6" />} label={language === 'vi' ? 'Người dùng Premium' : 'Premium Users'} value={stats.premiumUsers} color="bg-amber-500" />
            <StatCard icon={<Clock className="w-6 h-6" />} label={language === 'vi' ? 'Yêu cầu chờ duyệt' : 'Pending Requests'} value={stats.pendingRequests} color="bg-indigo-500" />
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">{language === 'vi' ? 'Người dùng' : 'User'}</th>
                  <th className="px-6 py-4">{language === 'vi' ? 'Mã thanh toán' : 'Payment Code'}</th>
                  <th className="px-6 py-4">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                  <th className="px-6 py-4 text-right">{language === 'vi' ? 'Hành động' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{req.name}</div>
                      <div className="text-xs text-slate-400">{req.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-xs font-bold">{req.paymentCode}</code>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase font-black">{language === 'vi' ? 'Gói' : 'Plan'}: {getLevelName(req.level)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${req.status === 'pending' ? 'bg-amber-50 text-amber-600' : req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleApprove(req)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"><Check className="w-5 h-5" /></button>
                          <button onClick={() => handleReject(req.id)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"><X className="w-5 h-5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">{language === 'vi' ? 'Chưa có yêu cầu nào' : 'No requests yet'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder={language === 'vi' ? 'Tìm kiếm người dùng (tên, email)...' : 'Search users (name, email)...'} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="text-sm text-slate-500">
              {language === 'vi' ? 'Hiển thị' : 'Showing'} <span className="font-bold text-slate-900 dark:text-white">{filteredUsers.length}</span> {language === 'vi' ? 'người dùng' : 'users'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">{language === 'vi' ? 'Người dùng' : 'User'}</th>
                    <th className="px-6 py-4">{language === 'vi' ? 'Gói dịch vụ' : 'Plan'}</th>
                    <th className="px-6 py-4 text-right">{language === 'vi' ? 'Hành động' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {filteredUsers.map(u => (
                    <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => {
                      setSelectedUser(u);
                      fetchUserSessions(u.uid);
                    }}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                          {u.premiumLevel === 1 && <Zap className="w-3 h-3 text-slate-400" />}
                          {u.premiumLevel === 2 && <Crown className="w-3 h-3 text-amber-400" />}
                          {u.premiumLevel === 3 && <Diamond className="w-3 h-3 text-indigo-400" />}
                          {getLevelName(u.premiumLevel)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {u.premiumLevel > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowConfirmModal({ isOpen: true, uid: u.uid, name: u.name });
                              }} 
                              className="text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-3 py-1 rounded-lg transition-all"
                            >
                              {language === 'vi' ? 'Hủy Premium' : 'Cancel Premium'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <AnimatePresence>
            {selectedUser && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                onClick={() => setSelectedUser(null)}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedUser.name}</h3>
                        <p className="text-sm text-slate-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        {language === 'vi' ? 'Lịch sử trò chuyện gần đây' : 'Recent Chat History'}
                      </h4>
                      {loadingSessions ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userSessions.map(session => (
                            <div key={session.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[70%]">{session.title || (language === 'vi' ? 'Không có tiêu đề' : 'No title')}</span>
                                <span className="text-[10px] text-slate-400">{session.updatedAt?.toDate().toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-500 truncate">{session.lastMessage || (language === 'vi' ? 'Chưa có tin nhắn' : 'No messages')}</p>
                            </div>
                          ))}
                          {userSessions.length === 0 && (
                            <p className="text-center py-8 text-slate-400 italic">{language === 'vi' ? 'Chưa có lịch sử trò chuyện' : 'No chat history'}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                <QrCode className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{language === 'vi' ? 'Cấu hình mã QR' : 'QR Code Config'}</h2>
            </div>
            
            <div className="space-y-4">
              <div className="aspect-square bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden group relative">
                {newQrUrl ? (
                  <>
                    <img src={newQrUrl} alt="New QR" className="w-full h-full object-contain p-4" />
                    <button 
                      onClick={() => setNewQrUrl('')}
                      className="absolute top-4 right-4 p-2 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm text-slate-400">{language === 'vi' ? 'Tải lên mã QR thanh toán của bạn' : 'Upload your payment QR code'}</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </div>

              <button
                onClick={handleUpdateQr}
                disabled={isUpdatingQr || !newQrUrl}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {isUpdatingQr ? <Loader2 className="w-5 h-5 animate-spin" /> : (language === 'vi' ? "Cập nhật mã QR" : "Update QR Code")}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{language === 'vi' ? 'Thông tin hỗ trợ' : 'Support Info'}</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{language === 'vi' ? 'Zalo hỗ trợ' : 'Zalo Support'}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">0347649098</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{language === 'vi' ? 'Email Admin' : 'Admin Email'}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">globalmmok24@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
      <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-opacity-20`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}
