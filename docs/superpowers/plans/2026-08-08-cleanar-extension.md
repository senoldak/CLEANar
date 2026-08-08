# CLEANar - Chrome Click & Clean Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade Chrome extension (Manifest V3) called CLEANar that features instant manual cleanup, automatic background cleaning rules, cookie whitelist protection, and a modern glassmorphism UI with statistics.

**Architecture:** Built using standard web technologies (HTML5, Vanilla CSS3 with Glassmorphism aesthetics, ES6 modules) and native Chrome Extension MV3 APIs (`chrome.browsingData`, `chrome.cookies`, `chrome.storage`, `chrome.alarms`, `chrome.windows`, `chrome.notifications`). Organized cleanly into storage/whitelist helpers, background service worker, popup dashboard UI, and options management UI.

**Tech Stack:** Chrome Extension Manifest V3, HTML5, CSS3 (Glassmorphism & Theme Variables), JavaScript ES6+ (Native Async/Await, Storage & BrowsingData API).

## Global Constraints
- Manifest V3 compliant (Service Worker instead of background pages).
- Pure Vanilla JS and CSS for zero third-party build tool/bundler overhead.
- All storage operations must use `chrome.storage.local`.
- Domain matching in Whitelist Engine must support apex domains (e.g. `google.com` matches `.google.com` and `sub.google.com`).

---

### Task 1: Scaffolding, Extension Manifest & Asset Icons

**Files:**
- Create: `manifest.json`
- Create: `assets/icons/generate_icons.js`
- Create: `assets/icons/icon-16.png`
- Create: `assets/icons/icon-48.png`
- Create: `assets/icons/icon-128.png`

**Interfaces:**
- Consumes: None
- Produces: `manifest.json` configuration defining extension permissions, service worker entrypoint, popup page, and options page.

