import { describe, expect, it } from 'vitest';
import {
  SEARCH_ENGINES,
  buildSearchUrl,
  defaultEngine,
  hostOf,
  looksLikeUrl,
  normalizeInputToUrl,
} from '@/core/util/url';

describe('hostOf', () => {
  it('drops the port and the www prefix, whatever the case', () => {
    expect(hostOf('https://example.com:8443/a')).toBe('example.com');
    expect(hostOf('http://WWW.Example.com:8080/path')).toBe('example.com');
    expect(hostOf('http://localhost:5173/')).toBe('localhost');
  });

  it('converts an internationalized host to its punycode form', () => {
    expect(hostOf('https://MÜNCHEN.example/')).toBe('xn--mnchen-3ya.example');
    expect(hostOf('https://例子.中国/')).toBe('xn--fsqu00a.xn--fiqs8s');
    expect(hostOf('https://xn--mnchen-3ya.example/')).toBe('xn--mnchen-3ya.example');
  });

  it('keeps a trailing dot, so a fully qualified host is not normalised away', () => {
    expect(hostOf('https://example.com./')).toBe('example.com.');
    expect(hostOf('https://example.com/')).toBe('example.com');
  });

  it('returns an empty string for anything without a host', () => {
    for (const raw of ['', 'nonsense', 'http://', 'data:text/plain,hi', 'file:///tmp/x', 'javascript:alert(1)', 'mailto:someone@example.com']) {
      expect(hostOf(raw)).toBe('');
    }
  });
});

describe('buildSearchUrl', () => {
  it('substitutes the query into every shipped engine template', () => {
    for (const engine of SEARCH_ENGINES) {
      expect(engine.template).toContain('%s');
      expect(buildSearchUrl('marktab', engine.id, '')).toBe(engine.template.replace('%s', 'marktab'));
    }
  });

  it('percent-encodes the query and trims surrounding whitespace', () => {
    expect(buildSearchUrl('a b', 'google', '')).toBe('https://www.google.com/search?q=a%20b');
    expect(buildSearchUrl('  react  ', 'bing', '')).toBe('https://www.bing.com/search?q=react');
    expect(buildSearchUrl('c++ & more', 'bing', '')).toBe(
      'https://www.bing.com/search?q=c%2B%2B%20%26%20more',
    );
    expect(buildSearchUrl('ümlaut/路径', 'google', '')).toBe(
      'https://www.google.com/search?q=%C3%BCmlaut%2F%E8%B7%AF%E5%BE%84',
    );
    expect(buildSearchUrl('$&', 'google', '')).toBe('https://www.google.com/search?q=%24%26');
    expect(buildSearchUrl('', 'google', '')).toBe('https://www.google.com/search?q=');
  });

  it('falls back to the default engine for an unknown or empty id', () => {
    const expected = defaultEngine().template.replace('%s', 'react');

    expect(buildSearchUrl('react', 'yandex', '')).toBe(expected);
    expect(buildSearchUrl('react', '', '')).toBe(expected);
    expect(buildSearchUrl('react', 'GOOGLE', '')).toBe(expected);
  });

  it('uses a custom template verbatim when it carries a placeholder', () => {
    expect(buildSearchUrl('react', 'custom', 'https://search.example/?q=%s')).toBe(
      'https://search.example/?q=react',
    );
    expect(buildSearchUrl('a b', 'custom', 'https://search.example/find?term=%s&lang=en')).toBe(
      'https://search.example/find?term=a%20b&lang=en',
    );
  });

  it('appends a query path when the custom template has no placeholder', () => {
    expect(buildSearchUrl('react', 'custom', 'https://search.example')).toBe(
      'https://search.example/search?q=react',
    );
    expect(buildSearchUrl('react', 'custom', 'https://search.example/')).toBe(
      'https://search.example/search?q=react',
    );
  });

  it('replaces only the first placeholder of a custom template', () => {
    expect(buildSearchUrl('react', 'custom', 'https://search.example/?q=%s&r=%s')).toBe(
      'https://search.example/?q=react&r=%s',
    );
  });

  it('returns a relative query path when the custom template is empty', () => {
    // Unreachable through the settings normalizer (it rejects an invalid custom
    // template), but recorded so a direct call cannot silently produce something
    // other than a path.
    expect(buildSearchUrl('react', 'custom', '')).toBe('/search?q=react');
  });
});

