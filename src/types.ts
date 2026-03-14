// ── Interfaces ──────────────────────────────────────────────

export interface SearchResult {
  index: number;    // 结果序号，从 1 开始
  title: string;    // 搜索结果标题
  url: string;      // 搜索结果 URL
  snippet: string;  // 搜索结果摘要
}

export interface SearchOptions {
  limit: number;
  deep: boolean;
}

export interface SearchProvider {
  name: string;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}

export interface FetchOptions {
  format: 'markdown' | 'text' | 'html' | 'json';
  raw: boolean;
  selector?: string;
}

export interface FetchedContent {
  title: string;
  source: string;
  content: string;
  links: Array<{ text: string; url: string }>;
}

export interface ExploreResult {
  url: string;
  title: string;
}

export interface ProviderConfig {
  api_key: string;
  base_url?: string;
}

export interface FetchSettings {
  user_agent: string;
  timeout: number;
  max_length: number;
}

export interface XwebConfig {
  default_provider: string;
  providers: Record<string, ProviderConfig>;
  fetch_settings: FetchSettings;
}

// ── Error Classes ──────────────────────────────────────────

export class XwebError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'XwebError';
  }
}

export class NetworkError extends XwebError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends XwebError {
  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}s`, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends XwebError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ProviderError extends XwebError {
  constructor(provider: string, message: string) {
    super(`Provider "${provider}": ${message}`, 'PROVIDER_ERROR');
    this.name = 'ProviderError';
  }
}
