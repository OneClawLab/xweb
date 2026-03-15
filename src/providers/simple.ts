import * as cheerio from 'cheerio';
import type { SearchProvider, SearchOptions, SearchResult } from '../types.js';
import { NetworkError } from '../types.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

type RawResult = Omit<SearchResult, 'index'>;

// ── Fetch helper ────────────────────────────────────────────

async function fetchHTML(url: string, timeoutMs = 10_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!resp.ok) throw new NetworkError(`HTTP ${resp.status}`, resp.status);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

// ── Engine: Bing ────────────────────────────────────────────

function bingUrl(query: string, count: number, offset = 0): string {
  // setlang=match: let Bing match result language to query language
  const u = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${count}&setlang=match`;
  return offset > 0 ? `${u}&first=${offset + 1}` : u;
}

function parseBing(html: string): RawResult[] {
  const $ = cheerio.load(html);
  const results: RawResult[] = [];
  $('li.b_algo').each((_i, el) => {
    const $el = $(el);
    const linkEl = $el.find('h2 a').first();
    const title = linkEl.text().trim();
    let href = linkEl.attr('href') ?? '';
    const snippet = $el.find('.b_caption p').first().text().trim()
      || $el.find('p').first().text().trim();

    // Bing wraps URLs in tracking redirects — extract the real URL
    href = decodeBingUrl(href);

    if (title && href.startsWith('http')) {
      results.push({ title, url: href, snippet });
    }
  });
  return results;
}

function decodeBingUrl(href: string): string {
  try {
    const u = new URL(href);
    // Bing tracking links have the real URL base64-encoded in the &u= param
    const uParam = u.searchParams.get('u');
    if (uParam && uParam.startsWith('a1')) {
      // Strip the 'a1' prefix and decode base64
      const decoded = Buffer.from(uParam.slice(2), 'base64').toString('utf-8');
      if (decoded.startsWith('http')) return decoded;
    }
  } catch {
    // Not a tracking URL, return as-is
  }
  return href;
}

async function searchBing(query: string, limit: number, deep: boolean): Promise<RawResult[]> {
  const pages = deep ? 3 : 1;
  const perPage = Math.max(limit, 10);
  const all: RawResult[] = [];
  for (let p = 0; p < pages; p++) {
    const html = await fetchHTML(bingUrl(query, perPage, p * perPage));
    all.push(...parseBing(html));
    if (all.length >= limit) break;
  }
  return all;
}

// ── Engine: Google (gbv=1, basic HTML version) ──────────────

function googleUrl(query: string, num: number, start = 0): string {
  const u = `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=14&gbv=1&num=${num}`;
  return start > 0 ? `${u}&start=${start}` : u;
}

function parseGoogle(html: string): RawResult[] {
  const $ = cheerio.load(html);
  const results: RawResult[] = [];
  $('div.g').each((_i, el) => {
    const $el = $(el);
    const linkEl = $el.find('a[href]').first();
    const href = linkEl.attr('href') ?? '';
    const title = $el.find('h3').first().text().trim() || linkEl.text().trim().split('\n')[0] || '';
    const snippet =
      $el.find('div[data-sncf]').first().text().trim() ||
      $el.find('div.VwiC3b').first().text().trim() ||
      $el.find('span.aCOpRe').first().text().trim() ||
      $el.find('div.IsZvec').first().text().trim() ||
      '';
    if (title && href.startsWith('http')) {
      results.push({ title, url: href, snippet });
    }
  });
  return results;
}

async function searchGoogle(query: string, limit: number, deep: boolean): Promise<RawResult[]> {
  const pages = deep ? 3 : 1;
  const all: RawResult[] = [];
  for (let p = 0; p < pages; p++) {
    const html = await fetchHTML(googleUrl(query, limit, p * 10));
    all.push(...parseGoogle(html));
    if (all.length >= limit) break;
  }
  return all;
}

// ── Engine: DuckDuckGo HTML ─────────────────────────────────

async function searchDDG(query: string, limit: number): Promise<RawResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);
  const results: RawResult[] = [];
  $('.result').each((_i, el) => {
    const $el = $(el);
    const linkEl = $el.find('.result__a').first();
    const title = linkEl.text().trim();
    const href = linkEl.attr('href') ?? '';
    const snippet = $el.find('.result__snippet').text().trim();
    if (title && href) {
      results.push({ title, url: href, snippet });
    }
  });
  return results.slice(0, limit);
}

// ── Engine chain with fallback ──────────────────────────────

interface Engine {
  name: string;
  search: (query: string, limit: number, deep: boolean) => Promise<RawResult[]>;
}

const ENGINES: Engine[] = [
  { name: 'bing',   search: searchBing },
  { name: 'google', search: searchGoogle },
  { name: 'ddg',    search: searchDDG },
];

async function searchWithFallback(query: string, limit: number, deep: boolean): Promise<RawResult[]> {
  const errors: string[] = [];
  for (const engine of ENGINES) {
    try {
      const results = await engine.search(query, limit, deep);
      if (results.length > 0) return results;
      // Got 0 results — not an error, but try next engine
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${engine.name}: ${msg}`);
    }
  }
  // All engines failed or returned empty
  if (errors.length > 0) {
    throw new NetworkError(`All search engines failed: ${errors.join('; ')}`);
  }
  return [];
}

// ── Provider export ─────────────────────────────────────────

export class SimpleProvider implements SearchProvider {
  name = 'simple';

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const results = await searchWithFallback(query, options.limit, options.deep);
    return results.slice(0, options.limit).map((r, i) => ({ ...r, index: i + 1 }));
  }
}

export function createSimpleProvider(): SearchProvider {
  return new SimpleProvider();
}
