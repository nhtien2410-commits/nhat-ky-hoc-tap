import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, UserPlus } from 'lucide-react';
import TaskDayCell from './TaskDayCell';
import { 
  WEEKDAYS_VI, 
  MONTH_NAMES_VI, 
  getCalendarGrid 
} from '../services/dateUtils';

function TaskCalendarView({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  tasks = [],
  onSelectDay,
  onSelectTask,
  onQuickAdd,
  onDropTask,
  currentUser,
  activeGroup,
  onOpenCreateGroup,
  onOpenJoinGroup
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysGrid = useMemo(() => getCalendarGrid(year, month), [year, month]);
  const monthLabel = useMemo(() => `${MONTH_NAMES_VI[month]}, ${year}`, [month, year]);

  // Group tasks by dueDate (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (t.dueDate) {
        if (!map[t.dueDate]) map[t.dueDate] = [];
        map[t.dueDate].push(t);
      }
    });
    return map;
  }, [tasks]);

  return (
    <div className="calendar-container glass-panel">
      {/* Friendly Empty State Banner when no group is joined */}
      {!activeGroup && (
        <div style={{
          margin: '1.25rem 1.25rem 0.5rem',
          padding: '1.4rem 1.6rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px dashed rgba(16, 185, 129, 0.4)',
          borderRadius: '16px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: '#10b981', marginBottom: '0.4rem', fontSize: '1.15rem', fontWeight: 600 }}>
            👋 Bạn chưa có nhóm làm việc nào
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto 1rem' }}>
            Hãy bấm <strong>Tạo nhóm mới</strong> để bắt đầu giao bài tập cho bạn bè, hoặc <strong>Nhập mã mời</strong> nếu bạn được bạn bè chia sẻ mã.
          </p>
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary pressable" 
              onClick={onOpenCreateGroup}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.2rem' }}
            >
              <Plus size={16} />
              <span>+ Tạo nhóm mới ngay</span>
            </button>
            <button 
              className="btn pressable" 
              onClick={onOpenJoinGroup}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.2rem' }}
            >
              <UserPlus size={16} />
              <span>Nhập mã mời</span>
            </button>
          </div>
        </div>
      )}

      {/* Calendar Top Navigation Bar */}
      <div className="calendar-top-bar">
        <div className="calendar-title-group">
          <CalendarIcon size={24} color="#10b981" />
          <h2 className="month-heading">{monthLabel}</h2>
          <span className="task-month-summary-badge">
            {tasks.length} công việc trong tháng
          </span>
        </div>

        <div className="calendar-nav-buttons">
          <button 
            className="btn btn-icon pressable" 
            onClick={onPrevMonth}
            title="Tháng trước"
            aria-label="Tháng trước"
          >
            <ChevronLeft size={20} />
          </button>

          <button 
            className="today-btn pressable" 
            onClick={onGoToday}
            title="Quay về tháng và ngày hôm nay"
          >
            Hôm nay
          </button>

          <button 
            className="btn btn-icon pressable" 
            onClick={onNextMonth}
            title="Tháng sau"
            aria-label="Tháng sau"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Weekday Columns (Monday to Sunday) */}
      <div className="calendar-weekdays-grid">
        {WEEKDAYS_VI.map((weekday, idx) => (
          <div 
            key={weekday.short} 
            className={`weekday-header ${idx === 6 ? 'weekend' : ''}`}
          >
            <span className="weekday-full">{weekday.full}</span>
          </div>
        ))}
      </div>

      {/* Monthly Days 7-Column Grid */}
      <div className="calendar-month-grid">
        {daysGrid.map((cell) => (
          <TaskDayCell
            key={cell.dateKey}
            cellData={cell}
            tasks={tasksByDate[cell.dateKey] || []}
            onSelectDay={onSelectDay}
            onSelectTask={onSelectTask}
            onQuickAdd={onQuickAdd}
            onDropTask={onDropTask}
            currentUser={currentUser}
          />
        ))}
      </div>
    </div>
  );
}

export default React.memo(TaskCalendarView);
