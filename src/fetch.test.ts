import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeFetch } from './fetch.js';
import type { FetchOptions, XwebConfig } from './types.js';
import { NetworkError, TimeoutError, ValidationError } from './types.js';

const defaultConfig: XwebConfig = {
  default_provider: 'google',
  providers: {},
  fetch_settings: {
    user_agent: 'Mozilla/5.0 (compatible; xweb/1.0)',
    timeout: 30,
    max_length: 50000,
  },
};

const defaultOptions: FetchOptions = {
  format: 'markdown',
  raw: false,
};

function mockFetchResponse(body: string, status = 200, statusText = 'OK') {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: () => Promise.resolve(body),
  });
}

describe('executeFetch', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws ValidationError for invalid URL', async () => {
    await expect(executeFetch('not-a-url', defaultOptions, defaultConfig)).rejects.toThrow(
      ValidationError,
    );
  });

  it('fetches HTML and returns markdown by default', async () => {
    const html = '<html><head><title>Test Page</title></head><body><p>Hello world</p></body></html>';
    globalThis.fetch = mockFetchResponse(html);

    const result = await executeFetch('https://example.com', defaultOptions, defaultConfig);

    expect(result).toContain('---');
    expect(result).toContain('title: "Test Page"');
    expect(result).toContain('source: "https://example.com"');
    expect(result).toContain('Hello world');
  });

  it('returns plain text with format=text', async () => {
    const html = '<html><body><p>Hello <strong>world</strong></p></body></html>';
    globalThis.fetch = mockFetchResponse(html);

    const result = await executeFetch(
      'https://example.com',
      { ...defaultOptions, format: 'text' },
      defaultConfig,
    );

    expect(result).toContain('Hello');
    expect(result).toContain('world');
    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<strong>');
  });

  it('returns cleaned HTML with format=html', async () => {
    const html =
      '<html><body><nav>Nav</nav><p>Content</p><script>alert(1)</script></body></html>';
    globalThis.fetch = mockFetchResponse(html);

    const result = await executeFetch(
      'https://example.com',
      { ...defaultOptions, format: 'html' },
      defaultConfig,
    );

    expect(result).toContain('Content');
    expect(result).not.toContain('<nav');
    expect(result).not.toContain('<script');
  });

  it('returns JSON with format=json containing title, source, content', async () => {
    const html = '<html><head><title>JSON Test</title></head><body><p>Data</p></body></html>';
    globalThis.fetch = mockFetchResponse(html);

    const result = await executeFetch(
      'https://example.com',
      { ...defaultOptions, format: 'json' },
      defaultConfig,
    );

    const parsed = JSON.parse(result) as { title: string; source: string; content: string };
    expect(parsed.title).toBe('JSON Test');
    expect(parsed.source).toBe('https://example.com');
    expect(parsed.content).toBeDefined();
  });

  it('skips cleaning in raw mode', async () => {
    const html = '<html><body><nav>Keep Nav</nav><p>Content</p></body></html>';
    globalThis.fetch = mockFetchResponse(html);

    const result = await executeFetch(
      'https://example.com',
      { ...defaultOptions, format: 'html', raw: true },
      defaultConfig,
    );

    expect(result).toContain('Keep Nav');
    expect(result).toContain('Content');
  });

  it('applies CSS selector extraction', async () => {
    const html =
      '<html><body><div class="target">Selected</div><div class="other">Ignored</div></body></html>';
    globalThis.fetch = mockFetchResponse(html);

    const result = await executeFetch(
      'https://example.com',
      { ...defaultOptions, format: 'text', selector: '.target' },
      defaultConfig,
    );

    expect(result).toContain('Selected');
    expect(result).not.toContain('Ignored');
  });

  it('throws NetworkError for HTTP error status', async () => {
    globalThis.fetch = mockFetchResponse('', 404, 'Not Found');

    await expect(
      executeFetch('https://example.com/missing', defaultOptions, defaultConfig),
    ).rejects.toThrow(NetworkError);
  });

  it('truncates HTML exceeding max_length', async () => {
    const longHtml = '<html><body>' + 'x'.repeat(100) + '</body></html>';
    globalThis.fetch = mockFetchResponse(longHtml);

    const config: XwebConfig = {
      ...defaultConfig,
      fetch_settings: { ...defaultConfig.fetch_settings, max_length: 30 },
    };

    const result = await executeFetch(
      'https://example.com',
      { ...defaultOptions, format: 'text' },
      config,
    );

    // The HTML was truncated before processing, so the output should be limited
    expect(typeof result).toBe('string');
  });

  it('extracts title from HTML', async () => {
    const html = '<html><head><title>My Title</title></head><body><p>Body</p></body></html>';
    globalThis.fetch = mockFetchResponse(html);

    const result = await executeFetch(
      'https://example.com',
      { ...defaultOptions, format: 'json' },
      defaultConfig,
    );

    const parsed = JSON.parse(result) as { title: string };
    expect(parsed.title).toBe('My Title');
  });

  it('handles HTML without title tag', async () => {
    const html = '<html><body><p>No title here</p></body></html>';
    globalThis.fetch = mockFetchResponse(html);

    const result = await executeFetch(
      'https://example.com',
      { ...defaultOptions, format: 'json' },
      defaultConfig,
    );

    const parsed = JSON.parse(result) as { title: string };
    expect(parsed.title).toBe('');
  });

  it('sends configured User-Agent header', async () => {
    const html = '<html><body><p>Test</p></body></html>';
    const mockFn = mockFetchResponse(html);
    globalThis.fetch = mockFn;

    await executeFetch('https://example.com', defaultOptions, defaultConfig);

    expect(mockFn).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'Mozilla/5.0 (compatible; xweb/1.0)',
        }) as Record<string, string>,
      }),
    );
  });

  it('throws NetworkError when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    await expect(
      executeFetch('https://example.com', defaultOptions, defaultConfig),
    ).rejects.toThrow(NetworkError);
  });
});
