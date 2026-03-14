import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  target: 'node18',
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  noExternal: [],
  external: ['commander', 'turndown', 'cheerio'],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
