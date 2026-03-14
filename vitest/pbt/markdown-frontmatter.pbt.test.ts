/**
 * Feature: xweb-cli, Property 15: Markdown 输出包含 YAML Front Matter
 *
 * **Validates: Requirements 8.1**
 *
 * For any FetchedContent with non-empty title and source, the Markdown
 * formatted output should start with `---\n` YAML front matter and
 * contain title and source fields.
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

/** Arbitrary for FetchedContent with non-empty title and source */
const fetchedContentArb: fc.Arbitrary<FetchedContent> = fc.record({
  title: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
  source: fc.webUrl(),
  content: fc.string(),
  links: fc.array(linkArb, { minLength: 0, maxLength: 5 }),
});

describe('Feature: xweb-cli, Property 15: Markdown 输出包含 YAML Front Matter', () => {
  it('markdown output should start with YAML front matter containing title and source', () => {
    fc.assert(
      fc.property(fetchedContentArb, (content: FetchedContent) => {
        const output = formatFetchedContent(content, 'markdown');

        expect(output).toMatch(/^---\n/);
        expect(output).toContain('title:');
        expect(output).toContain('source:');
        expect(output).toContain(content.title);
        expect(output).toContain(content.source);
      }),
      { numRuns: 100 },
    );
  });
});
