import { StorageManager } from '../core/storage.js';
import { CleanerEngine } from '../core/cleaner.js';
import { WhitelistManager } from '../core/whitelist.js';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('CLEANar extension installed.');
  const settings = await StorageManager.getSettings();
  await updateAlarms(settings.autoClean);
  setupContextMenu();
});

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'cleanThisSite',
      title: '🧹 CLEANar: Purge Data For Active Site',
      contexts: ['page', 'action']
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'cleanThisSite' && tab && tab.url) {
    const domain = WhitelistManager.cleanDomain(tab.url);
    if (domain) {
      // Execute site-specific cookie & cache removal
      const allCookies = await chrome.cookies.getAll({ domain });
      for (const c of allCookies) {
        const protocol = c.secure ? 'https:' : 'http:';
        const url = `${protocol}//${c.domain.replace(/^\./, '')}${c.path}`;
        try { await chrome.cookies.remove({ url, name: c.name }); } catch(e){}
      }
      await chrome.browsingData.removeDataForOrigin({
        origins: [new URL(tab.url).origin]
      }, { cache: true, localStorage: true });

      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon-48.png'),
        title: 'CLEANar Site Purge',
        message: `Purged data for ${domain}`
      });
    }
  }
});

// Emergency Panic Button Shortcut Handler (Ctrl+Shift+X)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'emergency_purge') {
    const result = await CleanerEngine.executeClean();
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon-48.png'),
      title: '🚨 EMERGENCY PURGE COMPLETE',
      message: `Emergency sanitized ${result.itemsCleared} items (~${Math.round(result.mbCleared)} MB)`
    });
  }
});

async function updateAlarms(autoCleanConfig) {
  try {
    await chrome.alarms.clear('periodicClean');
    await chrome.alarms.clear('tabSuspenderAlarm');

    if (autoCleanConfig && autoCleanConfig.enabled && autoCleanConfig.intervalMinutes > 0) {
      chrome.alarms.create('periodicClean', {
        periodInMinutes: Number(autoCleanConfig.intervalMinutes)
      });
    }

    if (autoCleanConfig && autoCleanConfig.tabSuspender) {
      chrome.alarms.create('tabSuspenderAlarm', {
        periodInMinutes: 15
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
  } else if (alarm.name === 'tabSuspenderAlarm') {
    // RAM Saver: Discard inactive background tabs
    const tabs = await chrome.tabs.query({ active: false, discarded: false, autoDiscardable: true });
    for (const t of tabs) {
      try {
        await chrome.tabs.discard(t.id);
      } catch (e) {}
    }
  }
});

// Browser & Tab Closure Event Handlers
chrome.windows.onRemoved.addListener(async () => {
  const settings = await StorageManager.getSettings();
  if (settings.autoClean && settings.autoClean.onBrowserClose) {
    const allWindows = await chrome.windows.getAll({});
    if (allWindows.length === 0) {
      await CleanerEngine.executeClean();
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const settings = await StorageManager.getSettings();
  if (settings.autoClean && settings.autoClean.onTabClose) {
    await CleanerEngine.executeClean();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    updateAlarms(message.settings.autoClean).then(() => sendResponse({ status: 'ok' }));
    return true;
  } else if (message.type === 'TRIGGER_CLEAN') {
    CleanerEngine.executeClean(message.customSettings).then(res => sendResponse(res));
    return true;
  }
});
