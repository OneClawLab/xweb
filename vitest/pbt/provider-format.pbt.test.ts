/**
 * Feature: xweb-cli, Property 3: Provider 输出格式一致性
 *
 * **Validates: Requirements 1.1, 1.2, 1.8**
 *
 * For any Search_Provider, its returned SearchResult objects should contain
 * index (positive integer), title (non-empty string), url (valid URL string),
 * and snippet (string).
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { SearchProvider, SearchOptions, SearchResult } from '../../src/types.js';
import { executeSearch, ProviderRegistry } from '../../src/search.js';
import { getDefaultConfig } from '../../src/config.js';

/**
 * Generator for arrays of SearchResult objects with varying quality.
 * The mock provider will return these, and executeSearch should normalize them.
 */
const searchResultArrayArb: fc.Arbitrary<SearchResult[]> = fc.array(
  fc.record({
    index: fc.integer({ min: 1 }),
    title: fc.string({ minLength: 1 }),
    url: fc.webUrl(),
    snippet: fc.string(),
  }),
  { minLength: 1, maxLength: 20 },
);

function createMockProvider(results: SearchResult[]): SearchProvider {
  return {
    name: 'mock-provider',
    async search(_query: string, _options: SearchOptions): Promise<SearchResult[]> {
      return results;
    },
  };
}

describe('Feature: xweb-cli, Property 3: Provider 输出格式一致性', () => {
  it('executeSearch output should have valid index, title, url, and snippet for every result', async () => {
    await fc.assert(
      fc.asyncProperty(searchResultArrayArb, async (generatedResults) => {
        const registry = new ProviderRegistry();
        const mockProvider = createMockProvider(generatedResults);
        registry.register(mockProvider);

        const config = getDefaultConfig();
        const options: SearchOptions = { limit: generatedResults.length, deep: false };

        const results = await executeSearch('test query', options, config, registry, 'mock-provider');

        for (const result of results) {
          // index should be a positive integer
          expect(result.index).toBeGreaterThan(0);
          expect(Number.isInteger(result.index)).toBe(true);

          // title should be a non-empty string
          expect(typeof result.title).toBe('string');
          expect(result.title.length).toBeGreaterThan(0);

          // url should be a valid URL string
          expect(typeof result.url).toBe('string');
          expect(() => new URL(result.url)).not.toThrow();

          // snippet should be a string
          expect(typeof result.snippet).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });
});
