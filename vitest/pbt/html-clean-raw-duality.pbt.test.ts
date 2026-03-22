/**
 * Feature: xweb-cli, Property 5: HTML 清洗与 Raw 模式的对偶性
 *
 * **Validates: Requirements 2.5, 2.7**
 *
 * For any HTML document containing nav, footer, script, iframe elements,
 * after cleanHtml() the output should NOT contain the content of those elements;
 * while the raw HTML (original) SHOULD contain that content.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { cleanHtml } from '../../src/html-cleaner.js';

/**
 * Generator for HTML documents with identifiable main content and unwanted
 * element content (nav, footer, script, iframe).
 *
 * Strategy: generate unique alphanumeric marker strings for each section so
 * we can reliably check presence/absence without worrying about HTML encoding
 * or special characters.
 */
const htmlWithUnwantedArb = fc
  .record({
    mainContent: fc
      .stringMatching(/^[A-Za-z][A-Za-z0-9]{4,19}$/)
      .filter((s) => s.trim().length > 0),
    navContent: fc
      .stringMatching(/^[A-Za-z][A-Za-z0-9]{4,19}$/)
      .filter((s) => s.trim().length > 0),
    footerContent: fc
      .stringMatching(/^[A-Za-z][A-Za-z0-9]{4,19}$/)
      .filter((s) => s.trim().length > 0),
    scriptContent: fc
      .stringMatching(/^[A-Za-z][A-Za-z0-9]{4,19}$/)
      .filter((s) => s.trim().length > 0),
    iframeContent: fc
      .stringMatching(/^[A-Za-z][A-Za-z0-9]{4,19}$/)
      .filter((s) => s.trim().length > 0),
  })
  .filter(
    ({ mainContent, navContent, footerContent, scriptContent, iframeContent }) => {
      const markers = [mainContent, navContent, footerContent, scriptContent, iframeContent];
      // Ensure all markers are distinct and none is a substring of another
      for (let i = 0; i < markers.length; i++) {
        for (let j = 0; j < markers.length; j++) {
          if (i !== j && markers[j]!.includes(markers[i]!)) return false;
        }
      }
      return true;
    },
  )
  .map(({ mainContent, navContent, footerContent, scriptContent, iframeContent }) => ({
    html: `<html><body><nav>${navContent}</nav><p>${mainContent}</p><footer>${footerContent}</footer><script>${scriptContent}</script><iframe>${iframeContent}</iframe></body></html>`,
    mainContent,
    navContent,
    footerContent,
    scriptContent,
    iframeContent,
  }));

describe('Feature: xweb-cli, Property 5: HTML 清洗与 Raw 模式的对偶性', () => {
  it('cleanHtml removes nav/footer/script/iframe content while raw preserves it', () => {
    fc.assert(
      fc.property(htmlWithUnwantedArb, ({ html, mainContent, navContent, footerContent, scriptContent, iframeContent }) => {
        // Raw mode: original HTML contains all unwanted content
        expect(html).toContain(navContent);
        expect(html).toContain(footerContent);
        expect(html).toContain(scriptContent);
        expect(html).toContain(iframeContent);
        expect(html).toContain(mainContent);

        // Non-raw mode: cleaned HTML should NOT contain unwanted content
        const cleaned = cleanHtml(html);
        expect(cleaned).not.toContain(navContent);
        expect(cleaned).not.toContain(footerContent);
        expect(cleaned).not.toContain(scriptContent);
        expect(cleaned).not.toContain(iframeContent);

        // Cleaned HTML should still contain the main content
        expect(cleaned).toContain(mainContent);
      }),
      { numRuns: 100 },
    );
  });
});
