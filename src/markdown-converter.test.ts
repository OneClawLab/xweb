import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, htmlToText, generateFrontMatter } from './markdown-converter.js';

describe('generateFrontMatter', () => {
  it('generates YAML front matter with title and source', () => {
    const result = generateFrontMatter('My Page', 'https://example.com');
    expect(result).toBe('---\ntitle: "My Page"\nsource: "https://example.com"\n---');
  });

  it('handles empty title and source', () => {
    const result = generateFrontMatter('', '');
    expect(result).toContain('title: ""');
    expect(result).toContain('source: ""');
    expect(result).toMatch(/^---\n/);
    expect(result).toMatch(/\n---$/);
  });
});

describe('htmlToMarkdown', () => {
  it('converts basic HTML to Markdown', () => {
    const html = '<h1>Hello</h1><p>World</p>';
    const result = htmlToMarkdown(html, 'Test', 'https://example.com');
    expect(result.content).toContain('Hello');
    expect(result.content).toContain('World');
    expect(result.title).toBe('Test');
    expect(result.source).toBe('https://example.com');
  });

  it('collects links as reference-style at document bottom', () => {
    const html = '<p>Visit <a href="https://example.com">Example</a> and <a href="https://other.com">Other</a></p>';
    const result = htmlToMarkdown(html, 'Test', 'https://test.com');

    // Should have reference markers in text
    expect(result.content).toContain('Example[1]');
    expect(result.content).toContain('Other[2]');

    // Should have reference links at bottom
    expect(result.content).toContain('[1]: https://example.com "Example"');
    expect(result.content).toContain('[2]: https://other.com "Other"');
  });

  it('returns collected links in the links array', () => {
    const html = '<p><a href="https://a.com">Link A</a> and <a href="https://b.com">Link B</a></p>';
    const result = htmlToMarkdown(html, 'Test', 'https://test.com');

    expect(result.links).toHaveLength(2);
    expect(result.links[0]).toEqual({ text: 'Link A', url: 'https://a.com' });
    expect(result.links[1]).toEqual({ text: 'Link B', url: 'https://b.com' });
  });

  it('preserves image alt text', () => {
    const html = '<p><img alt="A cute cat" src="https://example.com/cat.jpg"></p>';
    const result = htmlToMarkdown(html, 'Test', 'https://test.com');

    expect(result.content).toContain('A cute cat');
  });

  it('handles HTML with no links', () => {
    const html = '<p>Just some text</p>';
    const result = htmlToMarkdown(html, 'Test', 'https://test.com');

    expect(result.content).toContain('Just some text');
    expect(result.links).toHaveLength(0);
    // No reference section appended
    expect(result.content).not.toContain('[1]:');
  });

  it('skips links with empty text', () => {
    const html = '<p><a href="https://example.com"></a> Hello</p>';
    const result = htmlToMarkdown(html, 'Test', 'https://test.com');

    expect(result.links).toHaveLength(0);
  });

  it('skips links with no href', () => {
    const html = '<p><a>No href</a></p>';
    const result = htmlToMarkdown(html, 'Test', 'https://test.com');

    expect(result.links).toHaveLength(0);
  });

  it('converts headings to ATX style', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    const result = htmlToMarkdown(html, 'Test', 'https://test.com');

    expect(result.content).toContain('# Title');
    expect(result.content).toContain('## Subtitle');
  });
});

describe('htmlToText', () => {
  it('strips all HTML tags and returns text', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    const result = htmlToText(html);

    expect(result).toContain('Hello world');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('removes script and style content', () => {
    const html = '<p>Text</p><script>alert(1)</script><style>.x{}</style>';
    const result = htmlToText(html);

    expect(result).toContain('Text');
    expect(result).not.toContain('alert');
    expect(result).not.toContain('.x{}');
  });

  it('handles empty HTML', () => {
    const result = htmlToText('');
    expect(result).toBe('');
  });

  it('collapses whitespace', () => {
    const html = '<p>  Hello    world  </p>';
    const result = htmlToText(html);

    expect(result).toBe('Hello world');
  });

  it('preserves text from nested elements', () => {
    const html = '<div><p>First</p><p>Second</p></div>';
    const result = htmlToText(html);

    expect(result).toContain('First');
    expect(result).toContain('Second');
  });
});
