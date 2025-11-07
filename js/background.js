// BACKGROUND.JS - Extensity Time Scheduler Service Worker
// Handles time-based extension scheduling with once-per-day edit lockout

// Import the time scheduler module
importScripts('time-scheduler.js');

console.log('Extensity Background Service Worker: Loaded');

// Initialize on extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extensity: Extension installed/updated');
  await TimeScheduler.initialize();
});

// Initialize on browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extensity: Browser started');
  await TimeScheduler.initialize();
});

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Extensity: Alarm triggered:', alarm.name);
  await TimeScheduler.handleAlarm(alarm);
});

// Listen for storage changes from other devices (sync)
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && changes.timeRules) {
    console.log('Extensity: Time rules synced from another device');
    await TimeScheduler.initialize();
  }
});
