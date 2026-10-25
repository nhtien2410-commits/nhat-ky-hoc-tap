import React, { useState } from 'react';
import { 
  Users, 
  Settings, 
  Plus, 
  ChevronDown, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  Layers
} from 'lucide-react';
import { GROUP_ROLES, GROUP_ROLE_LABELS } from '../services/taskService';

export default function GroupBar({
  groups = [],
  activeGroup = null,
  onSelectGroup,
  onOpenCreateGroup,
  onOpenJoinGroup,
  onOpenGroupSettings,
  onOpenCreateTask,
  viewMode = 'all', // 'assigned_to_me' | 'assigned_by_me' | 'all'
  onChangeViewMode,
  currentUser = null
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentRole = activeGroup?.members?.[currentUser?.uid]?.role || GROUP_ROLES.MEMBER;
  const roleLabel = GROUP_ROLE_LABELS[currentRole]?.label || 'Thành viên';

  return (
    <div className="group-bar glass-panel">
      {/* 1. Left: Group Switcher & Settings */}
      <div className="group-bar-left">
        <div className="group-selector-dropdown">
          <button 
            type="button"
            className="group-selector-btn pressable"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Đổi nhóm làm việc"
            aria-expanded={dropdownOpen}
          >
            <div className="group-icon-avatar">
              <Users size={17} color="#10b981" />
            </div>
            <div className="group-name-col">
              <span className="group-active-name">{activeGroup ? activeGroup.name : 'Chọn nhóm'}</span>
              <span className="group-role-badge">{roleLabel}</span>
            </div>
            <ChevronDown size={15} className={`chevron-icon ${dropdownOpen ? 'rotated' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="group-dropdown-menu glass-panel shadow-lg">
              <div className="group-dropdown-header">Nhóm của bạn</div>
              <div className="group-dropdown-list">
                {groups.length === 0 ? (
                  <div style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Chưa có nhóm nào
                  </div>
                ) : (
                  groups.map((grp) => (
                    <button
                      type="button"
                      key={grp.id}
                      className={`group-dropdown-item ${grp.id === activeGroup?.id ? 'active' : ''}`}
                      onClick={() => {
                        onSelectGroup(grp.id);
                        setDropdownOpen(false);
                      }}
                    >
                      <span className="dropdown-group-name">{grp.name}</span>
                      <span className="dropdown-member-count">
                        {Object.keys(grp.members || {}).length} thành viên
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="group-dropdown-footer">
                <button 
                  type="button"
                  className="dropdown-action-btn"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenCreateGroup();
                  }}
                >
                  <Plus size={15} />
                  <span>Tạo nhóm mới</span>
                </button>
                <button 
                  type="button"
                  className="dropdown-action-btn"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenJoinGroup();
                  }}
                >
                  <UserPlus size={15} />
                  <span>Nhập mã mời</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {activeGroup ? (
          <button
            type="button"
            className="btn btn-icon group-settings-btn pressable"
            onClick={onOpenGroupSettings}
            title="Cài đặt nhóm & Quản lý thành viên"
            aria-label="Cài đặt nhóm"
          >
            <Settings size={17} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={onOpenCreateGroup}
            >
              <Plus size={15} />
              <span>Tạo nhóm</span>
            </button>
            <button
              type="button"
              className="btn"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={onOpenJoinGroup}
            >
              <UserPlus size={15} />
              <span>Nhập mã</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Center: View Mode Segmented Control ("Giao cho tôi" / "Tôi đã giao" / "Cả nhóm") */}
      <div className="group-bar-center">
        <div className="view-mode-segmented" role="tablist">
          <button
            type="button"
            className={`view-mode-btn pressable ${viewMode === 'assigned_to_me' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('assigned_to_me')}
            role="tab"
            aria-selected={viewMode === 'assigned_to_me'}
            title="Xem các công việc được giao cho bạn"
          >
            <CheckCircle2 size={15} />
            <span>Giao cho tôi</span>
          </button>
          <button
            type="button"
            className={`view-mode-btn pressable ${viewMode === 'assigned_by_me' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('assigned_by_me')}
            role="tab"
            aria-selected={viewMode === 'assigned_by_me'}
            title="Xem các công việc do bạn giao cho người khác"
          >
            <Clock size={15} />
            <span>Tôi đã giao</span>
          </button>
          <button
            type="button"
            className={`view-mode-btn pressable ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('all')}
            role="tab"
            aria-selected={viewMode === 'all'}
            title="Xem tất cả công việc của mọi người trong nhóm"
          >
            <Layers size={15} />
            <span>Cả nhóm</span>
          </button>
        </div>
      </div>

      {/* 3. Right: Primary Action Button "Giao việc mới" */}
      <div className="group-bar-right">
        <button 
          type="button"
          className="btn btn-primary create-task-btn pressable"
          onClick={onOpenCreateTask}
          title="Tạo và giao bài tập/nhiệm vụ mới cho thành viên"
        >
          <Plus size={17} />
          <span>Giao việc mới</span>
        </button>
      </div>
    </div>
  );
}
