import type { SearchProvider, SearchOptions, SearchResult } from '../types.js';
import { NetworkError } from '../types.js';

export class TavilyProvider implements SearchProvider {
  name = 'tavily';

  constructor(private apiKey: string, private baseUrl = 'https://api.tavily.com/search') {}

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const body = {
      api_key: this.apiKey,
      query,
      max_results: options.limit,
      search_depth: options.deep ? 'advanced' : 'basic',
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new NetworkError(`Tavily API returned HTTP ${response.status}`, response.status);
    }

    const data = await response.json() as { results?: Array<{ title: string; url: string; content: string }> };
    const results = data.results ?? [];

    return results.slice(0, options.limit).map((r, i) => ({
      index: i + 1,
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));
  }
}

export function createTavilyProvider(apiKey: string, baseUrl?: string): SearchProvider {
  return new TavilyProvider(apiKey, baseUrl);
}
