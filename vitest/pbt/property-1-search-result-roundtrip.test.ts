/**
 * Feature: xweb-cli, Property 1: SearchResult 序列化往返一致性
 *
 * **Validates: Requirements 1.7, 5.1, 5.2, 5.3**
 *
 * For any valid SearchResult object, serializing it to a JSON string and
 * deserializing it back should produce an equivalent SearchResult object
 * with all fields (index, title, url, snippet) unchanged.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { SearchResult } from '../../src/types.js';

/** Arbitrary generator for valid SearchResult objects */
const searchResultArb: fc.Arbitrary<SearchResult> = fc.record({
  index: fc.integer({ min: 1 }),
  title: fc.string({ minLength: 1 }),
  url: fc.webUrl(),
  snippet: fc.string(),
});

describe('Feature: xweb-cli, Property 1: SearchResult 序列化往返一致性', () => {
  it('should survive JSON serialization roundtrip with all fields intact', () => {
    fc.assert(
      fc.property(searchResultArb, (original: SearchResult) => {
        const serialized = JSON.stringify(original);
        const deserialized: SearchResult = JSON.parse(serialized);

        expect(deserialized).toEqual(original);
        expect(deserialized.index).toBe(original.index);
        expect(deserialized.title).toBe(original.title);
        expect(deserialized.url).toBe(original.url);
        expect(deserialized.snippet).toBe(original.snippet);
      }),
      { numRuns: 100 },
    );
  });
});
