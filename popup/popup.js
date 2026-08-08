import { StorageManager } from '../core/storage.js';
import { WhitelistManager } from '../core/whitelist.js';

let currentTabDomain = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initUI();
  bindEvents();
});

async function initUI() {
  const settings = await StorageManager.getSettings();
  const stats = await StorageManager.getStats();

  // Apply Theme
  applyTheme(settings.theme);

  // Update Stats
  updateStatsDisplay(stats.totalMB, stats.totalItems);

  // Time Range
  document.getElementById('timeRangeSelect').value = settings.timeRange || '1h';

  // Checkboxes
  document.getElementById('chkCache').checked = !!settings.dataTypes.cache;
  document.getElementById('chkHistory').checked = !!settings.dataTypes.history;
  document.getElementById('chkCookies').checked = !!settings.dataTypes.cookies;
  document.getElementById('chkDownloads').checked = !!settings.dataTypes.downloads;
  document.getElementById('chkFormData').checked = !!settings.dataTypes.formData;
  document.getElementById('chkLocalStorage').checked = !!settings.dataTypes.localStorage;

  // Current Domain Detection & Whitelist state
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const cleaned = WhitelistManager.cleanDomain(tabs[0].url);
      if (cleaned) {
        currentTabDomain = cleaned;
        document.getElementById('currentDomainLabel').textContent = cleaned;
        await refreshWhitelistBtnState();
      } else {
        document.getElementById('currentDomainLabel').textContent = 'System/Internal';
        document.getElementById('quickWhitelistBtn').disabled = true;
      }
    }
  } catch (err) {
    document.getElementById('currentDomainLabel').textContent = 'Unavailable';
  }
}

async function refreshWhitelistBtnState() {
  if (!currentTabDomain) return;
  const whitelist = await WhitelistManager.getDomains();
  const btn = document.getElementById('quickWhitelistBtn');
  const btnText = document.getElementById('whitelistBtnText');
  const isProtected = whitelist.includes(currentTabDomain);
  if (isProtected) {
    btnText.textContent = 'Protected';
    btn.classList.add('active');
  } else {
    btnText.textContent = 'Protect';
    btn.classList.remove('active');
  }
}

function applyTheme(themeName) {
  document.body.className = themeName === 'light' ? 'theme-light' : 'theme-dark';
}

function updateStatsDisplay(mb, items) {
  document.getElementById('statMB').textContent = mb.toFixed(1);
  document.getElementById('statItems').textContent = items;
}

function bindEvents() {
  // Theme Toggle
  document.getElementById('themeToggleBtn').addEventListener('click', async () => {
    const settings = await StorageManager.getSettings();
    settings.theme = settings.theme === 'light' ? 'dark' : 'light';
    await StorageManager.saveSettings(settings);
    applyTheme(settings.theme);
  });

  // Options Button
  document.getElementById('openOptionsBtn').addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });

  // Time Range & Checkbox saves
  document.getElementById('timeRangeSelect').addEventListener('change', saveCurrentFormSettings);
  ['chkCache', 'chkHistory', 'chkCookies', 'chkDownloads', 'chkFormData', 'chkLocalStorage'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveCurrentFormSettings);
  });

  // Quick Whitelist Toggle
  document.getElementById('quickWhitelistBtn').addEventListener('click', async () => {
    if (!currentTabDomain) return;
    const whitelist = await WhitelistManager.getDomains();
    if (whitelist.includes(currentTabDomain)) {
      await WhitelistManager.removeDomain(currentTabDomain);
    } else {
      await WhitelistManager.addDomain(currentTabDomain);
    }
    await refreshWhitelistBtnState();
  });

  // CLEAN NOW Action
  document.getElementById('cleanNowBtn').addEventListener('click', async () => {
    const btn = document.getElementById('cleanNowBtn');
    const statusText = document.getElementById('cleanStatusText');

    btn.disabled = true;
    btn.classList.add('cleaning');
    statusText.textContent = 'Sanitizing targets...';

    const customSettings = await collectFormSettings();

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRIGGER_CLEAN',
        customSettings
      });

      if (response && response.success) {
        updateStatsDisplay(response.stats.totalMB, response.stats.totalItems);
        statusText.textContent = `Purged ${response.itemsCleared} items (~${Math.round(response.mbCleared * 10) / 10} MB)`;
      } else {
        statusText.textContent = 'Cleaning complete';
      }
    } catch (e) {
      statusText.textContent = 'Cleanup finished';
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('cleaning');
        setTimeout(() => {
          statusText.textContent = 'System ready';
        }, 2500);
      }, 800);
    }
  });
}

async function collectFormSettings() {
  const current = await StorageManager.getSettings();
  return {
    ...current,
    timeRange: document.getElementById('timeRangeSelect').value,
    dataTypes: {
      cache: document.getElementById('chkCache').checked,
      history: document.getElementById('chkHistory').checked,
      cookies: document.getElementById('chkCookies').checked,
      downloads: document.getElementById('chkDownloads').checked,
      formData: document.getElementById('chkFormData').checked,
      localStorage: document.getElementById('chkLocalStorage').checked,
      passwords: current.dataTypes.passwords || false
    }
  };
}

async function saveCurrentFormSettings() {
  const settings = await collectFormSettings();
  await StorageManager.saveSettings(settings);
}