- [ ] **Step 1: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "CLEANar - Smart Click & Clean",
  "version": "1.0.0",
  "description": "Smart one-click and automatic browser cleaner with Whitelist domain protection.",
  "permissions": [
    "browsingData",
    "storage",
    "cookies",
    "alarms",
    "notifications",
    "activeTab",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/service_worker.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  "options_page": "options/options.html",
  "icons": {
    "16": "assets/icons/icon-16.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  }
}
```

- [ ] **Step 2: Generate PNG Icon Assets**

Write node/canvas or browser canvas script to generate sleek cyan/blue gradient clean broom/shield icon PNGs at 16x16, 48x48, 128x128.

- [ ] **Step 3: Verification**
Verify icons exist and `manifest.json` valid JSON structure.

---

### Task 2: Core Storage & Whitelist Management Modules

**Files:**
- Create: `core/storage.js`
- Create: `core/whitelist.js`

**Interfaces:**
- Consumes: `chrome.storage.local`
- Produces:
  - `StorageManager.getSettings()`: Returns cleaning options, time range, theme, auto-clean config.
  - `StorageManager.saveSettings(settings)`: Saves user configuration.
  - `StorageManager.getStats()`: Returns `{ totalMB: number, totalItems: number, lastCleaned: string }`.
  - `StorageManager.updateStats(mbCleared, itemsCleared)`: Increments deleted statistics.
  - `WhitelistManager.getDomains()`: Returns array of whitelisted strings.
  - `WhitelistManager.addDomain(domain)`: Adds domain string to whitelist.
  - `WhitelistManager.removeDomain(domain)`: Removes domain string.
  - `WhitelistManager.isWhitelisted(domain, whitelist)`: Returns boolean matching domain or subdomains.

- [ ] **Step 1: Create `core/storage.js`**

```javascript
export const DEFAULT_SETTINGS = {
  dataTypes: {
    cache: true,
    history: true,
    cookies: true,
    downloads: true,
    formData: false,
    localStorage: false,
    passwords: false
  },
  timeRange: '1h', // '1h', '24h', '7d', '4w', 'all'
  theme: 'dark', // 'dark' | 'light'
  autoClean: {
    enabled: false,
    intervalMinutes: 60,
    onBrowserClose: false,
    notifyOnClean: true
  }
};

export const DEFAULT_STATS = {
  totalMB: 0,
  totalItems: 0,
  lastCleaned: null
};

export class StorageManager {
  static async getSettings() {
    const res = await chrome.storage.local.get('settings');
    return { ...DEFAULT_SETTINGS, ...res.settings };
  }

  static async saveSettings(settings) {
    await chrome.storage.local.set({ settings });
  }

  static async getStats() {
    const res = await chrome.storage.local.get('stats');
    return { ...DEFAULT_STATS, ...res.stats };
  }

  static async updateStats(mbCleared, itemsCleared) {
    const stats = await this.getStats();
    stats.totalMB += Math.round(mbCleared * 10) / 10;
    stats.totalItems += itemsCleared;
    stats.lastCleaned = new Date().toISOString();
    await chrome.storage.local.set({ stats });
    return stats;
  }
}
```

- [ ] **Step 2: Create `core/whitelist.js`**

```javascript
export class WhitelistManager {
  static async getDomains() {
    const res = await chrome.storage.local.get('whitelist');
    return res.whitelist || ['google.com', 'github.com'];
  }

  static async saveDomains(domains) {
    const cleanDomains = [...new Set(domains.map(d => this.cleanDomain(d)).filter(Boolean))];
    await chrome.storage.local.set({ whitelist: cleanDomains });
    return cleanDomains;
  }

  static async addDomain(domain) {
    const cleaned = this.cleanDomain(domain);
    if (!cleaned) return false;
    const domains = await this.getDomains();
    if (!domains.includes(cleaned)) {
      domains.push(cleaned);
      await this.saveDomains(domains);
    }
    return true;
  }

  static async removeDomain(domain) {
    const domains = await this.getDomains();
    const filtered = domains.filter(d => d !== domain);
    await this.saveDomains(filtered);
  }

  static cleanDomain(rawUrl) {
    try {
      let host = rawUrl.trim().toLowerCase();
      if (host.startsWith('http://') || host.startsWith('https://')) {
        host = new URL(host).hostname;
      }
      if (host.startsWith('www.')) host = host.substring(4);
      return host;
    } catch {
      return null;
    }
  }

  static isWhitelisted(cookieDomain, whitelist) {
    let domain = cookieDomain.toLowerCase();
    if (domain.startsWith('.')) domain = domain.substring(1);
    if (domain.startsWith('www.')) domain = domain.substring(4);

    return whitelist.some(wDomain => {
      let target = wDomain.toLowerCase();
      if (target.startsWith('.')) target = target.substring(1);
      if (target.startsWith('www.')) target = target.substring(4);
      return domain === target || domain.endsWith('.' + target);
    });
  }
}
```

---

### Task 3: Core Cleaning Engine Logic

**Files:**
- Create: `core/cleaner.js`

**Interfaces:**
- Consumes: `StorageManager`, `WhitelistManager`, `chrome.browsingData`, `chrome.cookies`
- Produces:
  - `CleanerEngine.executeClean(options)`: Executes data deletion based on settings & whitelist, updates stats, returns execution summary.

- [ ] **Step 1: Create `core/cleaner.js`**

```javascript
import { StorageManager } from './storage.js';
import { WhitelistManager } from './whitelist.js';

export class CleanerEngine {
  static getTimeRangeSince(timeRangeKey) {
    const now = Date.now();
    switch (timeRangeKey) {
      case '1h': return now - 3600 * 1000;
      case '24h': return now - 24 * 3600 * 1000;
      case '7d': return now - 7 * 24 * 3600 * 1000;
      case '4w': return now - 28 * 24 * 3600 * 1000;
      case 'all': default: return 0;
    }
  }

  static async executeClean(customSettings = null) {
    const settings = customSettings || await StorageManager.getSettings();
    const whitelist = await WhitelistManager.getDomains();
    const since = this.getTimeRangeSince(settings.timeRange);

    const removalOptions = { since };
    const dataToRemove = {};
    let itemEstimate = 0;

    const { dataTypes } = settings;

    if (dataTypes.cache) { dataToRemove.cache = true; itemEstimate += 45; }
    if (dataTypes.history) { dataToRemove.history = true; itemEstimate += 25; }
    if (dataTypes.downloads) { dataToRemove.downloads = true; itemEstimate += 5; }
    if (dataTypes.formData) { dataToRemove.formData = true; itemEstimate += 10; }
    if (dataTypes.localStorage) { dataToRemove.localStorage = true; itemEstimate += 15; }
    if (dataTypes.passwords) { dataToRemove.passwords = true; itemEstimate += 2; }

    // Execute browsingData removal for non-cookie components
    if (Object.keys(dataToRemove).length > 0) {
      await chrome.browsingData.remove(removalOptions, dataToRemove);
    }

    // Handle cookies & whitelist preservation
    let removedCookieCount = 0;
    if (dataTypes.cookies) {
      const allCookies = await chrome.cookies.getAll({});
      for (const cookie of allCookies) {
        if (!WhitelistManager.isWhitelisted(cookie.domain, whitelist)) {
          const protocol = cookie.secure ? 'https:' : 'http:';
          const url = `${protocol}//${cookie.domain.replace(/^\./, '')}${cookie.path}`;
          try {
            await chrome.cookies.remove({ url, name: cookie.name, storeId: cookie.storeId });
            removedCookieCount++;
          } catch (e) {
            console.warn('Could not remove cookie:', cookie.name, e);
          }
        }
      }
      itemEstimate += removedCookieCount;
    }

    const estimatedMB = (Object.keys(dataToRemove).length * 12.5) + (removedCookieCount * 0.1);
    const stats = await StorageManager.updateStats(estimatedMB, itemEstimate);

    return {
      success: true,
      itemsCleared: itemEstimate,
      mbCleared: estimatedMB,
      stats
    };
  }
}
```

---

### Task 4: Background Service Worker & Auto-Clean Triggers

**Files:**
- Create: `background/service_worker.js`

**Interfaces:**
- Consumes: `CleanerEngine`, `StorageManager`, `chrome.alarms`, `chrome.windows`, `chrome.notifications`
- Produces: Service worker event listeners handling extension installation, alarm ticks, and window close events.

- [ ] **Step 1: Create `background/service_worker.js`**

```javascript
import { StorageManager } from '../core/storage.js';
import { CleanerEngine } from '../core/cleaner.js';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('CLEANar extension installed.');
  const settings = await StorageManager.getSettings();
  await updateAlarms(settings.autoClean);
});

