# Locked Extensions Feature Guide

## Overview

The **Locked Extensions** feature allows you to lock specific extensions so they cannot be disabled outside of designated time windows. This is perfect for maintaining focus and preventing yourself from disabling productivity tools during work hours.

## Key Features

✅ **Lock Any Extension** - Choose which extensions to lock  
✅ **Custom Time Windows** - Set when you're allowed to disable each locked extension  
✅ **Daily Repeat** - Time windows automatically repeat every day  
✅ **Auto Re-enable** - Extensions automatically re-enable when the window closes  
✅ **24-Hour Change Lock** - Can only modify time windows once every 24 hours (accountability feature)  
✅ **Notifications** - Get notified when your disable window opens  
✅ **Per-Extension Windows** - Each locked extension can have its own time window  

## How It Works

### Example Scenario

You want to prevent yourself from disabling Twitter extension during work hours:

1. **Set Up Lock**
   - Go to Locked Extensions settings (🔒 icon in Extensity popup)
   - Select "Twitter" from the dropdown
   - Set disable window: 9:00 PM to 11:00 PM
   - Click "Add Lock"

2. **During the Day (9:00 AM - 9:00 PM)**
   - Twitter extension is **forced ON**
   - Trying to disable it in Extensity does nothing (toggle won't work)
   - Extension stays enabled no matter what

3. **Window Opens (9:00 PM)**
   - You receive a notification: "You can now disable Twitter until 11:00 PM"
   - Twitter extension is still enabled, but now you CAN disable it if you want
   - Toggle works normally during this window

4. **Window Closes (11:00 PM)**
   - If Twitter was disabled, it automatically re-enables
   - Lock re-activates until 9:00 PM tomorrow
   - You receive a notification: "Twitter has been re-enabled and locked"

## Setup Instructions

### 1. Access Locked Extensions Settings

- Click the Extensity icon in your browser toolbar
- Click the **🔒 lock icon** in the header
- This opens the Locked Extensions settings page

### 2. Add a Lock

1. **Select Extension**: Choose from the dropdown menu
2. **Set Time Window**: 
   - "Allow disabling from": When the window opens (e.g., 21:00)
   - "to": When the window closes (e.g., 23:00)
3. **Click "Add Lock"**

### 3. Managing Locks

Each locked extension shows:
- Extension name
- Current time window
- Current status (locked or in disable window)
- **Edit** button - Change the time window (once per 24 hours)
- **Remove** button - Remove the lock completely

## Time Window Examples

### Example 1: Evening Social Media Access
```
Extension: Twitter
Window: 20:00 - 22:00 (8 PM to 10 PM)
Result: Can only disable Twitter between 8-10 PM
```

### Example 2: Lunch Break Gaming
```
Extension: Steam
Window: 12:00 - 13:00 (12 PM to 1 PM)
Result: Can only disable Steam during lunch hour
```

### Example 3: Late Night YouTube
```
Extension: YouTube Enhancer
Window: 22:00 - 02:00 (10 PM to 2 AM)
Result: Can disable between 10 PM and 2 AM (crosses midnight)
```

## Important Rules

### 24-Hour Change Restriction

- Once you set or modify a time window, you **cannot change it again for 24 hours**
- This is an accountability feature to prevent you from constantly adjusting times
- If you try to edit before 24 hours, you'll see: "Cannot change time window. Please wait X more hours."
- Timer resets from your last change, not from midnight

### Other Rules

- Locked extensions must be currently **enabled** when you add the lock
- If extension is disabled, it will be automatically enabled when lock is added
- You can always **enable** a locked extension (locks only prevent disabling)
- You can remove locks at any time (no 24-hour restriction on removal)
- Non-locked extensions work normally with no restrictions

## Notifications

You'll receive Chrome notifications for:

1. **Window Opens**: "You can now disable [Extension Name] until [End Time]"
2. **Window Closes** (if extension was disabled): "[Extension Name] has been re-enabled and locked until [Start Time] tomorrow"

## Troubleshooting

### Lock Not Working?

1. Make sure the extension is **enabled** in chrome://extensions
2. Check that Extensity has proper permissions (notifications, alarms, management)
3. Reload the extension: chrome://extensions → Click reload on Extensity

### Time Window Not Triggering?

1. Check browser is running at the scheduled time (alarms won't fire if browser is closed)
2. Verify system time is correct
3. Check Chrome notifications are enabled for Extensity

### Can't Edit Time Window?

- Check if 24 hours have passed since last change
- Look at the "Edit" button - it will show remaining time if blocked
- If you need to change urgently, remove the lock and add a new one

## Use Cases

### Productivity
- Lock social media extensions during work hours (9 AM - 6 PM)
- Only allow disabling during breaks (12 PM - 1 PM)

### Focus
- Lock YouTube/video extensions while studying
- Set short windows for checking entertainment sites

### Self-Control
- Prevent late-night browsing by locking site blockers
- Maintain accountability with 24-hour change restriction

### Habit Building
- Lock distraction blockers to build consistent routines
- Gradually reduce allowed time windows over weeks

## Technical Details

### Storage
- All lock configurations stored in `chrome.storage.local`
- Data persists across browser sessions
- Not synced across devices (local only)

### Alarms
- Uses Chrome Alarms API for precise scheduling
- Alarms persist even if browser is closed
- Daily repeat (24-hour period)

### Performance
- Minimal impact on browser performance
- Lock checks happen only during toggle attempts
- Alarms fire only at scheduled times

## FAQ

**Q: What happens if I restart my browser during a disable window?**  
A: The lock status is preserved. If the window is still active, you can still disable the extension.

**Q: Can I have multiple extensions with different time windows?**  
A: Yes! Each locked extension can have its own independent time window.

**Q: What if I really need to disable a locked extension outside the window?**  
A: You can remove the lock (no time restriction), then disable the extension, then add the lock back.

**Q: Does this work with the "Disable All" button in Extensity?**  
A: No, locked extensions will remain enabled even when you click "Disable All".

**Q: Can I lock Extensity itself?**  
A: No, Extensity cannot lock itself (this would break the extension).

## Version History

**v1.15.0** - Initial release of Locked Extensions feature
- Per-extension time windows
- Daily repeat scheduling
- Auto re-enable functionality
- 24-hour change restriction
- Notification system

---

**Need Help?** Open an issue on [GitHub](https://github.com/WinterSoldier91/Extensity/issues)
