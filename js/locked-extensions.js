// LOCKED-EXTENSIONS.JS - Settings page for managing locked extensions

let allExtensions = [];
let lockedExtensions = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadExtensions();
  await loadLockedExtensions();
  setupEventListeners();
});

// Load all installed extensions
async function loadExtensions() {
  const extensions = await chrome.management.getAll();
  
  // Filter out Extensity itself, apps, themes, and already locked extensions
  allExtensions = extensions.filter(ext => 
    ext.type === 'extension' && 
    ext.id !== chrome.runtime.id &&
    ext.enabled
  );
  
  populateExtensionSelect();
}

// Populate extension dropdown
function populateExtensionSelect() {
  const select = document.getElementById('extensionSelect');
  select.innerHTML = '<option value="">Select an extension...</option>';
  
  allExtensions
    .filter(ext => !lockedExtensions[ext.id])
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(ext => {
      const option = document.createElement('option');
      option.value = ext.id;
      option.textContent = ext.name;
      select.appendChild(option);
    });
}

// Load currently locked extensions
async function loadLockedExtensions() {
  const response = await chrome.runtime.sendMessage({ action: 'getAllLocks' });
  
  if (response.success) {
    lockedExtensions = response.locks;
    renderLockedExtensions();
  }
}

// Render locked extensions list
async function renderLockedExtensions() {
  const container = document.getElementById('lockedList');
  
  const lockEntries = Object.entries(lockedExtensions);
  
  if (lockEntries.length === 0) {
    container.innerHTML = '<div class="empty-state">No locked extensions yet</div>';
    return;
  }
  
  container.innerHTML = '';
  
  for (const [extId, config] of lockEntries) {
    try {
      const extInfo = await chrome.management.get(extId);
      const item = createLockedItem(extId, extInfo.name, config);
      container.appendChild(item);
    } catch (error) {
      console.error('Error loading extension:', extId, error);
    }
  }
}

// Create locked extension item
function createLockedItem(extId, name, config) {
  const item = document.createElement('div');
  item.className = 'locked-item';
  
  const info = document.createElement('div');
  info.className = 'locked-item-info';
  
  const nameEl = document.createElement('div');
  nameEl.className = 'locked-item-name';
  nameEl.textContent = name;
  
  const windowEl = document.createElement('div');
  windowEl.className = 'locked-item-window';
  windowEl.textContent = `Disable window: ${formatTime(config.windowStart)} - ${formatTime(config.windowEnd)}`;
  
  const statusEl = document.createElement('div');
  statusEl.className = 'locked-item-status';
  
  // Check if currently in window
  const inWindow = isCurrentlyInWindow(config.windowStart, config.windowEnd);
  statusEl.textContent = inWindow ? '✅ Currently in disable window' : '🔒 Currently locked';
  
  info.appendChild(nameEl);
  info.appendChild(windowEl);
  info.appendChild(statusEl);
  
  const actions = document.createElement('div');
  actions.className = 'locked-item-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-edit';
  editBtn.textContent = 'Edit';
  editBtn.onclick = () => editLock(extId, name, config);
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn btn-remove';
  removeBtn.textContent = 'Remove';
  removeBtn.onclick = () => removeLock(extId, name);
  
  actions.appendChild(editBtn);
  actions.appendChild(removeBtn);
  
  item.appendChild(info);
  item.appendChild(actions);
  
  return item;
}

// Check if currently in time window
function isCurrentlyInWindow(startTime, endTime) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  
  const [endHour, endMin] = endTime.split(':').map(Number);
  const endMinutes = endHour * 60 + endMin;
  
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// Format time for display
function formatTime(time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('addLockBtn').addEventListener('click', addLock);
}

// Add new lock
async function addLock() {
  const select = document.getElementById('extensionSelect');
  const windowStart = document.getElementById('windowStart').value;
  const windowEnd = document.getElementById('windowEnd').value;
  const messageEl = document.getElementById('addMessage');
  
  const extensionId = select.value;
  
  if (!extensionId) {
    showMessage(messageEl, 'Please select an extension', 'error');
    return;
  }
  
  if (!windowStart || !windowEnd) {
    showMessage(messageEl, 'Please set both start and end times', 'error');
    return;
  }
  
  if (windowStart === windowEnd) {
    showMessage(messageEl, 'Start and end times cannot be the same', 'error');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'setLock',
      extensionId,
      windowStart,
      windowEnd,
      notify: true
    });
    
    if (response.success) {
      const extInfo = await chrome.management.get(extensionId);
      showMessage(messageEl, `Lock added for "${extInfo.name}"`, 'success');
      select.value = '';
      await loadLockedExtensions();
      populateExtensionSelect();
    } else {
      showMessage(messageEl, response.error, 'error');
    }
  } catch (error) {
    showMessage(messageEl, error.message, 'error');
  }
}

// Edit existing lock
async function editLock(extId, name, currentConfig) {
  // Check if 24 hours have passed
  const response = await chrome.runtime.sendMessage({
    action: 'getTimeUntilChangeAllowed',
    extensionId: extId
  });
  
  if (response.hoursRemaining > 0) {
    alert(`Cannot modify time window for "${name}". Please wait ${Math.ceil(response.hoursRemaining)} more hours.`);
    return;
  }
  
  const newStart = prompt(`Edit disable window START time for "${name}"\n(Current: ${currentConfig.windowStart})\n\nEnter new time (HH:MM in 24-hour format):`, currentConfig.windowStart);
  
  if (!newStart) return;
  
  const newEnd = prompt(`Edit disable window END time for "${name}"\n(Current: ${currentConfig.windowEnd})\n\nEnter new time (HH:MM in 24-hour format):`, currentConfig.windowEnd);
  
  if (!newEnd) return;
  
  try {
    const updateResponse = await chrome.runtime.sendMessage({
      action: 'setLock',
      extensionId: extId,
      windowStart: newStart,
      windowEnd: newEnd,
      notify: true
    });
    
    if (updateResponse.success) {
      alert(`Time window updated for "${name}"`);
      await loadLockedExtensions();
    } else {
      alert(`Error: ${updateResponse.error}`);
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

// Remove lock
async function removeLock(extId, name) {
  if (!confirm(`Remove lock from "${name}"?\n\nThis extension will return to normal behavior.`)) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'removeLock',
      extensionId: extId
    });
    
    if (response.success) {
      await loadLockedExtensions();
      await loadExtensions();
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

// Show message
function showMessage(element, message, type) {
  element.className = type === 'error' ? 'error-message' : 'success-message';
  element.textContent = message;
  element.style.display = 'block';
  
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}
