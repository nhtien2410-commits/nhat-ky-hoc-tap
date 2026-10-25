import React from 'react';
import { 
  Filter, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  X,
  Tag
} from 'lucide-react';
import { TASK_STATUS, TASK_PRIORITY } from '../services/taskService';

const PRESET_CATEGORIES = [
  'Tiếng Anh',
  'Toán học',
  'Đọc sách',
  'Bài tập nhóm',
  'Dự án',
  'Chung'
];

export default function TaskFilterBar({
  activeGroup = null,
  selectedMemberFilter = null,
  onSelectMemberFilter,
  statusFilter = null,
  onStatusFilterChange,
  priorityFilter = null,
  onPriorityFilterChange,
  categoryFilter = null,
  onCategoryFilterChange,
  onClearFilters,
  activeFilterCount = 0,
  isTodayDrawerOpen = false,
  onToggleTodayDrawer,
  todayTaskCount = 0
}) {
  const membersList = activeGroup?.members ? Object.values(activeGroup.members) : [];

  return (
    <div className="task-filter-bar glass-panel">
      {/* Left: Member Avatar Chips */}
      <div className="filter-bar-left">
        {membersList.length > 0 && (
          <div className="member-filter-chips">
            <span className="member-filter-label" title="Lọc theo người phụ trách">
              Thành viên:
            </span>
            <button
              type="button"
              className={`member-chip ${selectedMemberFilter === null ? 'active' : ''}`}
              onClick={() => onSelectMemberFilter(null)}
              title="Xem tất cả thành viên"
              aria-label="Xem tất cả thành viên"
            >
              <span>Tất cả</span>
            </button>
            {membersList.map((m) => {
              const isSelected = selectedMemberFilter === m.uid;
              const shortName = m.displayName?.trim().split(' ').pop() || 'TV';
              return (
                <button
                  type="button"
                  key={m.uid}
                  className={`member-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectMemberFilter(isSelected ? null : m.uid)}
                  title={`Lọc theo: ${m.displayName || shortName}`}
                  aria-label={`Lọc theo ${m.displayName || shortName}`}
                >
                  <img
                    src={m.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.uid}`}
                    alt={m.displayName || shortName}
                    className="member-chip-avatar"
                    style={{ borderColor: m.accentColor || '#10b981' }}
                  />
                  <span className="member-chip-name">{shortName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Center: Dropdown Filter Selects + Filter Badge + Clear link */}
      <div className="filter-bar-center">
        {/* Status Filter */}
        <div className="custom-select-wrapper">
          <select
            className="form-control-select"
            value={statusFilter || 'all'}
            onChange={(e) => onStatusFilterChange(e.target.value === 'all' ? null : e.target.value)}
            title="Lọc theo trạng thái"
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="todo">Chưa làm</option>
            <option value="in_progress">Đang làm</option>
            <option value="pending_approval">Chờ duyệt</option>
            <option value="completed">Hoàn thành</option>
            <option value="overdue">Quá hạn</option>
          </select>
          <ChevronDown size={14} className="select-arrow-icon" aria-hidden="true" />
        </div>

        {/* Priority Filter */}
        <div className="custom-select-wrapper">
          <select
            className="form-control-select"
            value={priorityFilter || 'all'}
            onChange={(e) => onPriorityFilterChange(e.target.value === 'all' ? null : e.target.value)}
            title="Lọc theo mức độ ưu tiên"
            aria-label="Lọc theo mức độ ưu tiên"
          >
            <option value="all">Tất cả ưu tiên</option>
            <option value="high">Cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>
          <ChevronDown size={14} className="select-arrow-icon" aria-hidden="true" />
        </div>

        {/* Category Filter */}
        <div className="custom-select-wrapper">
          <select
            className="form-control-select"
            value={categoryFilter || 'all'}
            onChange={(e) => onCategoryFilterChange(e.target.value === 'all' ? null : e.target.value)}
            title="Lọc theo danh mục"
            aria-label="Lọc theo danh mục"
          >
            <option value="all">Tất cả danh mục</option>
            {PRESET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={14} className="select-arrow-icon" aria-hidden="true" />
        </div>

        {/* Active Filter Count Badge */}
        {activeFilterCount > 0 && (
          <span className="active-filter-badge" title={`${activeFilterCount} bộ lọc đang áp dụng`}>
            Bộ lọc ({activeFilterCount})
          </span>
        )}

        {/* Clear Filters Link */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            className="clear-filters-btn pressable"
            onClick={onClearFilters}
            title="Xóa tất cả bộ lọc đang áp dụng"
          >
            <X size={13} />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {/* Right: "Việc hôm nay (n)" toggle button at far end */}
      <div className="filter-bar-right">
        <button
          type="button"
          className={`today-drawer-toggle-btn pressable ${isTodayDrawerOpen ? 'active' : ''}`}
          onClick={onToggleTodayDrawer}
          title="Xem danh sách công việc cần làm hôm nay"
          aria-expanded={isTodayDrawerOpen}
        >
          <Calendar size={15} color="#10b981" />
          <span>Việc hôm nay ({todayTaskCount})</span>
          {isTodayDrawerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
    </div>
  );
}
