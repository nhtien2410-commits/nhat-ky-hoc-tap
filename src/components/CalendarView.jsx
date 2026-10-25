import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import DayCell from './DayCell';
import { 
  WEEKDAYS_VI, 
  MONTH_NAMES_VI, 
  getCalendarGrid 
} from '../services/dateUtils';

export default function CalendarView({ 
  currentDate, 
  onPrevMonth, 
  onNextMonth, 
  onGoToday, 
  studyData, 
  onToggleItem, 
  onOpenDetails 
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysGrid = useMemo(() => getCalendarGrid(year, month), [year, month]);
  const monthLabel = useMemo(() => `${MONTH_NAMES_VI[month]}, ${year}`, [month, year]);
  const monthKey = `${year}-${month}`;

  const [animClass, setAnimClass] = useState('month-transition-in');

  useEffect(() => {
    setAnimClass('month-transition-in');
    const timer = setTimeout(() => setAnimClass(''), 300);
    return () => clearTimeout(timer);
  }, [monthKey]);

  return (
    <div className="calendar-container glass-panel">
      {/* Calendar Top Navigation Bar */}
      <div className="calendar-top-bar">
        <div className="calendar-title-group">
          <CalendarIcon size={24} color="#10b981" />
          <h2 className="month-heading">{monthLabel}</h2>
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

      {/* Monthly Days 7-Column Grid with Transition */}
      <div className={`calendar-month-grid ${animClass}`}>
        {daysGrid.map((cell) => (
          <DayCell 
            key={cell.dateKey}
            cellData={cell}
            studyRecord={studyData[cell.dateKey]}
            onToggleItem={onToggleItem}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </div>
  );
}
