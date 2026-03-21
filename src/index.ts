import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createDefaultRegistry, executeSearch } from './search.js';
import { createSimpleProvider } from './providers/simple.js';
import { createBraveProvider } from './providers/brave.js';
import { createTavilyProvider } from './providers/tavily.js';
import { createSerperProvider } from './providers/serper.js';
import { executeFetch } from './fetch.js';
import { executeExplore } from './explore.js';
import { formatSearchResults, formatExploreResults } from './formatter.js';
import { XwebError, ValidationError } from './types.js';
import { installHelp, addSubcommandExamples } from './help.js';
import { handleConfig } from './commands/config.js';
import type { FetchOptions } from './types.js';

// Gracefully handle EPIPE (broken pipe, e.g. `xweb ... | head`)
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});
process.stderr.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const { version: pkgVersion } = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as { version: string };

const program = new Command();

program
  .name('xweb')
  .description('AI Agent 互联网访问 CLI 工具')
  .version(`xweb ${pkgVersion}`)
  .showHelpAfterError(true);

program.exitOverride();

// Install help system
installHelp(program);

// Search command
const searchCmd = program
  .command('search <query>')
  .description('搜索互联网')
  .option('--provider <name>', '指定搜索引擎 Provider')
  .option('--limit <n>', '限制结果数量', '5')
  .option('--deep', '启用深度搜索', false)
  .option('--json', '输出 JSON 格式', false)
  .action(async (query: string, opts: { provider?: string; limit: string; deep: boolean; json: boolean }) => {
    const config = loadConfig();
    const registry = createDefaultRegistry();

    // Register simple provider as fallback
    registry.register(createSimpleProvider());

    // Register API providers if configured
    for (const [name, providerConfig] of Object.entries(config.providers)) {
      if (providerConfig.api_key) {
        switch (name) {
          case 'brave':
            registry.register(createBraveProvider(providerConfig.api_key, providerConfig.base_url));
            break;
          case 'tavily':
            registry.register(createTavilyProvider(providerConfig.api_key, providerConfig.base_url));
            break;
          case 'serper':
            registry.register(createSerperProvider(providerConfig.api_key, providerConfig.base_url));
            break;
        }
      }
    }

    const results = await executeSearch(
      query,
      { limit: parseInt(opts.limit, 10) || 5, deep: opts.deep },
      config,
      registry,
      opts.provider,
    );

    if (results.length === 0) {
      process.stderr.write(`No results found for: ${query}\n`);
      process.exitCode = 1;
      return;
    }

    console.log(formatSearchResults(results, opts.json));
  });
addSubcommandExamples(searchCmd, 'search');

// Fetch command
const fetchCmd = program
  .command('fetch <url>')
  .description('抓取网页内容')
  .option('--format <type>', '输出格式: markdown|text|html|json', 'markdown')
  .option('--raw', '跳过 HTML 清洗', false)
  .option('--selector <css>', 'CSS 选择器提取')
  .action(async (url: string, opts: { format: string; raw: boolean; selector?: string }) => {
    const config = loadConfig();
    const fetchOptions: FetchOptions = {
      format: (opts.format as FetchOptions['format']) || 'markdown',
      raw: opts.raw,
      ...(opts.selector !== undefined ? { selector: opts.selector } : {}),
    };

    const result = await executeFetch(url, fetchOptions, config);
    console.log(result);
  });
addSubcommandExamples(fetchCmd, 'fetch');

// Explore command
const exploreCmd = program
  .command('explore <url>')
  .description('发现网站内部链接')
  .option('--json', '输出 JSON 格式', false)
  .action(async (url: string, opts: { json: boolean }) => {
    const config = loadConfig();
    const results = await executeExplore(url, opts, config);
    console.log(formatExploreResults(results, opts.json));
  });
addSubcommandExamples(exploreCmd, 'explore');

// Config command
const configCmd = program
  .command('config')
  .description('管理搜索引擎 Provider 配置')
  .option('--add', '添加 Provider（同名则 upsert）')
  .option('--update', '更新已有 Provider')
  .option('--show', '查看 Provider 配置（API key 脱敏）')
  .option('--delete', '删除 Provider')
  .option('--name <name>', 'Provider 名称')
  .option('--set <kv...>', '设置键值对，如 api_key=xxx')
  .option('--default-provider <name>', '设置默认搜索引擎')
  .option('--json', 'JSON 输出')
  .action((opts) => {
    handleConfig(opts);
  });
addSubcommandExamples(configCmd, 'config');

// Global error handling
async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    // commander throws CommanderError on exitOverride
    if (error && typeof error === 'object' && 'exitCode' in error) {
      const exitCode = (error as { exitCode: number }).exitCode;
      // Map commander's exit code 1 (argument errors) to 2 per spec
      process.exitCode = exitCode === 1 ? 2 : exitCode;
      return;
    }
    if (error instanceof ValidationError) {
      console.error(`Error [${error.code}]: ${error.message}`);
      process.exit(2);
    }
    if (error instanceof XwebError) {
      console.error(`Error [${error.code}]: ${error.message}`);
      process.exit(1);
    }
    console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
