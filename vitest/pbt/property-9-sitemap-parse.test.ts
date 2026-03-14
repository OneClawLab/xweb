/**
 * Feature: xweb-cli, Property 9: Sitemap XML 解析提取所有 URL
 *
 * **Validates: Requirements 3.2**
 *
 * For any valid sitemap.xml content, the parser should extract all URLs
 * from <loc> tags, and the number of extracted URLs should equal the
 * number of <loc> tags in the XML.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseSitemap } from '../../src/explore.js';

/**
 * Generator for arrays of valid URLs to embed in sitemap XML.
 * Generates 1-20 unique URLs with realistic paths.
 */
const urlArrayArb = fc
  .array(
    fc.stringMatching(/^[a-z][a-z0-9\-]{1,10}$/).map(
      (path) => `https://example.com/${path}`,
    ),
    { minLength: 1, maxLength: 20 },
  )
  .map((urls) => [...new Set(urls)]) // ensure unique URLs for clarity
  .filter((urls) => urls.length >= 1);

/**
 * Build a valid sitemap XML string from an array of URLs.
 */
function buildSitemapXml(urls: string[]): string {
  const entries = urls
    .map(
      (url) => `  <url>\n    <loc>${url}</loc>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

describe('Feature: xweb-cli, Property 9: Sitemap XML 解析提取所有 URL', () => {
  it('parseSitemap extracts all URLs from <loc> tags', () => {
    fc.assert(
      fc.property(urlArrayArb, (urls) => {
        const xml = buildSitemapXml(urls);
        const results = parseSitemap(xml);

        // Number of results equals number of input URLs
        expect(results.length).toBe(urls.length);

        // Each input URL appears in the results
        const resultUrls = results.map((r) => r.url);
        for (const url of urls) {
          expect(resultUrls).toContain(url);
        }
      }),
      { numRuns: 100 },
    );
  });
});
