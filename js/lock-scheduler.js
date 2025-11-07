// LOCK-SCHEDULER.JS - Extension Locking System
// Prevents specific extensions from being disabled except during designated time windows

const LockScheduler = {
  STORAGE_KEY: 'lockedExtensions',
  
  // Storage structure:
  // {
  //   "extension-id": {
  //     "windowStart": "21:00",  // 24-hour format
  //     "windowEnd": "23:00",
  //     "lastChanged": "2025-11-07T18:00:00.000Z",  // ISO timestamp
  //     "enabled": true,
  //     "notifyOnWindowOpen": true
  //   }
  // }

  /**
   * Initialize the scheduler - set up alarms for all locked extensions
   */
  async initialize() {
    console.log('LockScheduler: Initializing...');
    const locks = await this.getAllLocks();
    
    // Clear all existing alarms
    await chrome.alarms.clearAll();
    
    // Set up alarms for each locked extension
    for (const [extId, config] of Object.entries(locks)) {
      if (config.enabled) {
        await this.scheduleWindowAlarms(extId, config);
      }
    }
    
    console.log('LockScheduler: Initialized with', Object.keys(locks).length, 'locked extensions');
  },

  /**
   * Check if an extension is currently locked (cannot be disabled)
   */
  async isLocked(extensionId) {
    const locks = await this.getAllLocks();
    const config = locks[extensionId];
    
    if (!config || !config.enabled) {
      return false;
    }
    
    // Check if we're currently in the allowed window
    return !this.isInWindow(config.windowStart, config.windowEnd);
  },

  /**
   * Check if current time is within the specified window
   */
  isInWindow(startTime, endTime) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    
    const [endHour, endMin] = endTime.split(':').map(Number);
    const endMinutes = endHour * 60 + endMin;
    
    // Handle windows that cross midnight
    if (endMinutes < startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  },

  /**
   * Add or update a lock configuration for an extension
   */
  async setLock(extensionId, windowStart, windowEnd, notify = true) {
    const locks = await this.getAllLocks();
    const existing = locks[extensionId];
    
    // Check if we can change (24-hour restriction)
    if (existing && existing.lastChanged) {
      const lastChanged = new Date(existing.lastChanged);
      const now = new Date();
      const hoursSinceChange = (now - lastChanged) / (1000 * 60 * 60);
      
      if (hoursSinceChange < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceChange);
        throw new Error(`Cannot change time window. Please wait ${hoursRemaining} more hours.`);
      }
    }
    
    // Validate time format
    if (!this.isValidTime(windowStart) || !this.isValidTime(windowEnd)) {
      throw new Error('Invalid time format. Use HH:MM in 24-hour format.');
    }
    
    // Ensure extension is currently enabled
    const extInfo = await chrome.management.get(extensionId);
    if (!extInfo.enabled) {
      await chrome.management.setEnabled(extensionId, true);
    }
    
    // Save the lock configuration
    locks[extensionId] = {
      windowStart,
      windowEnd,
      lastChanged: new Date().toISOString(),
      enabled: true,
      notifyOnWindowOpen: notify
    };
    
    await chrome.storage.local.set({ [this.STORAGE_KEY]: locks });
    
    // Schedule the alarms
    await this.scheduleWindowAlarms(extensionId, locks[extensionId]);
    
    console.log('LockScheduler: Lock set for', extensionId);
    return locks[extensionId];
  },

  /**
   * Remove a lock from an extension
   */
  async removeLock(extensionId) {
    const locks = await this.getAllLocks();
    delete locks[extensionId];
    
    await chrome.storage.local.set({ [this.STORAGE_KEY]: locks });
    
    // Clear alarms for this extension
    await chrome.alarms.clear(`${extensionId}_window_start`);
    await chrome.alarms.clear(`${extensionId}_window_end`);
    
    console.log('LockScheduler: Lock removed for', extensionId);
  },

  /**
   * Get all lock configurations
   */
  async getAllLocks() {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || {};
  },

  /**
   * Get lock configuration for a specific extension
   */
  async getLock(extensionId) {
    const locks = await this.getAllLocks();
    return locks[extensionId] || null;
  },

  /**
   * Schedule alarms for window start and end
   */
  async scheduleWindowAlarms(extensionId, config) {
    const now = new Date();
    
    // Schedule window start alarm
    const startAlarm = this.getNextAlarmTime(config.windowStart);
    await chrome.alarms.create(`${extensionId}_window_start`, {
      when: startAlarm.getTime(),
      periodInMinutes: 24 * 60  // Repeat daily
    });
    
    // Schedule window end alarm
    const endAlarm = this.getNextAlarmTime(config.windowEnd);
    await chrome.alarms.create(`${extensionId}_window_end`, {
      when: endAlarm.getTime(),
      periodInMinutes: 24 * 60  // Repeat daily
    });
    
    console.log('LockScheduler: Alarms scheduled for', extensionId);
    console.log('  Window start:', startAlarm);
    console.log('  Window end:', endAlarm);
  },

  /**
   * Calculate next occurrence of a given time
   */
  getNextAlarmTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    const alarm = new Date();
    
    alarm.setHours(hours, minutes, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (alarm <= now) {
      alarm.setDate(alarm.getDate() + 1);
    }
    
    return alarm;
  },

  /**
   * Handle alarm triggers
   */
  async handleAlarm(alarm) {
    const alarmName = alarm.name;
    
    if (alarmName.endsWith('_window_start')) {
      const extensionId = alarmName.replace('_window_start', '');
      await this.onWindowStart(extensionId);
    } else if (alarmName.endsWith('_window_end')) {
      const extensionId = alarmName.replace('_window_end', '');
      await this.onWindowEnd(extensionId);
    }
  },

  /**
   * Handle window start - send notification
   */
  async onWindowStart(extensionId) {
    console.log('LockScheduler: Window opened for', extensionId);
    
    const config = await this.getLock(extensionId);
    if (!config || !config.enabled) return;
    
    // Get extension name for notification
    try {
      const extInfo = await chrome.management.get(extensionId);
      
      if (config.notifyOnWindowOpen) {
        chrome.notifications.create(`window_start_${extensionId}`, {
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: 'Extensity - Disable Window Open',
          message: `You can now disable "${extInfo.name}" until ${config.windowEnd}`,
          priority: 2
        });
      }
    } catch (error) {
      console.error('LockScheduler: Error sending notification:', error);
    }
  },

  /**
   * Handle window end - re-enable extension if disabled
   */
  async onWindowEnd(extensionId) {
    console.log('LockScheduler: Window closed for', extensionId);
    
    const config = await this.getLock(extensionId);
    if (!config || !config.enabled) return;
    
    try {
      const extInfo = await chrome.management.get(extensionId);
      
      // If extension is disabled, re-enable it
      if (!extInfo.enabled) {
        await chrome.management.setEnabled(extensionId, true);
        console.log('LockScheduler: Re-enabled', extensionId);
        
        chrome.notifications.create(`window_end_${extensionId}`, {
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: 'Extensity - Extension Re-enabled',
          message: `"${extInfo.name}" has been re-enabled and locked until ${config.windowStart} tomorrow`,
          priority: 1
        });
      }
    } catch (error) {
      console.error('LockScheduler: Error re-enabling extension:', error);
    }
  },

  /**
   * Validate time format (HH:MM)
   */
  isValidTime(timeString) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  },

  /**
   * Get time remaining until change is allowed
   */
  async getTimeUntilChangeAllowed(extensionId) {
    const config = await this.getLock(extensionId);
    if (!config || !config.lastChanged) return 0;
    
    const lastChanged = new Date(config.lastChanged);
    const now = new Date();
    const hoursSinceChange = (now - lastChanged) / (1000 * 60 * 60);
    
    return Math.max(0, 24 - hoursSinceChange);
  }
};

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LockScheduler;
}
