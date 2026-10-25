import React, { useState } from 'react';
import { Plus, CheckCircle2, Sparkles } from 'lucide-react';
import { TASK_STATUS, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../services/taskService';

// Status colors for left border/indicator
const STATUS_INDICATOR_COLORS = {
  [TASK_STATUS.TODO]: '#94a3b8',        // Chưa làm = gray
  [TASK_STATUS.IN_PROGRESS]: '#3b82f6', // Đang làm = blue
  [TASK_STATUS.PENDING]: '#a855f7',     // Chờ duyệt = violet
  [TASK_STATUS.COMPLETED]: '#10b981'    // Hoàn thành = emerald
};

function TaskDayCell({
  cellData,
  tasks = [],
  onSelectDay,
  onSelectTask,
  onQuickAdd,
  onDropTask,
  currentUser
}) {
  const { date, dateKey, dayNumber, isCurrentMonth, isToday } = cellData;
  const [isDragOver, setIsDragOver] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isWeekend = date ? (date.getDay() === 0 || date.getDay() === 6) : false;

  // Visual state calculations (Section 5 & Section 2)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length;
  const hasPendingApproval = tasks.some((t) => t.status === TASK_STATUS.PENDING);
  const hasOverdue = tasks.some((t) => t.status !== TASK_STATUS.COMPLETED && t.dueDate < todayStr);
  const allCompleted = totalTasks > 0 && completedTasks === totalTasks;
  const isPartial = totalTasks > 0 && completedTasks > 0 && completedTasks < totalTasks;
  const isEmpty = totalTasks === 0;

  // Split tasks into preview (up to 3) and remainder
  const previewTasks = tasks.slice(0, 3);
  const remainderCount = tasks.length - 3;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onDropTask) {
      onDropTask(taskId, dateKey);
    }
  };

  const handleCellClick = (e) => {
    onSelectDay(dateKey);
  };

  const handleQuickAddClick = (e) => {
    e.stopPropagation();
    onQuickAdd(dateKey);
  };

  return (
    <div
      className={`task-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isWeekend ? 'is-weekend' : ''} ${isToday ? 'is-today' : ''} ${isDragOver ? 'drag-over-active' : ''} ${allCompleted ? 'state-all-completed' : ''} ${hasOverdue ? 'state-has-overdue' : ''} ${isEmpty ? 'state-empty' : ''}`}
      onClick={handleCellClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCellClick(e);
        }
      }}
      title={`Xem công việc ngày ${dayNumber}`}
      aria-label={`Ngày ${dayNumber}${isToday ? ', Hôm nay' : ''}${totalTasks > 0 ? `, ${totalTasks} công việc` : ''}`}
    >
      {/* Cell Header: Day Number, Today Badge (Side-by-side with proper spacing), Progress & Corner + Button */}
      <div className="task-cell-header">
        <div className="day-number-row">
          <span className="day-num">{dayNumber}</span>
          {isToday && <span className="today-chip">HÔM NAY</span>}
        </div>

        <div className="task-cell-indicators">
          {/* Pending Approval Violet Dot */}
          {hasPendingApproval && (
            <span 
              className="pending-approval-dot" 
              title="Có công việc đang chờ duyệt"
              aria-label="Có công việc chờ duyệt"
            />
          )}

          {/* All Completed Emerald Glow Sparkle */}
          {allCompleted && (
            <span className="completed-glow-badge" title="Tất cả công việc đã hoàn thành! 🎉">
              <Sparkles size={11} color="#ffffff" />
            </span>
          )}

          {/* Partial Progress Chip */}
          {isPartial && (
            <span className="partial-progress-chip" title={`${completedTasks}/${totalTasks} việc hoàn thành`}>
              {completedTasks}/{totalTasks}
            </span>
          )}

          {/* Corner Quick Add Button (always accessible on mobile/touch) */}
          <button
            type="button"
            className="quick-add-task-btn pressable"
            onClick={handleQuickAddClick}
            title={`Giao việc nhanh cho ngày ${dayNumber}`}
            aria-label={`Thêm việc nhanh ngày ${dayNumber}`}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Partial Progress Track */}
      {isPartial && (
        <div className="cell-mini-progress-track">
          <div 
            className="cell-mini-progress-bar" 
            style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
          />
        </div>
      )}

      {/* Faint centered "+" quick-add affordance on hover/focus in empty spaces */}
      <div 
        className="empty-cell-quick-add" 
        onClick={handleQuickAddClick}
        title={`Bấm để giao việc mới cho ngày ${dayNumber}`}
        aria-hidden="true"
      >
        <Plus size={18} />
      </div>

      {/* Tasks List (up to 3 preview chips) */}
      <div className="task-items-list">
        {previewTasks.map((task) => {
          const isCompleted = task.status === TASK_STATUS.COMPLETED;
          const isOverdue = !isCompleted && task.dueDate < todayStr;
          const priorityInfo = TASK_PRIORITY_LABELS[task.priority] || TASK_PRIORITY_LABELS.medium;
          const statusInfo = TASK_STATUS_LABELS[task.status] || TASK_STATUS_LABELS.todo;
          const primaryAssignee = task.assignees?.[0];
          const statusBorderColor = STATUS_INDICATOR_COLORS[task.status] || '#94a3b8';

          return (
            <div
              key={task.id}
              className={`task-pill-card pressable ${isCompleted ? 'is-completed' : ''} ${isOverdue ? 'is-overdue' : ''}`}
              style={{
                borderLeft: `3px solid ${statusBorderColor}`
              }}
              draggable="true"
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', task.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTask(task);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  onSelectTask(task);
                }
              }}
              title={`${task.title}\n• Trạng thái: ${statusInfo.label}\n• Ưu tiên: ${priorityInfo.label}${isOverdue ? '\n• Cảnh báo: Quá hạn!' : ''}`}
            >
              {/* Priority Dot */}
              <span 
                className="task-priority-dot" 
                style={{ backgroundColor: priorityInfo.color }}
                title={`Ưu tiên: ${priorityInfo.label}`}
              />

              {/* Assignee Avatar */}
              {primaryAssignee && (
                <img
                  src={primaryAssignee.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${primaryAssignee.uid}`}
                  alt={primaryAssignee.displayName}
                  className="task-pill-avatar"
                  style={{ borderColor: primaryAssignee.accentColor || '#10b981' }}
                  title={`Phụ trách: ${primaryAssignee.displayName}`}
                />
              )}

              {/* Title with Ellipsis */}
              <span className="task-pill-title">{task.title}</span>

              {/* Overdue Labeled Pill: "Quá hạn" (Red text on soft red bg) */}
              {isOverdue && (
                <span className="overdue-chip-pill" title="Công việc đã quá hạn!">
                  Quá hạn
                </span>
              )}

              {/* Completed Emerald Checkmark */}
              {isCompleted && (
                <CheckCircle2 size={13} color="#10b981" className="completed-check-icon" />
              )}
            </div>
          );
        })}

        {/* Remainder Badge (+N nữa) */}
        {remainderCount > 0 && (
          <div 
            className="task-remainder-chip pressable" 
            onClick={(e) => {
              e.stopPropagation();
              onSelectDay(dateKey);
            }}
            role="button"
            tabIndex={0}
            title={`Xem thêm ${remainderCount} công việc khác`}
          >
            +{remainderCount} nữa
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(TaskDayCell);
