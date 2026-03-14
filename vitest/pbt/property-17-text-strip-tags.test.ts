/**
 * Feature: xweb-cli, Property 17: Text 格式剥离 HTML 标签
 *
 * **Validates: Requirements 2.2**
 *
 * For any HTML document, after converting to text format, the output
 * should not contain any HTML tags (`<...>`), but should preserve
 * the text content within the tags.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { htmlToText } from '../../src/markdown-converter.js';

/** Arbitrary for alphanumeric text content (no angle brackets) */
const textContentArb = fc.string({ minLength: 1, maxLength: 50 })
  .map((s) => s.replace(/[<>&"'/\\]/g, '').trim())
  .filter((s) => s.length > 0);

describe('Feature: xweb-cli, Property 17: Text 格式剥离 HTML 标签', () => {
  it('text output should not contain any HTML tags but should preserve text content', () => {
    fc.assert(
      fc.property(fc.array(textContentArb, { minLength: 1, maxLength: 5 }), (texts) => {
        // Build HTML with known text content
        const html = `<html><body>${texts.map((t, i) => `<p>${t}</p>`).join('')}</body></html>`;
        const output = htmlToText(html);

        // Output must NOT contain any HTML tags
        expect(output).not.toMatch(/<[^>]*>/);

        // Output SHOULD contain each text content piece
        for (const text of texts) {
          const trimmed = text.trim();
          if (trimmed.length > 0) {
            expect(output).toContain(trimmed);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
