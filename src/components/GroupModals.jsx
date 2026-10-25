import React, { useState } from 'react';
import { X, Users, UserPlus } from 'lucide-react';

export function CreateGroupModal({ onClose, onCreateGroup, onShowToast }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const grp = await onCreateGroup({ name, description });
      onShowToast(`Đã tạo nhóm "${grp?.name || name.trim()}" thành công! 🎉`, 'success');
      onClose();
    } catch (err) {
      console.error('Error creating group:', err);
      onShowToast(err.message || 'Lỗi khi tạo nhóm.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card small-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-icon" style={{ width: 34, height: 34 }}>
              <Users size={18} />
            </div>
            <h3 className="modal-title">Tạo nhóm mới</h3>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body form-body">
          <div className="form-group">
            <label className="field-label required">Tên nhóm *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="VD: Nhóm bạn học Tiếng Anh, Lớp 12A..." 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="field-label">Mô tả mục tiêu của nhóm</label>
            <textarea 
              className="form-textarea" 
              rows={2}
              placeholder="VD: Cùng nhau theo dõi tiến độ bài tập và ôn thi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || loading}>
              {loading ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function JoinGroupModal({ onClose, onJoinGroup, onShowToast, defaultCode = '' }) {
  const [inviteCode, setInviteCode] = useState(defaultCode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      const result = await onJoinGroup(inviteCode.trim());
      if (result.alreadyMember) {
        onShowToast(`Bạn đã là thành viên của nhóm "${result.group.name}".`, 'info');
      } else {
        onShowToast(`Chào mừng bạn gia nhập nhóm "${result.group.name}"! 🎉`, 'success');
      }
      onClose();
    } catch (err) {
      onShowToast(err.message || 'Mã mời không hợp lệ.', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card small-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-icon" style={{ width: 34, height: 34 }}>
              <UserPlus size={18} />
            </div>
            <h3 className="modal-title">Tham gia nhóm</h3>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body form-body">
          <div className="form-group">
            <label className="field-label required">Nhập mã mời nhóm (VD: VN-9821 hoặc HOC-2026) *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Nhập mã mời được bạn bè chia sẻ..." 
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              autoFocus
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={!inviteCode.trim()}>Vào nhóm</button>
          </div>
        </form>
      </div>
    </div>
  );
}
