import type { SearchProvider, SearchOptions, SearchResult } from '../types.js';
import { NetworkError } from '../types.js';

export class BraveProvider implements SearchProvider {
  name = 'brave';

  constructor(private apiKey: string, private baseUrl = 'https://api.search.brave.com/res/v1/web/search') {}

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const url = new URL(this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(options.limit));
    if (options.deep) {
      url.searchParams.set('result_filter', 'web');
      url.searchParams.set('extra_snippets', 'true');
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new NetworkError(`Brave API returned HTTP ${response.status}`, response.status);
    }

    const data = await response.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
    const results = data.web?.results ?? [];

    return results.slice(0, options.limit).map((r, i) => ({
      index: i + 1,
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
  }
}

export function createBraveProvider(apiKey: string, baseUrl?: string): SearchProvider {
  return new BraveProvider(apiKey, baseUrl);
}
