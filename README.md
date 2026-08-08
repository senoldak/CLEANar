# CLEANar — Smart Chrome Click & Clean Extension

> A modern, ultra-fast, high-performance Chrome Extension (Manifest V3) for instant one-click browser data sanitization, cookie whitelist protection, emergency panic hotkeys, RAM savings, and automated background cleaning rules.

---

## 🌟 Key Features & Advanced Capabilities

### ⚡ Instant & Granular Cleanup
* **One-Click Purge**: Clean browser cache, history, cookies, downloads, form data, and local storage instantly from the pop-up panel.
* **Time Range Granularity**: Target data removal for the Last Hour, Last 24 Hours, Last 7 Days, Last 4 Weeks, or All Time.

### 🚨 Emergency Panic Button (Boss Key)
* **Global Hotkey (`Ctrl+Shift+X` or `Cmd+Shift+X`)**: Instantly trigger an emergency background purge from anywhere in Chrome without opening any menus.

### 🛡️ Smart Whitelist & Wildcard Protection Engine
* **Session Protection**: Preserve critical login sessions and domain cookies (e.g. `google.com`, `github.com`) during all manual and automated purges.
* **Wildcard & Subdomain Rules**: Full support for wildcard domain matching (e.g. `*.google.com` or `dev.*`) for developer and staging workflows.

### 🖱️ Context Menu Integration
* **Right-Click Site Purge**: Right-click on any webpage or toolbar icon and select *"🧹 CLEANar: Purge Data For Active Site"* to wipe origin cache & cookies instantly.

### 🤖 Background Automation & RAM Saver
* **Periodic Alarms**: Schedule recurring background cleanup (every 15, 30, 60, or 120 minutes).
* **Browser Closure**: Automatically sanitize data when all Chrome windows exit.
* **Tab Closure Auto-Clean**: Trigger sanitization whenever any browser tab is closed.
* **RAM Saver (Tab Suspender)**: Automatically discard inactive background sekmeleri to free system memory.
* **Desktop Notifications**: Optional system alerts upon completion of automated tasks.

---

## 📁 Project Architecture

```text
CLEANar/
├── manifest.json            # Manifest V3 configuration, permissions & emergency command rules
├── cleanar-extension.zip    # Ready-to-publish Chrome Web Store package
├── background/
│   └── service_worker.js    # Background worker handling alarms, panic hotkey & context menu
├── core/
│   ├── cleaner.js           # Wraps chrome.browsingData API and selective cookie remover
│   ├── storage.js           # Storage helper for settings, statistics, theme & automation options
│   └── whitelist.js         # Wildcard and domain matching engine for cookie protection
├── popup/
│   ├── popup.html           # Popup glassmorphism layout & category selection matrix
│   ├── popup.css            # Deep Void theme CSS with responsive variable design
│   └── popup.js             # Interactive popup controller, real-time counters & theme toggle
├── options/
│   ├── options.html         # Tabbed settings dashboard (Whitelist CRUD & Automation rules)
│   ├── options.css          # Options page styling
│   └── options.js           # Whitelist manager, JSON import/export, and alarm updater
├── scripts/
│   └── build_zip.js         # Automated Chrome Web Store ZIP packager
└── assets/
    └── icons/
        ├── icon.svg          # Scalable master vector SVG icon
        ├── generate_icons.js # 4x anti-aliased icon generator script
        ├── icon-16.png       # 16x16 extension toolbar icon
        ├── icon-48.png       # 48x48 extensions manager icon
        └── icon-128.png      # 128x128 Web Store / detail page icon
```

---

## 🚀 Installation & Setup

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/CLEANar.git
   ```
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** (Paketlenmiş öge yükle).
5. Select the project directory:
   `c:\DEPO\KOD DEPOSU\CLEANar`
6. Click the extension puzzle icon in the Chrome toolbar and pin **CLEANar**.

---

## 🛠️ Usage Guide

### 1. Manual One-Click Purge
* Click the CLEANar icon in your Chrome toolbar.
* Select your desired **Time Range** (e.g., *Last Hour* or *All Time*).
* Toggle individual categories on/off (Cache, History, Cookies, Downloads, Forms, Storage).
* Click **ERASE NOW** to execute immediate sanitization.

### 2. Emergency Panic Purge
* Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) anywhere in Chrome to trigger an immediate Emergency Panic Purge.

### 3. Right-Click Site Purge
* Right-click anywhere on an open website -> Click **🧹 CLEANar: Purge Data For Active Site**.

### 4. Wildcard Whitelist & Export
* Open **Options** (⚙️).
* Under **Cookie Whitelist**, add exact domains or wildcard patterns like `*.google.com` or `dev.*`.
* Click **Export JSON** to back up your whitelist rules or **Import JSON** to restore them.

### 5. Automation & RAM Saver
* In Options, navigate to **Automation & Shortcuts**.
* Configure **Periodic Alarms**, **Browser Close**, **Tab Close**, or **RAM Saver (Tab Suspender)**.

---

## 📦 Web Store Packaging

To package the extension into a Chrome Web Store ready `.zip` archive:

```bash
node scripts/build_zip.js
```
This generates `cleanar-extension.zip` in the root folder.

---

## 🔒 Security & Privacy

CLEANar is strictly offline and privacy-first: zero analytics, zero external network requests. All data is processed locally using official Chrome Extension APIs.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
