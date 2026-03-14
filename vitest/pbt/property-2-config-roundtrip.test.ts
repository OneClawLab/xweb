/**
 * Feature: xweb-cli, Property 2: Config 序列化往返一致性
 *
 * **Validates: Requirements 4.5**
 *
 * For any valid XwebConfig object, serializing it to JSON and deserializing
 * it back should produce an equivalent config object.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ProviderConfig, FetchSettings, XwebConfig } from '../../src/types.js';

/**
 * Arbitrary for ProviderConfig.
 * base_url is optional, but JSON.stringify drops undefined values.
 * We generate base_url always as a string so the roundtrip is clean.
 */
const providerConfigArb: fc.Arbitrary<ProviderConfig> = fc.record({
  api_key: fc.string({ minLength: 1 }),
  base_url: fc.webUrl(),
});

/** Arbitrary for FetchSettings */
const fetchSettingsArb: fc.Arbitrary<FetchSettings> = fc.record({
  user_agent: fc.string({ minLength: 1 }),
  timeout: fc.integer({ min: 1, max: 300 }),
  max_length: fc.integer({ min: 1, max: 1_000_000 }),
});

/** Arbitrary for XwebConfig */
const xwebConfigArb: fc.Arbitrary<XwebConfig> = fc.record({
  default_provider: fc.string({ minLength: 1 }),
  providers: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    providerConfigArb,
  ),
  fetch_settings: fetchSettingsArb,
});

describe('Feature: xweb-cli, Property 2: Config 序列化往返一致性', () => {
  it('should survive JSON serialization roundtrip', () => {
    fc.assert(
      fc.property(xwebConfigArb, (original: XwebConfig) => {
        const serialized = JSON.stringify(original);
        const deserialized: XwebConfig = JSON.parse(serialized);

        expect(deserialized).toEqual(original);
      }),
      { numRuns: 100 },
    );
  });
});
