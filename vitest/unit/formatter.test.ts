import { describe, it, expect } from 'vitest';
import { formatSearchResults, formatExploreResults, formatFetchedContent } from '../../src/formatter.js';
import type { SearchResult, ExploreResult, FetchedContent } from '../../src/types.js';

describe('formatSearchResults', () => {
  const results: SearchResult[] = [
    { index: 1, title: 'First Result', url: 'https://example.com/1', snippet: 'First snippet' },
    { index: 2, title: 'Second Result', url: 'https://example.com/2', snippet: 'Second snippet' },
  ];

  it('returns JSON when json=true', () => {
    const output = formatSearchResults(results, true);
    expect(JSON.parse(output)).toEqual(results);
  });

  it('returns numbered list when json=false', () => {
    const output = formatSearchResults(results, false);
    expect(output).toContain('1. First Result');
    expect(output).toContain('URL: https://example.com/1');
    expect(output).toContain('First snippet');
    expect(output).toContain('2. Second Result');
    expect(output).toContain('URL: https://example.com/2');
    expect(output).toContain('Second snippet');
  });

  it('handles empty array', () => {
    expect(formatSearchResults([], true)).toBe('[]');
    expect(formatSearchResults([], false)).toBe('');
  });
});

describe('formatExploreResults', () => {
  const results: ExploreResult[] = [
    { url: 'https://example.com/page1', title: 'Page One' },
    { url: 'https://example.com/page2', title: 'Page Two' },
  ];

  it('returns JSON when json=true', () => {
    const output = formatExploreResults(results, true);
    expect(JSON.parse(output)).toEqual(results);
  });

  it('returns numbered list when json=false', () => {
    const output = formatExploreResults(results, false);
    expect(output).toContain('1. Page One');
    expect(output).toContain('https://example.com/page1');
    expect(output).toContain('2. Page Two');
    expect(output).toContain('https://example.com/page2');
  });

  it('handles empty array', () => {
    expect(formatExploreResults([], true)).toBe('[]');
    expect(formatExploreResults([], false)).toBe('');
  });
});

describe('formatFetchedContent', () => {
  const content: FetchedContent = {
    title: 'Test Page',
    source: 'https://example.com',
    content: 'Hello world',
    links: [{ text: 'link', url: 'https://example.com/link' }],
  };

  it('markdown format includes YAML front matter with title and source', () => {
    const output = formatFetchedContent(content, 'markdown');
    expect(output).toMatch(/^---\n/);
    expect(output).toContain('title: "Test Page"');
    expect(output).toContain('source: "https://example.com"');
    expect(output).toContain('---\n\nHello world');
  });

  it('text format returns content string', () => {
    expect(formatFetchedContent(content, 'text')).toBe('Hello world');
  });

  it('html format returns content string', () => {
    expect(formatFetchedContent(content, 'html')).toBe('Hello world');
  });

  it('json format includes title, source, content fields', () => {
    const output = formatFetchedContent(content, 'json');
    const parsed = JSON.parse(output);
    expect(parsed).toEqual({
      title: 'Test Page',
      source: 'https://example.com',
      content: 'Hello world',
    });
  });
});
