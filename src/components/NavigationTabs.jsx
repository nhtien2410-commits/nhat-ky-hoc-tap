import React from 'react';
import { BookOpen, Users } from 'lucide-react';

export default function NavigationTabs({ activeTab, onTabChange, taskCount = 0 }) {
  const badgeText = taskCount > 9 ? '9+' : String(taskCount);
  const badgeLabel = `${taskCount} việc cần bạn xử lý`;

  return (
    <div className="nav-tabs-container" role="tablist">
      <button
        className={`nav-tab-btn ${activeTab === 'diary' ? 'active' : ''}`}
        onClick={() => onTabChange('diary')}
        role="tab"
        aria-selected={activeTab === 'diary'}
        aria-label="Nhật ký học tập"
      >
        <BookOpen size={18} strokeWidth={2.2} />
        <span>Nhật ký học tập</span>
      </button>

      <button
        className={`nav-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
        onClick={() => onTabChange('tasks')}
        role="tab"
        aria-selected={activeTab === 'tasks'}
        aria-label={taskCount > 0 ? `Giao việc nhóm, ${badgeLabel}` : 'Giao việc nhóm'}
      >
        <Users size={18} strokeWidth={2.2} />
        <span>Giao việc nhóm</span>
        {taskCount > 0 && (
          <span 
            className="nav-tab-badge" 
            title={badgeLabel}
            aria-label={badgeLabel}
          >
            {badgeText}
          </span>
        )}
      </button>
    </div>
  );
}
