import React from 'react';
import { Award, CheckCheck, Flame, TrendingUp } from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp';

function StatsOverview({ stats, daysInMonthCount }) {
  const { fullyCompletedDays, totalItemsChecked, currentStreak } = stats;

  const totalPossibleChecks = (daysInMonthCount || 30) * 3;
  const targetPercentage = totalPossibleChecks > 0 
    ? Math.round((totalItemsChecked / totalPossibleChecks) * 100) 
    : 0;

  // Animated count-up numbers
  const animatedCompletedDays = useCountUp(fullyCompletedDays);
  const animatedTotalItems = useCountUp(totalItemsChecked);
  const animatedStreak = useCountUp(currentStreak);
  const animatedPercentage = useCountUp(targetPercentage);

  return (
    <div className="stats-grid">
      {/* 1. Fully completed days (All 3 items) */}
      <div className="stat-card glass-panel pressable">
        <div className="stat-icon-wrapper stat-icon-emerald">
          <Award size={24} strokeWidth={2.5} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{animatedCompletedDays} ngày</span>
          <span className="stat-label">Hoàn thành cả 3 mục</span>
        </div>
      </div>

      {/* 2. Total items checked */}
      <div className="stat-card glass-panel pressable">
        <div className="stat-icon-wrapper stat-icon-blue">
          <CheckCheck size={24} strokeWidth={2.5} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{animatedTotalItems} mục</span>
          <span className="stat-label">Tổng bài học đã tích</span>
        </div>
      </div>

      {/* 3. Current streak with glowing flame */}
      <div className="stat-card glass-panel pressable">
        <div className={`stat-icon-wrapper stat-icon-amber ${currentStreak > 0 ? 'flame-pulsing' : ''}`}>
          <Flame size={24} strokeWidth={2.5} />
        </div>
        <div className="stat-info">
          <span className="stat-value">
            {animatedStreak} ngày {currentStreak > 0 && <span className="streak-badge">🔥</span>}
          </span>
          <span className="stat-label">Chuỗi ngày liên tiếp</span>
        </div>
      </div>

      {/* 4. Monthly completion rate with progress indicator */}
      <div className="stat-card glass-panel pressable">
        <div className="stat-icon-wrapper stat-icon-purple">
          <TrendingUp size={24} strokeWidth={2.5} />
        </div>
        <div className="stat-info" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="stat-value">{animatedPercentage}%</span>
            {targetPercentage === 100 && (
              <span className="perfect-month-badge">Xuất sắc 🌟</span>
            )}
          </div>
          <div className="stat-progress-bar-bg">
            <div 
              className="stat-progress-bar-fill" 
              style={{ width: `${Math.min(targetPercentage, 100)}%` }}
            />
          </div>
          <span className="stat-label">Tỷ lệ hoàn thành tháng</span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(StatsOverview);
