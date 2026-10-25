import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  User, 
  Tag, 
  MessageSquare, 
  CheckSquare, 
  ExternalLink, 
  Send, 
  RotateCcw, 
  Check, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { 
  TASK_STATUS, 
  TASK_STATUS_LABELS, 
  TASK_PRIORITY_LABELS, 
  GROUP_ROLES 
} from '../services/taskService';
import { formatFullDateVi, parseDateKey } from '../services/dateUtils';

export default function TaskDetailModal({
  task,
  onClose,
  onUpdateStatus,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onReschedule,
  onProposeReschedule,
  onResolveReschedule,
  onAddComment,
  onDeleteTask,
  onEditTask,
  currentUser,
  activeGroup
}) {
  const [newComment, setNewComment] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [showCompletionNoteBox, setShowCompletionNoteBox] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [showReworkBox, setShowReworkBox] = useState(false);
  const [showRescheduleBox, setShowRescheduleBox] = useState(false);
  const [proposedDate, setProposedDate] = useState(task.dueDate || '');
  const [rescheduleReason, setRescheduleReason] = useState('');

  if (!task) return null;

  const currentUid = currentUser?.uid;
  const isAssignee = task.assignees?.some((a) => a.uid === currentUid);
  const isCreator = task.creatorId === currentUid;
  const userRole = activeGroup?.members?.[currentUid]?.role;
  const isAdminOrOwner = userRole === GROUP_ROLES.OWNER || userRole === GROUP_ROLES.ADMIN;
  const canManage = isCreator || isAdminOrOwner;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const isOverdue = !isCompleted && task.dueDate < todayStr;
  const statusInfo = TASK_STATUS_LABELS[task.status] || TASK_STATUS_LABELS.todo;
  const priorityInfo = TASK_PRIORITY_LABELS[task.priority] || TASK_PRIORITY_LABELS.medium;

  const dateObj = task.dueDate ? parseDateKey(task.dueDate) : new Date();
  const formattedDueDate = formatFullDateVi(dateObj);

  // Status step index (0 to 3)
  const statusSteps = [
    TASK_STATUS.TODO,
    TASK_STATUS.IN_PROGRESS,
    TASK_STATUS.PENDING,
    TASK_STATUS.COMPLETED
  ];
  const currentStepIndex = statusSteps.indexOf(task.status);

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(task.id, newComment);
    setNewComment('');
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    onAddSubtask(task.id, newSubtaskText);
    setNewSubtaskText('');
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card task-detail-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="task-detail-header-tags">
            <span 
              className="task-priority-chip"
              style={{ color: priorityInfo.color, borderColor: priorityInfo.color }}
            >
              • {priorityInfo.label}
            </span>
            {task.tag && (
              <span className="task-category-chip" style={{ color: task.tag.color }}>
                {task.tag.name}
              </span>
            )}
            {isOverdue && (
              <span className="task-overdue-alert-chip">
                <AlertCircle size={13} /> Quá hạn
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {canManage && (
              <button 
                className="btn btn-icon" 
                onClick={() => {
                  onClose();
                  onEditTask(task);
                }} 
                title="Chỉnh sửa công việc"
              >
                <Edit3 size={17} />
              </button>
            )}
            {canManage && (
              <button 
                className="btn btn-icon btn-danger-hover" 
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn xóa công việc này không?')) {
                    onDeleteTask(task.id);
                    onClose();
                  }
                }} 
                title="Xóa công việc"
              >
                <Trash2 size={17} color="#f43f5e" />
              </button>
            )}
            <button className="btn btn-icon" onClick={onClose} title="Đóng">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body task-detail-body">
          {/* Title & Description */}
          <div className="task-main-info">
            <h2 className="task-detail-title">{task.title}</h2>
            {task.description && (
              <p className="task-detail-desc">{task.description}</p>
            )}
          </div>

          {/* Workflow Status Tracker (4 Steps) */}
          <div className="task-workflow-tracker">
            {statusSteps.map((step, idx) => {
              const info = TASK_STATUS_LABELS[step];
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step} className={`workflow-step ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''}`}>
                  <div className="step-circle" style={{ borderColor: isCurrent ? info.color : undefined }}>
                    {isPast || (isCurrent && step === TASK_STATUS.COMPLETED) ? (
                      <Check size={14} color="#10b981" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span className="step-name" style={{ color: isCurrent ? info.color : undefined }}>
                    {info.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Status Action Buttons Bar */}
          <div className="task-action-buttons-bar">
            {/* 1. Assignee Actions */}
            {isAssignee && task.status === TASK_STATUS.TODO && (
              <button 
                className="btn btn-primary"
                onClick={() => onUpdateStatus(task.id, TASK_STATUS.IN_PROGRESS)}
              >
                <Clock size={16} />
                <span>Bắt đầu làm</span>
              </button>
            )}

            {isAssignee && task.status === TASK_STATUS.IN_PROGRESS && (
              <>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    if (task.requiresApproval && !isCreator) {
                      setShowCompletionNoteBox(!showCompletionNoteBox);
                    } else {
                      onUpdateStatus(task.id, TASK_STATUS.PENDING);
                    }
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{task.requiresApproval && !isCreator ? 'Gửi duyệt hoàn thành' : 'Đánh dấu hoàn thành'}</span>
                </button>
              </>
            )}

            {/* 2. Reviewer / Creator Actions */}
            {canManage && task.status === TASK_STATUS.PENDING && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => onUpdateStatus(task.id, TASK_STATUS.COMPLETED)}
                >
                  <CheckCircle2 size={16} />
                  <span>Duyệt hoàn thành</span>
                </button>
                <button 
                  className="btn"
                  onClick={() => setShowReworkBox(!showReworkBox)}
                  style={{ color: '#f59e0b', borderColor: '#f59e0b' }}
                >
                  <RotateCcw size={16} />
                  <span>Yêu cầu làm lại</span>
                </button>
              </div>
            )}

            {/* Quick Re-open if Completed */}
            {canManage && task.status === TASK_STATUS.COMPLETED && (
              <button 
                className="btn"
                onClick={() => onUpdateStatus(task.id, TASK_STATUS.IN_PROGRESS)}
                title="Mở lại công việc"
              >
                <RotateCcw size={15} />
                <span>Mở lại công việc</span>
              </button>
            )}
          </div>

          {/* Completion Note Prompt for Assignee */}
          {showCompletionNoteBox && (
            <div className="completion-note-box glass-panel">
              <label className="field-label">Ghi chú hoàn thành (tùy chọn):</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="VD: Đã làm xong và nộp file bài tập trên Drive..."
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setShowCompletionNoteBox(false)}>Hủy</button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    onUpdateStatus(task.id, TASK_STATUS.PENDING, { completionNote });
                    setShowCompletionNoteBox(false);
                  }}
                >
                  Gửi duyệt ngay
                </button>
              </div>
            </div>
          )}

          {/* Rework Note Box for Assigner */}
          {showReworkBox && (
            <div className="rework-note-box glass-panel">
              <label className="field-label">Lý do yêu cầu làm lại / Góp ý:</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="VD: Cần bổ sung thêm ví dụ phần 2 và sửa lại định dạng..."
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setShowReworkBox(false)}>Hủy</button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    onUpdateStatus(task.id, TASK_STATUS.IN_PROGRESS, { 
                      requestRework: true, 
                      feedbackNote 
                    });
                    setShowReworkBox(false);
                  }}
                >
                  Xác nhận yêu cầu
                </button>
              </div>
            </div>
          )}

          {/* Completion Note Banner if present */}
          {task.completionNote && (
            <div className="task-note-banner completion-banner">
              <strong>📝 Ghi chú hoàn thành:</strong> {task.completionNote}
            </div>
          )}

          {/* Feedback Note Banner if present */}
          {task.feedbackNote && task.status !== TASK_STATUS.COMPLETED && (
            <div className="task-note-banner feedback-banner">
              <strong>⚠️ Phản hồi từ người giao việc:</strong> {task.feedbackNote}
            </div>
          )}

          {/* Pending Reschedule Proposal Banner */}
          {task.rescheduleProposal && task.rescheduleProposal.status === 'pending' && (
            <div className="reschedule-proposal-banner glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <div>
                  <strong>{task.rescheduleProposal.proposedByName || 'Thành viên'}</strong> đề xuất dời hạn sang <strong>{task.rescheduleProposal.proposedDate}</strong>
                  {task.rescheduleProposal.reason && (
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Lý do: {task.rescheduleProposal.reason}
                    </p>
                  )}
                </div>
              </div>

              {canManage && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => onResolveReschedule(task.id, true)}
                  >
                    Chấp nhận dời hạn
                  </button>
                  <button 
                    className="btn btn-sm"
                    onClick={() => onResolveReschedule(task.id, false)}
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Key Details Grid */}
          <div className="task-details-meta-grid">
            {/* Due Date & Reschedule Trigger */}
            <div className="meta-item">
              <span className="meta-label">
                <Calendar size={14} /> Hạn chót
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <span className="meta-value">{formattedDueDate}</span>
                <button 
                  className="reschedule-trigger-btn"
                  onClick={() => setShowRescheduleBox(!showRescheduleBox)}
                  title="Thay đổi hoặc đề xuất hạn mới"
                >
                  Dời hạn
                </button>
              </div>
            </div>

            {/* Assignees */}
            <div className="meta-item">
              <span className="meta-label">
                <User size={14} /> Người thực hiện
              </span>
              <div className="assignees-chips-list" style={{ marginTop: '0.25rem' }}>
                {task.assignees?.map((a) => (
                  <div key={a.uid} className="assignee-detail-badge">
                    <img 
                      src={a.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${a.uid}`} 
                      alt={a.displayName}
                      className="assignee-badge-avatar"
                      style={{ borderColor: a.accentColor || '#10b981' }}
                    />
                    <span>{a.displayName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigner */}
            <div className="meta-item">
              <span className="meta-label">Người giao việc</span>
              <span className="meta-value">{task.creatorName || 'Tôi'}</span>
            </div>

            {/* Approval Requirement */}
            <div className="meta-item">
              <span className="meta-label">Yêu cầu duyệt</span>
              <span className="meta-value">
                {task.requiresApproval ? 'Cần người giao duyệt' : 'Tự động hoàn thành'}
              </span>
            </div>
          </div>

          {/* Reschedule Proposal Box */}
          {showRescheduleBox && (
            <div className="reschedule-box glass-panel">
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                {canManage ? 'Chọn ngày hạn chót mới' : 'Đề xuất ngày hạn chót mới'}
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input 
                  type="date" 
                  className="form-input"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                />
                {!canManage && (
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="Lý do đề xuất dời hạn..."
                    style={{ flex: 1 }}
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                  />
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (canManage) {
                      onReschedule(task.id, proposedDate);
                    } else {
                      onProposeReschedule(task.id, { proposedDate, reason: rescheduleReason });
                    }
                    setShowRescheduleBox(false);
                  }}
                >
                  {canManage ? 'Cập nhật hạn' : 'Gửi đề xuất'}
                </button>
              </div>
            </div>
          )}

          {/* Link Attachment if present */}
          {task.attachmentUrl && (
            <div className="task-attachment-section">
              <span className="meta-label">Tài liệu đính kèm</span>
              <a 
                href={task.attachmentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="attachment-link-card glass-panel"
              >
                <ExternalLink size={16} color="#3b82f6" />
                <span>{task.attachmentTitle || task.attachmentUrl}</span>
              </a>
            </div>
          )}

          {/* Subtasks Checklist */}
          <div className="task-checklist-section">
            <div className="section-title-row">
              <CheckSquare size={16} color="#10b981" />
              <h3 className="section-heading">
                Danh sách đầu việc nhỏ ({task.checklist?.filter((s) => s.completed).length || 0}/{task.checklist?.length || 0})
              </h3>
            </div>

            <div className="checklist-items-container">
              {task.checklist?.map((item) => (
                <div key={item.id} className="checklist-row">
                  <div 
                    className="custom-checkbox"
                    onClick={() => onToggleSubtask(task.id, item.id)}
                    role="checkbox"
                    aria-checked={item.completed}
                  >
                    <span className={`checkbox-box ${item.completed ? 'is-checked' : ''}`}>
                      {item.completed && <Check size={13} strokeWidth={3} />}
                    </span>
                  </div>
                  <span className={`checklist-item-text ${item.completed ? 'completed' : ''}`}>
                    {item.text}
                  </span>
                  <button 
                    className="delete-subtask-btn"
                    onClick={() => onDeleteSubtask(task.id, item.id)}
                    title="Xóa mục này"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSubtask} className="add-subtask-form">
              <input 
                type="text"
                className="form-input"
                placeholder="+ Thêm mục kiểm tra nhỏ..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
              />
              {newSubtaskText.trim() && (
                <button type="submit" className="btn btn-sm btn-primary">
                  Thêm
                </button>
              )}
            </form>
          </div>

          {/* Comments Thread */}
          <div className="task-comments-section">
            <div className="section-title-row">
              <MessageSquare size={16} color="#8b5cf6" />
              <h3 className="section-heading">
                Bình luận trao đổi ({task.comments?.length || 0})
              </h3>
            </div>

            <div className="comments-stream">
              {(!task.comments || task.comments.length === 0) ? (
                <div className="no-comments-placeholder">
                  Chưa có bình luận nào. Hãy gửi lời nhắn đầu tiên!
                </div>
              ) : (
                task.comments.map((comm) => (
                  <div key={comm.id} className="comment-item">
                    <img 
                      src={comm.authorAvatar} 
                      alt={comm.authorName} 
                      className="comment-avatar"
                      style={{ borderColor: comm.authorColor || '#10b981' }}
                    />
                    <div className="comment-bubble glass-panel">
                      <div className="comment-header">
                        <span className="comment-author">{comm.authorName}</span>
                        <span className="comment-time">
                          {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="comment-text">{comm.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleSendComment} className="comment-input-form">
              <input 
                type="text"
                className="form-input"
                placeholder="Nhập phản hồi hoặc trao đổi..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn btn-primary send-comment-btn"
                disabled={!newComment.trim()}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
