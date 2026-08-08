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
