/**
 * Feature: xweb-cli, Property 18: JSON 格式输出包含必需字段
 *
 * **Validates: Requirements 2.4**
 *
 * For any FetchedContent, after converting to JSON format, the output
 * should be a valid JSON object containing title, source, and content fields.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { FetchedContent } from '../../src/types.js';
import { formatFetchedContent } from '../../src/formatter.js';

/** Arbitrary for a link object */
const linkArb = fc.record({
  text: fc.string({ minLength: 1 }),
  url: fc.webUrl(),
});

/** Arbitrary for FetchedContent with non-empty fields */
const fetchedContentArb: fc.Arbitrary<FetchedContent> = fc.record({
  title: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
  source: fc.webUrl(),
  content: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
  links: fc.array(linkArb, { minLength: 0, maxLength: 5 }),
});

describe('Feature: xweb-cli, Property 18: JSON 格式输出包含必需字段', () => {
  it('json output should be valid JSON with title, source, and content fields matching input', () => {
    fc.assert(
      fc.property(fetchedContentArb, (content: FetchedContent) => {
        const output = formatFetchedContent(content, 'json');

        // Output must be valid JSON (JSON.parse should not throw)
        const parsed = JSON.parse(output);

        // Parsed object must have title, source, content fields
        expect(parsed).toHaveProperty('title');
        expect(parsed).toHaveProperty('source');
        expect(parsed).toHaveProperty('content');

        // Field values must match the input
        expect(parsed.title).toBe(content.title);
        expect(parsed.source).toBe(content.source);
        expect(parsed.content).toBe(content.content);
      }),
      { numRuns: 100 },
    );
  });
});
