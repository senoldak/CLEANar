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