describe('looksLikeUrl boundaries', () => {
  it('accepts anything carrying a scheme, whatever that scheme is', () => {
    for (const input of [
      'https://example.com',
      'HTTPS://EXAMPLE.COM',
      'ftp://example.com',
      'mailto:someone@example.com',
      'javascript:alert(1)',
      'data:text/plain,hi',
    ]) {
      expect(looksLikeUrl(input)).toBe(true);
    }
  });

  it('accepts protocol-relative and local destinations', () => {
    expect(looksLikeUrl('//example.com')).toBe(true);
    expect(looksLikeUrl('localhost')).toBe(true);
    expect(looksLikeUrl('localhost:3000')).toBe(true);
    expect(looksLikeUrl('localhost/path')).toBe(true);
  });

  it('accepts an ipv4 destination with an optional port', () => {
    expect(looksLikeUrl('192.168.0.1')).toBe(true);
    expect(looksLikeUrl('192.168.0.1:8080/a')).toBe(true);
    expect(looksLikeUrl('999.999.999.999')).toBe(true);
    expect(looksLikeUrl('1.2.3.4.5')).toBe(false);
  });

  it('requires a plausible top-level label', () => {
    expect(looksLikeUrl('example.com')).toBe(true);
    expect(looksLikeUrl('sub.example.co.uk/path?q=1#f')).toBe(true);
    expect(looksLikeUrl(`a.${'a'.repeat(24)}`)).toBe(true);
    expect(looksLikeUrl(`a.${'a'.repeat(26)}`)).toBe(false);
    expect(looksLikeUrl('foo.123')).toBe(false);
    expect(looksLikeUrl('exa_mple.com')).toBe(false);
  });

  it('rejects a single label that is not localhost or an ip address', () => {
    expect(looksLikeUrl('hello')).toBe(false);
    expect(looksLikeUrl('123')).toBe(false);
    expect(looksLikeUrl('example')).toBe(false);
  });

  it('needs an explicit scheme when the input contains whitespace', () => {
    expect(looksLikeUrl('https://example.com/a b')).toBe(true);
    expect(looksLikeUrl('example.com/a b')).toBe(false);
    expect(looksLikeUrl('  example.com  ')).toBe(true);
    expect(looksLikeUrl('   ')).toBe(false);
  });

  it('rejects a fully qualified host with a trailing dot', () => {
    expect(looksLikeUrl('example.com.')).toBe(false);
    expect(looksLikeUrl('example.')).toBe(false);
  });

  it('rejects a destination whose only path is a query or a fragment', () => {
    // Known gap: HOSTNAME_RE only allows `/` before the path, so a query- or
    // fragment-only destination is classified as a search term.
    expect(looksLikeUrl('example.com?q=1')).toBe(false);
    expect(looksLikeUrl('example.com#f')).toBe(false);
    expect(looksLikeUrl('example.com/?q=1')).toBe(true);
    expect(looksLikeUrl('example.com/#f')).toBe(true);
  });

  it('classifies host:port input as a destination but adds no scheme to it', () => {
    // Known gap: SCHEME_RE matches the `host:` prefix, so looksLikeUrl() says
    // "destination" while normalizeInputToUrl() adds `https://` only when the
    // input has no colon. openUrl() navigates for http(s) only, so pressing
    // Enter on `localhost:3000` does nothing.
    expect(looksLikeUrl('example.com:8443')).toBe(true);
    expect(normalizeInputToUrl('example.com:8443')).toBe('example.com:8443');
    expect(looksLikeUrl('localhost:3000')).toBe(true);
    expect(normalizeInputToUrl('localhost:3000')).toBe('localhost:3000');
  });
});

describe('normalizeInputToUrl', () => {
  it('adds https to a scheme-less destination and trims it', () => {
    expect(normalizeInputToUrl('  example.com  ')).toBe('https://example.com');
    expect(normalizeInputToUrl('example.com/a?q=1')).toBe('https://example.com/a?q=1');
    expect(normalizeInputToUrl('//example.com/a')).toBe('https://example.com/a');
  });

  it('keeps an explicit scheme untouched, including a non-web one', () => {
    expect(normalizeInputToUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeInputToUrl('ftp://example.com')).toBe('ftp://example.com');
    expect(normalizeInputToUrl('javascript:alert(1)')).toBe('javascript:alert(1)');
  });

  it('does not encode anything, leaving the destination as typed', () => {
    expect(normalizeInputToUrl('example.com/a b')).toBe('https://example.com/a b');
  });
});
