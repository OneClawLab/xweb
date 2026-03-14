/**
 * Feature: xweb-cli, Property 13: 搜索结果默认格式包含所有字段
 *
 * **Validates: Requirements 8.2**
 *
 * For any SearchResult array, the default formatted output string should
 * contain each result's title, url, and snippet.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { SearchResult } from '../../src/types.js';
import { formatSearchResults } from '../../src/formatter.js';

/** Arbitrary for a single SearchResult with non-empty fields */
const searchResultArb: fc.Arbitrary<SearchResult> = fc.record({
  index: fc.integer({ min: 1, max: 100 }),
  title: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
  url: fc.webUrl(),
  snippet: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
});

/** Arbitrary for a non-empty array of SearchResult (1-10 items) */
const searchResultsArb: fc.Arbitrary<SearchResult[]> = fc.array(searchResultArb, {
  minLength: 1,
  maxLength: 10,
});

describe('Feature: xweb-cli, Property 13: 搜索结果默认格式包含所有字段', () => {
  it('default format output should contain every result title, url, and snippet', () => {
    fc.assert(
      fc.property(searchResultsArb, (results: SearchResult[]) => {
        const output = formatSearchResults(results, false);

        for (const r of results) {
          expect(output).toContain(r.title);
          expect(output).toContain(r.url);
          expect(output).toContain(r.snippet);
        }
      }),
      { numRuns: 100 },
    );
  });
});
