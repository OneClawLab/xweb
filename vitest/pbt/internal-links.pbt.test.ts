/**
 * Feature: xweb-cli, Property 10: 内部链接提取完整性
 *
 * **Validates: Requirements 3.1**
 *
 * For any HTML document and base URL, the link extractor should find all
 * <a> tags pointing to the same domain, and should not include any
 * external domain links.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { extractInternalLinks } from '../../src/explore.js';

const BASE_DOMAIN = 'example.com';
const BASE_URL = `https://${BASE_DOMAIN}`;

/**
 * Generator for a mix of internal and external links embedded in HTML.
 */
const htmlWithLinksArb = fc
  .record({
    internalPaths: fc.array(
      fc.stringMatching(/^[a-z][a-z0-9\-]{0,9}$/),
      { minLength: 1, maxLength: 10 },
    ),
    externalPaths: fc.array(
      fc.stringMatching(/^[a-z][a-z0-9\-]{0,9}$/),
      { minLength: 0, maxLength: 5 },
    ),
    externalDomain: fc
      .stringMatching(/^[a-z]{3,8}\.com$/)
      .filter((d) => d !== BASE_DOMAIN),
  })
  .map(({ internalPaths, externalPaths, externalDomain }) => {
    const internalLinks = internalPaths.map(
      (p) => `<a href="https://${BASE_DOMAIN}/${p}">Internal ${p}</a>`,
    );
    const externalLinks = externalPaths.map(
      (p) => `<a href="https://${externalDomain}/${p}">External ${p}</a>`,
    );
    const allLinks = [...internalLinks, ...externalLinks];
    const html = `<html><body>${allLinks.join('\n')}</body></html>`;
    return { html, internalPaths, externalDomain, externalCount: externalPaths.length };
  });

describe('Feature: xweb-cli, Property 10: 内部链接提取完整性', () => {
  it('extractInternalLinks returns only same-domain links and no external links', () => {
    fc.assert(
      fc.property(htmlWithLinksArb, ({ html, internalPaths, externalDomain }) => {
        const results = extractInternalLinks(html, BASE_URL);

        // All returned URLs must have the same hostname as baseUrl
        for (const result of results) {
          const hostname = new URL(result.url).hostname;
          expect(hostname).toBe(BASE_DOMAIN);
        }

        // No external URLs should be included
        for (const result of results) {
          const hostname = new URL(result.url).hostname;
          expect(hostname).not.toBe(externalDomain);
        }

        // Each internal path should appear in the results
        for (const path of internalPaths) {
          const expectedUrl = `https://${BASE_DOMAIN}/${path}`;
          const resultUrls = results.map((r) => r.url);
          expect(resultUrls).toContain(expectedUrl);
        }
      }),
      { numRuns: 100 },
    );
  });
});
