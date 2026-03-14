import type { Command } from 'commander';

// ── Help text data ──────────────────────────────────────────

const MAIN_EXAMPLES = `
Examples:
  $ xweb search "rust vs go 2026"                     # 搜索互联网
  $ xweb fetch "https://example.com/article"          # 抓取网页 → Markdown
  $ xweb explore "https://docs.example.com"           # 发现内部链接

Config:
  配置文件: ~/.config/xweb/config.json
  无需 API key 即可使用 search (fallback) 和 fetch/explore。
  配置 API key 可获得更好的搜索质量。`;

const MAIN_VERBOSE = `
Providers:
  simple   内置 fallback（无需 API key）
  brave    Brave Search API
  tavily   Tavily Search API
  serper   Serper API

Provider 选择:
  1. --provider 指定 → 使用该 provider
  2. 配置了默认 provider 且有 API key → 使用默认
  3. 否则 fallback 到 simple

Config File (~/.config/xweb/config.json):
  {
    "default_provider": "brave",
    "providers": { "brave": { "api_key": "BSA-xxx" } },
    "fetch_settings": { "timeout": 30, "max_length": 50000 }
  }

Exit Codes:
  0  成功
  1  运行时错误（网络故障、超时、Provider 错误等）
  2  参数/用法错误（无效 URL、缺少必需参数等）`;

const SEARCH_EXAMPLES = `
Examples:
  $ xweb search "how to use docker compose"
  $ xweb search "kubernetes networking" --provider brave
  $ xweb search "rust async" --limit 3
  $ xweb search "python web frameworks" --json
  $ xweb search "machine learning trends" --deep

JSON output (--json):
  [{"index":1,"title":"...","url":"...","snippet":"..."},...]`;

const FETCH_EXAMPLES = `
Examples:
  $ xweb fetch "https://example.com/article"          # Markdown 输出
  $ xweb fetch "https://example.com" --format text    # 纯文本
  $ xweb fetch "https://example.com" --format json    # JSON 输出
  $ xweb fetch "https://example.com" --raw            # 原始 HTML
  $ xweb fetch "https://example.com" --selector "article.main"

JSON output (--format json):
  {"title":"...","source":"...","content":"..."}`;

const EXPLORE_EXAMPLES = `
Examples:
  $ xweb explore "https://docs.example.com"
  $ xweb explore "https://docs.example.com" --json

JSON output (--json):
  [{"url":"...","title":"..."},...]

Note:
  优先解析 sitemap.xml，无 sitemap 时从页面提取内部链接。`;

// ── Setup functions ─────────────────────────────────────────

export function installHelp(program: Command): void {
  program.addHelpText('after', MAIN_EXAMPLES);
  installVerboseHelp(program);
}

export function addSubcommandExamples(cmd: Command, name: string): void {
  const examples: Record<string, string> = {
    'search': SEARCH_EXAMPLES,
    'fetch': FETCH_EXAMPLES,
    'explore': EXPLORE_EXAMPLES,
  };
  const text = examples[name];
  if (text) {
    cmd.addHelpText('after', text);
  }
}

function installVerboseHelp(program: Command): void {
  program.option('--verbose', '(与 --help 一起使用) 显示完整帮助信息');
  program.on('option:verbose', () => {
    (program as unknown as Record<string, boolean>).__verboseHelp = true;
  });
  program.addHelpText('afterAll', () => {
    if ((program as unknown as Record<string, boolean>).__verboseHelp) {
      return MAIN_VERBOSE;
    }
    return '';
  });
}
