import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, BellRing, BellOff } from 'lucide-react';
import { notificationService } from '../services/notificationService';

export default function NotificationBell({ tasks = [], currentUser = null, onSelectTask }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(notificationService.isPushEnabled());
  const dropdownRef = useRef(null);

  // Re-calculate notifications when tasks or user change
  useEffect(() => {
    if (currentUser) {
      const list = notificationService.getNotifications(tasks, currentUser);
      setNotifications(list);
    } else {
      setNotifications([]);
    }
  }, [tasks, currentUser]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);
  const badgeLabel = `${unreadCount} thông báo chưa đọc`;

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead(notifications);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleItemClick = (notif) => {
    notificationService.markAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    if (notif.taskId && onSelectTask) {
      const target = tasks.find((t) => t.id === notif.taskId);
      if (target) {
        onSelectTask(target);
        setIsOpen(false);
      }
    }
  };

  const handleTogglePush = async () => {
    if (!pushEnabled) {
      const granted = await notificationService.requestPushPermission();
      setPushEnabled(granted);
    } else {
      localStorage.setItem('study_tracker_push_enabled_v1', 'false');
      setPushEnabled(false);
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="btn btn-icon pressable"
        onClick={() => setIsOpen(!isOpen)}
        title={unreadCount > 0 ? badgeLabel : "Thông báo"}
        aria-label={unreadCount > 0 ? badgeLabel : "Thông báo"}
        style={{ position: 'relative' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span 
            className="notification-badge" 
            title={badgeLabel}
            aria-label={badgeLabel}
          >
            {badgeText}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown glass-panel">
          <div className="notification-dropdown-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong style={{ fontSize: '0.95rem' }}>Thông báo</strong>
              {unreadCount > 0 && (
                <span className="role-pill" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {notificationService.isPushSupported() && (
                <button
                  className="btn btn-icon"
                  style={{ width: 28, height: 28, padding: 0 }}
                  onClick={handleTogglePush}
                  title={pushEnabled ? 'Đã bật thông báo trình duyệt' : 'Bật thông báo trình duyệt'}
                >
                  {pushEnabled ? <BellRing size={14} color="#10b981" /> : <BellOff size={14} />}
                </button>
              )}

              {unreadCount > 0 && (
                <button
                  className="btn btn-icon"
                  style={{ width: 28, height: 28, padding: 0 }}
                  onClick={handleMarkAllRead}
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={16} color="#10b981" />
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.4rem' }}>🎉</span>
                <p style={{ fontSize: '0.85rem' }}>Bạn không có thông báo mới nào!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => handleItemClick(notif)}
                >
                  <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '2px' }}>{notif.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: notif.isRead ? 500 : 700, fontSize: '0.85rem' }}>
                      {notif.title}
                    </div>
                    <div className="notification-text">{notif.body}</div>
                    {notif.time && (
                      <div className="notification-time">
                        {new Date(notif.time).toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
