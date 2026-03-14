/**
 * Feature: xweb-cli, Property 8: 链接去重与规范化的幂等性
 *
 * **Validates: Requirements 3.4**
 *
 * For any URL list, after deduplication and normalization:
 * (a) the result should contain no duplicate URLs,
 * (b) applying normalizeAndDedupe again on the result should produce the same result (idempotency).
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeAndDedupe } from '../../src/explore.js';
import type { ExploreResult } from '../../src/types.js';

/**
 * Generator for ExploreResult arrays with realistic URLs.
 * Includes duplicates, hash fragments, and trailing slashes to exercise normalization.
 */
const exploreResultArrayArb = fc
  .array(
    fc.record({
      path: fc.stringMatching(/^[a-z][a-z0-9\-]{0,9}$/),
      title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,14}$/),
      hash: fc.oneof(fc.constant(''), fc.stringMatching(/^#[a-z]{1,6}$/)),
      trailingSlash: fc.boolean(),
    }),
    { minLength: 1, maxLength: 20 },
  )
  .map((items) =>
    items.map(({ path, title, hash, trailingSlash }): ExploreResult => ({
      url: `https://example.com/${path}${trailingSlash ? '/' : ''}${hash}`,
      title,
    })),
  );

describe('Feature: xweb-cli, Property 8: 链接去重与规范化的幂等性', () => {
  it('normalizeAndDedupe produces no duplicates and is idempotent', () => {
    fc.assert(
      fc.property(exploreResultArrayArb, (links) => {
        const result = normalizeAndDedupe(links);

        // (a) No duplicate URLs in result
        const urls = result.map((r) => r.url);
        const uniqueUrls = new Set(urls);
        expect(urls.length).toBe(uniqueUrls.size);

        // (b) Idempotency: applying again produces the same result
        const resultAgain = normalizeAndDedupe(result);
        expect(resultAgain).toEqual(result);
      }),
      { numRuns: 100 },
    );
  });
});
