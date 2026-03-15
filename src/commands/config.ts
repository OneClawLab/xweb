import { loadConfig, saveConfig } from '../config.js';
import type { ProviderConfig } from '../types.js';

const KNOWN_PROVIDERS = ['brave', 'tavily', 'serper'];

interface ConfigOptions {
  add?: boolean;
  update?: boolean;
  show?: boolean;
  delete?: boolean;
  name?: string;
  set?: string[];
  defaultProvider?: string;
  json?: boolean;
}

export function handleConfig(opts: ConfigOptions): void {
  const config = loadConfig();

  // Set default provider
  if (opts.defaultProvider !== undefined) {
    config.default_provider = opts.defaultProvider;
    saveConfig(config);
    process.stdout.write(`Default provider set to: ${opts.defaultProvider}\n`);
    return;
  }

  // Count mutually exclusive actions
  const actions = [opts.add, opts.update, opts.show, opts.delete].filter(Boolean);
  if (actions.length > 1) {
    process.stderr.write('Error: --add, --update, --show, --delete are mutually exclusive.\n');
    process.exitCode = 2;
    return;
  }

  // All actions below require --name
  if (!opts.name) {
    // No action, no name → show full config
    if (actions.length === 0) {
      showFullConfig(config, !!opts.json);
      return;
    }
    process.stderr.write('Error: --name is required.\n');
    process.exitCode = 2;
    return;
  }

  const name = opts.name;

  if (opts.show) {
    const provider = config.providers[name];
    if (!provider) {
      process.stderr.write(`Provider "${name}" not found.\n`);
      process.exitCode = 2;
      return;
    }
    const masked = maskProvider(name, provider, config.default_provider);
    if (opts.json) {
      process.stdout.write(JSON.stringify(masked, null, 2) + '\n');
    } else {
      printProvider(masked);
    }
    return;
  }

  if (opts.delete) {
    if (!config.providers[name]) {
      process.stderr.write(`Provider "${name}" not found.\n`);
      process.exitCode = 2;
      return;
    }
    delete config.providers[name];
    if (config.default_provider === name) {
      config.default_provider = 'google';
    }
    saveConfig(config);
    process.stdout.write(`Provider "${name}" deleted.\n`);
    return;
  }

  // --add or --update
  if (opts.add || opts.update) {
    const kvPairs = parseKvPairs(opts.set || []);
    if (!kvPairs) {
      process.exitCode = 2;
      return;
    }

    if (opts.add) {
      // upsert
      const existing = config.providers[name] || { api_key: '' };
      Object.assign(existing, kvPairs);
      if (!existing.api_key) {
        process.stderr.write('Error: api_key is required. Use --set api_key=xxx\n');
        process.exitCode = 2;
        return;
      }
      config.providers[name] = existing;
    } else {
      // update: must exist
      if (!config.providers[name]) {
        process.stderr.write(`Provider "${name}" not found. Use --add to create.\n`);
        process.exitCode = 2;
        return;
      }
      Object.assign(config.providers[name], kvPairs);
    }

    saveConfig(config);
    process.stdout.write(`Provider "${name}" ${opts.add ? 'added' : 'updated'}.\n`);
    return;
  }

  // No action specified with --name → show that provider
  const provider = config.providers[name];
  if (!provider) {
    process.stderr.write(`Provider "${name}" not found.\n`);
    process.exitCode = 2;
    return;
  }
  const masked = maskProvider(name, provider, config.default_provider);
  if (opts.json) {
    process.stdout.write(JSON.stringify(masked, null, 2) + '\n');
  } else {
    printProvider(masked);
  }
}

function parseKvPairs(pairs: string[]): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) {
      process.stderr.write(`Invalid --set format: "${pair}". Expected key=value.\n`);
      return null;
    }
    result[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return result;
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function maskProvider(name: string, p: ProviderConfig, defaultProvider: string) {
  return {
    name,
    api_key: maskApiKey(p.api_key),
    ...(p.base_url ? { base_url: p.base_url } : {}),
    is_default: name === defaultProvider,
  };
}

function printProvider(p: { name: string; api_key: string; base_url?: string; is_default: boolean }) {
  process.stdout.write(`  ${p.name}${p.is_default ? ' (default)' : ''}\n`);
  process.stdout.write(`    api_key: ${p.api_key}\n`);
  if (p.base_url) process.stdout.write(`    base_url: ${p.base_url}\n`);
}

function showFullConfig(config: ReturnType<typeof loadConfig>, json: boolean) {
  const providers = Object.entries(config.providers).map(([name, p]) =>
    maskProvider(name, p, config.default_provider)
  );
  if (json) {
    process.stdout.write(JSON.stringify({
      default_provider: config.default_provider,
      providers,
      fetch_settings: config.fetch_settings,
    }, null, 2) + '\n');
  } else {
    process.stdout.write(`default_provider: ${config.default_provider}\n`);
    if (providers.length === 0) {
      process.stdout.write('providers: (none)\n');
    } else {
      process.stdout.write('providers:\n');
      for (const p of providers) printProvider(p);
    }
    process.stdout.write(`fetch_settings:\n`);
    process.stdout.write(`  timeout: ${config.fetch_settings.timeout}s\n`);
    process.stdout.write(`  max_length: ${config.fetch_settings.max_length}\n`);
    process.stdout.write(`  user_agent: ${config.fetch_settings.user_agent}\n`);
  }
}
