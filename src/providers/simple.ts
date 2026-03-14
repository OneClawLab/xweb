import * as cheerio from 'cheerio';
import type { SearchProvider, SearchOptions, SearchResult } from '../types.js';
import { NetworkError } from '../types.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

function buildGoogleUrl(query: string, num: number, start = 0): string {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${num}`;
  return start > 0 ? `${url}&start=${start}` : url;
}

function parseSearchResults(html: string): Omit<SearchResult, 'index'>[] {
  const $ = cheerio.load(html);
  const results: Omit<SearchResult, 'index'>[] = [];

  $('div.g').each((_i, el) => {
    const $el = $(el);
    const titleEl = $el.find('h3').first();
    const linkEl = $el.find('a[href]').first();
    const title = titleEl.text().trim();
    const href = linkEl.attr('href') ?? '';

    // Extract snippet from common Google snippet containers
    let snippet = '';
    const snippetEl =
      $el.find('div[data-sncf]').first().text().trim() ||
      $el.find('div.VwiC3b').first().text().trim() ||
      $el.find('span.aCOpRe').first().text().trim() ||
      $el.find('div.IsZvec').first().text().trim();
    snippet = snippetEl;

    if (title && href && href.startsWith('http')) {
      results.push({ title, url: href, snippet });
    }
  });

  return results;
}

async function fetchPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': randomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new NetworkError(
        `Google search returned HTTP ${response.status}`,
        response.status,
      );
    }

    return await response.text();
  } catch (error) {
    if (error instanceof NetworkError) throw error;
    throw new NetworkError(
      `Failed to fetch Google search results: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export class SimpleProvider implements SearchProvider {
  name = 'simple';

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const pageCount = options.deep ? 3 : 1;
    const allResults: Omit<SearchResult, 'index'>[] = [];

    for (let page = 0; page < pageCount; page++) {
      const start = page * 10;
      const url = buildGoogleUrl(query, options.limit, start);
      const html = await fetchPage(url);
      const pageResults = parseSearchResults(html);
      allResults.push(...pageResults);
    }

    // Re-index starting from 1
    return allResults.slice(0, options.limit).map((r, i) => ({
      ...r,
      index: i + 1,
    }));
  }
}

export function createSimpleProvider(): SearchProvider {
  return new SimpleProvider();
}
