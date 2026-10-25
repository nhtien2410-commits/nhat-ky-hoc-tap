import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Lightbulb, 
  Languages, 
  Sparkles,
  Trash2
} from 'lucide-react';
import { parseDateKey, formatFullDateVi } from '../services/dateUtils';

const STUDY_ITEMS = [
  { 
    key: 'knowledge', 
    title: 'Kiến thức mới', 
    desc: 'Học một khái niệm, bài giảng hoặc kỹ năng mới',
    icon: Lightbulb, 
    color: '#10b981' 
  },
  { 
    key: 'english', 
    title: 'Học Tiếng Anh', 
    desc: 'Luyện nghe, nói, học 10 từ vựng hoặc ngữ pháp',
    icon: Languages, 
    color: '#3b82f6' 
  },
  { 
    key: 'reading', 
    title: 'Đọc sách', 
    desc: 'Đọc ít nhất 15-20 trang sách phát triển bản thân / chuyên ngành',
    icon: BookOpen, 
    color: '#8b5cf6' 
  },
];

export default function DayDetailModal({ 
  dateKey, 
  record, 
  onClose, 
  onToggleItem, 
  onUpdateNotes,
  onClearDay
}) {
  const [notes, setNotes] = useState(record?.notes || '');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'typing', 'saving', 'saved'
  const debounceTimerRef = useRef(null);

  const dateObj = parseDateKey(dateKey);
  const formattedDate = formatFullDateVi(dateObj);

  // Sync internal notes state when record changes externally
  useEffect(() => {
    setNotes(record?.notes || '');
  }, [record?.notes]);

  // Debounced auto-save for notes
  const handleNotesChange = (e) => {
    const newText = e.target.value;
    setNotes(newText);
    setSaveStatus('typing');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      await onUpdateNotes(dateKey, newText);
      setSaveStatus('saved');
    }, 400); // 400ms debounce
  };

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [onClose]);

  const completedCount = 
    (record?.knowledge ? 1 : 0) + 
    (record?.english ? 1 : 0) + 
    (record?.reading ? 1 : 0);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-date-title">{formattedDate}</h3>
            <p className="brand-subtitle" style={{ marginTop: '0.2rem' }}>
              Hoàn thành: {completedCount}/3 mục
            </p>
          </div>
          <button 
            className="btn btn-icon" 
            onClick={onClose} 
            title="Đóng cửa sổ"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* 3 Interactive Checklist Items */}
          <div className="modal-checklist">
            {STUDY_ITEMS.map((item) => {
              const isChecked = !!record?.[item.key];
              const IconComp = item.icon;

              return (
                <div 
                  key={item.key}
                  className={`modal-check-item ${isChecked ? 'checked' : ''}`}
                  onClick={() => onToggleItem(dateKey, item.key)}
                >
                  <span className="custom-checkbox">
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => {}} 
                      tabIndex={-1} 
                    />
                    <span className={`checkbox-box ${isChecked ? 'is-checked pop-active' : ''}`}>
                      {isChecked && <Check size={14} strokeWidth={3} />}
                    </span>
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <IconComp size={16} color={item.color} />
                      <span className="item-title">{item.title}</span>
                    </div>
                    <p className="item-desc">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes Section with Auto-Save */}
          <div className="modal-notes-section">
            <div className="notes-label-row">
              <label htmlFor="daily-note" className="notes-label">
                <Sparkles size={16} color="#f59e0b" />
                <span>Ghi chú bài học & Cảm nghĩ trong ngày</span>
              </label>

              <div className="save-status-badge">
                {saveStatus === 'typing' && (
                  <>
                    <Clock size={13} />
                    <span>Đang nhập...</span>
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <Clock size={13} className="spin" />
                    <span>Đang lưu...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle2 size={13} color="#10b981" />
                    <span style={{ color: 'var(--primary)' }}>Tự động lưu</span>
                  </>
                )}
              </div>
            </div>

            <textarea 
              id="daily-note"
              className="notes-textarea"
              value={notes}
              onChange={handleNotesChange}
              placeholder="Hôm nay bạn đã học được điều gì mới? Đọc cuốn sách nào, từ trang mấy? Ghi lại từ vựng, ngữ pháp tiếng Anh hoặc những suy nghĩ tích cực..."
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {(completedCount > 0 || (notes && notes.trim().length > 0)) && (
            <button 
              className="btn" 
              style={{ marginRight: 'auto', color: 'var(--accent-rose)' }}
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ đánh dấu và ghi chú của ngày này?')) {
                  onClearDay(dateKey);
                }
              }}
              title="Xóa trắng dữ liệu ngày này"
            >
              <Trash2 size={16} />
              <span>Xóa ngày này</span>
            </button>
          )}

          <button className="btn btn-primary" onClick={onClose}>
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
