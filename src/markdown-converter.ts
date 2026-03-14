import TurndownService from 'turndown';
import * as cheerio from 'cheerio';
import type { FetchedContent } from './types.js';

/**
 * Generate YAML front matter with title and source fields.
 * Req 8.1: Markdown output includes YAML front matter
 */
export function generateFrontMatter(title: string, source: string): string {
  return `---\ntitle: "${title}"\nsource: "${source}"\n---`;
}

/**
 * Convert HTML to Markdown with reference-style links at the bottom.
 * - Uses turndown for HTML→Markdown conversion
 * - Collects links and appends them as reference links
 * - Preserves image alt text (turndown default behavior)
 * - Returns FetchedContent with front matter in content
 *
 * Req 2.1: HTML → Markdown conversion
 * Req 2.8: Reference-style links at document bottom
 * Req 2.9: Preserve image alt text
 * Req 8.1: YAML front matter
 */
export function htmlToMarkdown(html: string, title: string, source: string): FetchedContent {
  const collectedLinks: Array<{ text: string; url: string }> = [];
  let linkIndex = 0;

  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  // Override link rule to collect links and output reference-style markers
  service.addRule('referenceLink', {
    filter: 'a',
    replacement(_content, node) {
      const href = node.getAttribute('href');
      const text = node.textContent ?? '';
      if (!href || !text.trim()) {
        return text;
      }
      linkIndex++;
      collectedLinks.push({ text: text.trim(), url: href });
      return `${text.trim()}[${linkIndex}]`;
    },
  });

  const markdown = service.turndown(html);

  // Build reference links section
  let content = markdown;
  if (collectedLinks.length > 0) {
    const refs = collectedLinks
      .map((link, i) => `[${i + 1}]: ${link.url} "${link.text}"`)
      .join('\n');
    content = `${markdown}\n\n${refs}`;
  }

  return {
    title,
    source,
    content,
    links: collectedLinks,
  };
}


/**
 * Convert HTML to plain text by stripping all tags.
 * Req 2.2: --format text outputs plain text
 */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html);

  // Remove script and style content entirely
  $('script, style').remove();

  // Get text content, collapse whitespace
  const text = $.text();
  return text
    .split(/\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
