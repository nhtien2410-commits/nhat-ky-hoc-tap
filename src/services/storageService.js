/**
 * Storage Service Abstraction Layer
 * Provides unified interface for reading, writing, exporting, importing,
 * and synchronizing daily study data across LocalStorage and Cloud (Firebase).
 */

import { 
  fetchRemoteStudyData, 
  saveRemoteStudyData, 
  subscribeToRemoteData 
} from './firebaseService';

const STORAGE_KEY = 'daily_study_tracker_data_v1';

class StorageService {
  constructor() {
    this.subscribers = new Set();
    this.data = this.loadFromLocalStorage();
    this.currentUserId = null;
    this.unsubscribeFirestore = null;
  }

  /**
   * Read raw data from localStorage
   */
  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to read localStorage data:', e);
    }
    return {};
  }

  /**
   * Persist current in-memory data to localStorage
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
  }

  /**
   * Subscribe to local storage changes
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    // Initial call with a fresh snapshot
    callback({ ...this.data });
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all listeners with latest data
   * Always pass a fresh shallow clone so React detects the reference change immediately
   */
  notify() {
    const snapshot = { ...this.data };
    this.subscribers.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });
  }

  /**
   * Get all study records
   */
  getAllData() {
    return { ...this.data };
  }

  /**
   * Get single day's record
   */
  getDayData(dateKey) {
    const defaultDay = {
      knowledge: false,
      english: false,
      reading: false,
      notes: '',
      updatedAt: null
    };
    return { ...defaultDay, ...(this.data[dateKey] || {}) };
  }

  /**
   * Update a specific field or entire day's record
   */
  updateDayData(dateKey, updates) {
    const existing = this.getDayData(dateKey);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Clean up empty records if all false and notes empty
    const isEmpty = !updated.knowledge && !updated.english && !updated.reading && (!updated.notes || updated.notes.trim() === '');
    
    const nextData = { ...this.data };
    if (isEmpty) {
      delete nextData[dateKey];
    } else {
      nextData[dateKey] = updated;
    }
    this.data = nextData;

    this.saveToLocalStorage();
    this.notify();

    // Sync to remote if logged in (fire-and-forget background sync)
    if (this.currentUserId) {
      saveRemoteStudyData(this.currentUserId, this.data).catch(console.error);
    }

    return updated;
  }

  /**
   * Toggle a specific checkbox item for a date
   */
  toggleItem(dateKey, itemKey) {
    const existing = this.getDayData(dateKey);
    const newValue = !existing[itemKey];
    return this.updateDayData(dateKey, { [itemKey]: newValue });
  }

  /**
   * Update notes for a date
   */
  updateNotes(dateKey, notes) {
    return this.updateDayData(dateKey, { notes });
  }

  /**
   * Handle user login state change to sync cloud data
   */
  async handleUserChange(user) {
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }

    if (!user) {
      this.currentUserId = null;
      return;
    }

    this.currentUserId = user.uid;

    try {
      const remoteData = await fetchRemoteStudyData(user.uid);
      if (remoteData) {
        // Merge remote and local data (keep newest by updatedAt)
        const merged = { ...this.data };
        Object.entries(remoteData).forEach(([dateKey, remoteRecord]) => {
          const localRecord = merged[dateKey];
          if (!localRecord) {
            merged[dateKey] = remoteRecord;
          } else {
            const remoteTime = remoteRecord.updatedAt ? new Date(remoteRecord.updatedAt).getTime() : 0;
            const localTime = localRecord.updatedAt ? new Date(localRecord.updatedAt).getTime() : 0;
            if (remoteTime >= localTime) {
              merged[dateKey] = remoteRecord;
            }
          }
        });

        this.data = merged;
        this.saveToLocalStorage();
        this.notify();

        // Push combined data back to Firestore to ensure full sync
        await saveRemoteStudyData(user.uid, this.data);
      } else {
        // First time cloud sync: push current local data to remote
        if (Object.keys(this.data).length > 0) {
          await saveRemoteStudyData(user.uid, this.data);
        }
      }

      // Listen for remote updates from other devices in real-time
      this.unsubscribeFirestore = subscribeToRemoteData(user.uid, (freshRemoteData) => {
        if (freshRemoteData) {
          this.data = { ...this.data, ...freshRemoteData };
          this.saveToLocalStorage();
          this.notify();
        }
      });
    } catch (err) {
      console.error('Failed to sync with cloud on login:', err);
    }
  }

  /**
   * Export all study data as JSON file
   */
  exportToJson() {
    const payload = {
      version: '1.0',
      appName: 'Daily Study Tracker',
      exportedAt: new Date().toISOString(),
      totalEntries: Object.keys(this.data).length,
      data: this.data
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `nhat-ky-hoc-tap-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from JSON file content
   * @param {string} jsonString
   * @param {boolean} mergeMode - if true, merge with existing; if false, replace
   */
  async importFromJson(jsonString, mergeMode = true) {
    try {
      const parsed = JSON.parse(jsonString);
      let incomingData = null;

      if (parsed.data && typeof parsed.data === 'object') {
        incomingData = parsed.data;
      } else if (typeof parsed === 'object') {
        // Raw date dictionary
        incomingData = parsed;
      }

      if (!incomingData) {
        throw new Error('Định dạng tệp không hợp lệ.');
      }

      // Validate date keys format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const cleanedData = {};

      Object.entries(incomingData).forEach(([key, val]) => {
        if (dateRegex.test(key) && typeof val === 'object' && val !== null) {
          cleanedData[key] = {
            knowledge: Boolean(val.knowledge),
            english: Boolean(val.english),
            reading: Boolean(val.reading),
            notes: typeof val.notes === 'string' ? val.notes : '',
            updatedAt: val.updatedAt || new Date().toISOString()
          };
        }
      });

      if (mergeMode) {
        this.data = { ...this.data, ...cleanedData };
      } else {
        this.data = cleanedData;
      }

      this.saveToLocalStorage();
      this.notify();

      if (this.currentUserId) {
        await saveRemoteStudyData(this.currentUserId, this.data);
      }

      return { success: true, count: Object.keys(cleanedData).length };
    } catch (err) {
      console.error('Import error:', err);
      return { success: false, error: err.message || 'Lỗi khi nhập dữ liệu.' };
    }
  }
}

export const storageService = new StorageService();
