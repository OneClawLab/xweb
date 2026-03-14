import * as cheerio from 'cheerio';

/** Tags to remove during readability heuristic cleaning */
const REMOVE_TAGS = ['nav', 'footer', 'script', 'style', 'iframe', 'noscript'];

/** Patterns that indicate ad-related or non-content elements */
const AD_PATTERNS = [
  'ad-',
  'ads-',
  'advert',
  'advertisement',
  'sidebar',
  'banner',
  'popup',
  'modal',
  'cookie',
];

/**
 * Clean HTML by removing non-content elements using readability heuristics.
 * Removes nav, footer, script, style, iframe, noscript tags and elements
 * with ad-related class/id patterns.
 */
export function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove unwanted tags
  $(REMOVE_TAGS.join(', ')).remove();

  // Remove elements with ad-related class or id
  $('*').each((_, el) => {
    const elem = $(el);
    const cls = (elem.attr('class') ?? '').toLowerCase();
    const id = (elem.attr('id') ?? '').toLowerCase();

    for (const pattern of AD_PATTERNS) {
      if (cls.includes(pattern) || id.includes(pattern)) {
        elem.remove();
        return; // element removed, skip remaining patterns
      }
    }
  });

  // Return body innerHTML if body exists, otherwise full HTML
  const body = $('body');
  if (body.length > 0) {
    return body.html() ?? '';
  }
  return $.html();
}

/**
 * Extract HTML fragments matching a CSS selector.
 * Returns the outer HTML of all matched elements concatenated.
 */
export function extractBySelector(html: string, selector: string): string {
  const $ = cheerio.load(html);
  const matched: string[] = [];

  $(selector).each((_, el) => {
    matched.push($.html(el));
  });

  return matched.join('');
}
