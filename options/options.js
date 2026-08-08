import { StorageManager } from '../core/storage.js';
import { WhitelistManager } from '../core/whitelist.js';

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  await loadWhitelist();
  await loadAutoCleanSettings();
  bindEvents();
});

function initTabs() {
  const btnWhitelist = document.getElementById('tabBtnWhitelist');
  const btnAutoClean = document.getElementById('tabBtnAutoClean');
  const tabWhitelist = document.getElementById('tabWhitelist');
  const tabAutoClean = document.getElementById('tabAutoClean');

  btnWhitelist.addEventListener('click', () => {
    btnWhitelist.classList.add('active');
    btnAutoClean.classList.remove('active');
    tabWhitelist.classList.add('active');
    tabAutoClean.classList.remove('active');
  });

  btnAutoClean.addEventListener('click', () => {
    btnAutoClean.classList.add('active');
    btnWhitelist.classList.remove('active');
    tabAutoClean.classList.add('active');
    tabWhitelist.classList.remove('active');
  });
}

async function loadWhitelist(searchQuery = '') {
  const domains = await WhitelistManager.getDomains();
  const container = document.getElementById('domainTagsContainer');
  container.innerHTML = '';

  const filtered = domains.filter(d => d.includes(searchQuery.toLowerCase()));

  if (filtered.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">No whitelisted domains added.</span>';
    return;
  }

  filtered.forEach(domain => {
    const tag = document.createElement('div');
    tag.className = 'tag';

    const text = document.createElement('span');
    text.textContent = domain;

    const removeBtn = document.createElement('span');
    removeBtn.className = 'tag-remove';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove Domain';
    removeBtn.addEventListener('click', async () => {
      await WhitelistManager.removeDomain(domain);
      await loadWhitelist(searchQuery);
      showToast('Rule removed!');
    });

    tag.appendChild(text);
    tag.appendChild(removeBtn);
    container.appendChild(tag);
  });
}

async function loadAutoCleanSettings() {
  const settings = await StorageManager.getSettings();
  const { autoClean } = settings;

  document.getElementById('autoCleanEnabled').checked = !!autoClean.enabled;
  document.getElementById('intervalSelect').value = String(autoClean.intervalMinutes || 60);
  document.getElementById('autoCleanOnClose').checked = !!autoClean.onBrowserClose;
  document.getElementById('autoCleanOnTabClose').checked = !!autoClean.onTabClose;
  document.getElementById('autoCleanTabSuspender').checked = !!autoClean.tabSuspender;
  document.getElementById('autoCleanNotify').checked = !!autoClean.notifyOnClean;
}

function bindEvents() {
  // Add Domain
  const addBtn = document.getElementById('addDomainBtn');
  const input = document.getElementById('newDomainInput');

  const handleAdd = async () => {
    const val = input.value.trim();
    if (!val) return;
    const success = await WhitelistManager.addDomain(val);
    if (success) {
      input.value = '';
      await loadWhitelist();
      showToast('Domain rule added!');
    } else {
      showToast('Invalid domain format.');
    }
  };

  addBtn.addEventListener('click', handleAdd);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAdd();
  });

  // Filter Domain Search
  document.getElementById('filterDomainInput').addEventListener('input', (e) => {
    loadWhitelist(e.target.value);
  });

  // Save Auto Clean Rules
  document.getElementById('saveAutoCleanBtn').addEventListener('click', async () => {
    const settings = await StorageManager.getSettings();
    settings.autoClean = {
      enabled: document.getElementById('autoCleanEnabled').checked,
      intervalMinutes: Number(document.getElementById('intervalSelect').value),
      onBrowserClose: document.getElementById('autoCleanOnClose').checked,
      onTabClose: document.getElementById('autoCleanOnTabClose').checked,
      tabSuspender: document.getElementById('autoCleanTabSuspender').checked,
      notifyOnClean: document.getElementById('autoCleanNotify').checked
    };

    await StorageManager.saveSettings(settings);

    // Notify service worker to reset alarms
    try {
      await chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        settings
      });
    } catch (e) {}

    showToast('Auto-Clean settings saved!');
  });

  // JSON Export / Import
  document.getElementById('exportJsonBtn').addEventListener('click', async () => {
    const domains = await WhitelistManager.getDomains();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(domains, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "cleanar_whitelist.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  const fileInput = document.getElementById('importJsonFileInput');
  document.getElementById('importJsonBtn').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          const current = await WhitelistManager.getDomains();
          const merged = [...current, ...imported];
          await WhitelistManager.saveDomains(merged);
          await loadWhitelist();
          showToast('Whitelist imported successfully!');
        }
      } catch (err) {
        showToast('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  });
}

function showToast(msg) {
  const toast = document.getElementById('toastMessage');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
