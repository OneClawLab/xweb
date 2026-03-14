import { describe, it, expect } from 'vitest';
import { cleanHtml, extractBySelector } from './html-cleaner.js';

describe('cleanHtml', () => {
  it('removes nav, footer, script, style, iframe, noscript tags', () => {
    const html = `<html><body>
      <nav>Navigation</nav>
      <main><p>Main content</p></main>
      <footer>Footer</footer>
      <script>alert(1)</script>
      <style>.x{}</style>
      <iframe src="x"></iframe>
      <noscript>No JS</noscript>
    </body></html>`;

    const result = cleanHtml(html);

    expect(result).not.toContain('<nav');
    expect(result).not.toContain('Navigation');
    expect(result).not.toContain('<footer');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('<style');
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<noscript');
    expect(result).toContain('Main content');
  });

  it('removes elements with ad-related class patterns', () => {
    const html = `<html><body>
      <div class="ad-banner">Ad here</div>
      <div class="ads-container">More ads</div>
      <div class="advertisement">Advert</div>
      <div class="sidebar">Side</div>
      <p>Real content</p>
    </body></html>`;

    const result = cleanHtml(html);

    expect(result).not.toContain('Ad here');
    expect(result).not.toContain('More ads');
    expect(result).not.toContain('Advert');
    expect(result).not.toContain('Side');
    expect(result).toContain('Real content');
  });

  it('removes elements with ad-related id patterns', () => {
    const html = `<html><body>
      <div id="ad-top">Top ad</div>
      <div id="cookie-notice">Cookie</div>
      <div id="popup-overlay">Popup</div>
      <p>Content here</p>
    </body></html>`;

    const result = cleanHtml(html);

    expect(result).not.toContain('Top ad');
    expect(result).not.toContain('Cookie');
    expect(result).not.toContain('Popup');
    expect(result).toContain('Content here');
  });

  it('handles HTML without body tag', () => {
    const html = '<div><p>Hello</p><script>x</script></div>';
    const result = cleanHtml(html);

    expect(result).toContain('Hello');
    expect(result).not.toContain('<script');
  });

  it('handles empty HTML', () => {
    const result = cleanHtml('');
    expect(result).toBeDefined();
  });

  it('preserves main content elements', () => {
    const html = `<html><body>
      <article><h1>Title</h1><p>Paragraph</p></article>
      <nav>Nav</nav>
    </body></html>`;

    const result = cleanHtml(html);

    expect(result).toContain('<article>');
    expect(result).toContain('Title');
    expect(result).toContain('Paragraph');
    expect(result).not.toContain('Nav');
  });

  it('is case-insensitive for class/id pattern matching', () => {
    const html = `<html><body>
      <div class="AD-Banner">Upper ad</div>
      <div id="SIDEBAR">Upper sidebar</div>
      <p>Keep me</p>
    </body></html>`;

    const result = cleanHtml(html);

    expect(result).not.toContain('Upper ad');
    expect(result).not.toContain('Upper sidebar');
    expect(result).toContain('Keep me');
  });
});

describe('extractBySelector', () => {
  it('extracts elements matching a CSS selector', () => {
    const html = `<html><body>
      <div class="target">Found 1</div>
      <div class="other">Not this</div>
      <div class="target">Found 2</div>
    </body></html>`;

    const result = extractBySelector(html, '.target');

    expect(result).toContain('Found 1');
    expect(result).toContain('Found 2');
    expect(result).not.toContain('Not this');
  });

  it('returns empty string when no elements match', () => {
    const html = '<html><body><p>Hello</p></body></html>';
    const result = extractBySelector(html, '.nonexistent');
    expect(result).toBe('');
  });

  it('supports tag selectors', () => {
    const html = '<html><body><h1>Title</h1><p>Text</p></body></html>';
    const result = extractBySelector(html, 'h1');
    expect(result).toContain('Title');
    expect(result).not.toContain('Text');
  });

  it('supports id selectors', () => {
    const html = '<html><body><div id="main">Main</div><div>Other</div></body></html>';
    const result = extractBySelector(html, '#main');
    expect(result).toContain('Main');
    expect(result).not.toContain('Other');
  });

  it('returns outer HTML of matched elements', () => {
    const html = '<html><body><div class="x"><span>Inner</span></div></body></html>';
    const result = extractBySelector(html, '.x');
    expect(result).toContain('<div class="x">');
    expect(result).toContain('<span>Inner</span>');
    expect(result).toContain('</div>');
  });
});
