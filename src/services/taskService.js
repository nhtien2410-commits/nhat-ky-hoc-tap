/**
 * Task & Group Management Service
 * Handles collaborative task assignment, group workspaces, invitations,
 * role permissions, status workflows, subtasks, reschedule proposals, and comments.
 * 
 * Supports both LocalStorage offline-first persistence and Firebase Firestore cloud sync.
 */

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  onValue, 
  off 
} from 'firebase/database';
import { isFirebaseConfigured, getFirestoreDb, getRealtimeDb } from './firebaseService';

const STORAGE_KEY_GROUPS = 'collaborative_study_groups_v1';
const STORAGE_KEY_TASKS = 'collaborative_study_tasks_v1';
const STORAGE_KEY_ACTIVE_GROUP = 'collaborative_study_active_group_v1';

export const TASK_STATUS = {
  TODO: 'todo',                 // Chưa làm
  IN_PROGRESS: 'in_progress',   // Đang làm
  PENDING: 'pending_approval',  // Chờ duyệt
  COMPLETED: 'completed'        // Hoàn thành
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.TODO]: { label: 'Chưa làm', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  [TASK_STATUS.IN_PROGRESS]: { label: 'Đang làm', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  [TASK_STATUS.PENDING]: { label: 'Chờ duyệt', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  [TASK_STATUS.COMPLETED]: { label: 'Hoàn thành', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const TASK_PRIORITY_LABELS = {
  [TASK_PRIORITY.LOW]: { label: 'Thấp', color: '#10b981' },
  [TASK_PRIORITY.MEDIUM]: { label: 'Trung bình', color: '#f59e0b' },
  [TASK_PRIORITY.HIGH]: { label: 'Cao', color: '#f43f5e' }
};

export const GROUP_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
};

export const GROUP_ROLE_LABELS = {
  [GROUP_ROLES.OWNER]: { label: 'Chủ nhóm', color: '#8b5cf6' },
  [GROUP_ROLES.ADMIN]: { label: 'Quản trị viên', color: '#3b82f6' },
  [GROUP_ROLES.MEMBER]: { label: 'Thành viên', color: '#10b981' }
};

// Default seed demo members
export const DEMO_MEMBERS = [
  {
    uid: 'demo_user_1',
    displayName: 'Minh Anh',
    email: 'minhanh@example.com',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=MinhAnh',
    accentColor: '#3b82f6'
  },
  {
    uid: 'demo_user_2',
    displayName: 'Tuấn Kiệt',
    email: 'tuankiet@example.com',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=TuanKiet',
    accentColor: '#8b5cf6'
  },
  {
    uid: 'demo_user_3',
    displayName: 'Bảo Châu',
    email: 'baochau@example.com',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=BaoChau',
    accentColor: '#f43f5e'
  }
];

class TaskService {
  constructor() {
    this.subscribers = new Set();
    this.currentUser = null;
    this.groups = this.loadGroups();
    this.tasks = this.loadTasks();
    this.activeGroupId = localStorage.getItem(STORAGE_KEY_ACTIVE_GROUP) || null;
    this.visibleYear = new Date().getFullYear();
    this.visibleMonth = new Date().getMonth();
    this.taskListenerUnsubscribe = null;
    this.groupListenerUnsubscribe = null;
  }

  /**
   * Set visible calendar month to query Firestore ONLY for tasks in this month
   */
  setVisibleMonth(year, month) {
    if (this.visibleYear === year && this.visibleMonth === month) return;
    this.visibleYear = year;
    this.visibleMonth = month;
    this.syncVisibleMonthTasks();
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (user && Object.keys(this.groups).length === 0) {
      this.seedStarterData(user);
    }

    // Auto-link real user to current active group if they are missing
    if (user && !user.isDemo && this.activeGroupId && this.groups[this.activeGroupId]) {
      const activeGrp = this.groups[this.activeGroupId];
      if (!activeGrp.members || !activeGrp.members[user.uid]) {
        if (!activeGrp.members) activeGrp.members = {};
        activeGrp.members[user.uid] = {
          uid: user.uid,
          displayName: user.displayName || 'Tôi',
          email: user.email || '',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
          accentColor: user.accentColor || '#10b981',
          role: activeGrp.ownerId === user.uid ? GROUP_ROLES.OWNER : GROUP_ROLES.MEMBER,
          joinedAt: new Date().toISOString()
        };
        this.saveGroups();
      }
    }

    // If no active group or current user is not in active group, pick first available
    const userGroups = this.getUserGroups();
    if (!this.activeGroupId || !this.groups[this.activeGroupId]) {
      if (userGroups.length > 0) {
        this.activeGroupId = userGroups[0].id;
        localStorage.setItem(STORAGE_KEY_ACTIVE_GROUP, this.activeGroupId);
      }
    }

    if (user && !user.isDemo) {
      this.syncUserGroups();
      this.syncVisibleMonthTasks();
    } else {
      this.cleanupRemoteListeners();
    }

    this.notify();
  }

  cleanupRemoteListeners() {
    if (this.taskListenerUnsubscribe) {
      this.taskListenerUnsubscribe();
      this.taskListenerUnsubscribe = null;
    }
    if (this.groupListenerUnsubscribe) {
      this.groupListenerUnsubscribe();
      this.groupListenerUnsubscribe = null;
    }
  }

  /**
   * Realtime sync for tasks in the active group (RTDB primary, Firestore fallback)
   */
  syncVisibleMonthTasks() {
    if (this.taskListenerUnsubscribe) {
      this.taskListenerUnsubscribe();
      this.taskListenerUnsubscribe = null;
    }

    if (!this.currentUser || this.currentUser.isDemo || !this.activeGroupId) return;

    // 1. Prioritize Realtime Database
    const rtdb = getRealtimeDb();
    if (rtdb) {
      try {
        const tasksRef = ref(rtdb, `tasks/${this.activeGroupId}`);
        const listener = onValue(tasksRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val() || {};
            Object.entries(data).forEach(([tId, tData]) => {
              if (tData) {
                this.tasks[tId] = { id: tId, ...tData };
              }
            });
            this.saveTasks();
            this.notify();
          }
        }, (err) => {
          console.warn('RTDB tasks listener notice:', err);
        });

        this.taskListenerUnsubscribe = () => off(tasksRef, 'value', listener);
        return;
      } catch (e) {
        console.warn('Error setting up RTDB tasks query:', e);
      }
    }

    // 2. Fallback to Firestore
    const db = getFirestoreDb();
    if (db) {
      if (this.visibleYear === undefined || this.visibleMonth === undefined) return;

      const startOfMonth = `${this.visibleYear}-${String(this.visibleMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(this.visibleYear, this.visibleMonth + 1, 0).getDate();
      const endOfMonth = `${this.visibleYear}-${String(this.visibleMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      try {
        const q = query(
          collection(db, 'groups', this.activeGroupId, 'tasks'),
          where('dueDate', '>=', startOfMonth),
          where('dueDate', '<=', endOfMonth)
        );

        this.taskListenerUnsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const tData = change.doc.data();
            if (change.type === 'removed') {
              delete this.tasks[change.doc.id];
            } else {
              this.tasks[change.doc.id] = { id: change.doc.id, ...tData };
            }
          });
          this.saveTasks();
          this.notify();
        }, (err) => {
          console.warn('Firestore tasks listener notice (offline or rules):', err);
        });
      } catch (e) {
        console.warn('Error setting up visible month Firestore query:', e);
      }
    }
  }

  /**
   * Realtime sync for groups where current user is a member (RTDB primary, Firestore fallback)
   */
  syncUserGroups() {
    if (this.groupListenerUnsubscribe) {
      this.groupListenerUnsubscribe();
      this.groupListenerUnsubscribe = null;
    }

    if (!this.currentUser || this.currentUser.isDemo) return;

    // 1. Prioritize Realtime Database
    const rtdb = getRealtimeDb();
    if (rtdb) {
      try {
        const groupsRef = ref(rtdb, 'groups');
        const listener = onValue(groupsRef, (snapshot) => {
          if (snapshot.exists()) {
            const allGroups = snapshot.val() || {};
            let hasChanges = false;
            Object.entries(allGroups).forEach(([gId, gData]) => {
              if (gData && gData.members && gData.members[this.currentUser.uid]) {
                this.groups[gId] = { id: gId, ...gData };
                hasChanges = true;
              }
            });
            if (hasChanges) {
              this.saveGroups();
              this.notify();
            }
          }
        }, (err) => {
          console.warn('RTDB groups listener notice:', err);
        });

        this.groupListenerUnsubscribe = () => off(groupsRef, 'value', listener);
        return;
      } catch (e) {
        console.warn('Error setting up RTDB groups query:', e);
      }
    }

    // 2. Fallback to Firestore
    const db = getFirestoreDb();
    if (db) {
      try {
        const q = query(
          collection(db, 'groups'),
          where('memberUids', 'array-contains', this.currentUser.uid)
        );

        this.groupListenerUnsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const gData = change.doc.data();
            if (change.type === 'removed') {
              delete this.groups[change.doc.id];
            } else {
              this.groups[change.doc.id] = { id: change.doc.id, ...gData };
            }
          });
          this.saveGroups();
          this.notify();
        }, (err) => {
          console.warn('Firestore groups listener notice (offline or rules):', err);
        });
      } catch (e) {
        console.warn('Error setting up user groups Firestore query:', e);
      }
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback({
      groups: this.getUserGroups(),
      activeGroup: this.getActiveGroup(),
      tasks: this.getActiveGroupTasks(),
    });
    return () => this.subscribers.delete(callback);
  }

  notify() {
    const payload = {
      groups: this.getUserGroups(),
      activeGroup: this.getActiveGroup(),
      tasks: this.getActiveGroupTasks(),
    };
    this.subscribers.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error('TaskService subscriber error:', err);
      }
    });
  }

  loadGroups() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GROUPS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading groups from storage', e);
    }
    return {};
  }

  saveGroups() {
    try {
      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(this.groups));
    } catch (e) {
      console.error('Error saving groups', e);
    }
  }

  loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TASKS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading tasks from storage', e);
    }
    return {};
  }

  saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(this.tasks));
    } catch (e) {
      console.error('Error saving tasks', e);
    }
  }

  seedStarterData(user) {
    const defaultGroupId = 'grp_starter_' + Date.now();
    const today = new Date();
    const formatDate = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const starterGroup = {
      id: defaultGroupId,
      name: 'Nhóm bạn cùng tiến',
      description: 'Nhóm học tập, giao bài và theo dõi tiến độ các môn học',
      ownerId: user.uid,
      inviteCode: 'HOC-2026',
      inviteEnabled: true,
      settings: {
        allowMemberAssignOthers: true
      },
      members: {
        [user.uid]: {
          uid: user.uid,
          displayName: user.displayName || 'Bạn (Tôi)',
          email: user.email || '',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
          accentColor: user.accentColor || '#10b981',
          role: GROUP_ROLES.OWNER,
          joinedAt: new Date().toISOString()
        },
        [DEMO_MEMBERS[0].uid]: {
          ...DEMO_MEMBERS[0],
          role: GROUP_ROLES.ADMIN,
          joinedAt: new Date().toISOString()
        },
        [DEMO_MEMBERS[1].uid]: {
          ...DEMO_MEMBERS[1],
          role: GROUP_ROLES.MEMBER,
          joinedAt: new Date().toISOString()
        },
        [DEMO_MEMBERS[2].uid]: {
          ...DEMO_MEMBERS[2],
          role: GROUP_ROLES.MEMBER,
          joinedAt: new Date().toISOString()
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.groups[defaultGroupId] = starterGroup;
    this.activeGroupId = defaultGroupId;
    localStorage.setItem(STORAGE_KEY_ACTIVE_GROUP, defaultGroupId);

    // Seed realistic sample tasks
    const task1Id = 'task_sample_1';
    const task2Id = 'task_sample_2';
    const task3Id = 'task_sample_3';
    const task4Id = 'task_sample_4';

    this.tasks[task1Id] = {
      id: task1Id,
      groupId: defaultGroupId,
      title: 'Tóm tắt 10 từ vựng IELTS chủ đề Environment',
      description: 'Ghi chép ví dụ và đặt câu với mỗi từ vựng để chuẩn bị cho buổi thuyết trình nhóm.',
      dueDate: formatDate(0), // Today
      creatorId: user.uid,
      creatorName: user.displayName || 'Bạn',
      assignees: [
        {
          uid: DEMO_MEMBERS[0].uid,
          displayName: DEMO_MEMBERS[0].displayName,
          photoURL: DEMO_MEMBERS[0].photoURL,
          accentColor: DEMO_MEMBERS[0].accentColor
        }
      ],
      priority: TASK_PRIORITY.HIGH,
      tag: { name: 'Tiếng Anh', color: '#3b82f6' },
      repeat: 'none',
      requiresApproval: true,
      status: TASK_STATUS.IN_PROGRESS,
      checklist: [
        { id: 'sub_1', text: 'Tìm kiếm 10 collocations chủ đề môi trường', completed: true },
        { id: 'sub_2', text: 'Đặt câu ví dụ học thuật', completed: true },
        { id: 'sub_3', text: 'Tạo slide tóm tắt trên Canva', completed: false }
      ],
      attachmentUrl: 'https://quizlet.com',
      attachmentTitle: 'Bộ từ vựng Quizlet',
      comments: [
        {
          id: 'comm_1',
          authorId: user.uid,
          authorName: user.displayName || 'Bạn',
          authorAvatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
          authorColor: '#10b981',
          text: 'Nhớ bổ sung thêm phần bài tập trắc nghiệm nhanh ở cuối nhé!',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: 'comm_2',
          authorId: DEMO_MEMBERS[0].uid,
          authorName: DEMO_MEMBERS[0].displayName,
          authorAvatar: DEMO_MEMBERS[0].photoURL,
          authorColor: DEMO_MEMBERS[0].accentColor,
          text: 'Đã rõ, mình đang hoàn thiện 3 câu cuối!',
          createdAt: new Date(Date.now() - 1800000).toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks[task2Id] = {
      id: task2Id,
      groupId: defaultGroupId,
      title: 'Đọc & tổng hợp Chương 4 sách Atomic Habits',
      description: 'Tập trung vào quy luật "Làm cho nó trở nên rõ ràng" (Make it obvious).',
      dueDate: formatDate(1), // Tomorrow
      creatorId: DEMO_MEMBERS[0].uid,
      creatorName: DEMO_MEMBERS[0].displayName,
      assignees: [
        {
          uid: user.uid,
          displayName: user.displayName || 'Bạn (Tôi)',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
          accentColor: user.accentColor || '#10b981'
        }
      ],
      priority: TASK_PRIORITY.MEDIUM,
      tag: { name: 'Đọc sách', color: '#8b5cf6' },
      repeat: 'none',
      requiresApproval: false,
      status: TASK_STATUS.TODO,
      checklist: [
        { id: 'sub_4', text: 'Đọc 25 trang chương 4', completed: false },
        { id: 'sub_5', text: 'Rút ra 3 hành động áp dụng vào việc học', completed: false }
      ],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks[task3Id] = {
      id: task3Id,
      groupId: defaultGroupId,
      title: 'Giải đề thi thử Toán - Bộ đề số 3',
      description: 'Làm đề trong thời gian quy định 90 phút và chấm điểm chéo.',
      dueDate: formatDate(3), // In 3 days
      creatorId: user.uid,
      creatorName: user.displayName || 'Bạn',
      assignees: [
        {
          uid: DEMO_MEMBERS[1].uid,
          displayName: DEMO_MEMBERS[1].displayName,
          photoURL: DEMO_MEMBERS[1].photoURL,
          accentColor: DEMO_MEMBERS[1].accentColor
        },
        {
          uid: user.uid,
          displayName: user.displayName || 'Bạn (Tôi)',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
          accentColor: user.accentColor || '#10b981'
        }
      ],
      priority: TASK_PRIORITY.HIGH,
      tag: { name: 'Toán học', color: '#10b981' },
      repeat: 'weekly',
      requiresApproval: true,
      status: TASK_STATUS.PENDING,
      completionNote: 'Mình đã làm xong đề số 3 và đạt 8.5 điểm. File giải chi tiết đính kèm.',
      checklist: [
        { id: 'sub_6', text: 'Làm bài 90 phút không xem tài liệu', completed: true },
        { id: 'sub_7', text: 'Xem lại các câu sai phần Tích phân', completed: true }
      ],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks[task4Id] = {
      id: task4Id,
      groupId: defaultGroupId,
      title: 'Luyện tập phát âm bảng IPA nguyên âm đôi',
      description: 'Ghi âm 5 phút gửi vào nhóm Zalo để mọi người sửa âm.',
      dueDate: formatDate(-1), // Yesterday (Completed)
      creatorId: DEMO_MEMBERS[1].uid,
      creatorName: DEMO_MEMBERS[1].displayName,
      assignees: [
        {
          uid: DEMO_MEMBERS[2].uid,
          displayName: DEMO_MEMBERS[2].displayName,
          photoURL: DEMO_MEMBERS[2].photoURL,
          accentColor: DEMO_MEMBERS[2].accentColor
        }
      ],
      priority: TASK_PRIORITY.LOW,
      tag: { name: 'Tiếng Anh', color: '#3b82f6' },
      repeat: 'none',
      requiresApproval: true,
      status: TASK_STATUS.COMPLETED,
      checklist: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveGroups();
    this.saveTasks();
  }

  /* ================= GROUP MANAGEMENT ================= */

  getUserGroups() {
    if (!this.currentUser) return [];
    const uid = this.currentUser.uid;
    return Object.values(this.groups).filter((g) => g.members && !!g.members[uid]);
  }

  getActiveGroup() {
    if (!this.activeGroupId || !this.groups[this.activeGroupId]) {
      const userGroups = this.getUserGroups();
      if (userGroups.length > 0) {
        this.activeGroupId = userGroups[0].id;
        localStorage.setItem(STORAGE_KEY_ACTIVE_GROUP, this.activeGroupId);
      } else {
        return null;
      }
    }
    return this.groups[this.activeGroupId] || null;
  }

  setActiveGroup(groupId) {
    if (this.groups[groupId]) {
      this.activeGroupId = groupId;
      localStorage.setItem(STORAGE_KEY_ACTIVE_GROUP, groupId);
      this.syncVisibleMonthTasks();
      this.notify();
    }
  }

  async createGroup({ name, description }) {
    if (!this.currentUser) throw new Error('Vui lòng đăng nhập trước khi tạo nhóm.');
    const user = this.currentUser;
    const groupId = 'grp_' + Date.now();
    const randomCode = 'VN-' + Math.floor(1000 + Math.random() * 9000);

    const newGroup = {
      id: groupId,
      name: name.trim(),
      description: (description || '').trim(),
      ownerId: user.uid,
      inviteCode: randomCode,
      inviteEnabled: true,
      settings: {
        allowMemberAssignOthers: true
      },
      members: {
        [user.uid]: {
          uid: user.uid,
          displayName: user.displayName || 'Tôi',
          email: user.email || '',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
          accentColor: user.accentColor || '#10b981',
          role: GROUP_ROLES.OWNER,
          joinedAt: new Date().toISOString()
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.groups[groupId] = newGroup;
    this.activeGroupId = groupId;
    localStorage.setItem(STORAGE_KEY_ACTIVE_GROUP, groupId);
    this.saveGroups();
    this.notify();

    // Remote sync to RTDB
    const rtdb = getRealtimeDb();
    if (rtdb && !user.isDemo) {
      try {
        await set(ref(rtdb, `groups/${groupId}`), newGroup);
      } catch (e) {
        console.warn('Error saving group to RTDB:', e);
      }
    }

    // Remote sync to Firestore
    const db = getFirestoreDb();
    if (db && !user.isDemo) {
      setDoc(doc(db, 'groups', groupId), {
        ...newGroup,
        memberUids: Object.keys(newGroup.members)
      }).catch(console.error);
    }

    this.syncVisibleMonthTasks();
    return newGroup;
  }

  async updateGroup(groupId, updates) {
    if (!this.groups[groupId]) return;
    this.groups[groupId] = {
      ...this.groups[groupId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveGroups();
    this.notify();

    // Remote sync to RTDB
    const rtdb = getRealtimeDb();
    if (rtdb && this.currentUser && !this.currentUser.isDemo) {
      try {
        await update(ref(rtdb, `groups/${groupId}`), updates);
      } catch (e) {
        console.warn('Error updating group in RTDB:', e);
      }
    }

    // Remote sync to Firestore
    const db = getFirestoreDb();
    if (db && this.currentUser && !this.currentUser.isDemo) {
      setDoc(doc(db, 'groups', groupId), {
        ...this.groups[groupId],
        memberUids: Object.keys(this.groups[groupId].members || {})
      }, { merge: true }).catch(console.error);
    }
  }

  regenerateInviteCode(groupId) {
    const group = this.groups[groupId];
    if (!group) return;
    const newCode = 'VN-' + Math.floor(1000 + Math.random() * 9000);
    this.updateGroup(groupId, { inviteCode: newCode, inviteEnabled: true });
    return newCode;
  }

  toggleInviteEnabled(groupId, enabled) {
    this.updateGroup(groupId, { inviteEnabled: enabled });
  }

  async joinGroupByCode(inviteCode) {
    if (!this.currentUser) throw new Error('Vui lòng đăng nhập trước khi tham gia nhóm.');
    const code = (inviteCode || '').trim().toUpperCase();
    const user = this.currentUser;

    // 1. Search local groups first
    let foundGroup = Object.values(this.groups).find(
      (g) => g && g.inviteCode && g.inviteCode.toUpperCase() === code && g.inviteEnabled
    );

    // 2. Query Realtime Database for group by invite code
    const rtdb = getRealtimeDb();
    if (!foundGroup && rtdb) {
      try {
        const snap = await get(ref(rtdb, 'groups'));
        if (snap.exists()) {
          const allGroups = snap.val() || {};
          const matched = Object.entries(allGroups).find(
            ([, g]) => g && g.inviteCode && g.inviteCode.toUpperCase() === code && g.inviteEnabled
          );
          if (matched) {
            foundGroup = { id: matched[0], ...matched[1] };
          }
        }
      } catch (err) {
        console.warn('Error querying groups from RTDB:', err);
      }
    }

    // 3. Query Firestore
    if (!foundGroup) {
      const db = getFirestoreDb();
      if (db) {
        try {
          const q = query(collection(db, 'groups'), where('inviteCode', '==', code), where('inviteEnabled', '==', true));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docSnap = snap.docs[0];
            foundGroup = { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e) {
          console.warn('Firestore query group notice:', e);
        }
      }
    }

    if (!foundGroup) {
      throw new Error('Mã mời không tồn tại hoặc nhóm đã khóa liên kết mời.');
    }

    if (!foundGroup.members) foundGroup.members = {};
    const alreadyMember = !!foundGroup.members[user.uid];

    foundGroup.members[user.uid] = {
      uid: user.uid,
      displayName: user.displayName || 'Tôi',
      email: user.email || '',
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
      accentColor: user.accentColor || '#10b981',
      role: GROUP_ROLES.MEMBER,
      joinedAt: foundGroup.members[user.uid]?.joinedAt || new Date().toISOString()
    };

    foundGroup.updatedAt = new Date().toISOString();
    this.groups[foundGroup.id] = foundGroup;
    this.saveGroups();
    this.setActiveGroup(foundGroup.id);

    // Sync to RTDB
    if (rtdb && !user.isDemo) {
      try {
        await update(ref(rtdb, `groups/${foundGroup.id}`), {
          members: foundGroup.members,
          updatedAt: foundGroup.updatedAt
        });
      } catch (e) {
        console.warn('Failed to update members in RTDB:', e);
      }
    }

    // Sync to Firestore
    const db = getFirestoreDb();
    if (db && !user.isDemo) {
      setDoc(doc(db, 'groups', foundGroup.id), {
        ...foundGroup,
        memberUids: Object.keys(foundGroup.members)
      }, { merge: true }).catch(console.error);
    }

    this.notify();
    return { group: foundGroup, alreadyMember };
  }

  updateMemberRole(groupId, memberUid, newRole) {
    const group = this.groups[groupId];
    if (!group || !group.members || !group.members[memberUid]) return;
    if (group.ownerId === memberUid) return; // Cannot demote owner

    group.members[memberUid].role = newRole;
    group.updatedAt = new Date().toISOString();
    this.saveGroups();
    this.notify();

    const rtdb = getRealtimeDb();
    if (rtdb && this.currentUser && !this.currentUser.isDemo) {
      update(ref(rtdb, `groups/${groupId}/members/${memberUid}`), { role: newRole }).catch(console.warn);
    }
  }

  async removeMember(groupId, memberUid) {
    const group = this.groups[groupId];
    if (!group) return;

    if (group.members && group.members[memberUid]) {
      if (group.ownerId === memberUid) return; // Cannot remove owner
      delete group.members[memberUid];
      group.updatedAt = new Date().toISOString();
      this.saveGroups();

      const rtdb = getRealtimeDb();
      if (rtdb && this.currentUser && !this.currentUser.isDemo) {
        remove(ref(rtdb, `groups/${groupId}/members/${memberUid}`)).catch(console.warn);
      }
    }

    if (this.currentUser && this.currentUser.uid === memberUid) {
      delete this.groups[groupId];
      this.saveGroups();
      const remaining = this.getUserGroups();
      this.activeGroupId = remaining.length > 0 ? remaining[0].id : null;
      localStorage.setItem(STORAGE_KEY_ACTIVE_GROUP, this.activeGroupId || '');
      this.syncVisibleMonthTasks();
    }

    this.notify();
  }

  async leaveGroup(groupId) {
    const uid = this.currentUser?.uid;
    const group = this.groups[groupId];

    if (group && uid && group.members && group.members[uid]) {
      delete group.members[uid];
      group.updatedAt = new Date().toISOString();

      const rtdb = getRealtimeDb();
      if (rtdb && !this.currentUser.isDemo) {
        try {
          await remove(ref(rtdb, `groups/${groupId}/members/${uid}`));
        } catch (e) {
          console.warn('Error removing member from RTDB:', e);
        }
      }

      const db = getFirestoreDb();
      if (db && !this.currentUser.isDemo) {
        setDoc(doc(db, 'groups', groupId), {
          members: group.members,
          memberUids: Object.keys(group.members),
          updatedAt: group.updatedAt
        }, { merge: true }).catch(console.warn);
      }
    }

    // Always delete group from local store so user leaves completely
    delete this.groups[groupId];
    this.saveGroups();

    const remaining = this.getUserGroups();
    this.activeGroupId = remaining.length > 0 ? remaining[0].id : null;
    localStorage.setItem(STORAGE_KEY_ACTIVE_GROUP, this.activeGroupId || '');

    this.syncVisibleMonthTasks();
    this.notify();
  }

  async deleteGroup(groupId) {
    const group = this.groups[groupId];
    if (!group) return;

    delete this.groups[groupId];
    this.saveGroups();

    // Delete tasks of that group
    Object.keys(this.tasks).forEach((tId) => {
      if (this.tasks[tId].groupId === groupId) {
        delete this.tasks[tId];
      }
    });
    this.saveTasks();

    // Remove from RTDB
    const rtdb = getRealtimeDb();
    if (rtdb && this.currentUser && !this.currentUser.isDemo) {
      try {
        await remove(ref(rtdb, `groups/${groupId}`));
        await remove(ref(rtdb, `tasks/${groupId}`));
      } catch (e) {
        console.warn('Error deleting group from RTDB:', e);
      }
    }

    // Remove from Firestore
    const db = getFirestoreDb();
    if (db && this.currentUser && !this.currentUser.isDemo) {
      deleteDoc(doc(db, 'groups', groupId)).catch(console.warn);
    }

    const remaining = this.getUserGroups();
    this.activeGroupId = remaining.length > 0 ? remaining[0].id : null;
    localStorage.setItem(STORAGE_KEY_ACTIVE_GROUP, this.activeGroupId || '');
    this.syncVisibleMonthTasks();
    this.notify();
  }

  /* ================= TASK MANAGEMENT ================= */

  getActiveGroupTasks() {
    if (!this.activeGroupId) return [];
    return Object.values(this.tasks).filter((t) => t.groupId === this.activeGroupId);
  }

  getTask(taskId) {
    return this.tasks[taskId] || null;
  }

  createTask(taskData) {
    if (!this.currentUser) throw new Error('Vui lòng đăng nhập trước khi tạo công việc.');
    if (!this.activeGroupId) throw new Error('Chưa chọn nhóm.');

    const taskId = 'task_' + Date.now() + Math.random().toString(36).substring(2, 6);
    const user = this.currentUser;

    // Check if task is assigned only to self
    const isSelfAssigned = 
      taskData.assignees && 
      taskData.assignees.length === 1 && 
      taskData.assignees[0].uid === user.uid;

    const newTask = {
      id: taskId,
      groupId: this.activeGroupId,
      title: taskData.title.trim(),
      description: (taskData.description || '').trim(),
      dueDate: taskData.dueDate,
      creatorId: user.uid,
      creatorName: user.displayName || 'Tôi',
      assignees: taskData.assignees || [
        {
          uid: user.uid,
          displayName: user.displayName || 'Tôi',
          photoURL: user.photoURL,
          accentColor: user.accentColor || '#10b981'
        }
      ],
      priority: taskData.priority || TASK_PRIORITY.MEDIUM,
      tag: taskData.tag || { name: 'Chung', color: '#10b981' },
      repeat: taskData.repeat || 'none',
      requiresApproval: isSelfAssigned ? false : Boolean(taskData.requiresApproval),
      status: TASK_STATUS.TODO,
      checklist: taskData.checklist || [],
      attachmentUrl: (taskData.attachmentUrl || '').trim(),
      attachmentTitle: (taskData.attachmentTitle || '').trim(),
      comments: [],
      rescheduleProposal: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks[taskId] = newTask;
    this.saveTasks();
    this.notify();

    // Remote sync to RTDB
    const rtdb = getRealtimeDb();
    if (rtdb && !user.isDemo && this.activeGroupId) {
      set(ref(rtdb, `tasks/${this.activeGroupId}/${taskId}`), newTask).catch(console.warn);
    }

    // Remote sync to Firestore subcollection
    const db = getFirestoreDb();
    if (db && !user.isDemo && this.activeGroupId) {
      setDoc(doc(db, 'groups', this.activeGroupId, 'tasks', taskId), newTask).catch(console.error);
    }

    return newTask;
  }

  updateTask(taskId, updates) {
    if (!this.tasks[taskId]) return;
    this.tasks[taskId] = {
      ...this.tasks[taskId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveTasks();
    this.notify();

    // Remote sync to RTDB
    const rtdb = getRealtimeDb();
    if (rtdb && this.currentUser && !this.currentUser.isDemo && this.activeGroupId) {
      update(ref(rtdb, `tasks/${this.activeGroupId}/${taskId}`), this.tasks[taskId]).catch(console.warn);
    }

    // Remote sync to Firestore
    const db = getFirestoreDb();
    if (db && this.currentUser && !this.currentUser.isDemo && this.activeGroupId) {
      setDoc(doc(db, 'groups', this.activeGroupId, 'tasks', taskId), this.tasks[taskId], { merge: true }).catch(console.error);
    }

    return this.tasks[taskId];
  }

  deleteTask(taskId) {
    if (!this.tasks[taskId]) return;
    delete this.tasks[taskId];
    this.saveTasks();
    this.notify();

    // Remote delete from RTDB
    const rtdb = getRealtimeDb();
    if (rtdb && this.currentUser && !this.currentUser.isDemo && this.activeGroupId) {
      remove(ref(rtdb, `tasks/${this.activeGroupId}/${taskId}`)).catch(console.warn);
    }

    // Remote delete from Firestore
    const db = getFirestoreDb();
    if (db && this.currentUser && !this.currentUser.isDemo && this.activeGroupId) {
      deleteDoc(doc(db, 'groups', this.activeGroupId, 'tasks', taskId)).catch(console.error);
    }
  }

  /**
   * Update task workflow status with approval logic
   */
  updateTaskStatus(taskId, nextStatus, options = {}) {
    const task = this.tasks[taskId];
    if (!task) return;

    const currentUid = this.currentUser?.uid;
    const isAssignee = task.assignees.some((a) => a.uid === currentUid);
    const isCreator = task.creatorId === currentUid;
    const activeGroup = this.getActiveGroup();
    const userRole = activeGroup?.members[currentUid]?.role;
    const isAdminOrOwner = userRole === GROUP_ROLES.OWNER || userRole === GROUP_ROLES.ADMIN;

    const updates = { status: nextStatus };

    // Case 1: Assignee moving to In Progress
    if (nextStatus === TASK_STATUS.IN_PROGRESS) {
      updates.status = TASK_STATUS.IN_PROGRESS;
    }

    // Case 2: Assignee marks as Pending Approval (or straight to Completed if no approval required / self assigned)
    if (nextStatus === TASK_STATUS.PENDING) {
      if (!task.requiresApproval || isCreator) {
        updates.status = TASK_STATUS.COMPLETED;
      } else {
        updates.status = TASK_STATUS.PENDING;
        if (options.completionNote) {
          updates.completionNote = options.completionNote;
        }
      }
    }

    // Case 3: Approval by Creator / Admin / Owner
    if (nextStatus === TASK_STATUS.COMPLETED) {
      updates.status = TASK_STATUS.COMPLETED;
      updates.approvedBy = currentUid;
      updates.approvedAt = new Date().toISOString();
    }

    // Case 4: Rework requested by Creator / Admin / Owner
    if (options.requestRework) {
      updates.status = TASK_STATUS.IN_PROGRESS;
      updates.feedbackNote = options.feedbackNote || 'Yêu cầu kiểm tra và làm lại';
    }

    return this.updateTask(taskId, updates);
  }

  /**
   * Checklist Subtasks
   */
  toggleSubtask(taskId, subtaskId) {
    const task = this.tasks[taskId];
    if (!task || !task.checklist) return;

    const updatedChecklist = task.checklist.map((item) =>
      item.id === subtaskId ? { ...item, completed: !item.completed } : item
    );

    return this.updateTask(taskId, { checklist: updatedChecklist });
  }

  addSubtask(taskId, text) {
    const task = this.tasks[taskId];
    if (!task) return;

    const checklist = task.checklist || [];
    const newSubtask = {
      id: 'sub_' + Date.now(),
      text: text.trim(),
      completed: false
    };

    return this.updateTask(taskId, { checklist: [...checklist, newSubtask] });
  }

  deleteSubtask(taskId, subtaskId) {
    const task = this.tasks[taskId];
    if (!task || !task.checklist) return;

    const updatedChecklist = task.checklist.filter((item) => item.id !== subtaskId);
    return this.updateTask(taskId, { checklist: updatedChecklist });
  }

  /**
   * Reschedule Logic
   */
  rescheduleTask(taskId, newDueDate) {
    const task = this.tasks[taskId];
    if (!task) return;

    return this.updateTask(taskId, {
      dueDate: newDueDate,
      rescheduleProposal: null // clear any pending proposal
    });
  }

  proposeReschedule(taskId, { proposedDate, reason }) {
    const task = this.tasks[taskId];
    if (!task) return;

    const proposal = {
      proposedDate,
      reason: reason.trim(),
      proposedBy: this.currentUser?.uid,
      proposedByName: this.currentUser?.displayName || 'Thành viên',
      proposedAt: new Date().toISOString(),
      status: 'pending'
    };

    return this.updateTask(taskId, { rescheduleProposal: proposal });
  }

  resolveRescheduleProposal(taskId, accept) {
    const task = this.tasks[taskId];
    if (!task || !task.rescheduleProposal) return;

    if (accept) {
      return this.updateTask(taskId, {
        dueDate: task.rescheduleProposal.proposedDate,
        rescheduleProposal: null
      });
    } else {
      return this.updateTask(taskId, {
        rescheduleProposal: {
          ...task.rescheduleProposal,
          status: 'declined'
        }
      });
    }
  }

  /**
   * Task Comment Thread
   */
  addComment(taskId, text) {
    const task = this.tasks[taskId];
    if (!task || !this.currentUser || !text.trim()) return;

    const user = this.currentUser;
    const newComment = {
      id: 'comm_' + Date.now(),
      authorId: user.uid,
      authorName: user.displayName || 'Tôi',
      authorAvatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
      authorColor: user.accentColor || '#10b981',
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    const existingComments = task.comments || [];
    return this.updateTask(taskId, {
      comments: [...existingComments, newComment]
    });
  }
}

export const taskService = new TaskService();
