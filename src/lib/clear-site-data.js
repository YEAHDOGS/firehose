// clear-site-data.js — DOGS standard: we don't set cookies, and this button proves it.
// Wipes everything the browser may be holding for this site:
// document cookies (all paths), localStorage, sessionStorage.
//
// Honest limitation: HttpOnly cookies can only be cleared server-side.
// DOGS sites don't set any, so this covers everything we can touch.

const COOKIE_EPOCH = 'Thu, 01 Jan 1970 00:00:00 GMT';
const CONFIRM_TIMEOUT_MS = 2600;

/**
 * Expire every readable cookie for this site on all common paths,
 * then clear localStorage and sessionStorage. Safe to call when
 * nothing is stored — it's a no-op.
 * @returns {boolean} always true when finished
 */
export function clearSiteData() {
  const loc = typeof window !== 'undefined' ? window.location : null;
  if (typeof document !== 'undefined' && document.cookie) {
    const paths = loc ? ['/', loc.pathname] : ['/'];
    const hosts = loc ? [loc.hostname, '.' + loc.hostname] : [];
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const name = cookie.split('=')[0].trim();
      if (!name) continue;
      for (const path of paths) {
        document.cookie = name + '=;expires=' + COOKIE_EPOCH + ';path=' + path;
        for (const domain of hosts) {
          document.cookie =
            name + '=;expires=' + COOKIE_EPOCH + ';path=' + path + ';domain=' + domain;
        }
      }
    }
  }

  try {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  } catch (e) {
    /* storage unavailable — nothing to clear */
  }
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  } catch (e) {
    /* storage unavailable — nothing to clear */
  }
  return true;
}

export { CONFIRM_TIMEOUT_MS };
