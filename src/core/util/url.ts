/** URL helpers shared by search, the palette and the bookmark model. */

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/;
const HOSTNAME_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i;
const TRAILING_DOT = /\.$/;

export function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/** Lower-cased hostname with a leading `www.` removed. Empty for opaque URLs. */
export function hostOf(raw: string): string {
  const url = parseUrl(raw);
  if (!url) return '';
  return url.hostname.toLowerCase().replace(/^www\./, '');
}

export function isWebUrl(raw: string): boolean {
  const url = parseUrl(raw);
  if (!url) return false;
  return url.protocol === 'http:' || url.protocol === 'https:';
}

export function prettyPath(raw: string): string {
  const url = parseUrl(raw);
  if (!url) return raw;
  const path = `${url.pathname}${url.search}`;
  return path === '/' ? '' : path.replace(/\/$/, '');
}

/** Compact human-readable form: `host/path`, never the scheme. */
export function displayUrl(raw: string): string {
  const url = parseUrl(raw);
  if (!url) return raw;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return raw;
  const host = url.hostname.replace(/^www\./, '') + (url.port ? `:${url.port}` : '');
  return `${host}${prettyPath(raw)}`;
}

/**
 * Decides whether raw input should be treated as a destination instead of a
 * search term. Deliberately conservative: whitespace-containing input is only a
 * URL when it carries an explicit scheme.
 */
/**
 * Schemes MarkTab is willing to navigate to.
 *
 * One allow-list, used by every way a URL can be opened (page navigation, a new
 * tab, a new window) and by the bookmark anchors, because a bookmark URL is data
 * the user may not have typed: an import file or a page can put `javascript:`,
 * `data:` or `file:` there.
 */
const OPENABLE_SCHEME = /^(https?|chrome-extension):/i;

export function canOpenUrl(url: string): boolean {
  return OPENABLE_SCHEME.test(url.trim());
}

export function looksLikeUrl(input: string): boolean {
  const value = input.trim();
  if (!value || /\s/.test(value)) return SCHEME_RE.test(value);
  if (SCHEME_RE.test(value)) return true;
  if (value.startsWith('//')) return true;
  const hostPart = value.split(/[/?#]/, 1)[0] ?? value;
  if (hostPart.toLowerCase() === 'localhost') return true;
  if (IPV4_RE.test(value)) return true;
  if (!hostPart.includes('.')) return false;
  const bare = TRAILING_DOT.test(hostPart) ? hostPart.slice(0, -1) : hostPart;
  const lastLabel = bare.split('.').pop() ?? '';
  if (!/^[a-z]{2,24}$/i.test(lastLabel)) return false;
  return HOSTNAME_RE.test(value);
}

/** Adds `https://` to scheme-less destinations. */
export function normalizeInputToUrl(input: string): string {
  const value = input.trim();
  if (SCHEME_RE.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return `https://${value}`;
}

export interface SearchEngine {
  id: string;
  label: string;
  /** `%s` is replaced with the encoded query. */
  template: string;
  /** True when the engine is a user-provided template. */
  custom?: boolean;
}

export const SEARCH_ENGINES: readonly SearchEngine[] = [
  { id: 'google', label: 'Google', template: 'https://www.google.com/search?q=%s' },
  { id: 'duckduckgo', label: 'DuckDuckGo', template: 'https://duckduckgo.com/?q=%s' },
  { id: 'bing', label: 'Bing', template: 'https://www.bing.com/search?q=%s' },
  { id: 'baidu', label: '百度', template: 'https://www.baidu.com/s?wd=%s' },
];

export function defaultEngine(): SearchEngine {
  return SEARCH_ENGINES[0] as SearchEngine;
}

export function findEngine(id: string): SearchEngine | undefined {
  return SEARCH_ENGINES.find((engine) => engine.id === id);
}

export function buildSearchUrl(
  query: string,
  engineId: string,
  customTemplate: string,
): string {
  const encoded = encodeURIComponent(query.trim());
  if (engineId === 'custom') {
    const template = customTemplate.includes('%s')
      ? customTemplate
      : `${customTemplate.replace(/\/$/, '')}/search?q=%s`;
    return template.replace('%s', encoded);
  }
  const engine = findEngine(engineId) ?? defaultEngine();
  return engine.template.replace('%s', encoded);
}

/** Validates a custom search template in settings. */
export function isValidTemplate(template: string): boolean {
  const value = template.trim();
  if (!value) return false;
  const url = parseUrl(value.includes('%s') ? value.replace('%s', 'query') : value);
  if (!url) return false;
  return url.protocol === 'https:' || url.protocol === 'http:';
}
