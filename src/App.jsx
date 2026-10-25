import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Header from './components/Header';
import StatsOverview from './components/StatsOverview';
import CalendarView from './components/CalendarView';
import DayDetailModal from './components/DayDetailModal';
import SyncModal from './components/SyncModal';
import Toast from './components/Toast';
import ThreeBackground from './components/ThreeBackground';
import CelebrationCanvas from './components/CelebrationCanvas';
import { celebrationManager } from './three/CelebrationEffects';
import { storageService } from './services/storageService';
import { calculateStats, formatDateKey } from './services/dateUtils';
import { onAuthChange, signInWithGoogle, signInAsDemoUser } from './services/firebaseService';

// Part 2: Collaborative Task Calendar Imports
import { taskService, TASK_STATUS, GROUP_ROLES } from './services/taskService';
import { AlertTriangle } from 'lucide-react';
import GroupBar from './components/GroupBar';
import TaskCalendarView from './components/TaskCalendarView';
import TaskDetailModal from './components/TaskDetailModal';
import TaskCreateModal from './components/TaskCreateModal';
import GroupSettingsModal from './components/GroupSettingsModal';
import { CreateGroupModal, JoinGroupModal } from './components/GroupModals';
import AuthPrompt from './components/AuthPrompt';
import UserProfileModal from './components/UserProfileModal';
import TaskStatsAndFilters from './components/TaskStatsAndFilters';
import TaskFilterBar from './components/TaskFilterBar';

import './styles/app.css';

