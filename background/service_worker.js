import { StorageManager } from '../core/storage.js';
import { CleanerEngine } from '../core/cleaner.js';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('CLEANar extension installed.');
  const settings = await StorageManager.getSettings();
  await updateAlarms(settings.autoClean);
});

async function updateAlarms(autoCleanConfig) {
  try {
    await chrome.alarms.clear('periodicClean');
    if (autoCleanConfig && autoCleanConfig.enabled && autoCleanConfig.intervalMinutes > 0) {
      chrome.alarms.create('periodicClean', {
        periodInMinutes: Number(autoCleanConfig.intervalMinutes)
      });
    }
  } catch (err) {
    console.error('Failed updating alarms:', err);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'periodicClean') {
    const result = await CleanerEngine.executeClean();
    const settings = await StorageManager.getSettings();
    if (settings.autoClean && settings.autoClean.notifyOnClean) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon-48.png'),
        title: 'CLEANar Auto-Clean Complete',
        message: `Cleared ${result.itemsCleared} items (~${Math.round(result.mbCleared)} MB)`
      });
    }
  }
});

chrome.windows.onRemoved.addListener(async () => {
  const settings = await StorageManager.getSettings();
  if (settings.autoClean && settings.autoClean.onBrowserClose) {
    const allWindows = await chrome.windows.getAll({});
    if (allWindows.length === 0) {
      await CleanerEngine.executeClean();
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    updateAlarms(message.settings.autoClean).then(() => sendResponse({ status: 'ok' }));
    return true;
  } else if (message.type === 'TRIGGER_CLEAN') {
    CleanerEngine.executeClean(message.customSettings).then(res => sendResponse(res));
    return true; // Keep channel open for async response
  }
});