async function updateAlarms(autoCleanConfig) {
  await chrome.alarms.clear('periodicClean');
  if (autoCleanConfig && autoCleanConfig.enabled && autoCleanConfig.intervalMinutes > 0) {
    chrome.alarms.create('periodicClean', {
      periodInMinutes: Number(autoCleanConfig.intervalMinutes)
    });
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'periodicClean') {
    const result = await CleanerEngine.executeClean();
    const settings = await StorageManager.getSettings();
    if (settings.autoClean.notifyOnClean) {
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
  if (settings.autoClean.onBrowserClose) {
    const allWindows = await chrome.windows.getAll({});
    if (allWindows.length === 0) {
      await CleanerEngine.executeClean();
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    updateAlarms(message.settings.autoClean);
    sendResponse({ status: 'ok' });
  } else if (message.type === 'TRIGGER_CLEAN') {
    CleanerEngine.executeClean(message.customSettings).then(res => sendResponse(res));
    return true; // Keep channel open for async response
  }
});
```

---

### Task 5: Popup Dashboard UI (Glassmorphism & Interactive Logic)

**Files:**
- Create: `popup/popup.html`
- Create: `popup/popup.css`
- Create: `popup/popup.js`

**Interfaces:**
- Consumes: `StorageManager`, `WhitelistManager`, `CleanerEngine`, `chrome.tabs`
- Produces: Popup dashboard window allowing user to launch instant cleanup, toggle data types, select time range, toggle dark/light mode, add current site to whitelist, and open options page.

- [ ] **Step 1: Create `popup/popup.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CLEANar</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body class="theme-dark">
  <div class="popup-container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <div class="logo-icon">✨</div>
        <span class="brand-name">CLEANar</span>
      </div>
      <div class="header-actions">
        <button id="themeToggleBtn" class="icon-btn" title="Toggle Light/Dark Theme">🌙</button>
        <button id="openOptionsBtn" class="icon-btn" title="Open Settings">⚙️</button>
      </div>
    </header>

    <!-- Stats Dashboard -->
    <section class="stats-card">
      <div class="stat-box">
        <span id="statMB" class="stat-value">0.0</span>
        <span class="stat-unit">MB Cleaned</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-box">
        <span id="statItems" class="stat-value">0</span>
        <span class="stat-unit">Items Removed</span>
      </div>
    </section>

    <!-- Clean Now Hero Action Button -->
    <div class="action-section">
      <button id="cleanNowBtn" class="btn-hero-clean">
        <span class="btn-sparkle">🧹</span>
        <span class="btn-text">CLEAN NOW</span>
      </button>
      <div id="cleanStatusText" class="clean-status">Ready to sanitize</div>
    </div>

    <!-- Time Range Selector -->
    <div class="form-group row">
      <label for="timeRangeSelect">Time Range:</label>
      <select id="timeRangeSelect" class="custom-select">
        <option value="1h">Last Hour</option>
        <option value="24h">Last 24 Hours</option>
        <option value="7d">Last 7 Days</option>
        <option value="4w">Last 4 Weeks</option>
        <option value="all">Everything</option>
      </select>
    </div>

    <!-- Whitelist Quick Add Current Tab -->
    <div class="whitelist-quick-bar">
      <span id="currentDomainLabel" class="domain-label">current-site.com</span>
      <button id="quickWhitelistBtn" class="btn-subtle">🛡️ Whitelist</button>
    </div>

    <!-- Category Toggles Grid -->
    <div class="toggles-grid">
      <label class="toggle-card">
        <input type="checkbox" id="chkCache">
        <span class="card-icon">⚡</span>
        <span class="card-label">Cache</span>
      </label>
      <label class="toggle-card">
        <input type="checkbox" id="chkHistory">
        <span class="card-icon">📜</span>
        <span class="card-label">History</span>
      </label>
      <label class="toggle-card">
        <input type="checkbox" id="chkCookies">
        <span class="card-icon">🍪</span>
        <span class="card-label">Cookies</span>
      </label>
      <label class="toggle-card">
        <input type="checkbox" id="chkDownloads">
        <span class="card-icon">📥</span>
        <span class="card-label">Downloads</span>
      </label>
      <label class="toggle-card">
        <input type="checkbox" id="chkFormData">
        <span class="card-icon">📝</span>
        <span class="card-label">Form Data</span>
      </label>
      <label class="toggle-card">
        <input type="checkbox" id="chkLocalStorage">
        <span class="card-icon">💾</span>
        <span class="card-label">Storage</span>
      </label>
    </div>
  </div>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `popup/popup.css`**

Modern glassmorphism UI with vibrant cyan gradients, smooth transitions, dark and light variable definitions, micro-animations for the Clean button.

- [ ] **Step 3: Create `popup/popup.js`**

Handles popup UI state initialization, theme switching, fast stats counter animation on clean, domain detection on active tab, checkboxes binding with storage.

---

### Task 6: Options Management Page (Whitelist CRUD & Auto-Clean Configuration)

**Files:**
- Create: `options/options.html`
- Create: `options/options.css`
- Create: `options/options.js`

**Interfaces:**
- Consumes: `StorageManager`, `WhitelistManager`
- Produces: Dedicated page for whitelist management (add, delete, search, export/import JSON) and auto-clean rules (kapanışta temizle, periyodik zamanlayıcı).

- [ ] **Step 1: Create `options/options.html`**

Tabbed UI containing:
- Whitelist domain manager (Input field, Add button, list of domain tags with remove buttons, Export JSON & Import JSON).
- Auto-clean settings (Enable periodic clean toggle, select interval minutes, enable browser closure clean toggle, enable notification toggle).

- [ ] **Step 2: Create `options/options.css`**

Responsive, sleek options dashboard styled to match popup's glassmorphism palette.

- [ ] **Step 3: Create `options/options.js`**

Binds CRUD actions for Whitelist, handles JSON import/export, saves auto-clean configuration to `StorageManager`, and posts `SETTINGS_UPDATED` message to service worker.

---

### Task 7: Final End-to-End Verification & Build Check

**Files:**
- Test all files in extension directory.

- [ ] **Step 1: Verify file paths and ES module imports**
- [ ] **Step 2: Ensure zero console errors or syntax errors**
- [ ] **Step 3: Validate Manifest V3 requirements**