export default function App() {
  // Theme state: default to system preference or saved theme
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('study_tracker_theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Active Tab state: 'diary' (Part 1) or 'tasks' (Part 2)
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash.startsWith('#tasks')) return 'tasks';
    if (hash.startsWith('#diary')) return 'diary';
    return localStorage.getItem('study_tracker_active_tab') || 'diary';
  });

  // Calendar current view date (defaults to current month and year - SHARED across both tabs)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // PART 1: Diary Data (Private to local user)
  const [studyData, setStudyData] = useState(() => storageService.getAllData());
  const [activeDateKey, setActiveDateKey] = useState(null);

  // PART 2: Collaborative Task Data
  const [taskData, setTaskData] = useState(() => ({
    groups: taskService.getUserGroups(),
    activeGroup: taskService.getActiveGroup(),
    tasks: taskService.getActiveGroupTasks()
  }));

  // Task View Mode: 'assigned_to_me' | 'assigned_by_me' | 'all'
  const [taskViewMode, setTaskViewMode] = useState('assigned_to_me');
  const [taskMemberFilter, setTaskMemberFilter] = useState(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState(null);
  const [taskPriorityFilter, setTaskPriorityFilter] = useState(null);
  const [taskCategoryFilter, setTaskCategoryFilter] = useState(null);
  const [isTodayDrawerOpen, setIsTodayDrawerOpen] = useState(false);

  // Online / Offline Status (Section 8)
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Task Modals State
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [taskCreateInitialDate, setTaskCreateInitialDate] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [joinGroupInitialCode, setJoinGroupInitialCode] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync / Cloud modal open state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Track previous 100% completion state to avoid repeating grand celebration
  const prev100CelebrationMonthRef = useRef(null);

  // Toast trigger helper
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Set HTML theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('study_tracker_theme', theme);
  }, [theme]);

  // Subscribe to storage updates (Part 1)
  useEffect(() => {
    const unsubscribe = storageService.subscribe((freshData) => {
      setStudyData(freshData);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to task updates (Part 2)
  useEffect(() => {
    taskService.setCurrentUser(currentUser);
    const unsubscribe = taskService.subscribe((fresh) => {
      setTaskData(fresh);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Listen to Auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthChange(async (user) => {
      setCurrentUser(user);
      taskService.setCurrentUser(user);
      await storageService.handleUserChange(user);
    });
    return () => unsubscribeAuth();
  }, []);

  // Keep taskService visible month in sync with calendar date for quota-conserving queries
  useEffect(() => {
    taskService.setVisibleMonth(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  // Tab switching with URL hash & local storage synchronization
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    localStorage.setItem('study_tracker_active_tab', tab);
    window.location.hash = tab === 'diary' ? '#diary' : '#tasks';
  }, []);

  // Listen for URL hash changes and invite links
  useEffect(() => {
    const checkHashAndInvite = () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      if (hash.startsWith('#tasks')) {
        setActiveTab('tasks');
      } else if (hash.startsWith('#diary')) {
        setActiveTab('diary');
      }

      // Check invite code
      let inviteCode = null;
      if (hash.includes('invite=')) {
        const match = hash.match(/invite=([A-Za-z0-9-_]+)/);
        if (match) inviteCode = match[1];
      } else if (search.includes('invite=')) {
        const params = new URLSearchParams(search);
        inviteCode = params.get('invite');
      }

      if (inviteCode) {
        setActiveTab('tasks');
        setJoinGroupInitialCode(inviteCode);
        setIsJoinGroupOpen(true);
      }
    };

    checkHashAndInvite();
    window.addEventListener('hashchange', checkHashAndInvite);
    return () => window.removeEventListener('hashchange', checkHashAndInvite);
  }, []);

  // Synchronized Month Navigation (Shared across Part 1 & Part 2)
  const handlePrevMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleGoToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  /* ================= PART 1 HANDLERS (DIARY) ================= */

  const handleOpenDetails = useCallback((dateKey) => {
    setActiveDateKey(dateKey);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setActiveDateKey(null);
  }, []);

  const handleToggleItem = useCallback((dateKey, itemKey, clickCoords) => {
    const existing = storageService.getDayData(dateKey);
    const existingCount = 
      (existing.knowledge ? 1 : 0) + 
      (existing.english ? 1 : 0) + 
      (existing.reading ? 1 : 0);

    const willBeChecked = !existing[itemKey];
    const newCount = existingCount + (willBeChecked ? 1 : -1);

    storageService.toggleItem(dateKey, itemKey);

    // If user completed all 3 items, trigger celebration particle burst
    if (newCount === 3 && existingCount < 3) {
      const x = clickCoords?.x || window.innerWidth / 2;
      const y = clickCoords?.y || window.innerHeight / 2;
      celebrationManager.burst(x, y, 'day_complete');
    }
  }, []);

  const handleUpdateNotes = useCallback((dateKey, notes) => {
    storageService.updateNotes(dateKey, notes);
  }, []);

  const handleClearDay = useCallback((dateKey) => {
    storageService.updateDayData(dateKey, {
      knowledge: false,
      english: false,
      reading: false,
      notes: ''
    });
    addToast('Đã xóa dữ liệu ngày này.', 'info');
  }, [addToast]);

  const handleExport = useCallback(() => {
    try {
      const diaryData = storageService.getAllData();
      const userTasks = taskData.tasks || [];
      const exportPayload = {
        version: 2,
        exportedAt: new Date().toISOString(),
        records: diaryData,
        tasks: userTasks
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nhat-ky-va-nhiem-vu-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Đã xuất tệp dữ liệu sao lưu JSON thành công!', 'success');
    } catch {
      storageService.exportToJson();
      addToast('Đã xuất dữ liệu thành công!', 'success');
    }
  }, [taskData.tasks, addToast]);

  const handleImport = useCallback(async (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      // Combined format (version: 2)
      if (parsed && parsed.records) {
        const result = await storageService.importFromJson(JSON.stringify(parsed.records), true);
        if (Array.isArray(parsed.tasks)) {
          parsed.tasks.forEach((t) => {
            if (t && t.id) taskService.tasks[t.id] = t;
          });
          taskService.saveTasks();
          taskService.notify();
        }
        addToast(`Nhập dữ liệu thành công! Đã khôi phục ${result.count || 0} ngày học tập và công việc.`, 'success');
        return;
      }
      // Legacy diary-only format (backward compatible)
      const result = await storageService.importFromJson(jsonString, true);
      if (result.success) {
        addToast(`Nhập dữ liệu thành công! Đã cập nhật ${result.count} ngày học tập.`, 'success');
      } else {
        addToast(`Nhập dữ liệu thất bại: ${result.error}`, 'error');
      }
    } catch (err) {
      addToast(`Lỗi nhập tệp: ${err.message}`, 'error');
    }
  }, [addToast]);

  // Monthly stats calculations for Part 1
  const stats = useMemo(() => {
    return calculateStats(
      studyData, 
      currentDate.getFullYear(), 
      currentDate.getMonth()
    );
  }, [studyData, currentDate]);

  const daysInCurrentMonth = useMemo(() => {
    return new Date(
      currentDate.getFullYear(), 
      currentDate.getMonth() + 1, 
      0
    ).getDate();
  }, [currentDate]);

  // Grand celebration when completion rate reaches 100%
  const totalPossible = daysInCurrentMonth * 3;
  const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

  useEffect(() => {
    if (
      totalPossible > 0 &&
      stats.totalItemsChecked === totalPossible &&
      prev100CelebrationMonthRef.current !== currentMonthKey
    ) {
      prev100CelebrationMonthRef.current = currentMonthKey;
      celebrationManager.burst(window.innerWidth / 2, window.innerHeight * 0.35, 'month_grand');
      addToast('🎉 Chúc mừng! Bạn đã hoàn thành 100% mục tiêu học tập tháng này!', 'success');
    }
  }, [stats.totalItemsChecked, totalPossible, currentMonthKey, addToast]);

  const activeRecord = activeDateKey ? storageService.getDayData(activeDateKey) : null;

  /* ================= PART 2 HANDLERS (COLLABORATIVE TASKS) ================= */

  // Filter tasks based on viewMode, memberFilter, statusFilter, priorityFilter, categoryFilter (Section 3 & 4)
  const filteredTasks = useMemo(() => {
    let list = taskData.tasks || [];
    const myUid = currentUser?.uid;

    if (taskViewMode === 'assigned_to_me' && myUid) {
      list = list.filter((t) => t.assignees && t.assignees.some((a) => a.uid === myUid));
    } else if (taskViewMode === 'assigned_by_me' && myUid) {
      list = list.filter((t) => t.creatorId === myUid);
    }

    if (taskMemberFilter) {
      list = list.filter((t) => t.assignees && t.assignees.some((a) => a.uid === taskMemberFilter));
    }

    if (taskStatusFilter === 'overdue') {
      const today = new Date().toISOString().slice(0, 10);
      list = list.filter((t) => t.status !== TASK_STATUS.COMPLETED && t.dueDate < today);
    } else if (taskStatusFilter) {
      list = list.filter((t) => t.status === taskStatusFilter);
    }

    if (taskPriorityFilter) {
      list = list.filter((t) => t.priority === taskPriorityFilter);
    }

    if (taskCategoryFilter) {
      list = list.filter((t) => t.tag?.name === taskCategoryFilter || t.category === taskCategoryFilter);
    }

    return list;
  }, [taskData.tasks, taskViewMode, taskMemberFilter, taskStatusFilter, taskPriorityFilter, taskCategoryFilter, currentUser]);

  // Active filter count and clear helper (Section 3)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (taskMemberFilter) count++;
    if (taskStatusFilter) count++;
    if (taskPriorityFilter) count++;
    if (taskCategoryFilter) count++;
    return count;
  }, [taskMemberFilter, taskStatusFilter, taskPriorityFilter, taskCategoryFilter]);

  const handleClearFilters = useCallback(() => {
    setTaskMemberFilter(null);
    setTaskStatusFilter(null);
    setTaskPriorityFilter(null);
    setTaskCategoryFilter(null);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayTaskCount = useMemo(() => {
    return (taskData.tasks || []).filter((t) => t.dueDate === todayStr).length;
  }, [taskData.tasks, todayStr]);

  // Count tasks that need MY action: (assigned to me and not completed) + (pending approvals waiting for me)
  const pendingTaskCount = useMemo(() => {
    if (!currentUser) return 0;
    const currentUid = currentUser.uid;
    const userRole = taskData.activeGroup?.members?.[currentUid]?.role;
    const isManager = userRole === GROUP_ROLES.OWNER || userRole === GROUP_ROLES.ADMIN;

    return (taskData.tasks || []).filter((t) => {
      const isAssignedToMeAndNotDone = t.status !== TASK_STATUS.COMPLETED && 
        t.assignees?.some((a) => a.uid === currentUid);
      
      const isApprovalWaitingForMe = t.status === TASK_STATUS.PENDING && 
        (t.creatorId === currentUid || isManager);

      return isAssignedToMeAndNotDone || isApprovalWaitingForMe;
    }).length;
  }, [taskData.tasks, taskData.activeGroup, currentUser]);

  // Task creation and editing
  const handleOpenCreateTask = useCallback((initialDate = null) => {
    if (!taskData.activeGroup) {
      addToast('Bạn chưa có nhóm làm việc. Vui lòng tạo nhóm mới trước!', 'info');
      setIsCreateGroupOpen(true);
      return;
    }
    setTaskCreateInitialDate(initialDate || formatDateKey(currentDate));
    setEditingTask(null);
    setIsCreateTaskModalOpen(true);
  }, [taskData.activeGroup, currentDate, addToast]);

  const handleEditTask = useCallback((task) => {
    setEditingTask(task);
    setIsCreateTaskModalOpen(true);
  }, []);

  const handleCreateTask = useCallback((payload) => {
    const newTask = taskService.createTask(payload);
    addToast(`Đã giao việc "${newTask.title}" thành công!`, 'success');
    celebrationManager.burst(window.innerWidth / 2, window.innerHeight / 2, 'day_complete');
  }, [addToast]);

  const handleUpdateTask = useCallback((taskId, payload) => {
    taskService.updateTask(taskId, payload);
    addToast('Đã lưu thay đổi công việc!', 'success');
  }, [addToast]);

  const handleDeleteTask = useCallback((taskId) => {
    taskService.deleteTask(taskId);
    addToast('Đã xóa công việc.', 'info');
  }, [addToast]);

  const handleUpdateTaskStatus = useCallback((taskId, newStatus, options) => {
    taskService.updateTaskStatus(taskId, newStatus, options);
    if (newStatus === TASK_STATUS.COMPLETED) {
      celebrationManager.burst(window.innerWidth / 2, window.innerHeight * 0.4, 'day_complete');
      addToast('🎉 Công việc đã hoàn thành xuất sắc!', 'success');
    } else if (options?.requestRework) {
      addToast('Đã gửi yêu cầu làm lại cho người thực hiện.', 'info');
    } else {
      addToast('Đã cập nhật trạng thái công việc.', 'info');
    }
  }, [addToast]);

  const handleToggleSubtask = useCallback((taskId, subtaskId) => {
    taskService.toggleSubtask(taskId, subtaskId);
  }, []);

  const handleAddSubtask = useCallback((taskId, text) => {
    taskService.addSubtask(taskId, text);
  }, []);

  const handleDeleteSubtask = useCallback((taskId, subtaskId) => {
    taskService.deleteSubtask(taskId, subtaskId);
  }, []);

  const handleReschedule = useCallback((taskId, newDueDate) => {
    taskService.rescheduleTask(taskId, newDueDate);
    addToast(`Đã dời hạn công việc sang ${newDueDate}!`, 'success');
  }, [addToast]);

  const handleProposeReschedule = useCallback((taskId, proposal) => {
    taskService.proposeReschedule(taskId, proposal);
    addToast('Đã gửi đề xuất dời hạn đến người giao việc.', 'info');
  }, [addToast]);

  const handleResolveReschedule = useCallback((taskId, accept) => {
    taskService.resolveRescheduleProposal(taskId, accept);
    if (accept) {
      addToast('Đã chấp nhận dời hạn mới!', 'success');
    } else {
      addToast('Đã từ chối đề xuất dời hạn.', 'info');
    }
  }, [addToast]);

  const handleAddComment = useCallback((taskId, text) => {
    taskService.addComment(taskId, text);
  }, []);

  // Drag and Drop Task Reschedule Handler
  const handleDropTask = useCallback((taskId, targetDateKey) => {
    const task = taskService.getTask(taskId);
    if (!task) return;

    const currentUid = currentUser?.uid;
    const isCreator = task.creatorId === currentUid;
    const userRole = taskData.activeGroup?.members?.[currentUid]?.role;
    const canDirectlyReschedule = isCreator || userRole === GROUP_ROLES.OWNER || userRole === GROUP_ROLES.ADMIN;

    if (canDirectlyReschedule) {
      taskService.rescheduleTask(taskId, targetDateKey);
      addToast(`Đã chuyển công việc "${task.title}" sang ngày ${targetDateKey}!`, 'success');
    } else {
      // Regular assignee cannot directly move; open detail with propose option
      setSelectedTask(task);
      addToast('Bạn không có quyền dời hạn trực tiếp. Vui lòng gửi "Đề xuất dời hạn"!', 'info');
    }
  }, [currentUser, taskData.activeGroup, addToast]);

  // Group Management Handlers
  const handleSelectGroup = useCallback((groupId) => {
    taskService.setActiveGroup(groupId);
  }, []);

  const handleCreateGroup = useCallback(async (groupData) => {
    const grp = await taskService.createGroup(groupData);
    return grp;
  }, []);

  const handleJoinGroup = useCallback(async (code) => {
    return await taskService.joinGroupByCode(code);
  }, []);

  const handleUpdateGroup = useCallback((groupId, updates) => {
    taskService.updateGroup(groupId, updates);
  }, []);

  const handleRegenerateCode = useCallback((groupId) => {
    const code = taskService.regenerateInviteCode(groupId);
    addToast(`Đã tạo mã mời mới: ${code}`, 'success');
  }, [addToast]);

  const handleToggleInvite = useCallback((groupId, enabled) => {
    taskService.toggleInviteEnabled(groupId, enabled);
    addToast(enabled ? 'Đã bật liên kết mời nhóm.' : 'Đã khóa liên kết mời nhóm.', 'info');
  }, [addToast]);

  const handleUpdateMemberRole = useCallback((groupId, memberUid, role) => {
    taskService.updateMemberRole(groupId, memberUid, role);
    addToast('Đã cập nhật quyền thành viên.', 'info');
  }, [addToast]);

  const handleRemoveMember = useCallback((groupId, memberUid) => {
    taskService.removeMember(groupId, memberUid);
    addToast('Đã xóa thành viên khỏi nhóm.', 'info');
  }, [addToast]);

  const handleLeaveGroup = useCallback(async (groupId) => {
    await taskService.leaveGroup(groupId);
    addToast('Đã rời khỏi nhóm thành công.', 'info');
  }, [addToast]);

  const handleDeleteGroup = useCallback(async (groupId) => {
    await taskService.deleteGroup(groupId);
    addToast('Đã xóa nhóm.', 'info');
  }, [addToast]);

  // Demo Sign In Handler
  const handleDemoSignIn = useCallback((demoUser) => {
    signInAsDemoUser(demoUser);
    addToast(`Chào mừng ${demoUser.displayName}! Bạn đang ở chế độ trải nghiệm nhóm.`, 'success');
  }, [addToast]);

  const handleGoogleSignInClick = useCallback(async () => {
    try {
      await signInWithGoogle();
      addToast('Đăng nhập Google thành công!', 'success');
    } catch (err) {
      addToast(err.message || 'Đăng nhập thất bại.', 'error');
    }
  }, [addToast]);

  return (
    <>
      {/* 3D Ambient Three.js Background Canvas (Stays persistent across both tabs) */}
      <ThreeBackground theme={theme} isPaused={!!activeDateKey || !!selectedTask} />

      {/* 3D / Particle Celebration Overlay Canvas */}
      <CelebrationCanvas />

      <div className="app-container">
        {/* Offline Warning Banner (Section 8) */}
        {!isOnline && (
          <div className="offline-banner">
            <AlertTriangle size={16} />
            <span>Đang ngoại tuyến (Offline) - Dữ liệu đang lưu tạm trên máy và sẽ tự động đồng bộ khi có kết nối trở lại.</span>
          </div>
        )}

        {/* 1. Header with brand, tab switcher (#diary / #tasks), cloud sync, profile, theme toggle */}
        <Header 
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onExport={handleExport}
          onImport={handleImport}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          currentUser={currentUser}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingTaskCount={pendingTaskCount}
          tasks={taskData.tasks}
          onSelectTask={(task) => setSelectedTask(task)}
        />

        {/* ================= PART 1: DIARY CALENDAR ================= */}
        {activeTab === 'diary' && (
          <>
            {/* Monthly stats banner with animated numbers & pulsing streak */}
            <StatsOverview 
              stats={stats} 
              daysInMonthCount={daysInCurrentMonth} 
            />

            {/* Monthly Calendar View (Monday to Sunday) */}
            <main>
              <CalendarView 
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onGoToday={handleGoToday}
                studyData={studyData}
                onToggleItem={handleToggleItem}
                onOpenDetails={handleOpenDetails}
              />
            </main>
          </>
        )}

        {/* ================= PART 2: TASK ASSIGNMENT CALENDAR ================= */}
        {activeTab === 'tasks' && (
          <main>
            {!currentUser ? (
              /* Require login for Part 2 with friendly AuthPrompt */
              <AuthPrompt 
                onGoogleSignIn={handleGoogleSignInClick}
                onDemoSignIn={handleDemoSignIn}
                onOpenCloudConfig={() => setIsSyncModalOpen(true)}
              />
            ) : (
              <>
                {/* Row 1: Group Switcher, Role Badge, View Mode & + Giao việc */}
                <GroupBar 
                  groups={taskData.groups}
                  activeGroup={taskData.activeGroup}
                  onSelectGroup={handleSelectGroup}
                  onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
                  onOpenJoinGroup={() => {
                    setJoinGroupInitialCode('');
                    setIsJoinGroupOpen(true);
                  }}
                  onOpenGroupSettings={() => setIsGroupSettingsOpen(true)}
                  onOpenCreateTask={() => handleOpenCreateTask()}
                  viewMode={taskViewMode}
                  onChangeViewMode={setTaskViewMode}
                  currentUser={currentUser}
                />

                {/* Row 2: Member avatar chips, Status/Priority/Category filters, Active badge, Clear link, Today Toggle */}
                <TaskFilterBar 
                  activeGroup={taskData.activeGroup}
                  selectedMemberFilter={taskMemberFilter}
                  onSelectMemberFilter={setTaskMemberFilter}
                  statusFilter={taskStatusFilter}
                  onStatusFilterChange={setTaskStatusFilter}
                  priorityFilter={taskPriorityFilter}
                  onPriorityFilterChange={setTaskPriorityFilter}
                  categoryFilter={taskCategoryFilter}
                  onCategoryFilterChange={setTaskCategoryFilter}
                  onClearFilters={handleClearFilters}
                  activeFilterCount={activeFilterCount}
                  isTodayDrawerOpen={isTodayDrawerOpen}
                  onToggleTodayDrawer={() => setIsTodayDrawerOpen(!isTodayDrawerOpen)}
                  todayTaskCount={todayTaskCount}
                />

                {/* Section 4 & 5: Task Stats Cards (Colored tiles, animated count-up, clickable Quá hạn) + Leaderboard + Today Drawer */}
                <TaskStatsAndFilters 
                  tasks={taskData.tasks}
                  activeGroup={taskData.activeGroup}
                  currentUser={currentUser}
                  viewMode={taskViewMode}
                  statusFilter={taskStatusFilter}
                  onStatusFilterChange={setTaskStatusFilter}
                  onSelectTask={(task) => setSelectedTask(task)}
                  onToggleTaskComplete={(taskId, newStatus) => {
                    taskService.updateTaskStatus(taskId, newStatus);
                  }}
                  isTodayDrawerOpen={isTodayDrawerOpen}
                  onToggleTodayDrawer={() => setIsTodayDrawerOpen(!isTodayDrawerOpen)}
                />

                {/* Collaborative Task Assignment Monthly Calendar */}
                <TaskCalendarView 
                  currentDate={currentDate}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onGoToday={handleGoToday}
                  tasks={filteredTasks}
                  onSelectDay={(dateKey) => handleOpenCreateTask(dateKey)}
                  onSelectTask={(task) => setSelectedTask(task)}
                  onQuickAdd={(dateKey) => handleOpenCreateTask(dateKey)}
                  onDropTask={handleDropTask}
                  currentUser={currentUser}
                  activeGroup={taskData.activeGroup}
                  onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
                  onOpenJoinGroup={() => {
                    setJoinGroupInitialCode('');
                    setIsJoinGroupOpen(true);
                  }}
                />
              </>
            )}
          </main>
        )}

        {/* ================= MODALS ================= */}

        {/* Day Notes Modal (Part 1) */}
        {activeDateKey && (
          <DayDetailModal 
            dateKey={activeDateKey}
            record={activeRecord}
            onClose={handleCloseDetails}
            onToggleItem={handleToggleItem}
            onUpdateNotes={handleUpdateNotes}
            onClearDay={handleClearDay}
          />
        )}

        {/* Task Detail & Workflow Modal (Part 2) */}
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdateStatus={handleUpdateTaskStatus}
            onToggleSubtask={handleToggleSubtask}
            onAddSubtask={handleAddSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onReschedule={handleReschedule}
            onProposeReschedule={handleProposeReschedule}
            onResolveReschedule={handleResolveReschedule}
            onAddComment={handleAddComment}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
            currentUser={currentUser}
            activeGroup={taskData.activeGroup}
          />
        )}

        {/* Create / Edit Task Modal (Part 2) */}
        {isCreateTaskModalOpen && (
          <TaskCreateModal 
            initialDate={taskCreateInitialDate}
            editingTask={editingTask}
            activeGroup={taskData.activeGroup}
            onClose={() => {
              setIsCreateTaskModalOpen(false);
              setEditingTask(null);
            }}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            currentUser={currentUser}
          />
        )}

        {/* Group Settings & Member Roles Modal (Part 2) */}
        {isGroupSettingsOpen && (
          <GroupSettingsModal 
            activeGroup={taskData.activeGroup}
            onClose={() => setIsGroupSettingsOpen(false)}
            onUpdateGroup={handleUpdateGroup}
            onRegenerateCode={handleRegenerateCode}
            onToggleInvite={handleToggleInvite}
            onUpdateMemberRole={handleUpdateMemberRole}
            onRemoveMember={handleRemoveMember}
            onLeaveGroup={handleLeaveGroup}
            onDeleteGroup={handleDeleteGroup}
            currentUser={currentUser}
            onShowToast={addToast}
          />
        )}

        {/* Create Group Modal */}
        {isCreateGroupOpen && (
          <CreateGroupModal 
            onClose={() => setIsCreateGroupOpen(false)}
            onCreateGroup={handleCreateGroup}
            onShowToast={addToast}
          />
        )}

        {/* Join Group with Code / Link Modal */}
        {isJoinGroupOpen && (
          <JoinGroupModal 
            defaultCode={joinGroupInitialCode}
            onClose={() => setIsJoinGroupOpen(false)}
            onJoinGroup={handleJoinGroup}
            onShowToast={addToast}
          />
        )}

        {/* User Profile Modal */}
        {isProfileModalOpen && (
          <UserProfileModal 
            currentUser={currentUser}
            onClose={() => setIsProfileModalOpen(false)}
            onShowToast={addToast}
          />
        )}

        {/* Cloud Sync / Firebase Modal */}
        {isSyncModalOpen && (
          <SyncModal 
            onClose={() => setIsSyncModalOpen(false)}
            currentUser={currentUser}
            onShowToast={addToast}
          />
        )}

        {/* Toast Notifications */}
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </>
  );
}
