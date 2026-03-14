/**
 * Feature: xweb-cli, Property 16: 无效 JSON 配置回退到默认值
 *
 * **Validates: Requirements 4.3**
 *
 * For any string that is NOT valid JSON, Config_Manager should fall back
 * to the default config, and the returned config object should be equivalent
 * to the built-in default config.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock node:fs before importing config module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { existsSync, readFileSync } from 'node:fs';
import { loadConfig, getDefaultConfig } from '../../src/config.js';

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);

/** Arbitrary that generates strings which are NOT valid JSON */
const invalidJsonArb = fc.string().filter((s) => {
  try {
    JSON.parse(s);
    return false;
  } catch {
    return true;
  }
});

describe('Feature: xweb-cli, Property 16: 无效 JSON 配置回退到默认值', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should fall back to default config for any invalid JSON string', () => {
    const defaultConfig = getDefaultConfig();

    fc.assert(
      fc.property(invalidJsonArb, (invalidJson: string) => {
        vi.clearAllMocks();
        mockedExistsSync.mockReturnValue(true);
        mockedReadFileSync.mockReturnValue(invalidJson);

        const result = loadConfig();

        expect(result).toEqual(defaultConfig);
      }),
      { numRuns: 100 },
    );
  });
});
