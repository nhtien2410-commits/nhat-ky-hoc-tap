import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  Tag, 
  AlertCircle, 
  Repeat, 
  CheckSquare, 
  Link, 
  ShieldCheck, 
  Plus, 
  Trash2 
} from 'lucide-react';
import { TASK_PRIORITY } from '../services/taskService';

const PRESET_TAGS = [
  { name: 'Tiếng Anh', color: '#3b82f6' },
  { name: 'Toán học', color: '#10b981' },
  { name: 'Đọc sách', color: '#8b5cf6' },
  { name: 'Bài tập nhóm', color: '#f59e0b' },
  { name: 'Dự án', color: '#f43f5e' },
  { name: 'Chung', color: '#64748b' }
];

export default function TaskCreateModal({
  initialDate,
  editingTask = null,
  activeGroup,
  onClose,
  onCreateTask,
  onUpdateTask,
  currentUser
}) {
  const members = activeGroup?.members ? Object.values(activeGroup.members) : [];

  const [title, setTitle] = useState(editingTask?.title || '');
  const [titleError, setTitleError] = useState('');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [dueDate, setDueDate] = useState(editingTask?.dueDate || initialDate || new Date().toISOString().slice(0, 10));
  const [selectedAssigneeUids, setSelectedAssigneeUids] = useState(() => {
    if (editingTask?.assignees) {
      return editingTask.assignees.map((a) => a.uid);
    }
    return currentUser ? [currentUser.uid] : [];
  });
  const [priority, setPriority] = useState(editingTask?.priority || TASK_PRIORITY.MEDIUM);
  const [tag, setTag] = useState(editingTask?.tag || PRESET_TAGS[0]);
  const [repeat, setRepeat] = useState(editingTask?.repeat || 'none');
  const [requiresApproval, setRequiresApproval] = useState(
    editingTask ? Boolean(editingTask.requiresApproval) : true
  );
  const [attachmentUrl, setAttachmentUrl] = useState(editingTask?.attachmentUrl || '');
  const [attachmentTitle, setAttachmentTitle] = useState(editingTask?.attachmentTitle || '');
  
  // Checklist
  const [checklist, setChecklist] = useState(editingTask?.checklist || []);
  const [newSubtask, setNewSubtask] = useState('');

  const toggleAssignee = (uid) => {
    if (selectedAssigneeUids.includes(uid)) {
      if (selectedAssigneeUids.length > 1) {
        setSelectedAssigneeUids(selectedAssigneeUids.filter((id) => id !== uid));
      }
    } else {
      setSelectedAssigneeUids([...selectedAssigneeUids, uid]);
    }
  };

  const handleAddSubtask = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newSubtask.trim()) return;
    setChecklist([
      ...checklist,
      { id: 'sub_' + Date.now(), text: newSubtask.trim(), completed: false }
    ]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (id) => {
    setChecklist(checklist.filter((i) => i.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Vui lòng nhập tiêu đề');
      return;
    }
    setTitleError('');

    // Map selected UIDs to assignee objects
    const assignees = members
      .filter((m) => selectedAssigneeUids.includes(m.uid))
      .map((m) => ({
        uid: m.uid,
        displayName: m.displayName,
        photoURL: m.photoURL,
        accentColor: m.accentColor
      }));

    const payload = {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      assignees: assignees.length > 0 ? assignees : (currentUser ? [{
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        accentColor: currentUser.accentColor
      }] : []),
      priority,
      tag,
      repeat,
      requiresApproval,
      checklist,
      attachmentUrl: attachmentUrl.trim(),
      attachmentTitle: attachmentTitle.trim()
    };

    if (editingTask) {
      onUpdateTask(editingTask.id, payload);
    } else {
      onCreateTask(payload);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card task-create-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">
            {editingTask ? 'Chỉnh sửa công việc' : 'Giao việc mới'}
          </h3>
          <button className="btn btn-icon" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="modal-body task-form">
          {/* Field 1: Title */}
          <div className="form-field">
            <label className="field-label" htmlFor="task-title-input">
              Tiêu đề công việc <span className="required-star">*</span>
            </label>
            <input 
              id="task-title-input"
              type="text"
              className={`form-input ${titleError ? 'input-error' : ''}`}
              placeholder="VD: Làm bài tập 10 từ vựng tiếng Anh..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError && e.target.value.trim()) {
                  setTitleError('');
                }
              }}
              autoFocus
            />
            {titleError && (
              <span className="form-error-msg">
                <AlertCircle size={14} /> {titleError}
              </span>
            )}
          </div>

          {/* Field 2: Description */}
          <div className="form-field">
            <label className="field-label" htmlFor="task-desc-input">Mô tả chi tiết</label>
            <textarea 
              id="task-desc-input"
              className="form-textarea"
              rows={3}
              placeholder="Mô tả cụ thể yêu cầu, lưu ý hoặc hướng dẫn hoàn thành..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Field 3: Assignees Selector */}
          <div className="form-field">
            <label className="field-label">Người thực hiện (chọn một hoặc nhiều bạn):</label>
            <div className="assignees-selector-grid">
              {members.map((m) => {
                const isSelected = selectedAssigneeUids.includes(m.uid);
                return (
                  <button
                    type="button"
                    key={m.uid}
                    className={`assignee-pick-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleAssignee(m.uid)}
                  >
                    <img 
                      src={m.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.uid}`} 
                      alt={m.displayName}
                      className="assignee-pick-avatar"
                      style={{ borderColor: m.accentColor || '#10b981' }}
                    />
                    <span className="assignee-pick-name">{m.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 4: 2-column row for Due Date & Repeat */}
          <div className="form-row-2col">
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor="task-due-date">
                <Calendar size={14} /> Hạn chót
              </label>
              <input 
                id="task-due-date"
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor="task-repeat-select">
                <Repeat size={14} /> Lặp lại công việc
              </label>
              <select 
                id="task-repeat-select"
                className="form-input" 
                value={repeat} 
                onChange={(e) => setRepeat(e.target.value)}
              >
                <option value="none">Không lặp lại</option>
                <option value="daily">Hàng ngày</option>
                <option value="weekly">Hàng tuần</option>
                <option value="weekdays">Các ngày trong tuần (T2 - T6)</option>
              </select>
            </div>
          </div>

          {/* Field 5: Priority Selector */}
          <div className="form-field">
            <label className="field-label">Mức độ ưu tiên</label>
            <div className="priority-pill-selector">
              <button
                type="button"
                className={`priority-pill priority-low ${priority === TASK_PRIORITY.LOW ? 'active' : ''}`}
                onClick={() => setPriority(TASK_PRIORITY.LOW)}
              >
                Thấp
              </button>
              <button
                type="button"
                className={`priority-pill priority-medium ${priority === TASK_PRIORITY.MEDIUM ? 'active' : ''}`}
                onClick={() => setPriority(TASK_PRIORITY.MEDIUM)}
              >
                Trung bình
              </button>
              <button
                type="button"
                className={`priority-pill priority-high ${priority === TASK_PRIORITY.HIGH ? 'active' : ''}`}
                onClick={() => setPriority(TASK_PRIORITY.HIGH)}
              >
                Cao
              </button>
            </div>
          </div>

          {/* Field 6: Category Tag Selector */}
          <div className="form-field">
            <label className="field-label">
              <Tag size={14} /> Danh mục / Thẻ
            </label>
            <div className="preset-tags-container">
              {PRESET_TAGS.map((t) => {
                const isSelected = tag?.name === t.name;
                return (
                  <button
                    type="button"
                    key={t.name}
                    className={`tag-choice-chip ${isSelected ? 'active' : ''}`}
                    style={{ 
                      borderColor: t.color, 
                      backgroundColor: isSelected ? t.color : 'transparent',
                      color: isSelected ? '#ffffff' : t.color 
                    }}
                    onClick={() => setTag(t)}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 7: Checklist Subtasks */}
          <div className="form-field">
            <label className="field-label">
              <CheckSquare size={14} /> Các đầu việc nhỏ (Checklist)
            </label>
            {checklist.length > 0 && (
              <div className="create-checklist-list" style={{ marginBottom: '8px' }}>
                {checklist.map((item) => (
                  <div key={item.id} className="checklist-preview-row">
                    <span>• {item.text}</span>
                    <button 
                      type="button" 
                      className="delete-subtask-btn"
                      onClick={() => handleRemoveSubtask(item.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="checklist-add-row">
              <input 
                type="text"
                className="form-input"
                placeholder="+ Thêm mục kiểm tra... (nhấn Enter)"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask(e);
                  }
                }}
              />
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleAddSubtask}
              >
                <Plus size={16} /> Thêm
              </button>
            </div>
          </div>

          {/* Field 8: Link Attachment */}
          <div className="form-field">
            <label className="field-label">
              <Link size={14} /> Đính kèm liên kết / tài liệu
            </label>
            <div className="link-inputs-row">
              <input 
                type="url"
                className="form-input link-url-input"
                placeholder="https://... (URL tài liệu)"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
              />
              <input 
                type="text"
                className="form-input link-title-input"
                placeholder="Tên hiển thị..."
                value={attachmentTitle}
                onChange={(e) => setAttachmentTitle(e.target.value)}
              />
            </div>
          </div>

          {/* Field 9: Requires Approval Checkbox */}
          <div className="approval-toggle-row glass-panel" style={{ marginBottom: '20px' }}>
            <div className="custom-checkbox" onClick={() => setRequiresApproval(!requiresApproval)}>
              <span className={`checkbox-box ${requiresApproval ? 'is-checked' : ''}`}>
                {requiresApproval && <ShieldCheck size={14} />}
              </span>
            </div>
            <div style={{ marginLeft: '0.5rem', cursor: 'pointer' }} onClick={() => setRequiresApproval(!requiresApproval)}>
              <span className="approval-toggle-title">Cần người giao việc duyệt hoàn thành</span>
              <p className="approval-toggle-sub">
                Khi tích chọn, người thực hiện sẽ chuyển sang "Chờ duyệt" để bạn kiểm tra trước khi tính là xong.
              </p>
            </div>
          </div>

          {/* Field 10: Footer Actions */}
          <div className="modal-footer" style={{ margin: '0 -1.5rem -1.5rem -1.5rem' }}>
            <button type="button" className="btn" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {editingTask ? 'Lưu thay đổi' : 'Tạo & Giao việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
