import { describe, expect, it } from 'vitest';
import {
  SEARCH_ENGINES,
  buildSearchUrl,
  defaultEngine,
  displayUrl,
  findEngine,
  hostOf,
  isWebUrl,
  isValidTemplate,
  looksLikeUrl,
  normalizeInputToUrl,
  parseUrl,
  prettyPath,
} from '@/core/util/url';

describe('parseUrl', () => {
  it('parses absolute urls and rejects everything else', () => {
    expect(parseUrl('https://example.com/a')?.hostname).toBe('example.com');
    expect(parseUrl('not a url')).toBeNull();
    expect(parseUrl('')).toBeNull();
  });
});

describe('hostOf', () => {
  it('lower-cases the host and strips a leading www', () => {
    expect(hostOf('https://WWW.Example.com/Path')).toBe('example.com');
    expect(hostOf('https://sub.example.com/')).toBe('sub.example.com');
  });

  it('returns an empty string for opaque or unparseable urls', () => {
    expect(hostOf('mailto:someone@example.com')).toBe('');
    expect(hostOf('nonsense')).toBe('');
  });
});

describe('isWebUrl', () => {
  it('accepts only http(s) destinations', () => {
    expect(isWebUrl('https://example.com')).toBe(true);
    expect(isWebUrl('http://example.com')).toBe(true);
    expect(isWebUrl('ftp://example.com')).toBe(false);
    expect(isWebUrl('mailto:someone@example.com')).toBe(false);
    expect(isWebUrl('nonsense')).toBe(false);
  });
});

describe('prettyPath', () => {
  it('keeps the path and query, drops a bare or trailing slash', () => {
    expect(prettyPath('https://example.com/')).toBe('');
    expect(prettyPath('https://example.com/a/')).toBe('/a');
    expect(prettyPath('https://example.com/a?q=1')).toBe('/a?q=1');
  });

  it('passes unparseable input through unchanged', () => {
    expect(prettyPath('nonsense')).toBe('nonsense');
  });
});

describe('displayUrl', () => {
  it('renders host + path without a scheme', () => {
    expect(displayUrl('https://www.example.com/a/')).toBe('example.com/a');
    expect(displayUrl('https://example.com:8443/a')).toBe('example.com:8443/a');
  });

  it('leaves non-web urls untouched', () => {
    expect(displayUrl('mailto:someone@example.com')).toBe('mailto:someone@example.com');
  });
});

describe('looksLikeUrl', () => {
  it('accepts scheme-carrying, localhost and dotted destinations', () => {
    expect(looksLikeUrl('https://example.com/a')).toBe(true);
    expect(looksLikeUrl('example.com')).toBe(true);
    expect(looksLikeUrl('example.com/a?q=1')).toBe(true);
    expect(looksLikeUrl('localhost')).toBe(true);
    expect(looksLikeUrl('192.168.0.1')).toBe(true);
  });

  it('rejects plain words, spaces and single-label misses', () => {
    expect(looksLikeUrl('hello')).toBe(false);
    expect(looksLikeUrl('what is this')).toBe(false);
    expect(looksLikeUrl('foo.123')).toBe(false);
    expect(looksLikeUrl('')).toBe(false);
  });

  it('only treats whitespace-containing input as a url when a scheme is present', () => {
    expect(looksLikeUrl('https://example.com/a b')).toBe(true);
    expect(looksLikeUrl('example.com/a b')).toBe(false);
  });
});

describe('normalizeInputToUrl', () => {
  it('adds https to scheme-less destinations and trims input', () => {
    expect(normalizeInputToUrl('  example.com  ')).toBe('https://example.com');
    expect(normalizeInputToUrl('//example.com')).toBe('https://example.com');
  });

  it('keeps an explicit scheme untouched', () => {
    expect(normalizeInputToUrl('http://example.com')).toBe('http://example.com');
  });
});

describe('search engines', () => {
  it('exposes a default engine that findEngine can resolve', () => {
    expect(findEngine(defaultEngine().id)).toBe(defaultEngine());
    expect(findEngine('nope')).toBeUndefined();
    expect(SEARCH_ENGINES.length).toBeGreaterThan(0);
  });

  it('encodes the query into the engine template', () => {
    expect(buildSearchUrl('a b', 'google', '')).toBe(
      'https://www.google.com/search?q=a%20b',
    );
    expect(buildSearchUrl('react', 'duckduckgo', '')).toBe('https://duckduckgo.com/?q=react');
  });

  it('falls back to the default engine for an unknown id', () => {
    expect(buildSearchUrl('react', 'nope', '')).toBe(defaultEngine().template.replace('%s', 'react'));
  });

  it('uses the custom template, adding a query path only when %s is missing', () => {
    expect(buildSearchUrl('react', 'custom', 'https://search.example/?q=%s')).toBe(
      'https://search.example/?q=react',
    );
    expect(buildSearchUrl('react', 'custom', 'https://search.example/')).toBe(
      'https://search.example/search?q=react',
    );
  });
});

describe('isValidTemplate', () => {
  it('requires an http(s) destination', () => {
    expect(isValidTemplate('https://search.example/?q=%s')).toBe(true);
    expect(isValidTemplate('http://search.example/?q=%s')).toBe(true);
    expect(isValidTemplate('javascript:alert(1)')).toBe(false);
    expect(isValidTemplate('search.example')).toBe(false);
    expect(isValidTemplate('   ')).toBe(false);
  });
});
