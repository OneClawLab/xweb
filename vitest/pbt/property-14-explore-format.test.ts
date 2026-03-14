/**
 * Feature: xweb-cli, Property 14: Explore 结果默认格式包含所有字段
 *
 * **Validates: Requirements 8.3**
 *
 * For any ExploreResult array, the default formatted output string should
 * contain each result's url and title.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ExploreResult } from '../../src/types.js';
import { formatExploreResults } from '../../src/formatter.js';

/** Arbitrary for a single ExploreResult with non-empty fields */
const exploreResultArb: fc.Arbitrary<ExploreResult> = fc.record({
  url: fc.webUrl(),
  title: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
});

/** Arbitrary for a non-empty array of ExploreResult (1-10 items) */
const exploreResultsArb: fc.Arbitrary<ExploreResult[]> = fc.array(exploreResultArb, {
  minLength: 1,
  maxLength: 10,
});

describe('Feature: xweb-cli, Property 14: Explore 结果默认格式包含所有字段', () => {
  it('default format output should contain every result url and title', () => {
    fc.assert(
      fc.property(exploreResultsArb, (results: ExploreResult[]) => {
        const output = formatExploreResults(results, false);

        for (const r of results) {
          expect(output).toContain(r.url);
          expect(output).toContain(r.title);
        }
      }),
      { numRuns: 100 },
    );
  });
});
