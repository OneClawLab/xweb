import * as cheerio from 'cheerio';
import type { ExploreResult, XwebConfig } from './types.js';
import { NetworkError, TimeoutError, ValidationError } from './types.js';

/**
 * Parse sitemap XML to extract URLs from <loc> tags.
 * Uses cheerio for XML parsing.
 */
export function parseSitemap(xml: string): ExploreResult[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const results: ExploreResult[] = [];

  $('loc').each((_, el) => {
    const url = $(el).text().trim();
    if (!url) return;

    // Extract title from URL path (last segment, cleaned up)
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1] ?? '';
      const title = decodeURIComponent(lastSegment)
        .replace(/[-_]/g, ' ')
        .replace(/\.\w+$/, '') // remove file extension
        .trim() || parsed.hostname;
      results.push({ url, title });
    } catch {
      results.push({ url, title: url });
    }
  });

  return results;
}

/**
 * Extract internal links from HTML.
 * Filters to same hostname, resolves relative URLs, extracts link text as title.
 */
export function extractInternalLinks(html: string, baseUrl: string): ExploreResult[] {
  const $ = cheerio.load(html);
  const results: ExploreResult[] = [];
  let baseHostname: string;

  try {
    baseHostname = new URL(baseUrl).hostname;
  } catch {
    return results;
  }

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    // Resolve relative URLs
    let resolved: URL;
    try {
      resolved = new URL(href, baseUrl);
    } catch {
      return;
    }

    // Filter to internal links only (same hostname)
    if (resolved.hostname !== baseHostname) return;

    const title = $(el).text().trim() || resolved.pathname;
    results.push({ url: resolved.href, title });
  });

  return results;
}

/**
 * Normalize and deduplicate links.
 * - Remove hash fragments
 * - Remove trailing slashes
 * - Lowercase hostname
 * - Deduplicate by normalized URL (keep first occurrence)
 * - Sort alphabetically by URL
 */
export function normalizeAndDedupe(links: ExploreResult[]): ExploreResult[] {
  const seen = new Map<string, ExploreResult>();

  for (const link of links) {
    let normalized: string;
    try {
      const parsed = new URL(link.url);
      parsed.hash = ''; // remove hash fragments
      // Lowercase hostname (URL constructor already lowercases hostname)
      normalized = parsed.href.replace(/\/+$/, ''); // remove trailing slashes
    } catch {
      normalized = link.url;
    }

    if (!seen.has(normalized)) {
      seen.set(normalized, { url: normalized, title: link.title });
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.url.localeCompare(b.url));
}

/**
 * Explore Engine: discover internal links from a URL.
 *
 * Processing logic:
 * 1. Validate URL
 * 2. Try to fetch sitemap.xml first (priority)
 * 3. If no sitemap or fetch fails, fetch target page and extract internal links
 * 4. Normalize and deduplicate results
 *
 * Req 3.1: fetch URL and extract all internal links
 * Req 3.2: prioritize sitemap.xml parsing
 * Req 3.4: deduplicate and normalize links
 */
export async function executeExplore(
  url: string,
  options: { json: boolean },
  config: XwebConfig,
): Promise<ExploreResult[]> {
  // 1. Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new ValidationError(`Invalid URL: ${url}`);
  }

  const fetchOptions = {
    headers: {
      'User-Agent': config.fetch_settings.user_agent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(config.fetch_settings.timeout * 1000),
  };

  let links: ExploreResult[] = [];

  // 2. Try sitemap.xml first
  const sitemapUrl = `${parsedUrl.origin}/sitemap.xml`;
  try {
    const response = await fetch(sitemapUrl, fetchOptions);
    if (response.ok) {
      const text = await response.text();
      // Check if it looks like XML with sitemap content
      if (text.includes('<urlset') || text.includes('<sitemapindex')) {
        links = parseSitemap(text);
      }
    }
  } catch {
    // Sitemap fetch failed, fall through to HTML extraction
  }

  // 3. If no sitemap results, fetch target page and extract links
  if (links.length === 0) {
    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new NetworkError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
        );
      }
      const html = await response.text();
      links = extractInternalLinks(html, url);
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ValidationError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError(url, config.fetch_settings.timeout);
      }
      throw new NetworkError(
        `Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 4. Normalize and deduplicate
  return normalizeAndDedupe(links);
}
