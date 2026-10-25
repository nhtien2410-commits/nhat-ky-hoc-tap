import React, { useState } from 'react';
import { X, User, Palette, Check, LogOut } from 'lucide-react';
import { saveUserProfile, signOutUser } from '../services/firebaseService';

const ACCENT_COLORS = [
  { label: 'Ngọc lục bảo', value: '#10b981' },
  { label: 'Xanh đại dương', value: '#3b82f6' },
  { label: 'Tím mộng mơ', value: '#8b5cf6' },
  { label: 'Hồng rực rỡ', value: '#f43f5e' },
  { label: 'Cam hoàng hôn', value: '#f59e0b' },
  { label: 'Xanh mòng két', value: '#0d9488' }
];

export default function UserProfileModal({ currentUser, onClose, onShowToast }) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [accentColor, setAccentColor] = useState(currentUser?.accentColor || '#10b981');
  const [photoURL, setPhotoURL] = useState(
    currentUser?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.uid}`
  );

  if (!currentUser) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    saveUserProfile(currentUser.uid, {
      displayName: displayName.trim(),
      accentColor,
      photoURL
    });

    onShowToast('Đã lưu hồ sơ cá nhân thành công!', 'success');
    onClose();
  };

  const handleSignOut = async () => {
    await signOutUser();
    onShowToast('Đã đăng xuất tài khoản.', 'info');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card user-profile-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-icon" style={{ width: 36, height: 36 }}>
              <User size={20} />
            </div>
            <div>
              <h3 className="modal-title">Hồ sơ cá nhân</h3>
              <p className="brand-subtitle">{currentUser.email || 'Tài khoản hoạt động'}</p>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body profile-form">
          {/* Avatar Preview */}
          <div className="profile-avatar-row">
            <div className="profile-avatar-wrapper" style={{ borderColor: accentColor }}>
              <img src={photoURL} alt={displayName} className="profile-large-avatar" />
            </div>
            <div>
              <button 
                type="button" 
                className="btn btn-sm"
                onClick={() => {
                  const seed = Math.random().toString(36).substring(7);
                  setPhotoURL(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
                }}
              >
                Đổi mẫu Avatar ngẫu nhiên
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div className="form-group">
            <label className="field-label">Tên hiển thị</label>
            <input 
              type="text" 
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          {/* Accent Color Chooser */}
          <div className="form-group">
            <label className="field-label">
              <Palette size={14} /> Màu sắc đại diện của bạn
            </label>
            <div className="accent-colors-grid">
              {ACCENT_COLORS.map((c) => {
                const isSelected = accentColor === c.value;
                return (
                  <button
                    type="button"
                    key={c.value}
                    className={`color-choice-circle ${isSelected ? 'selected' : ''}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setAccentColor(c.value)}
                    title={c.label}
                  >
                    {isSelected && <Check size={16} color="#ffffff" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
            <button 
              type="button" 
              className="btn btn-danger-hover" 
              onClick={handleSignOut}
              style={{ color: '#f43f5e' }}
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn btn-primary">Lưu hồ sơ</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
