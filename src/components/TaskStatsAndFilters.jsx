import React, { useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Trophy, 
  Calendar, 
  Check, 
  Sparkles
} from 'lucide-react';
import { TASK_STATUS } from '../services/taskService';
import { celebrationManager } from '../three/CelebrationEffects';
import { useCountUp } from '../hooks/useCountUp';

export default function TaskStatsAndFilters({
  tasks = [],
  activeGroup = null,
  currentUser = null,
  viewMode = 'all',
  statusFilter = null,
  onStatusFilterChange,
  onSelectTask,
  onToggleTaskComplete,
  isTodayDrawerOpen = false,
  onToggleTodayDrawer
}) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Today's tasks
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === todayStr);
  }, [tasks, todayStr]);

  // Monthly stats calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
  const overdueTasks = tasks.filter((t) => t.status !== TASK_STATUS.COMPLETED && t.dueDate < todayStr).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Animated Count-up values
  const animatedTotal = useCountUp(totalTasks);
  const animatedCompleted = useCountUp(completedTasks);
  const animatedOverdue = useCountUp(overdueTasks);
  const animatedRate = useCountUp(completionRate);

  // Member Leaderboard (Completed tasks per member)
  const leaderboard = useMemo(() => {
    if (!activeGroup?.members) return [];
    const memberCounts = {};
    Object.values(activeGroup.members).forEach((m) => {
      memberCounts[m.uid] = {
        member: m,
        count: 0
      };
    });

    tasks.forEach((t) => {
      if (t.status === TASK_STATUS.COMPLETED && Array.isArray(t.assignees)) {
        t.assignees.forEach((a) => {
          if (memberCounts[a.uid]) {
            memberCounts[a.uid].count += 1;
          }
        });
      }
    });

    return Object.values(memberCounts).sort((a, b) => b.count - a.count);
  }, [tasks, activeGroup]);

  // Click on "Quá hạn" card to apply overdue filter and scroll to calendar
  const handleOverdueCardClick = () => {
    if (onStatusFilterChange) {
      onStatusFilterChange(statusFilter === 'overdue' ? null : 'overdue');
    }
    const calEl = document.querySelector('.calendar-container');
    if (calEl) {
      calEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Quick complete task from Today drawer
  const handleQuickCheck = (e, task) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const isNowDone = task.status !== TASK_STATUS.COMPLETED;
    
    if (isNowDone) {
      celebrationManager.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'star_burst');
    }

    if (onToggleTaskComplete) {
      onToggleTaskComplete(task.id, isNowDone ? TASK_STATUS.COMPLETED : TASK_STATUS.TODO);
    }
  };

  return (
    <div className="task-stats-section">
      {/* 1. Stats Cards with soft colored icon tiles (Section 4) */}
      <div className="task-stats-bar">
        {/* Card 1: Total Tasks (Blue Tile) */}
        <div className="task-stat-card glass-panel">
          <div className="task-stat-header">
            <span className="task-stat-title">Tổng nhiệm vụ</span>
            <div className="stat-icon-tile tile-blue" aria-hidden="true">
              <Calendar size={18} color="#3b82f6" />
            </div>
          </div>
          <div className="task-stat-num">{animatedTotal}</div>
          <span className="task-stat-caption">trong tháng này</span>
        </div>

        {/* Card 2: Completed (Emerald Tile) */}
        <div className="task-stat-card glass-panel">
          <div className="task-stat-header">
            <span className="task-stat-title">Đã hoàn thành</span>
            <div className="stat-icon-tile tile-emerald" aria-hidden="true">
              <CheckCircle2 size={18} color="#10b981" />
            </div>
          </div>
          <div className="task-stat-num" style={{ color: '#10b981' }}>{animatedCompleted}</div>
          <div className="task-stat-progress-track">
            <div className="task-stat-progress-fill" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Card 3: Overdue (Red Tile) - Clickable to filter & scroll */}
        <div 
          className={`task-stat-card glass-panel pressable stat-card-overdue ${statusFilter === 'overdue' ? 'active-filter' : ''}`}
          onClick={handleOverdueCardClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOverdueCardClick();
            }
          }}
          title={overdueTasks > 0 ? "Bấm để lọc công việc quá hạn trên lịch" : "Không có việc quá hạn"}
        >
          <div className="task-stat-header">
            <span className="task-stat-title">Quá hạn</span>
            <div className="stat-icon-tile tile-rose" aria-hidden="true">
              <AlertTriangle size={18} color="#f43f5e" />
            </div>
          </div>
          <div className="task-stat-num" style={{ color: overdueTasks > 0 ? '#f43f5e' : 'var(--text-main)' }}>
            {animatedOverdue}
          </div>
          <span className={`task-stat-caption ${overdueTasks > 0 ? 'text-danger' : ''}`}>
            {overdueTasks > 0 ? 'Cần hoàn thành sớm! (bấm để xem)' : 'Không có việc trễ hạn'}
          </span>
        </div>

        {/* Card 4: Completion Rate (Violet Tile) */}
        <div className="task-stat-card glass-panel">
          <div className="task-stat-header">
            <span className="task-stat-title">Tỷ lệ hoàn thành</span>
            <div className="stat-icon-tile tile-violet" aria-hidden="true">
              <TrendingUp size={18} color="#8b5cf6" />
            </div>
          </div>
          <div className="task-stat-num" style={{ color: '#8b5cf6' }}>{animatedRate}%</div>
          <div className="task-stat-progress-track">
            <div 
              className="task-stat-progress-fill" 
              style={{ width: `${completionRate}%`, background: 'linear-gradient(90deg, #8b5cf6, #10b981)' }} 
            />
          </div>
        </div>
      </div>

      {/* 2. Member Leaderboard in "Cả nhóm" mode */}
      {viewMode === 'all' && leaderboard.length > 0 && (
        <div className="task-leaderboard-card glass-panel">
          <div className="leaderboard-title">
            <Trophy size={18} color="#f59e0b" />
            <span>Bảng vinh danh thành viên nhóm</span>
          </div>
          <div className="leaderboard-grid">
            {leaderboard.map((item, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              return (
                <div key={item.member.uid} className="leaderboard-item">
                  <span className="leaderboard-medal">{medal}</span>
                  <img
                    src={item.member.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.member.uid}`}
                    alt={item.member.displayName}
                    className="leaderboard-avatar"
                    style={{ borderColor: item.member.accentColor || '#10b981' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="leaderboard-name">
                      {item.member.displayName}
                    </span>
                    <span className="leaderboard-score">
                      {item.count} việc xong
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Collapsible "Việc hôm nay" Drawer */}
      {isTodayDrawerOpen && (
        <div className="today-tasks-drawer glass-panel">
          <div className="today-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={17} color="#10b981" />
              <strong>Danh sách công việc hôm nay ({todayStr})</strong>
            </div>
            <span className="today-drawer-hint">Bấm checkbox để hoàn thành nhanh</span>
          </div>

          {todayTasks.length === 0 ? (
            <div className="today-drawer-empty">
              🌟 Hôm nay không có công việc nào cần hoàn thành!
            </div>
          ) : (
            <div className="today-drawer-list">
              {todayTasks.map((task) => {
                const isCompleted = task.status === TASK_STATUS.COMPLETED;
                return (
                  <div 
                    key={task.id} 
                    className="today-task-row pressable"
                    onClick={() => onSelectTask(task)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <div
                        className={`checkbox-box ${isCompleted ? 'is-checked' : ''}`}
                        onClick={(e) => handleQuickCheck(e, task)}
                        style={{ cursor: 'pointer', flexShrink: 0 }}
                        title={isCompleted ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
                        role="checkbox"
                        aria-checked={isCompleted}
                      >
                        {isCompleted && <Check size={13} strokeWidth={3} />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className={`today-task-title ${isCompleted ? 'is-done' : ''}`}>
                          {task.title}
                        </div>
                        <div className="today-task-meta">
                          <span>Giao bởi: {task.creatorName || 'Thành viên'}</span>
                          {task.tag && (
                            <span style={{ color: task.tag.color }}>• {task.tag.name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      {task.assignees?.map((a) => (
                        <img
                          key={a.uid}
                          src={a.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${a.uid}`}
                          alt={a.displayName}
                          className="today-task-assignee-avatar"
                          style={{ borderColor: a.accentColor || '#10b981' }}
                          title={a.displayName}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
