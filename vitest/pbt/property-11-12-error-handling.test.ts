/**
 * Feature: xweb-cli, Property 11: 无效输入产生描述性错误
 * Feature: xweb-cli, Property 12: HTTP/API 错误映射为统一格式
 *
 * **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
 *
 * Property 11: For any non-existent provider name, resolveProvider should
 * throw a ProviderError with a descriptive message.
 *
 * Property 12: For any HTTP error status code (400-599), a provider that
 * throws NetworkError should propagate with the correct status code.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { SearchProvider, SearchOptions, SearchResult } from '../../src/types.js';
import { ProviderError, NetworkError } from '../../src/types.js';
import { resolveProvider, executeSearch, ProviderRegistry } from '../../src/search.js';
import { getDefaultConfig } from '../../src/config.js';

/**
 * Generator for non-existent provider names.
 * We use alphanumeric strings that won't collide with 'simple'.
 */
const nonExistentProviderArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-z][a-z0-9]{2,15}$/)
  .filter((s) => s !== 'simple' && s !== 'google');

/** Generator for HTTP error status codes (400-599) */
const httpErrorCodeArb: fc.Arbitrary<number> = fc.integer({ min: 400, max: 599 });

/** Generator for error message strings */
const errorMessageArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 100 });

describe('Feature: xweb-cli, Property 11: 无效输入产生描述性错误', () => {
  it('resolveProvider should throw ProviderError for non-existent provider names', () => {
    fc.assert(
      fc.property(nonExistentProviderArb, (providerName) => {
        const registry = new ProviderRegistry();
        const config = getDefaultConfig();

        expect(() => resolveProvider(providerName, config, registry)).toThrow(ProviderError);

        try {
          resolveProvider(providerName, config, registry);
        } catch (err) {
          expect(err).toBeInstanceOf(ProviderError);
          const providerErr = err as ProviderError;
          // Error message should be descriptive (non-empty)
          expect(providerErr.message.length).toBeGreaterThan(0);
          // Error message should reference the provider name
          expect(providerErr.message).toContain(providerName);
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('Feature: xweb-cli, Property 12: HTTP/API 错误映射为统一格式', () => {
  it('NetworkError from provider should propagate with correct status code', async () => {
    await fc.assert(
      fc.asyncProperty(httpErrorCodeArb, errorMessageArb, async (statusCode, message) => {
        const registry = new ProviderRegistry();
        const failingProvider: SearchProvider = {
          name: 'failing-provider',
          async search(_query: string, _options: SearchOptions): Promise<SearchResult[]> {
            throw new NetworkError(message, statusCode);
          },
        };
        registry.register(failingProvider);

        const config = getDefaultConfig();
        const options: SearchOptions = { limit: 5, deep: false };

        try {
          await executeSearch('test', options, config, registry, 'failing-provider');
          // Should not reach here
          expect.unreachable('Expected NetworkError to be thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(NetworkError);
          const netErr = err as NetworkError;
          expect(netErr.statusCode).toBe(statusCode);
          expect(netErr.code).toBe('NETWORK_ERROR');
        }
      }),
      { numRuns: 100 },
    );
  });
});
