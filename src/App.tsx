import { useState, useEffect } from 'react';
import { Bot, LogOut, ShieldCheck, Loader2, MessageSquare, History, Zap, Moon, Sun, Info, Phone, Settings, Menu, X, Globe, Bell, Trash2, ChevronRight, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Chat from './components/Chat';
import ChatHistory from './components/ChatHistory';
import UpgradeTab from './components/UpgradeTab';
import GlobalChat from './components/GlobalChat';
import BlockBlast from './components/BlockBlast';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import FallingFlowers from './components/FallingFlowers';
import ConfirmModal from './components/ConfirmModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

function MainApp() {
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout, loading, theme, language } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <FallingFlowers />
        <Login />
      </>
    );
  }

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      theme === 'dark' ? 'bg-black text-slate-100 dark' : 'bg-slate-50 text-slate-900',
      "font-sans relative z-10 overflow-x-hidden"
    )}>
      <FallingFlowers />
      
      <ConfirmModal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
        title={language === 'vi' ? 'Đăng xuất' : 'Logout'}
        message={language === 'vi' ? 'Bạn có chắc chắn muốn đăng xuất?' : 'Are you sure you want to logout?'}
        confirmText={language === 'vi' ? 'Đăng xuất' : 'Logout'}
        cancelText={language === 'vi' ? 'Hủy' : 'Cancel'}
      />
      
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 768 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      <nav className={cn(
        "fixed top-0 bottom-0 left-0 w-72 border-r z-[70] transition-all duration-300 transform",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100',
        "flex flex-col"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex flex-col gap-6 px-6 py-10">
            <div className="flex items-center justify-between">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tighter bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI TM3</span>
                  <span className="text-[8px] font-bold text-slate-400 -mt-1 uppercase tracking-widest">v2.1.0 Pro</span>
                </div>
              </motion.div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={cn(
              "p-4 rounded-3xl border transition-all duration-300",
              theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-blue-50/50 border-blue-100'
            )}>
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full object-cover shadow-md" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                    {user.role === 'admin' ? (language === 'vi' ? 'Quản trị viên' : 'Administrator') : (language === 'vi' ? 'Thành viên' : 'Member')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col flex-1 px-4 gap-2">
            <NavItem icon={<MessageSquare />} label={language === 'vi' ? 'Trò chuyện' : 'Chat'} active={activeTab === 'chat'} onClick={() => { setActiveTab('chat'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} theme={theme} />
            <NavItem icon={<Globe />} label={language === 'vi' ? 'Thế giới' : 'World Chat'} active={activeTab === 'global'} onClick={() => { setActiveTab('global'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} theme={theme} />
            <NavItem icon={<Gamepad2 />} label={language === 'vi' ? 'Trò chơi' : 'Game'} active={activeTab === 'game'} onClick={() => { setActiveTab('game'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} theme={theme} />
            <NavItem icon={<History />} label={language === 'vi' ? 'Lịch sử' : 'History'} active={activeTab === 'history'} onClick={() => { setActiveTab('history'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} theme={theme} />
            <NavItem icon={<Info />} label={language === 'vi' ? 'Giới thiệu' : 'About'} active={activeTab === 'about'} onClick={() => { setActiveTab('about'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} theme={theme} />
          </div>

          <div className="p-6 space-y-4">
            <button 
              onClick={() => { setActiveTab('settings'); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all",
                activeTab === 'settings' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
              )}
            >
              <Settings className="w-5 h-5" />
              <span>{language === 'vi' ? 'Cài đặt' : 'Settings'}</span>
            </button>

            <button 
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>{language === 'vi' ? 'Đăng xuất' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className={cn(
        "transition-all duration-300 min-h-screen",
        isSidebarOpen ? "md:pl-72" : "md:pl-0"
      )}>
        <div className="p-4 md:p-8 max-w-screen-2xl mx-auto relative z-10">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="fixed top-6 left-6 z-40 p-3 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl shadow-xl text-blue-600"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full"
            >
              {activeTab === 'chat' && (
                <Chat 
                  sessionId={selectedSessionId} 
                  onBack={() => setSelectedSessionId(undefined)} 
                  onUpgrade={() => setActiveTab('upgrade')}
                />
              )}
              {activeTab === 'global' && <GlobalChat />}
              {activeTab === 'game' && <BlockBlast />}
              {activeTab === 'history' && (
                <ChatHistory 
                  onSelectSession={(id) => {
                    setSelectedSessionId(id);
                    setActiveTab('chat');
                  }} 
                />
              )}
              {activeTab === 'upgrade' && <UpgradeTab onBack={() => setActiveTab('chat')} />}
              {activeTab === 'about' && <AboutSection />}
              {activeTab === 'settings' && <SettingsSection onShowAdmin={() => setActiveTab('admin')} setShowLogoutModal={setShowLogoutModal} />}
              {activeTab === 'admin' && user.role === 'admin' && <AdminPanel onBack={() => setActiveTab('settings')} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function AboutSection() {
  const { theme, language } = useAuth();
  return (
    <div className="max-w-3xl mx-auto p-6 rounded-2xl border transition-colors duration-300 bg-white dark:bg-slate-900 border-blue-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-10 h-10 text-blue-600" />
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{language === 'vi' ? 'Về AI TM3' : 'About AI TM3'}</h2>
      </div>
      
      <div className="space-y-6 text-slate-600 dark:text-slate-300">
        <p className="text-lg leading-relaxed">
          {language === 'vi' 
            ? 'AI TM3 là trợ lý trí tuệ nhân tạo thế hệ mới, được thiết kế để hỗ trợ bạn trong mọi công việc từ lập trình, viết lách đến phân tích dữ liệu phức tạp.' 
            : 'AI TM3 is a next-generation AI assistant designed to help you with everything from coding and writing to complex data analysis.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border bg-blue-50 dark:bg-slate-800/50 border-blue-100 dark:border-slate-700">
            <h3 className="font-bold mb-2 text-slate-900 dark:text-slate-100">{language === 'vi' ? 'Đa dạng mô hình' : 'Diverse Models'}</h3>
            <p className="text-sm">{language === 'vi' ? 'Tích hợp các mô hình Gemini tiên tiến nhất từ Google, phù hợp với mọi nhu cầu.' : 'Integrated with the most advanced Gemini models from Google, suitable for all needs.'}</p>
          </div>
          <div className="p-4 rounded-xl border bg-blue-50 dark:bg-slate-800/50 border-blue-100 dark:border-slate-700">
            <h3 className="font-bold mb-2 text-slate-900 dark:text-slate-100">{language === 'vi' ? 'Gói Premium linh hoạt' : 'Flexible Premium Plans'}</h3>
            <p className="text-sm">{language === 'vi' ? 'Nâng cấp trải nghiệm với gói AI Nâng Cao để mở khóa sức mạnh tối đa.' : 'Upgrade your experience with AI Nâng Cao plan to unlock maximum power.'}</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl border-2 border-dashed border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
          <h3 className="flex items-center gap-2 font-bold mb-4 text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-5 h-5" /> {language === 'vi' ? 'Quy định & Bản quyền' : 'Regulations & Copyright'}
          </h3>
          <div className="space-y-4 text-sm">
            <p><strong>1. Quy định sử dụng:</strong> Không sử dụng AI cho mục đích vi phạm pháp luật, tạo nội dung độc hại hoặc lừa đảo. Mọi hành vi vi phạm sẽ bị khóa tài khoản vĩnh viễn.</p>
            <p><strong>2. Bản quyền:</strong> Ứng dụng được phát triển và sở hữu bản quyền bởi <strong>GIA BẢO K24</strong>. Mọi hành vi sao chép mã nguồn khi chưa được phép là vi phạm bản quyền.</p>
            <p><strong>3. Bảo mật:</strong> Chúng tôi cam kết bảo mật dữ liệu cá nhân của bạn. Dữ liệu trò chuyện được mã hóa và chỉ sử dụng để cải thiện chất lượng dịch vụ.</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-blue-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
          <h3 className="flex items-center gap-2 font-bold mb-4 text-blue-600 dark:text-blue-400">
            <Phone className="w-5 h-5" /> {language === 'vi' ? 'Hỗ trợ khách hàng' : 'Customer Support'}
          </h3>
          <p className="mb-4">
            {language === 'vi' 
              ? 'Nếu bạn gặp vấn đề về đăng nhập, thanh toán hoặc cần khôi phục tài khoản, vui lòng liên hệ quản trị viên:' 
              : 'If you have login, payment issues or need account recovery, please contact the administrator:'}
          </p>
          <div className="flex flex-col gap-2">
            <a href="https://zalo.me/0347649098" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline font-bold">
              <span>Zalo: 0347649098</span>
            </a>
            <p className="font-bold">Email: globalmmok24@gmail.com</p>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">© 2024 AI TM3 - by GIA BẢO K24</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ onShowAdmin, setShowLogoutModal }: { onShowAdmin: () => void, setShowLogoutModal: (show: boolean) => void }) {
  const { user, clearChatHistory, theme, language, setLanguage, notifications, setNotifications, updateProfile } = useAuth();
  const [clearing, setClearing] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [newPhoto, setNewPhoto] = useState(user?.photoURL || '');
  const [updating, setUpdating] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      await clearChatHistory();
      showToast(language === 'vi' ? 'Đã xóa lịch sử trò chuyện thành công.' : 'Chat history cleared successfully.');
    } catch (error) {
      showToast(language === 'vi' ? 'Có lỗi xảy ra khi xóa lịch sử.' : 'Error clearing history.', 'error');
    } finally {
      setClearing(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await updateProfile({ name: newName, photoURL: newPhoto });
      setIsEditingProfile(false);
      showToast(language === 'vi' ? 'Cập nhật hồ sơ thành công.' : 'Profile updated successfully.');
    } catch (error) {
      showToast(language === 'vi' ? 'Lỗi cập nhật hồ sơ.' : 'Error updating profile.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const toggleNotifications = () => {
    setNotifications(!notifications);
    showToast(language === 'vi' 
      ? (notifications ? 'Đã tắt thông báo.' : 'Đã bật thông báo.') 
      : (notifications ? 'Notifications disabled.' : 'Notifications enabled.')
    );
  };

  const changeLanguage = () => {
    const newLang = language === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    showToast(newLang === 'vi' ? 'Đã chuyển sang Tiếng Việt.' : 'Switched to English.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <ConfirmModal 
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearHistory}
        title={language === 'vi' ? 'Xóa lịch sử' : 'Clear History'}
        message={language === 'vi' ? 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác.' : 'Are you sure you want to clear all chat history? This action cannot be undone.'}
        confirmText={language === 'vi' ? 'Xóa ngay' : 'Clear Now'}
        cancelText={language === 'vi' ? 'Hủy' : 'Cancel'}
      />

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

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {language === 'vi' ? 'Cài đặt' : 'Settings'}
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-12 h-12 rounded-xl object-cover shadow-md" />
            ) : (
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{user?.name}</h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
          >
            {language === 'vi' ? 'Sửa Profile' : 'Edit Profile'}
          </button>
        </div>

        <AnimatePresence>
          {isEditingProfile && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleUpdateProfile}
              className="space-y-4 overflow-hidden"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'vi' ? 'Tên hiển thị' : 'Display Name'}</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{language === 'vi' ? 'Ảnh đại diện' : 'Profile Picture'}</label>
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="relative group">
                    {newPhoto ? (
                      <img src={newPhoto} alt="Preview" className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-white dark:border-slate-700" />
                    ) : (
                      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        {newName?.[0] || 'U'}
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                      <span className="text-[10px] text-white font-bold uppercase tracking-tighter">{language === 'vi' ? 'Thay đổi' : 'Change'}</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) {
                              showToast(language === 'vi' ? 'Ảnh quá lớn (tối đa 1MB)' : 'Image too large (max 1MB)', 'error');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewPhoto(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-slate-500 font-medium">
                      {language === 'vi' ? 'Tải ảnh lên từ thiết bị của bạn. Dung lượng tối đa 1MB.' : 'Upload an image from your device. Max size 1MB.'}
                    </p>
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                        input?.click();
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      {language === 'vi' ? 'Chọn tệp tin' : 'Select file'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {language === 'vi' ? 'Lưu thay đổi' : 'Save Changes'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div 
            onClick={changeLanguage}
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-slate-400" />
              <span className="font-bold">{language === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
            </div>
            <span className="text-sm text-slate-500">{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
          </div>
          <div 
            onClick={toggleNotifications}
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="font-bold">{language === 'vi' ? 'Thông báo' : 'Notifications'}</span>
            </div>
            <div className={cn(
              "w-10 h-5 rounded-full relative transition-colors duration-300",
              notifications ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
            )}>
              <motion.div 
                animate={{ x: notifications ? 20 : 4 }}
                className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm" 
              />
            </div>
          </div>
          <button 
            onClick={() => setShowClearModal(true)}
            disabled={clearing}
            className="w-full flex items-center justify-between p-4 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all text-rose-600"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5" />
              <span className="font-bold">{language === 'vi' ? 'Xóa lịch sử trò chuyện' : 'Clear chat history'}</span>
            </div>
            {clearing && <Loader2 className="w-4 h-4 animate-spin" />}
          </button>
          {user?.role === 'admin' && (
            <button 
              onClick={onShowAdmin}
              className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all text-blue-600"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-bold">{language === 'vi' ? 'Quản trị hệ thống' : 'System Administration'}</span>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <button 
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          {language === 'vi' ? 'Đăng xuất' : 'Logout'}
        </button>
      </div>
    </div>
  );
}

function HomeSection({ onStartChat, onUpgrade }: { onStartChat: () => void, onUpgrade: () => void }) {
  const { theme } = useAuth();
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/40"
        >
          <Bot className="w-12 h-12 text-white" />
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
          AI TM3
        </h1>
        <p className="text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed text-slate-600 dark:text-slate-400">
          Trợ lý AI thông minh vượt trội, hỗ trợ hình ảnh, tệp tin và giải đáp mọi thắc mắc của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartChat}
          className="p-8 rounded-[2rem] border-2 text-left transition-all group relative overflow-hidden bg-white dark:bg-slate-900 border-blue-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 shadow-xl shadow-blue-500/5"
        >
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Bắt đầu trò chuyện</h3>
          <p className="text-slate-500 dark:text-slate-400">Trải nghiệm sức mạnh của AI TM3 ngay bây giờ.</p>
          <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
            <MessageSquare className="w-24 h-24 text-blue-600" />
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={onUpgrade}
          className="p-8 rounded-[2rem] border-2 text-left transition-all group relative overflow-hidden bg-white dark:bg-slate-900 border-blue-100 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 shadow-xl shadow-amber-500/5"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform">
            <Zap className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Nâng cấp Premium</h3>
          <p className="text-slate-500 dark:text-slate-400">Mở khóa các tính năng cao cấp và mô hình mạnh mẽ hơn.</p>
          <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
            <Zap className="w-24 h-24 text-amber-500" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, theme }: { icon: any, label: string, active: boolean, onClick: () => void, theme: 'light' | 'dark' }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 px-2 py-2 md:py-4 md:px-6 rounded-2xl transition-all duration-300 group relative",
        active 
          ? 'text-blue-600 md:bg-blue-600 md:text-white shadow-lg shadow-blue-500/20' 
          : theme === 'dark' 
            ? 'text-slate-400 hover:text-slate-100 md:hover:bg-slate-800/50' 
            : 'text-slate-500 hover:text-blue-600 md:hover:bg-blue-50'
      )}
    >
      <div className={cn(
        "w-6 h-6 flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
        active ? 'text-white' : ''
      )}>
        {icon}
      </div>
      <span className="text-[10px] md:text-sm font-bold">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute -bottom-1 md:bottom-auto md:left-0 md:top-1/2 md:-translate-y-1/2 md:w-1 md:h-8 bg-blue-600 rounded-full hidden md:block"
        />
      )}
    </button>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
