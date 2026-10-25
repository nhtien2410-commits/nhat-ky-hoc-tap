import React from 'react';
import { Users, Lock, LogIn, Sparkles, Shield, UserCheck } from 'lucide-react';
import { DEMO_MEMBERS } from '../services/taskService';

export default function AuthPrompt({ onGoogleSignIn, onDemoSignIn, onOpenCloudConfig }) {
  return (
    <div className="auth-prompt-card glass-panel shadow-lg">
      <div className="auth-prompt-icon-wrapper">
        <Users size={40} color="#10b981" />
      </div>

      <h2 className="auth-prompt-title">Đăng nhập để giao việc nhóm</h2>
      <p className="auth-prompt-subtitle">
        Phần <strong>Nhật ký học tập</strong> của bạn vẫn luôn được lưu <strong>riêng tư</strong> trên thiết bị. 
        Đăng nhập giúp bạn kết nối với nhóm bạn, giao bài tập, phân công nhiệm vụ và duyệt hoàn thành cùng nhau!
      </p>

      {/* Primary Action: Google Sign In */}
      <div className="auth-prompt-actions">
        <button 
          className="btn btn-primary btn-lg pressable"
          onClick={onGoogleSignIn}
        >
          <LogIn size={20} />
          <span>Đăng nhập với Google</span>
        </button>

        {/* Instant Demo Account Testing */}
        <div className="demo-accounts-section">
          <div className="demo-section-divider">
            <span>hoặc trải nghiệm nhanh với tài khoản Demo</span>
          </div>

          <div className="demo-users-grid">
            <button
              className="demo-user-card pressable"
              onClick={() => onDemoSignIn({
                uid: 'demo_user_me',
                displayName: 'Nguyễn Văn An',
                email: 'an.nguyen@example.com',
                photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=AnNguyen',
                accentColor: '#10b981',
                isDemo: true
              })}
            >
              <img 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=AnNguyen" 
                alt="An" 
                className="demo-card-avatar"
                style={{ borderColor: '#10b981' }}
              />
              <span className="demo-card-name">Nguyễn Văn An</span>
              <span className="demo-card-badge">Chủ nhóm</span>
            </button>

            {DEMO_MEMBERS.map((u) => (
              <button
                key={u.uid}
                className="demo-user-card pressable"
                onClick={() => onDemoSignIn({ ...u, isDemo: true })}
              >
                <img 
                  src={u.photoURL} 
                  alt={u.displayName} 
                  className="demo-card-avatar"
                  style={{ borderColor: u.accentColor }}
                />
                <span className="demo-card-name">{u.displayName}</span>
                <span className="demo-card-badge">Bạn học</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-prompt-features-footer">
        <div className="feature-pill">
          <Shield size={14} color="#10b981" />
          <span>Nhật ký cá nhân 100% riêng tư</span>
        </div>
        <div className="feature-pill">
          <Sparkles size={14} color="#8b5cf6" />
          <span>Thời gian thực & Phê duyệt 4 bước</span>
        </div>
        <div className="feature-pill">
          <UserCheck size={14} color="#3b82f6" />
          <span>Kéo thả dời hạn dễ dàng</span>
        </div>
      </div>
    </div>
  );
}
