import type { FetchOptions, XwebConfig } from './types.js';
import { NetworkError, TimeoutError, ValidationError } from './types.js';
import { cleanHtml, extractBySelector } from './html-cleaner.js';
import { htmlToMarkdown, htmlToText } from './markdown-converter.js';
import { formatFetchedContent } from './formatter.js';

/**
 * Fetch Engine: HTTP request → selector extraction → cleaning → format conversion pipeline.
 *
 * Processing pipeline:
 * 1. Validate URL
 * 2. HTTP request to fetch raw HTML
 * 3. Truncate if exceeds max_length
 * 4. If --selector specified, extract matching CSS fragments
 * 5. If not --raw, apply readability heuristic cleaning
 * 6. Convert to target format based on --format
 *
 * Req 2.1: fetch URL → Markdown
 * Req 2.2: --format text
 * Req 2.3: --format html (cleaned)
 * Req 2.4: --format json
 * Req 2.5: --raw skips cleaning
 * Req 2.6: --selector extracts CSS-matched fragments
 */
export async function executeFetch(
  url: string,
  options: FetchOptions,
  config: XwebConfig,
): Promise<string> {
  // 1. Validate URL
  try {
    new URL(url);
  } catch {
    throw new ValidationError(`Invalid URL: ${url}`);
  }

  // 2. Fetch HTML with timeout via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.fetch_settings.timeout * 1000);

  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': config.fetch_settings.user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    html = await response.text();
  } catch (error) {
    if (error instanceof NetworkError || error instanceof ValidationError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError(url, config.fetch_settings.timeout);
    }
    throw new NetworkError(
      `Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // 3. Truncate if exceeds max_length
  if (html.length > config.fetch_settings.max_length) {
    html = html.slice(0, config.fetch_settings.max_length);
  }

  // 4. Apply CSS selector if specified
  if (options.selector) {
    html = extractBySelector(html, options.selector);
  }

  // 5. Clean HTML unless --raw mode
  let processedHtml = html;
  if (!options.raw) {
    processedHtml = cleanHtml(html);
  }

  // 6. Extract title from original HTML
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? '';

  // 7. Convert based on format
  switch (options.format) {
    case 'markdown': {
      const result = htmlToMarkdown(processedHtml, title, url);
      return formatFetchedContent(result, 'markdown');
    }
    case 'text': {
      return htmlToText(processedHtml);
    }
    case 'html': {
      return processedHtml;
    }
    case 'json': {
      const result = htmlToMarkdown(processedHtml, title, url);
      return formatFetchedContent(result, 'json');
    }
  }
}
