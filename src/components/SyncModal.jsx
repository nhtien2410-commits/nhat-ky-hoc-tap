import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  CheckCircle2, 
  LogOut, 
  AlertCircle, 
  Key, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signOutUser, 
  isFirebaseConfigured, 
  getFirebaseConfig, 
  saveCustomFirebaseConfig 
} from '../services/firebaseService';

export default function SyncModal({ 
  onClose, 
  currentUser, 
  onShowToast 
}) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configJson, setConfigJson] = useState(() => {
    const current = getFirebaseConfig();
    return current ? JSON.stringify(current, null, 2) : '';
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isConfigured = isFirebaseConfigured();

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onShowToast('Đăng nhập Google thành công! Dữ liệu đang được đồng bộ đám mây.', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể đăng nhập Google.');
      onShowToast('Đăng nhập Google thất bại: ' + (err.code || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      onShowToast('Đã đăng xuất tài khoản Google.', 'info');
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(configJson);
      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error('Cấu hình phải có tối thiểu apiKey và projectId.');
      }
      saveCustomFirebaseConfig(parsed);
      onShowToast('Đã lưu cấu hình Firebase! Đang khởi động lại...', 'success');
    } catch (err) {
      setErrorMsg('Định dạng JSON cấu hình không hợp lệ: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cloud size={22} color="#10b981" />
            <h3 className="modal-date-title">Đồng Bộ Đám Mây</h3>
          </div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body" style={{ gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--accent-rose)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {currentUser ? (
            /* Logged in state */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1rem',
              padding: '1rem 0'
            }}>
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'User'} 
                  style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid var(--primary)' }}
                />
              ) : (
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 700
                }}>
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{currentUser.displayName || 'Người dùng Google'}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{currentUser.email}</p>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--primary-subtle)',
                color: 'var(--primary-text)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <CheckCircle2 size={16} />
                <span>Đã kết nối Firestore • Dữ liệu tự động đồng bộ</span>
              </div>

              <button 
                className="btn" 
                onClick={handleSignOut} 
                style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
              >
                <LogOut size={16} />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          ) : (
            /* Not logged in state */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Đăng nhập bằng tài khoản Google để tự động đồng bộ lịch học tập và ghi chú trên tất cả thiết bị của bạn qua Firebase Cloud Firestore.
              </p>

              {isConfigured ? (
                <button 
                  className="btn btn-primary" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  style={{
                    padding: '0.85rem',
                    fontSize: '1rem',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    width: '100%'
                  }}
                >
                  {/* Google SVG Icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>{loading ? 'Đang kết nối...' : 'Đăng nhập bằng tài khoản Google'}</span>
                </button>
              ) : (
                <div style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-main)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    <HelpCircle size={18} color="#f59e0b" />
                    <span>Chưa phát hiện cấu hình Firebase</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Ứng dụng vẫn hoạt động 100% bằng LocalStorage trên máy bạn. Bạn cũng có thể dán Firebase Config (hoặc biến môi trường .env) ngay tại đây để kích hoạt Google Sign-In đồng bộ đa thiết bị.
                  </p>
                  <button 
                    className="btn" 
                    onClick={() => setShowConfigForm(!showConfigForm)}
                    style={{ fontSize: '0.85rem', alignSelf: 'flex-start' }}
                  >
                    <Key size={15} />
                    <span>{showConfigForm ? 'Ẩn form cấu hình' : 'Nhập mã Firebase Config'}</span>
                  </button>
                </div>
              )}

              {/* Custom Firebase Config Form */}
              {showConfigForm && (
                <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Dán đoạn mã cấu hình Firebase (JSON format):
                  </label>
                  <textarea 
                    value={configJson} 
                    onChange={(e) => setConfigJson(e.target.value)}
                    rows={6}
                    placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "my-project.firebaseapp.com",\n  "projectId": "my-project",\n  "appId": "1:..."\n}`}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-main)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-main)'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                      Lưu cấu hình
                    </button>
                    {configJson && (
                      <button 
                        type="button" 
                        className="btn"
                        onClick={() => {
                          saveCustomFirebaseConfig(null);
                          onShowToast('Đã xóa cấu hình Firebase tùy chỉnh.', 'info');
                        }}
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
