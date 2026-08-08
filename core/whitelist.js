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
    if (!cookieDomain || !whitelist || whitelist.length === 0) return false;
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
