/**
 * Feature: xweb-cli, Property 7: CSS 选择器精确提取
 *
 * **Validates: Requirements 2.6**
 *
 * For any HTML document and valid CSS selector, when using `--selector`,
 * the output should only contain the content of elements matching that selector,
 * and should NOT contain content from non-matching elements.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { extractBySelector } from '../../src/html-cleaner.js';

/**
 * Generator for HTML documents with a target element (class="target") containing
 * unique content and other elements containing different unique content.
 */
const htmlWithSelectorArb = fc
  .record({
    targetContent: fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{4,19}$/),
    otherContent: fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{4,19}$/),
  })
  .filter(({ targetContent, otherContent }) => targetContent !== otherContent)
  .map(({ targetContent, otherContent }) => ({
    html: `<html><body><div class="target">${targetContent}</div><div class="other">${otherContent}</div></body></html>`,
    targetContent,
    otherContent,
  }));

describe('Feature: xweb-cli, Property 7: CSS 选择器精确提取', () => {
  it('extractBySelector returns only matched element content, excluding non-matched content', () => {
    fc.assert(
      fc.property(htmlWithSelectorArb, ({ html, targetContent, otherContent }) => {
        const result = extractBySelector(html, '.target');

        // Output should contain the target content
        expect(result).toContain(targetContent);

        // Output should NOT contain the non-target content
        expect(result).not.toContain(otherContent);
      }),
      { numRuns: 100 },
    );
  });
});
