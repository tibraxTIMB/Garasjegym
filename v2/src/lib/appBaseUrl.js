/**
 * Returns the app's configured base URL for Supabase email redirects.
 * This matters on GitHub Pages, where the app lives below the host root.
 */
export function getAppBaseUrl(origin, baseUrl = '/') {
  if (typeof origin !== 'string' || !origin.trim()) {
    throw new TypeError('An app origin is required.');
  }
  const url = new URL(baseUrl || '/', origin);
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.toString();
}
