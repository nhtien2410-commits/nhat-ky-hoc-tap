import React, { useRef } from 'react';
import { 
  BookOpen, 
  Sun, 
  Moon, 
  Download, 
  Upload, 
  Cloud, 
  CloudCheck, 
  Sparkles,
  User,
  Users
} from 'lucide-react';
import NavigationTabs from './NavigationTabs';
import NotificationBell from './NotificationBell';

function Header({ 
  theme, 
  onToggleTheme, 
  onExport, 
  onImport, 
  onOpenSyncModal, 
  onOpenProfileModal,
  currentUser, 
  isSyncing,
  activeTab,
  onTabChange,
  pendingTaskCount = 0,
  tasks = [],
  onSelectTask
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImport(event.target.result);
      };
      reader.readAsText(file);
    }
    // reset input value so re-importing same file triggers change
    e.target.value = '';
  };

  return (
    <header className="app-header glass-panel">
      {/* 1. Brand Logo & Title */}
      <div className="brand-wrapper">
        <div className="brand-icon">
          {activeTab === 'diary' ? (
            <BookOpen size={24} strokeWidth={2.5} />
          ) : (
            <Users size={24} strokeWidth={2.5} />
          )}
        </div>
        <div>
          <h1 className="brand-title">
            {activeTab === 'diary' ? 'Nhật Ký Học Tập' : 'Giao Việc & Theo Dõi Nhóm'}
          </h1>
          <p className="brand-subtitle">
            {activeTab === 'diary' 
              ? 'Theo dõi thói quen & kiến thức mỗi ngày' 
              : 'Giao bài tập, cùng học và phê duyệt nhiệm vụ bạn bè'}
          </p>
        </div>
      </div>

      {/* 2. Middle Navigation Tabs Switcher */}
      <div className="header-tabs-wrapper">
        <NavigationTabs 
          activeTab={activeTab} 
          onTabChange={onTabChange} 
          taskCount={pendingTaskCount}
        />
      </div>

      {/* 3. Header Action Buttons */}
      <div className="header-actions">
        {/* Hidden file input for import */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".json,application/json" 
          onChange={handleFileChange}
        />

        {/* In-App Notification Bell (Section 6) */}
        {currentUser && (
          <NotificationBell 
            tasks={tasks}
            currentUser={currentUser}
            onSelectTask={onSelectTask}
          />
        )}

        {/* User Profile Button if Logged In */}
        {currentUser ? (
          <button 
            className="btn profile-header-btn pressable"
            onClick={onOpenProfileModal}
            title={`Hồ sơ cá nhân: ${currentUser.displayName || currentUser.email}`}
          >
            <img 
              src={currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`} 
              alt="Avatar" 
              className="header-user-avatar"
              style={{ borderColor: currentUser.accentColor || '#10b981' }}
            />
            <span className="header-user-name">
              {currentUser.displayName ? currentUser.displayName.split(' ').pop() : 'Hồ sơ'}
            </span>
          </button>
        ) : (
          /* Cloud / Google Sign-in trigger */
          <button 
            className="btn btn-sync-prompt"
            onClick={onOpenSyncModal}
            title="Đăng nhập tài khoản"
          >
            <Cloud size={17} />
            <span>Đăng nhập</span>
          </button>
        )}

        {/* Export / Import (Shown when on diary tab) */}
        {activeTab === 'diary' && (
          <>
            <button 
              className="btn btn-icon-only-mobile" 
              onClick={onExport} 
              title="Tải tệp sao lưu dữ liệu JSON"
              aria-label="Xuất dữ liệu"
            >
              <Download size={18} />
              <span className="btn-label-desktop">Xuất</span>
            </button>

            <button 
              className="btn btn-icon-only-mobile" 
              onClick={() => fileInputRef.current?.click()} 
              title="Nhập lại dữ liệu từ tệp JSON"
              aria-label="Nhập dữ liệu"
            >
              <Upload size={18} />
              <span className="btn-label-desktop">Nhập</span>
            </button>
          </>
        )}

        {/* Theme Toggle Button */}
        <button 
          className="btn btn-icon" 
          onClick={onToggleTheme} 
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          aria-label="Chuyển chế độ giao diện"
        >
          {theme === 'dark' ? <Sun size={19} color="#fbbf24" /> : <Moon size={19} color="#6366f1" />}
        </button>
      </div>
    </header>
  );
}

export default React.memo(Header);
