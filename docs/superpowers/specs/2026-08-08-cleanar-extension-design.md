# CLEANar - Chrome Click & Clean Extension Design Specification

## Overview
CLEANar is a full-featured, high-performance Chrome Extension (Manifest V3) designed to provide both instant one-click browser data cleanup and background automated cleaning rules (per-interval or browser shutdown). It features a robust Whitelist Engine to preserve critical site cookies, a modern glassmorphism dark/light UI dashboard with statistics tracking, and granular cleanup controls.

## Key Features
1. **Hybrid Cleaning Engine**:
   - Instant manual one-click cleanup from popup.
   - Background periodic cleanup via `chrome.alarms`.
   - Automated cleaning on browser window/tab closure events (`chrome.windows.onRemoved`).
2. **Whitelist Protection Engine**:
   - Preserves user-designated trusted domains (e.g. `google.com`, `github.com`) from cookie deletion.
   - Dedicated whitelist management tab in Options and quick-add button in Popup.
   - Import/Export functionality for whitelist rules (JSON format).
3. **Time Range & Granular Categories**:
   - Configurable time ranges: Last hour, Last 24 hours, Last 7 days, Last 4 weeks, Everything.
   - Granular toggles: Cache, History, Cookies, Downloads, Form Data, Local Storage / IndexedDB, Passwords.
4. **Modern UI & Dashboard**:
   - Glassmorphism visual language with dark/light themes and micro-animations.
   - Live cleanup stats counters (total items deleted, MBs reclaimed).
   - Chrome notification alerts on successful automated cleanup.

---

## Architecture & Component Design

### Directory Layout
```text
CLEANar/
├── manifest.json            # Manifest V3 configuration and permissions
├── background/
│   └── service_worker.js    # Background cleanup alarms and window close listeners
├── core/
│   ├── cleaner.js           # Wraps chrome.browsingData API & cookie filtering logic
│   ├── storage.js           # Local storage helper for settings, stats, whitelist
│   └── whitelist.js         # Whitelist matching and cookie preservation helper
├── popup/
│   ├── popup.html           # Popup UI layout
│   ├── popup.css            # Modern glassmorphism & responsive theme styles
│   └── popup.js             # Popup logic, animation controls, stats display
├── options/
│   ├── options.html         # Full settings & whitelist management page
│   ├── options.css          # Options page styling
│   └── options.js           # Whitelist CRUD operations & auto-clean preferences
└── assets/
    └── icons/               # 16px, 48px, 128px extension icons (SVG / PNG generators)
```

### Manifest V3 Configuration (`manifest.json`)
- `manifest_version`: 3
- `name`: "CLEANar - Smart Click & Clean"
- `version`: "1.0.0"
- `permissions`:
  - `browsingData`
  - `storage`
  - `cookies`
  - `alarms`
  - `notifications`
  - `activeTab`
  - `tabs`
- `host_permissions`:
  - `<all_urls>`
- `background`:
  - `service_worker`: `background/service_worker.js`
- `action`:
  - `default_popup`: `popup/popup.html`
  - `default_icon`: `assets/icons/icon-48.png`
- `options_page`: `options/options.html`

---

## Data Flow & Technical Details

### 1. Cleaning & Whitelist Execution Algorithm
When a cleaning action is triggered:
1. `core/cleaner.js` loads user settings (selected data types, time range, whitelist).
2. If `cookies` is checked and whitelist is non-empty:
   - Queries current cookies using `chrome.cookies.getAll({})`.
   - Filters out cookies matching any domain in the whitelist array.
   - Executes `chrome.browsingData.remove` for all checked types EXCEPT cookies.
   - Iterates through non-whitelisted cookies and calls `chrome.cookies.remove` for each.
3. If whitelist is empty or cookies option is unselected:
   - Executes standard `chrome.browsingData.remove` with options matching selected time range.
4. Calculates estimated items/bytes cleared and updates total stats in `chrome.storage.local`.
5. Sends runtime message to popup (if open) to update UI counters and shows native notification if enabled.

### 2. Auto-Clean Background Triggers
- **Alarm Interval**: `chrome.alarms.create('periodicClean', { periodInMinutes: interval })`.
- **Browser Closure**: Listens to `chrome.windows.onRemoved`. When `windows.getAll()` returns length 0, triggers shutdown cleaning rule.

---

## UI/UX & Visual Design Specs

### Color Palette (Glassmorphism Dark / Light)
- **Dark Mode Background**: `#0F172A` (Slate 900)
- **Glass Panel Background**: `rgba(30, 41, 59, 0.7)` with `backdrop-filter: blur(12px)`
- **Accent Primary**: `#06B6D4` (Cyan 500) & `#3B82F6` (Blue 500) gradient
- **Success Glow**: `#10B981` (Emerald 500)
- **Danger Action**: `#EF4444` (Red 500)
- **Typography**: Inter / System UI sans-serif, crisp hierarchy.

### Micro-Animations
- Pulse animation on the main "CLEAN NOW" action button.
- Smooth radial progress meter / counter increment animation when cleaning completes.
- Hover lift & glow effect on category toggle cards.

---

## Verification Plan

### Manual Verification
1. Load unpacked extension in Chrome developer mode (`chrome://extensions`).
2. Test one-click clean from Popup and verify browser history/cache clearing in `chrome://history` and `chrome://settings/clearBrowserData`.
3. Add a test site (e.g. `github.com`) to Whitelist, log in, perform cleanup, and verify login session remains active while non-whitelisted cookies are removed.
4. Test auto-clean triggers (Background alarm & window close listener).
5. Verify dark/light theme switcher and JSON import/export of whitelist in Options page.
