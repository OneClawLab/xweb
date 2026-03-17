# xweb

Internet access CLI for AI agents and humans. Converts unstructured web content into LLM-friendly data streams.

## Features

- Web search via multiple providers (Brave, Tavily, Serper, built-in fallback — no API key required)
- Fetch and clean web pages to Markdown, text, HTML, or JSON
- Discover site structure via sitemap or link extraction
- Auto-detect TTY for human-readable vs JSON output
- All subcommands support `--json`

## Install

```bash
npm install
npm run build
npm link
```

## Quick Start

```bash
# Search the web (no API key needed)
xweb search "rust vs go 2026"

# Fetch a page as clean Markdown
xweb fetch "https://example.com/article"

# Discover internal links of a site
xweb explore "https://docs.example.com"
```

## Commands

| Command | Description |
|---------|-------------|
| `xweb search <query>` | Search the web, returns structured results |
| `xweb fetch <url>` | Fetch and clean a web page |
| `xweb explore <url>` | Discover internal links (sitemap or crawl) |
| `xweb config` | Manage search provider configuration |

## Search Providers

| Provider | API Key Required |
|----------|-----------------|
| `simple` | No (default fallback) |
| `brave` | Yes (`BSA-...`) |
| `tavily` | Yes (`tvly-...`) |
| `serper` | Yes |

Provider selection: explicit `--provider` > configured default > `simple` fallback.

## Configuration

Config file: `~/.config/xweb/default.json`

```json
{
  "default_provider": "brave",
  "providers": {
    "brave": { "api_key": "BSA-xxx" },
    "tavily": { "api_key": "tvly-xxx" },
    "serper": { "api_key": "xxx" }
  },
  "fetch_settings": {
    "timeout": 30,
    "max_length": 50000
  }
}
```

## Documentation

- **[USAGE.md](USAGE.md)** — Full usage guide with all options and examples
