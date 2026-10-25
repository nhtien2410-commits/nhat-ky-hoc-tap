import React from 'react';
import { Check, Sparkles, Lightbulb, Languages, BookOpen } from 'lucide-react';

const STUDY_ITEMS = [
  { key: 'knowledge', label: 'Kiến thức mới', icon: Lightbulb, color: '#f59e0b' },
  { key: 'english', label: 'Học Tiếng Anh', icon: Languages, color: '#3b82f6' },
  { key: 'reading', label: 'Đọc sách', icon: BookOpen, color: '#10b981' },
];

function DayCell({ 
  cellData, 
  studyRecord, 
  onToggleItem, 
  onOpenDetails 
}) {
  const { dateKey, dayNumber, isCurrentMonth, isToday } = cellData;
  const record = studyRecord || { knowledge: false, english: false, reading: false, notes: '' };

  const completedCount = 
    (record.knowledge ? 1 : 0) + 
    (record.english ? 1 : 0) + 
    (record.reading ? 1 : 0);

  const isCompleted = completedCount === 3;
  const isPartial = completedCount > 0 && completedCount < 3;
  const hasNotes = record.notes && record.notes.trim().length > 0;

  const handleCellClick = () => {
    onOpenDetails(dateKey);
  };

  const handleCheckboxClick = (e, itemKey) => {
    e.stopPropagation();
    const clickCoords = { x: e.clientX, y: e.clientY };
    onToggleItem(dateKey, itemKey, clickCoords);
  };

  // Determine state class
  let stateClass = '';
  if (isCompleted) {
    stateClass = 'state-completed';
  } else if (isPartial) {
    stateClass = 'state-partial';
  }

  return (
    <div 
      className={`day-cell ${stateClass} ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}`}
      onClick={handleCellClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCellClick();
        }
      }}
      title={`Nhấp để mở ghi chú chi tiết ngày ${dayNumber}`}
    >
      {/* Cell Header: Day Number, Badges, Note Icon, Progress indicator */}
      <div className="cell-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span className="day-num">{dayNumber}</span>
          {isToday && <span className="today-chip">Hôm nay</span>}
        </div>

        <div className="cell-badges">
          {hasNotes && (
            <span className="note-indicator" title="Có ghi chú học tập">
              📝
            </span>
          )}

          {isCompleted && (
            <span className="completed-glow-badge" title="Đã hoàn thành 3/3 mục!">
              <Sparkles size={12} color="#ffffff" />
            </span>
          )}

          {isPartial && (
            <span className="partial-progress-chip" title={`${completedCount}/3 mục hoàn thành`}>
              {completedCount}/3
            </span>
          )}
        </div>
      </div>

      {/* Partial Mini Progress Bar (for 1/3 or 2/3 done) */}
      {isPartial && (
        <div className="cell-mini-progress-track">
          <div 
            className="cell-mini-progress-bar" 
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
      )}

      {/* 3 Study Items with Fixed 3-Column Grid */}
      <div className="cell-items-list" role="group" aria-label="Nội dung học tập">
        {STUDY_ITEMS.map((item) => {
          const isChecked = !!record[item.key];
          const IconComp = item.icon;
          return (
            <div 
              key={item.key} 
              className={`cell-item study-row ${isChecked ? 'is-checked' : ''}`}
              onClick={(e) => handleCheckboxClick(e, item.key)}
              role="checkbox"
              aria-checked={isChecked}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleCheckboxClick(e, item.key);
                }
              }}
              title={`${item.label}: ${isChecked ? 'Đã hoàn thành' : 'Chưa hoàn thành'}`}
              aria-label={`${item.label}: ${isChecked ? 'Đã hoàn thành' : 'Chưa hoàn thành'}`}
            >
              <div className="row-col-check">
                <span className={`checkbox-box ${isChecked ? 'is-checked' : ''}`}>
                  {isChecked && <Check size={12} strokeWidth={3} />}
                </span>
              </div>
              <div className={`row-col-icon icon-${item.key}`} aria-hidden="true">
                <IconComp size={16} strokeWidth={2.2} />
              </div>
              <span className="item-label row-col-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(DayCell, (prevProps, nextProps) => {
  // Only re-render if cell properties changed or this day's record changed
  if (prevProps.cellData.dateKey !== nextProps.cellData.dateKey) return false;
  if (prevProps.cellData.isToday !== nextProps.cellData.isToday) return false;
  if (prevProps.cellData.isCurrentMonth !== nextProps.cellData.isCurrentMonth) return false;

  const prevRec = prevProps.studyRecord;
  const nextRec = nextProps.studyRecord;

  if (prevRec === nextRec) return true;
  if (!prevRec && !nextRec) return true;
  if (!prevRec || !nextRec) return false;

  return (
    prevRec.knowledge === nextRec.knowledge &&
    prevRec.english === nextRec.english &&
    prevRec.reading === nextRec.reading &&
    (prevRec.notes || '') === (nextRec.notes || '')
  );
});
