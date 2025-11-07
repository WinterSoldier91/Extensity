// TIME-SCHEDULER.JS - Time-based Extension Scheduling System
// Features: Daily time windows, cross-device sync, once-per-day edit lockout

const TimeScheduler = (() => {
  
  // Get current date in YYYY-MM-DD format
  const getTodayString = () => new Date().toISOString().slice(0, 10);
  
  // Check if user can edit time rules (once per day lockout)
  const canEditRule = async (extensionId) => {
    const { timeRules = {} } = await chrome.storage.sync.get('timeRules');
    const rule = timeRules[extensionId];
    if (!rule) return true;
    return rule.lastChanged !== getTodayString();
  };
  
  // Update time rule with lockout timestamp
  const updateTimeRule = async (extensionId, disableTime, enableTime, enabled = true) => {
    const canEdit = await canEditRule(extensionId);
    if (!canEdit) {
      throw new Error('Time rule can only be changed once per day. Try again tomorrow.');
    }
    
    const { timeRules = {} } = await chrome.storage.sync.get('timeRules');
    timeRules[extensionId] = {
      disableTime,
      enableTime,
      enabled,
      lastChanged: getTodayString()
    };
    await chrome.storage.sync.set({ timeRules });
    await initialize(); // Recreate alarms
  };
  
  // Toggle extension on/off
  const toggleExtension = async (extensionId, shouldEnable) => {
    try {
      const extInfo = await chrome.management.get(extensionId);
      if (extInfo.enabled === shouldEnable) return;
      await chrome.management.setEnabled(extensionId, shouldEnable);
      console.log(`Extension ${extensionId} ${shouldEnable ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`Failed to toggle extension ${extensionId}:`, error);
    }
  };
  
  // Schedule alarms for an extension
  const scheduleExtensionAlarms = (extensionId, rule) => {
    const now = new Date();
    const [disableHour, disableMin] = rule.disableTime.split(':').map(Number);
    const [enableHour, enableMin] = rule.enableTime.split(':').map(Number);
    
    // Schedule disable alarm
    const disableDate = new Date();
    disableDate.setHours(disableHour, disableMin, 0, 0);
    if (disableDate <= now) {
      disableDate.setDate(disableDate.getDate() + 1);
    }
    
    chrome.alarms.create(`disable_${extensionId}`, {
      when: disableDate.getTime(),
      periodInMinutes: 24 * 60
    });
    
    // Schedule enable alarm
    const enableDate = new Date();
    enableDate.setHours(enableHour, enableMin, 0, 0);
    if (enableDate <= now) {
      enableDate.setDate(enableDate.getDate() + 1);
    }
    
    chrome.alarms.create(`enable_${extensionId}`, {
      when: enableDate.getTime(),
      periodInMinutes: 24 * 60
    });
    
    console.log(`Scheduled alarms for ${extensionId}: disable at ${rule.disableTime}, enable at ${rule.enableTime}`);
  };
  
  // Initialize scheduler - recreate all alarms
  const initialize = async () => {
    await chrome.alarms.clearAll();
    const { timeRules = {} } = await chrome.storage.sync.get('timeRules');
    
    for (const [extensionId, rule] of Object.entries(timeRules)) {
      if (rule.enabled) {
        scheduleExtensionAlarms(extensionId, rule);
      }
    }
    console.log('TimeScheduler initialized with', Object.keys(timeRules).length, 'rules');
  };
  
  // Handle alarm trigger
  const handleAlarm = async (alarm) => {
    const [action, extensionId] = alarm.name.split('_');
    if (action === 'disable') {
      await toggleExtension(extensionId, false);
    } else if (action === 'enable') {
      await toggleExtension(extensionId, true);
    }
  };
  
  // Get all time rules
  const getAllRules = async () => {
    const { timeRules = {} } = await chrome.storage.sync.get('timeRules');
    return timeRules;
  };
  
  // Delete time rule
  const deleteRule = async (extensionId) => {
    const { timeRules = {} } = await chrome.storage.sync.get('timeRules');
    delete timeRules[extensionId];
    await chrome.storage.sync.set({ timeRules });
    await chrome.alarms.clear(`disable_${extensionId}`);
    await chrome.alarms.clear(`enable_${extensionId}`);
  };
  
  return {
    initialize,
    handleAlarm,
    updateTimeRule,
    getAllRules,
    deleteRule,
    canEditRule
  };
})();

// Export for use in background.js
if (typeof module !== 'undefined') {
  module.exports = TimeScheduler;
}
