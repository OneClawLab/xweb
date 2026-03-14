import type { SearchProvider, SearchOptions, SearchResult } from '../types.js';
import { NetworkError } from '../types.js';

export class SerperProvider implements SearchProvider {
  name = 'serper';

  constructor(private apiKey: string, private baseUrl = 'https://google.serper.dev/search') {}

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const body: Record<string, unknown> = {
      q: query,
      num: options.limit,
    };
    if (options.deep) {
      body['gl'] = 'us';
      body['hl'] = 'en';
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new NetworkError(`Serper API returned HTTP ${response.status}`, response.status);
    }

    const data = await response.json() as { organic?: Array<{ title: string; link: string; snippet: string }> };
    const results = data.organic ?? [];

    return results.slice(0, options.limit).map((r, i) => ({
      index: i + 1,
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    }));
  }
}

export function createSerperProvider(apiKey: string, baseUrl?: string): SearchProvider {
  return new SerperProvider(apiKey, baseUrl);
}
