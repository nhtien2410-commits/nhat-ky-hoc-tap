/**
 * Date utility helpers for Daily Study Tracker
 * Localized for Vietnamese calendar standards (Monday - Sunday)
 */

export const WEEKDAYS_VI = [
  { full: 'Thứ Hai', short: 'T2', initial: 'H' },
  { full: 'Thứ Ba', short: 'T3', initial: 'B' },
  { full: 'Thứ Tư', short: 'T4', initial: 'T' },
  { full: 'Thứ Năm', short: 'T5', initial: 'N' },
  { full: 'Thứ Sáu', short: 'T6', initial: 'S' },
  { full: 'Thứ Bảy', short: 'T7', initial: 'B' },
  { full: 'Chủ Nhật', short: 'CN', initial: 'C' },
];

export const MONTH_NAMES_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

/**
 * Format Date object to YYYY-MM-DD in local time
 */
export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD string to local Date object
 */
export function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if a date matches today's date in local time
 */
export function isToday(date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Get human readable date string in Vietnamese
 * Example: "Thứ Ba, 13 tháng 10, 2026"
 */
export function formatFullDateVi(date) {
  const dayOfWeek = (date.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const weekdayName = WEEKDAYS_VI[dayOfWeek].full;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${weekdayName}, ${day} tháng ${month}, ${year}`;
}

/**
 * Generates calendar grid cells for a given month and year.
 * Weeks start on Monday (index 0) and end on Sunday (index 6).
 * Includes padding days from previous and next months for a complete grid.
 */
export function getCalendarGrid(year, month) {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Convert JavaScript getDay() (0 = Sun, 1 = Mon ... 6 = Sat)
  // to Monday-start (0 = Mon, 1 = Tue ... 6 = Sun)
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  const days = [];

  // Previous month padding days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const date = new Date(year, month - 1, dayNum);
    days.push({
      date,
      dateKey: formatDateKey(date),
      dayNumber: dayNum,
      isCurrentMonth: false,
      isPrevMonth: true,
      isNextMonth: false,
      isToday: isToday(date)
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const date = new Date(year, month, dayNum);
    days.push({
      date,
      dateKey: formatDateKey(date),
      dayNumber: dayNum,
      isCurrentMonth: true,
      isPrevMonth: false,
      isNextMonth: false,
      isToday: isToday(date)
    });
  }

  // Next month padding days to complete remaining week row
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const date = new Date(year, month + 1, dayNum);
    days.push({
      date,
      dateKey: formatDateKey(date),
      dayNumber: dayNum,
      isCurrentMonth: false,
      isPrevMonth: false,
      isNextMonth: true,
      isToday: isToday(date)
    });
  }

  return days;
}

/**
 * Calculate streak and monthly statistics
 */
export function calculateStats(studyData, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  
  let fullyCompletedDays = 0;
  let totalItemsChecked = 0;
  let daysWithAnyActivity = 0;

  // Monthly stats
  Object.entries(studyData).forEach(([dateKey, record]) => {
    if (dateKey.startsWith(prefix)) {
      const count = (record.knowledge ? 1 : 0) + (record.english ? 1 : 0) + (record.reading ? 1 : 0);
      totalItemsChecked += count;
      if (count === 3) fullyCompletedDays++;
      if (count > 0) daysWithAnyActivity++;
    }
  });

  // Calculate current streak of consecutive days
  // A day counts towards streak if at least 1 study item was checked
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = formatDateKey(today);
  const todayRecord = studyData[todayKey];
  const todayActive = todayRecord && ((todayRecord.knowledge ? 1 : 0) + (todayRecord.english ? 1 : 0) + (todayRecord.reading ? 1 : 0)) > 0;

  // If today is active, start counting from today.
  // If today isn't active yet, start checking from yesterday so user doesn't lose streak mid-day!
  let cursor = new Date(today);
  if (!todayActive) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = formatDateKey(cursor);
    const rec = studyData[key];
    const hasActivity = rec && ((rec.knowledge ? 1 : 0) + (rec.english ? 1 : 0) + (rec.reading ? 1 : 0)) > 0;
    
    if (hasActivity) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    fullyCompletedDays,
    totalItemsChecked,
    daysWithAnyActivity,
    currentStreak
  };
}
