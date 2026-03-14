import { describe, it, expect } from 'vitest';
import {
  ProviderRegistry,
  resolveProvider,
  executeSearch,
  createDefaultRegistry,
} from '../../src/search.js';
import type { SearchProvider, SearchOptions, XwebConfig } from '../../src/types.js';
import { ProviderError } from '../../src/types.js';

function makeProvider(name: string, results: number = 10): SearchProvider {
  return {
    name,
    async search(_query: string, _options: SearchOptions) {
      return Array.from({ length: results }, (_, i) => ({
        index: i + 1,
        title: `${name} result ${i + 1}`,
        url: `https://example.com/${name}/${i + 1}`,
        snippet: `Snippet ${i + 1} from ${name}`,
      }));
    },
  };
}

function makeConfig(overrides: Partial<XwebConfig> = {}): XwebConfig {
  return {
    default_provider: 'google',
    providers: {},
    fetch_settings: {
      user_agent: 'test',
      timeout: 10,
      max_length: 5000,
    },
    ...overrides,
  };
}

describe('ProviderRegistry', () => {
  it('registers and retrieves a provider', () => {
    const registry = new ProviderRegistry();
    const provider = makeProvider('brave');
    registry.register(provider);

    expect(registry.get('brave')).toBe(provider);
    expect(registry.has('brave')).toBe(true);
    expect(registry.has('unknown')).toBe(false);
  });

  it('returns undefined for unregistered provider', () => {
    const registry = new ProviderRegistry();
    expect(registry.get('missing')).toBeUndefined();
  });

  it('getAll returns all registered providers', () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('a'));
    registry.register(makeProvider('b'));
    expect(registry.getAll()).toHaveLength(2);
  });
});

describe('resolveProvider', () => {
  it('returns the named provider when --provider is specified', () => {
    const registry = new ProviderRegistry();
    const brave = makeProvider('brave');
    registry.register(brave);

    const result = resolveProvider('brave', makeConfig(), registry);
    expect(result).toBe(brave);
  });

  it('throws ProviderError when named provider not found', () => {
    const registry = new ProviderRegistry();
    expect(() => resolveProvider('missing', makeConfig(), registry)).toThrow(ProviderError);
  });

  it('uses default_provider when it exists in registry and has api_key', () => {
    const registry = new ProviderRegistry();
    const google = makeProvider('google');
    registry.register(google);

    const config = makeConfig({
      default_provider: 'google',
      providers: { google: { api_key: 'key123' } },
    });

    const result = resolveProvider(undefined, config, registry);
    expect(result).toBe(google);
  });

  it('falls back to simple when default_provider has no api_key', () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('google'));
    const simple = makeProvider('simple');
    registry.register(simple);

    const config = makeConfig({ default_provider: 'google' });
    const result = resolveProvider(undefined, config, registry);
    expect(result).toBe(simple);
  });

  it('falls back to simple when default_provider not in registry', () => {
    const registry = new ProviderRegistry();
    const simple = makeProvider('simple');
    registry.register(simple);

    const config = makeConfig({ default_provider: 'tavily' });
    const result = resolveProvider(undefined, config, registry);
    expect(result).toBe(simple);
  });

  it('throws when neither default nor simple provider available', () => {
    const registry = new ProviderRegistry();
    expect(() => resolveProvider(undefined, makeConfig(), registry)).toThrow(ProviderError);
  });
});

describe('executeSearch', () => {
  it('truncates results to options.limit', async () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('simple', 20));

    const results = await executeSearch(
      'test',
      { limit: 3, deep: false },
      makeConfig(),
      registry,
    );

    expect(results).toHaveLength(3);
  });

  it('re-indexes results starting from 1', async () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('simple', 10));

    const results = await executeSearch(
      'test',
      { limit: 5, deep: false },
      makeConfig(),
      registry,
    );

    expect(results.map((r) => r.index)).toEqual([1, 2, 3, 4, 5]);
  });

  it('defaults to 5 results when limit is 5', async () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('simple', 20));

    const results = await executeSearch(
      'query',
      { limit: 5, deep: false },
      makeConfig(),
      registry,
    );

    expect(results).toHaveLength(5);
  });

  it('returns fewer results when provider returns less than limit', async () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('simple', 2));

    const results = await executeSearch(
      'query',
      { limit: 10, deep: false },
      makeConfig(),
      registry,
    );

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.index)).toEqual([1, 2]);
  });

  it('uses specified provider via providerName', async () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('simple', 5));
    registry.register(makeProvider('brave', 5));

    const results = await executeSearch(
      'query',
      { limit: 5, deep: false },
      makeConfig(),
      registry,
      'brave',
    );

    expect(results[0].title).toContain('brave');
  });
});

describe('createDefaultRegistry', () => {
  it('returns an empty registry', () => {
    const registry = createDefaultRegistry();
    expect(registry.getAll()).toHaveLength(0);
  });
});
