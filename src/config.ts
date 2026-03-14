import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { XwebConfig } from './types.js';

const CONFIG_DIR = join(homedir(), '.config', 'xweb');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export function getDefaultConfig(): XwebConfig {
  return {
    default_provider: 'google',
    providers: {},
    fetch_settings: {
      user_agent: 'Mozilla/5.0 (compatible; xweb/1.0)',
      timeout: 30,
      max_length: 50000,
    },
  };
}

export function loadConfig(): XwebConfig {
  const defaults = getDefaultConfig();

  if (!existsSync(CONFIG_PATH)) {
    return defaults;
  }

  let raw: string;
  try {
    raw = readFileSync(CONFIG_PATH, 'utf-8');
  } catch {
    return defaults;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`[xweb] Warning: Invalid JSON in ${CONFIG_PATH}, using default config.`);
    return defaults;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    console.error(`[xweb] Warning: Config file is not a JSON object, using default config.`);
    return defaults;
  }

  const userConfig = parsed as Partial<XwebConfig>;

  return {
    default_provider: userConfig.default_provider ?? defaults.default_provider,
    providers: { ...defaults.providers, ...userConfig.providers },
    fetch_settings: {
      ...defaults.fetch_settings,
      ...userConfig.fetch_settings,
    },
  };
}

export function saveConfig(config: XwebConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
