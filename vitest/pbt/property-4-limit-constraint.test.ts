/**
 * Feature: xweb-cli, Property 4: Limit 参数约束结果数量
 *
 * **Validates: Requirements 1.4**
 *
 * For any positive integer n and any set of search results, when specifying
 * `--limit n`, the returned search result array length should not exceed n.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { SearchProvider, SearchOptions, SearchResult } from '../../src/types.js';
import { executeSearch, ProviderRegistry } from '../../src/search.js';
import { getDefaultConfig } from '../../src/config.js';

/** Generate a large pool of search results (up to 50) */
const largeResultPoolArb: fc.Arbitrary<SearchResult[]> = fc.array(
  fc.record({
    index: fc.integer({ min: 1 }),
    title: fc.string({ minLength: 1 }),
    url: fc.webUrl(),
    snippet: fc.string(),
  }),
  { minLength: 1, maxLength: 50 },
);

/** Generate a random limit value between 1 and 50 */
const limitArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 50 });

function createMockProvider(results: SearchResult[]): SearchProvider {
  return {
    name: 'mock-provider',
    async search(_query: string, _options: SearchOptions): Promise<SearchResult[]> {
      return results;
    },
  };
}

describe('Feature: xweb-cli, Property 4: Limit 参数约束结果数量', () => {
  it('executeSearch should return at most `limit` results', async () => {
    await fc.assert(
      fc.asyncProperty(largeResultPoolArb, limitArb, async (generatedResults, limit) => {
        const registry = new ProviderRegistry();
        const mockProvider = createMockProvider(generatedResults);
        registry.register(mockProvider);

        const config = getDefaultConfig();
        const options: SearchOptions = { limit, deep: false };

        const results = await executeSearch('test query', options, config, registry, 'mock-provider');

        expect(results.length).toBeLessThanOrEqual(limit);
      }),
      { numRuns: 100 },
    );
  });
});
