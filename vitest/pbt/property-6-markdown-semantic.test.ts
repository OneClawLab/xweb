/**
 * Feature: xweb-cli, Property 6: Markdown 转换保留语义内容
 *
 * **Validates: Requirements 2.8, 2.9**
 *
 * For any HTML document containing hyperlinks and images with alt attributes,
 * after converting to Markdown:
 * (a) Hyperlinks should appear as reference links at the document bottom
 * (b) Image alt description text should be preserved in the output
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { htmlToMarkdown } from '../../src/markdown-converter.js';

/**
 * Generator for HTML documents with at least one link and one image.
 * Uses alphanumeric strings for text/alt to avoid HTML encoding issues.
 */
const htmlWithLinksAndImagesArb = fc
  .record({
    linkText: fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{3,15}$/),
    linkUrl: fc.webUrl(),
    imgAlt: fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{3,15}$/),
    imgSrc: fc.webUrl(),
  })
  .map(({ linkText, linkUrl, imgAlt, imgSrc }) => ({
    html: `<html><body><p><a href="${linkUrl}">${linkText}</a></p><p><img alt="${imgAlt}" src="${imgSrc}"></p></body></html>`,
    linkText,
    linkUrl,
    imgAlt,
    imgSrc,
  }));

describe('Feature: xweb-cli, Property 6: Markdown 转换保留语义内容', () => {
  it('reference links appear at document bottom and image alt text is preserved', () => {
    fc.assert(
      fc.property(htmlWithLinksAndImagesArb, ({ html, linkText, linkUrl, imgAlt, imgSrc }) => {
        const result = htmlToMarkdown(html, 'Test', 'https://test.com');

        // (a) Reference link format [1]: url should appear in content
        expect(result.content).toContain('[1]:');
        expect(result.content).toContain(linkUrl);

        // (b) Image alt text should be preserved in the output
        expect(result.content).toContain(imgAlt);

        // Links array should contain the link text and URL
        expect(result.links).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ text: linkText, url: linkUrl }),
          ]),
        );
      }),
      { numRuns: 100 },
    );
  });
});
