import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BraveProvider, createBraveProvider } from './brave.js';
import { TavilyProvider, createTavilyProvider } from './tavily.js';
import { SerperProvider, createSerperProvider } from './serper.js';
import { NetworkError } from '../types.js';

// Mock global fetch
const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

// ── Brave Provider ──────────────────────────────────────────

describe('BraveProvider', () => {
  const apiKey = 'test-brave-key';

  it('implements SearchProvider interface with name "brave"', () => {
    const provider = new BraveProvider(apiKey);
    expect(provider.name).toBe('brave');
  });

  it('sends correct headers and query params', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ web: { results: [] } }));

    const provider = new BraveProvider(apiKey);
    await provider.search('test query', { limit: 5, deep: false });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.searchParams.get('q')).toBe('test query');
    expect(parsed.searchParams.get('count')).toBe('5');
    expect(parsed.searchParams.has('extra_snippets')).toBe(false);
    expect((init.headers as Record<string, string>)['X-Subscription-Token']).toBe(apiKey);
  });

  it('sets deep mode params when deep is true', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ web: { results: [] } }));

    const provider = new BraveProvider(apiKey);
    await provider.search('deep query', { limit: 10, deep: true });

    const [url] = mockFetch.mock.calls[0] as [string];
    const parsed = new URL(url);
    expect(parsed.searchParams.get('result_filter')).toBe('web');
    expect(parsed.searchParams.get('extra_snippets')).toBe('true');
  });

  it('maps API response to SearchResult array', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({
      web: {
        results: [
          { title: 'Result 1', url: 'https://example.com/1', description: 'Desc 1' },
          { title: 'Result 2', url: 'https://example.com/2', description: 'Desc 2' },
        ],
      },
    }));

    const provider = new BraveProvider(apiKey);
    const results = await provider.search('test', { limit: 5, deep: false });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ index: 1, title: 'Result 1', url: 'https://example.com/1', snippet: 'Desc 1' });
    expect(results[1]).toEqual({ index: 2, title: 'Result 2', url: 'https://example.com/2', snippet: 'Desc 2' });
  });

  it('respects limit when API returns more results', async () => {
    const manyResults = Array.from({ length: 20 }, (_, i) => ({
      title: `R${i}`, url: `https://example.com/${i}`, description: `D${i}`,
    }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ web: { results: manyResults } }));

    const provider = new BraveProvider(apiKey);
    const results = await provider.search('test', { limit: 3, deep: false });

    expect(results).toHaveLength(3);
  });

  it('throws NetworkError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 401));

    const provider = new BraveProvider(apiKey);
    await expect(provider.search('test', { limit: 5, deep: false })).rejects.toThrow(NetworkError);
  });

  it('returns empty array when web.results is missing', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    const provider = new BraveProvider(apiKey);
    const results = await provider.search('test', { limit: 5, deep: false });
    expect(results).toEqual([]);
  });

  it('factory function creates a valid provider', () => {
    const provider = createBraveProvider('key');
    expect(provider.name).toBe('brave');
  });
});

// ── Tavily Provider ─────────────────────────────────────────

describe('TavilyProvider', () => {
  const apiKey = 'test-tavily-key';

  it('implements SearchProvider interface with name "tavily"', () => {
    const provider = new TavilyProvider(apiKey);
    expect(provider.name).toBe('tavily');
  });

  it('sends POST request with correct body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));

    const provider = new TavilyProvider(apiKey);
    await provider.search('test query', { limit: 5, deep: false });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.api_key).toBe(apiKey);
    expect(body.query).toBe('test query');
    expect(body.max_results).toBe(5);
    expect(body.search_depth).toBe('basic');
  });

  it('uses advanced search_depth when deep is true', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));

    const provider = new TavilyProvider(apiKey);
    await provider.search('deep query', { limit: 10, deep: true });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.search_depth).toBe('advanced');
  });

  it('maps API response to SearchResult array', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({
      results: [
        { title: 'Tavily 1', url: 'https://tavily.com/1', content: 'Content 1' },
        { title: 'Tavily 2', url: 'https://tavily.com/2', content: 'Content 2' },
      ],
    }));

    const provider = new TavilyProvider(apiKey);
    const results = await provider.search('test', { limit: 5, deep: false });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ index: 1, title: 'Tavily 1', url: 'https://tavily.com/1', snippet: 'Content 1' });
  });

  it('throws NetworkError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));

    const provider = new TavilyProvider(apiKey);
    await expect(provider.search('test', { limit: 5, deep: false })).rejects.toThrow(NetworkError);
  });

  it('returns empty array when results is missing', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    const provider = new TavilyProvider(apiKey);
    const results = await provider.search('test', { limit: 5, deep: false });
    expect(results).toEqual([]);
  });

  it('factory function creates a valid provider', () => {
    const provider = createTavilyProvider('key');
    expect(provider.name).toBe('tavily');
  });
});

// ── Serper Provider ─────────────────────────────────────────

describe('SerperProvider', () => {
  const apiKey = 'test-serper-key';

  it('implements SearchProvider interface with name "serper"', () => {
    const provider = new SerperProvider(apiKey);
    expect(provider.name).toBe('serper');
  });

  it('sends POST request with correct headers and body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ organic: [] }));

    const provider = new SerperProvider(apiKey);
    await provider.search('test query', { limit: 5, deep: false });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-API-KEY']).toBe(apiKey);
    const body = JSON.parse(init.body as string);
    expect(body.q).toBe('test query');
    expect(body.num).toBe(5);
    expect(body.gl).toBeUndefined();
  });

  it('adds gl and hl params when deep is true', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ organic: [] }));

    const provider = new SerperProvider(apiKey);
    await provider.search('deep query', { limit: 10, deep: true });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.gl).toBe('us');
    expect(body.hl).toBe('en');
  });

  it('maps API response to SearchResult array', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({
      organic: [
        { title: 'Serper 1', link: 'https://serper.dev/1', snippet: 'Snippet 1' },
        { title: 'Serper 2', link: 'https://serper.dev/2', snippet: 'Snippet 2' },
      ],
    }));

    const provider = new SerperProvider(apiKey);
    const results = await provider.search('test', { limit: 5, deep: false });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ index: 1, title: 'Serper 1', url: 'https://serper.dev/1', snippet: 'Snippet 1' });
  });

  it('throws NetworkError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 403));

    const provider = new SerperProvider(apiKey);
    await expect(provider.search('test', { limit: 5, deep: false })).rejects.toThrow(NetworkError);
  });

  it('returns empty array when organic is missing', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    const provider = new SerperProvider(apiKey);
    const results = await provider.search('test', { limit: 5, deep: false });
    expect(results).toEqual([]);
  });

  it('factory function creates a valid provider', () => {
    const provider = createSerperProvider('key');
    expect(provider.name).toBe('serper');
  });
});
