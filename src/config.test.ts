import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_PATH = join(homedir(), '.config', 'xweb', 'config.json');

// We mock node:fs to avoid touching the real filesystem
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { getDefaultConfig, loadConfig, saveConfig } from './config.js';

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);
const mockedMkdirSync = vi.mocked(mkdirSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getDefaultConfig', () => {
  it('returns the built-in default config', () => {
    const config = getDefaultConfig();
    expect(config).toEqual({
      default_provider: 'google',
      providers: {},
      fetch_settings: {
        user_agent: 'Mozilla/5.0 (compatible; xweb/1.0)',
        timeout: 30,
        max_length: 50000,
      },
    });
  });

  it('returns a fresh object each call', () => {
    const a = getDefaultConfig();
    const b = getDefaultConfig();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe('loadConfig', () => {
  it('returns default config when file does not exist', () => {
    mockedExistsSync.mockReturnValue(false);
    const config = loadConfig();
    expect(config).toEqual(getDefaultConfig());
  });

  it('returns default config and logs warning when file contains invalid JSON', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue('not valid json {{{');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const config = loadConfig();

    expect(config).toEqual(getDefaultConfig());
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid JSON'),
    );
    spy.mockRestore();
  });

  it('returns default config when file is a JSON array', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue('[1,2,3]');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const config = loadConfig();

    expect(config).toEqual(getDefaultConfig());
    spy.mockRestore();
  });

  it('loads a valid full config', () => {
    const userConfig = {
      default_provider: 'brave',
      providers: {
        brave: { api_key: 'abc123' },
      },
      fetch_settings: {
        user_agent: 'custom-agent',
        timeout: 60,
        max_length: 100000,
      },
    };
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify(userConfig));

    const config = loadConfig();
    expect(config).toEqual(userConfig);
  });

  it('merges partial config with defaults', () => {
    const partial = { default_provider: 'tavily' };
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify(partial));

    const config = loadConfig();
    expect(config.default_provider).toBe('tavily');
    expect(config.providers).toEqual({});
    expect(config.fetch_settings).toEqual(getDefaultConfig().fetch_settings);
  });

  it('merges partial fetch_settings with defaults', () => {
    const partial = { fetch_settings: { timeout: 10 } };
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(JSON.stringify(partial));

    const config = loadConfig();
    expect(config.fetch_settings.timeout).toBe(10);
    expect(config.fetch_settings.user_agent).toBe('Mozilla/5.0 (compatible; xweb/1.0)');
    expect(config.fetch_settings.max_length).toBe(50000);
  });
});

describe('saveConfig', () => {
  it('creates config directory and writes JSON file', () => {
    const config = getDefaultConfig();
    saveConfig(config);

    expect(mockedMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.config'),
      { recursive: true },
    );
    expect(mockedWriteFileSync).toHaveBeenCalledWith(
      CONFIG_PATH,
      JSON.stringify(config, null, 2),
      'utf-8',
    );
  });
});
