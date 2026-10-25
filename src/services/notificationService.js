/**
 * In-App and Browser Push Notification Service (Section 6)
 * Generates and tracks alerts for:
 * - New task assigned to you
 * - Task approved or rework requested
 * - New comment added
 * - Task due within 24 hours
 * - Task overdue
 * - Reschedule proposals
 */

const STORAGE_KEY_NOTIFICATIONS_READ = 'study_tracker_read_notifications_v1';
const STORAGE_KEY_PUSH_ENABLED = 'study_tracker_push_enabled_v1';

class NotificationService {
  constructor() {
    this.readIds = this.loadReadIds();
  }

  loadReadIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS_READ);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  saveReadIds() {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS_READ, JSON.stringify([...this.readIds]));
    } catch (e) {
      console.warn('Error saving read notifications', e);
    }
  }

  markAsRead(notificationId) {
    this.readIds.add(notificationId);
    this.saveReadIds();
  }

  markAllAsRead(notifications) {
    notifications.forEach((n) => this.readIds.add(n.id));
    this.saveReadIds();
  }

  isPushSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  isPushEnabled() {
    return localStorage.getItem(STORAGE_KEY_PUSH_ENABLED) === 'true';
  }

  async requestPushPermission() {
    if (!this.isPushSupported()) return false;
    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';
    localStorage.setItem(STORAGE_KEY_PUSH_ENABLED, String(enabled));
    return enabled;
  }

  sendBrowserNotification(title, body) {
    if (this.isPushSupported() && Notification.permission === 'granted' && this.isPushEnabled()) {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.warn('Browser push error:', e);
      }
    }
  }

  /**
   * Derive notifications list from current user and tasks
   */
  getNotifications(tasks = [], currentUser = null) {
    if (!currentUser || !Array.isArray(tasks)) return [];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const in24Hours = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const notifications = [];

    tasks.forEach((task) => {
      const isAssignee = task.assignees?.some((a) => a.uid === currentUser.uid);
      const isCreator = task.creatorId === currentUser.uid;

      // 1. You were assigned a task
      if (isAssignee && !isCreator) {
        const notifId = `assigned_${task.id}`;
        notifications.push({
          id: notifId,
          type: 'assigned',
          icon: '📌',
          title: 'Bạn được giao nhiệm vụ mới',
          body: `"${task.title}" được giao bởi ${task.creatorName || 'trưởng nhóm'}`,
          time: task.createdAt,
          taskId: task.id,
          isRead: this.readIds.has(notifId)
        });
      }

      // 2. Approval or Rework notice
      if (isAssignee && task.status === 'completed' && task.requiresApproval) {
        const notifId = `approved_${task.id}_${task.updatedAt}`;
        notifications.push({
          id: notifId,
          type: 'approved',
          icon: '✅',
          title: 'Nhiệm vụ đã được phê duyệt!',
          body: `Công việc "${task.title}" đã được duyệt hoàn thành.`,
          time: task.updatedAt,
          taskId: task.id,
          isRead: this.readIds.has(notifId)
        });
      }

      if (isAssignee && task.status === 'in_progress' && task.reworkNote) {
        const notifId = `rework_${task.id}_${task.updatedAt}`;
        notifications.push({
          id: notifId,
          type: 'rework',
          icon: '⚠️',
          title: 'Yêu cầu làm lại công việc',
          body: `"${task.title}": ${task.reworkNote}`,
          time: task.updatedAt,
          taskId: task.id,
          isRead: this.readIds.has(notifId)
        });
      }

      // 3. New comments notice
      if ((isAssignee || isCreator) && Array.isArray(task.comments) && task.comments.length > 0) {
        const lastComment = task.comments[task.comments.length - 1];
        if (lastComment && lastComment.authorId !== currentUser.uid) {
          const notifId = `comm_${lastComment.id}`;
          notifications.push({
            id: notifId,
            type: 'comment',
            icon: '💬',
            title: `Bình luận mới từ ${lastComment.authorName}`,
            body: `"${lastComment.text}" trong việc "${task.title}"`,
            time: lastComment.createdAt,
            taskId: task.id,
            isRead: this.readIds.has(notifId)
          });
        }
      }

      // 4. Due within 24 hours
      if (isAssignee && task.status !== 'completed' && task.dueDate === in24Hours) {
        const notifId = `due_24h_${task.id}_${task.dueDate}`;
        notifications.push({
          id: notifId,
          type: 'due_soon',
          icon: '⏰',
          title: 'Công việc sắp đến hạn trong 24 giờ',
          body: `"${task.title}" có hạn chót vào ngày mai!`,
          time: task.updatedAt || task.createdAt,
          taskId: task.id,
          isRead: this.readIds.has(notifId)
        });
      }

      // 5. Overdue warning
      if (isAssignee && task.status !== 'completed' && task.dueDate < todayStr) {
        const notifId = `overdue_${task.id}_${task.dueDate}`;
        notifications.push({
          id: notifId,
          type: 'overdue',
          icon: '🚨',
          title: 'Công việc đã quá hạn',
          body: `"${task.title}" đã quá hạn vào ngày ${task.dueDate}. Hãy hoàn thành sớm!`,
          time: task.dueDate,
          taskId: task.id,
          isRead: this.readIds.has(notifId)
        });
      }

      // 6. Reschedule proposal for creator
      if (isCreator && task.rescheduleProposal) {
        const notifId = `reschedule_${task.id}_${task.rescheduleProposal.proposedDate}`;
        notifications.push({
          id: notifId,
          type: 'reschedule',
          icon: '📅',
          title: 'Yêu cầu dời hạn mới',
          body: `${task.rescheduleProposal.proposerName} đề xuất dời "${task.title}" sang ${task.rescheduleProposal.proposedDate}`,
          time: task.rescheduleProposal.createdAt,
          taskId: task.id,
          isRead: this.readIds.has(notifId)
        });
      }
    });

    // Sort newest first
    return notifications.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  }
}

export const notificationService = new NotificationService();
