import type { SearchProvider, SearchOptions, SearchResult, XwebConfig } from './types.js';
import { ProviderError } from './types.js';

export class ProviderRegistry {
  private providers: Map<string, SearchProvider> = new Map();

  register(provider: SearchProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): SearchProvider | undefined {
    return this.providers.get(name);
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  getAll(): SearchProvider[] {
    return [...this.providers.values()];
  }
}

export function resolveProvider(
  providerName: string | undefined,
  config: XwebConfig,
  registry: ProviderRegistry,
): SearchProvider {
  if (providerName) {
    const provider = registry.get(providerName);
    if (!provider) {
      throw new ProviderError(providerName, 'Provider not found in registry');
    }
    return provider;
  }

  const defaultName = config.default_provider;
  if (
    registry.has(defaultName) &&
    config.providers[defaultName]?.api_key
  ) {
    return registry.get(defaultName)!;
  }

  const simple = registry.get('simple');
  if (!simple) {
    throw new ProviderError('simple', 'Fallback simple provider not found in registry');
  }
  return simple;
}

export async function executeSearch(
  query: string,
  options: SearchOptions,
  config: XwebConfig,
  registry: ProviderRegistry,
  providerName?: string,
): Promise<SearchResult[]> {
  const provider = resolveProvider(providerName, config, registry);
  try {
    const results = await provider.search(query, options);
    return results.slice(0, options.limit).map((r, i) => ({ ...r, index: i + 1 }));
  } catch (err) {
    // If a non-simple provider fails and no explicit provider was requested,
    // fall back to the simple provider automatically.
    if (!providerName && provider.name !== 'simple') {
      const simple = registry.get('simple');
      if (simple) {
        const results = await simple.search(query, options);
        return results.slice(0, options.limit).map((r, i) => ({ ...r, index: i + 1 }));
      }
    }
    throw err;
  }
}

export function createDefaultRegistry(): ProviderRegistry {
  return new ProviderRegistry();
}
