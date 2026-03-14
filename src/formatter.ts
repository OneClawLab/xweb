import type { SearchResult, FetchedContent, ExploreResult } from './types.js';

/**
 * Format search results as a numbered list or JSON.
 * Req 8.2: numbered list with title, URL, snippet
 * Req 1.7: --json outputs pure JSON array
 */
export function formatSearchResults(results: SearchResult[], json: boolean): string {
  if (json) {
    return JSON.stringify(results, null, 2);
  }

  return results
    .map(
      (r) =>
        `${r.index}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`,
    )
    .join('\n\n');
}

/**
 * Format explore results as a numbered list or JSON.
 * Req 8.3: numbered list with URL and title
 * Req 3.3: --json outputs JSON array
 */
export function formatExploreResults(results: ExploreResult[], json: boolean): string {
  if (json) {
    return JSON.stringify(results, null, 2);
  }

  return results
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`)
    .join('\n\n');
}

/**
 * Format fetched content in the requested output format.
 * Req 8.1: Markdown includes YAML front matter with title and source
 */
export function formatFetchedContent(
  content: FetchedContent,
  format: 'markdown' | 'text' | 'html' | 'json',
): string {
  switch (format) {
    case 'markdown':
      return `---\ntitle: "${content.title}"\nsource: "${content.source}"\n---\n\n${content.content}`;
    case 'text':
      return content.content;
    case 'html':
      return content.content;
    case 'json':
      return JSON.stringify(
        { title: content.title, source: content.source, content: content.content },
        null,
        2,
      );
  }
}
