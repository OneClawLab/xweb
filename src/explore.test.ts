import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseSitemap,
  extractInternalLinks,
  normalizeAndDedupe,
  executeExplore,
} from './explore.js';
import type { XwebConfig } from './types.js';
import { ValidationError, NetworkError } from './types.js';

const defaultConfig: XwebConfig = {
  default_provider: 'google',
  providers: {},
  fetch_settings: {
    user_agent: 'Mozilla/5.0 (compatible; xweb/1.0)',
    timeout: 30,
    max_length: 50000,
  },
};

// ── parseSitemap ────────────────────────────────────────────

describe('parseSitemap', () => {
  it('extracts URLs from <loc> tags', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/about</loc></url>
        <url><loc>https://example.com/blog/post-1</loc></url>
      </urlset>`;

    const results = parseSitemap(xml);
    expect(results).toHaveLength(2);
    expect(results[0]!.url).toBe('https://example.com/about');
    expect(results[0]!.title).toBe('about');
    expect(results[1]!.url).toBe('https://example.com/blog/post-1');
    expect(results[1]!.title).toBe('post 1');
  });

  it('handles empty sitemap', () => {
    const xml = `<?xml version="1.0"?><urlset></urlset>`;
    expect(parseSitemap(xml)).toEqual([]);
  });

  it('cleans file extensions from title', () => {
    const xml = `<urlset><url><loc>https://example.com/docs/guide.html</loc></url></urlset>`;
    const results = parseSitemap(xml);
    expect(results[0]!.title).toBe('guide');
  });

  it('uses hostname as title when path is empty', () => {
    const xml = `<urlset><url><loc>https://example.com/</loc></url></urlset>`;
    const results = parseSitemap(xml);
    expect(results[0]!.title).toBe('example.com');
  });
});

// ── extractInternalLinks ────────────────────────────────────

describe('extractInternalLinks', () => {
  it('extracts internal links only', () => {
    const html = `<html><body>
      <a href="/about">About</a>
      <a href="https://example.com/contact">Contact</a>
      <a href="https://external.com/page">External</a>
    </body></html>`;

    const results = extractInternalLinks(html, 'https://example.com');
    expect(results).toHaveLength(2);
    expect(results.map(r => r.url)).toContain('https://example.com/about');
    expect(results.map(r => r.url)).toContain('https://example.com/contact');
  });

  it('resolves relative URLs against base', () => {
    const html = `<html><body><a href="/docs/intro">Intro</a></body></html>`;
    const results = extractInternalLinks(html, 'https://example.com/page');
    expect(results[0]!.url).toBe('https://example.com/docs/intro');
  });

  it('uses link text as title', () => {
    const html = `<html><body><a href="/about">About Us</a></body></html>`;
    const results = extractInternalLinks(html, 'https://example.com');
    expect(results[0]!.title).toBe('About Us');
  });

  it('skips anchors without href', () => {
    const html = `<html><body><a>No href</a><a href="/real">Real</a></body></html>`;
    const results = extractInternalLinks(html, 'https://example.com');
    expect(results).toHaveLength(1);
  });

  it('returns empty for invalid base URL', () => {
    const html = `<html><body><a href="/about">About</a></body></html>`;
    expect(extractInternalLinks(html, 'not-a-url')).toEqual([]);
  });
});

// ── normalizeAndDedupe ──────────────────────────────────────

describe('normalizeAndDedupe', () => {
  it('removes duplicate URLs', () => {
    const links = [
      { url: 'https://example.com/about', title: 'About' },
      { url: 'https://example.com/about', title: 'About Us' },
    ];
    const results = normalizeAndDedupe(links);
    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe('About'); // keeps first occurrence
  });

  it('removes hash fragments', () => {
    const links = [
      { url: 'https://example.com/page#section1', title: 'Section 1' },
      { url: 'https://example.com/page#section2', title: 'Section 2' },
    ];
    const results = normalizeAndDedupe(links);
    expect(results).toHaveLength(1);
    expect(results[0]!.url).not.toContain('#');
  });

  it('removes trailing slashes', () => {
    const links = [
      { url: 'https://example.com/about/', title: 'About' },
      { url: 'https://example.com/about', title: 'About 2' },
    ];
    const results = normalizeAndDedupe(links);
    expect(results).toHaveLength(1);
  });

  it('sorts results alphabetically by URL', () => {
    const links = [
      { url: 'https://example.com/z', title: 'Z' },
      { url: 'https://example.com/a', title: 'A' },
      { url: 'https://example.com/m', title: 'M' },
    ];
    const results = normalizeAndDedupe(links);
    expect(results.map(r => r.url)).toEqual([
      'https://example.com/a',
      'https://example.com/m',
      'https://example.com/z',
    ]);
  });

  it('handles empty input', () => {
    expect(normalizeAndDedupe([])).toEqual([]);
  });
});

// ── executeExplore ──────────────────────────────────────────

describe('executeExplore', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetchResponse(body: string, status = 200, statusText = 'OK') {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText,
      text: () => Promise.resolve(body),
    };
  }

  it('throws ValidationError for invalid URL', async () => {
    await expect(
      executeExplore('not-a-url', { json: false }, defaultConfig),
    ).rejects.toThrow(ValidationError);
  });

  it('uses sitemap when available', async () => {
    const sitemapXml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/page1</loc></url>
        <url><loc>https://example.com/page2</loc></url>
      </urlset>`;

    globalThis.fetch = vi.fn().mockResolvedValue(mockFetchResponse(sitemapXml));

    const results = await executeExplore(
      'https://example.com',
      { json: false },
      defaultConfig,
    );

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.map(r => r.url)).toContain('https://example.com/page1');
    expect(results.map(r => r.url)).toContain('https://example.com/page2');
  });

  it('falls back to HTML link extraction when sitemap fails', async () => {
    const html = `<html><body>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </body></html>`;

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(mockFetchResponse('', 404, 'Not Found')) // sitemap fails
      .mockResolvedValueOnce(mockFetchResponse(html)); // page fetch succeeds

    const results = await executeExplore(
      'https://example.com',
      { json: false },
      defaultConfig,
    );

    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('throws NetworkError for HTTP error on page fetch', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(mockFetchResponse('', 404, 'Not Found')) // sitemap fails
      .mockResolvedValueOnce(mockFetchResponse('', 500, 'Server Error')); // page fails

    await expect(
      executeExplore('https://example.com', { json: false }, defaultConfig),
    ).rejects.toThrow(NetworkError);
  });

  it('deduplicates and normalizes results', async () => {
    const sitemapXml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/page</loc></url>
        <url><loc>https://example.com/page/</loc></url>
        <url><loc>https://example.com/page#section</loc></url>
      </urlset>`;

    globalThis.fetch = vi.fn().mockResolvedValue(mockFetchResponse(sitemapXml));

    const results = await executeExplore(
      'https://example.com',
      { json: false },
      defaultConfig,
    );

    // All three should normalize to the same URL
    expect(results).toHaveLength(1);
    expect(results[0]!.url).toBe('https://example.com/page');
  });
});
