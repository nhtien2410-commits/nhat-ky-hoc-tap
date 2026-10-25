import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Copy, 
  Check, 
  RotateCcw, 
  Shield, 
  UserMinus, 
  Trash2, 
  LogOut, 
  Link as LinkIcon, 
  Share2,
  Lock,
  Unlock
} from 'lucide-react';
import { GROUP_ROLES, GROUP_ROLE_LABELS } from '../services/taskService';

export default function GroupSettingsModal({
  activeGroup,
  onClose,
  onUpdateGroup,
  onRegenerateCode,
  onToggleInvite,
  onUpdateMemberRole,
  onRemoveMember,
  onLeaveGroup,
  onDeleteGroup,
  currentUser,
  onShowToast
}) {
  const [name, setName] = useState(activeGroup?.name || '');
  const [description, setDescription] = useState(activeGroup?.description || '');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [allowMemberAssign, setAllowMemberAssign] = useState(
    activeGroup?.settings?.allowMemberAssignOthers ?? true
  );

  if (!activeGroup) return null;

  const currentUid = currentUser?.uid;
  const isOwner = activeGroup.ownerId === currentUid;
  const currentRole = activeGroup.members?.[currentUid]?.role;
  const isAdminOrOwner = isOwner || currentRole === GROUP_ROLES.ADMIN;
  const members = Object.values(activeGroup.members || {});

  const inviteLink = `${window.location.origin}${window.location.pathname}#tasks?invite=${activeGroup.inviteCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    onShowToast('Đã sao chép liên kết mời vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeGroup.inviteCode);
    setCopiedCode(true);
    onShowToast('Đã sao chép mã mời!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveInfo = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateGroup(activeGroup.id, {
      name: name.trim(),
      description: description.trim(),
      settings: {
        ...activeGroup.settings,
        allowMemberAssignOthers: allowMemberAssign
      }
    });
    onShowToast('Đã cập nhật thông tin nhóm!', 'success');
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card group-settings-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="brand-icon" style={{ width: 36, height: 36 }}>
              <Users size={20} />
            </div>
            <div>
              <h3 className="modal-title">Cài đặt nhóm</h3>
              <p className="brand-subtitle">{activeGroup.name}</p>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body group-settings-body">
          {/* 1. Group Info Form */}
          {isAdminOrOwner && (
            <form onSubmit={handleSaveInfo} className="group-info-form glass-panel">
              <div className="form-group">
                <label className="field-label">Tên nhóm</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="field-label">Mô tả nhóm</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mục đích hoặc thông tin của nhóm..."
                />
              </div>

              {/* Group permission toggle */}
              <div className="approval-toggle-row" style={{ marginTop: '0.5rem' }}>
                <div 
                  className="custom-checkbox" 
                  onClick={() => setAllowMemberAssign(!allowMemberAssign)}
                >
                  <span className={`checkbox-box ${allowMemberAssign ? 'is-checked' : ''}`}>
                    {allowMemberAssign && <Check size={14} />}
                  </span>
                </div>
                <div style={{ marginLeft: '0.5rem', cursor: 'pointer' }} onClick={() => setAllowMemberAssign(!allowMemberAssign)}>
                  <span className="approval-toggle-title">Cho phép thành viên giao việc cho bạn khác</span>
                  <p className="approval-toggle-sub">
                    Nếu tắt, chỉ Chủ nhóm và Quản trị viên mới được giao việc cho người khác.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}

          {/* 2. Invitation Link & Code Section */}
          <div className="invite-share-section glass-panel">
            <div className="section-title-row">
              <Share2 size={16} color="#10b981" />
              <h4 className="section-heading">Mời bạn bè tham gia nhóm</h4>
            </div>

            <div className="invite-details-box">
              <div className="invite-code-row">
                <div className="invite-code-badge">
                  Mã mời: <strong>{activeGroup.inviteCode}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-sm" onClick={handleCopyCode}>
                    {copiedCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Đã chép mã' : 'Chép mã'}</span>
                  </button>

                  {isAdminOrOwner && (
                    <button 
                      className="btn btn-sm btn-icon" 
                      onClick={() => onRegenerateCode(activeGroup.id)}
                      title="Tạo lại mã mời mới"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}

                  {isAdminOrOwner && (
                    <button 
                      className="btn btn-sm btn-icon" 
                      onClick={() => onToggleInvite(activeGroup.id, !activeGroup.inviteEnabled)}
                      title={activeGroup.inviteEnabled ? 'Vô hiệu hóa link mời' : 'Bật lại link mời'}
                    >
                      {activeGroup.inviteEnabled ? <Unlock size={14} color="#10b981" /> : <Lock size={14} color="#f43f5e" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="invite-link-row">
                <input 
                  type="text" 
                  readOnly 
                  className="form-input invite-link-input"
                  value={activeGroup.inviteEnabled ? inviteLink : '(Link mời đang bị tạm khóa)'}
                />
                {activeGroup.inviteEnabled && (
                  <button className="btn btn-primary btn-sm" onClick={handleCopyLink}>
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Đã sao chép' : 'Sao chép link'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Members List */}
          <div className="group-members-section glass-panel">
            <div className="section-title-row">
              <Users size={16} color="#3b82f6" />
              <h4 className="section-heading">Danh sách thành viên ({members.length})</h4>
            </div>

            <div className="members-manage-list">
              {members.map((m) => {
                const isThisMemberOwner = m.role === GROUP_ROLES.OWNER;
                const isThisMemberSelf = m.uid === currentUid;
                const roleBadge = GROUP_ROLE_LABELS[m.role] || GROUP_ROLE_LABELS.member;

                return (
                  <div key={m.uid} className="member-manage-row">
                    <div className="member-avatar-col">
                      <img 
                        src={m.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.uid}`} 
                        alt={m.displayName}
                        className="member-list-avatar"
                        style={{ borderColor: m.accentColor || '#10b981' }}
                      />
                      <div>
                        <div className="member-display-name">
                          {m.displayName} {isThisMemberSelf && <span className="you-chip">(Bạn)</span>}
                        </div>
                        <div className="member-email-text">{m.email || 'Thành viên'}</div>
                      </div>
                    </div>

                    <div className="member-actions-col">
                      {/* Role Badge / Switcher */}
                      {isOwner && !isThisMemberOwner ? (
                        <select 
                          className="role-selector-select"
                          value={m.role}
                          onChange={(e) => onUpdateMemberRole(activeGroup.id, m.uid, e.target.value)}
                        >
                          <option value={GROUP_ROLES.MEMBER}>Thành viên</option>
                          <option value={GROUP_ROLES.ADMIN}>Quản trị viên</option>
                        </select>
                      ) : (
                        <span 
                          className="member-role-pill" 
                          style={{ color: roleBadge.color, borderColor: roleBadge.color }}
                        >
                          {roleBadge.label}
                        </span>
                      )}

                      {/* Remove member button */}
                      {isAdminOrOwner && !isThisMemberOwner && !isThisMemberSelf && (
                        <button 
                          className="btn btn-icon btn-sm btn-danger-hover"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa "${m.displayName}" khỏi nhóm không?`)) {
                              onRemoveMember(activeGroup.id, m.uid);
                            }
                          }}
                          title="Xóa thành viên khỏi nhóm"
                        >
                          <UserMinus size={14} color="#f43f5e" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Danger Zone (Leave or Delete Group) */}
          <div className="group-danger-zone glass-panel">
            {!isOwner && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Rời khỏi nhóm</strong>
                  <p className="brand-subtitle">Bạn sẽ không còn xem được các công việc trong nhóm này.</p>
                </div>
                <button 
                  className="btn"
                  style={{ color: '#f59e0b', borderColor: '#f59e0b' }}
                  onClick={async () => {
                    if (window.confirm('Bạn có chắc muốn rời khỏi nhóm này không?')) {
                      await onLeaveGroup(activeGroup.id);
                      onClose();
                    }
                  }}
                >
                  <LogOut size={15} />
                  <span>Rời nhóm</span>
                </button>
              </div>
            )}

            {isOwner && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#f43f5e' }}>Xóa vĩnh viễn nhóm này</strong>
                  <p className="brand-subtitle">Toàn bộ công việc và lịch trong nhóm sẽ bị xóa hoàn toàn.</p>
                </div>
                <button 
                  className="btn btn-danger-hover"
                  style={{ color: '#f43f5e', borderColor: '#f43f5e' }}
                  onClick={async () => {
                    if (window.confirm(`Xác nhận xóa nhóm "${activeGroup.name}"? Thao tác này không thể hoàn tác!`)) {
                      await onDeleteGroup(activeGroup.id);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={15} />
                  <span>Xóa nhóm</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
