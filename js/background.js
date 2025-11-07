// BACKGROUND.JS - Extensity Service Worker
// Handles extension locking and time-based scheduling

// Import the lock scheduler module
importScripts('lock-scheduler.js');

console.log('Extensity Background Service Worker: Loaded');

// Initialize on extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extensity: Extension installed/updated');
  await LockScheduler.initialize();
});

// Initialize on browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extensity: Browser started');
  await LockScheduler.initialize();
});

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Extensity: Alarm triggered:', alarm.name);
  await LockScheduler.handleAlarm(alarm);
});

// Listen for messages from popup/options pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'isLocked':
          const locked = await LockScheduler.isLocked(request.extensionId);
          sendResponse({ success: true, locked });
          break;
          
        case 'setLock':
          const config = await LockScheduler.setLock(
            request.extensionId,
            request.windowStart,
            request.windowEnd,
            request.notify !== false
          );
          sendResponse({ success: true, config });
          break;
          
        case 'removeLock':
          await LockScheduler.removeLock(request.extensionId);
          sendResponse({ success: true });
          break;
          
        case 'getLock':
          const lockConfig = await LockScheduler.getLock(request.extensionId);
          sendResponse({ success: true, config: lockConfig });
          break;
          
        case 'getAllLocks':
          const allLocks = await LockScheduler.getAllLocks();
          sendResponse({ success: true, locks: allLocks });
          break;
          
        case 'getTimeUntilChangeAllowed':
          const hoursRemaining = await LockScheduler.getTimeUntilChangeAllowed(request.extensionId);
          sendResponse({ success: true, hoursRemaining });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Extensity: Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Keep message channel open for async response
});
