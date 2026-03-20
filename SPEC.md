# xweb - web access CLI command

A CLI tool designed for AI Agents to access the internet. It abstracts web requests, anti-scraping handling, content extraction, and search aggregation into simple semantic commands, outputting LLM-optimized Markdown or structured JSON.

## 决策记录

1. **Agent 优先**：所有输出格式（Markdown / JSON）均面向 LLM 消费优化，人类可读是副产品。
2. **搜索聚合**：支持多个搜索引擎 provider（Google、Brave、Tavily、Serper），无 API Key 时自动 fallback 到模拟浏览器爬虫。
3. **内容清洗**：fetch 默认剔除导航、页脚、脚本、广告等噪音，保留正文和关键链接。
4. **不支持动态渲染**：暂不支持 JavaScript 渲染的网页，未来本地安装了 browser 命令后再增加。

## 1. Role

- **Search**: Aggregate multiple search engine APIs, return structured results.
- **Fetch**: Convert web pages into LLM-friendly Markdown/text/JSON.
- **Explore**: Discover internal links and sitemaps for a given domain or URL.

## 2. Tech Stack & Project Structure

遵循 `pai` repo 约定：

- **TypeScript + ESM** (Node 20+)
- **构建**: tsup (ESM, shebang banner)
- **测试**: vitest (unit, pbt, fixtures)
- **CLI 解析**: commander
- **HTML to Markdown**: turndown (or similar)

## 3. Data Directory Layout

Config file: `~/.config/xweb/default.json`

```json
{
  "default_provider": "google",
  "providers": {
    "brave": { "api_key": "...", "base_url": "..." },
    "tavily": { "api_key": "..." }
  },
  "fetch_settings": {
    "user_agent": "Mozilla/5.0...",
    "timeout": 30,
    "max_length": 50000
  }
}
```

## 4. CLI Commands

### 4.1 `xweb search <query>`

Aggregate search engines and return structured results.

**Args**:
- `-p, --provider` — explicitly specify `google` (default), `brave`, `tavily`, `serper`
- `-n, --limit` — number of results (default 5-10)
- `--deep` — deep search mode (if provider supports it, e.g. Tavily research mode)
- `--json` — force pure JSON array output with `title`, `url`, `snippet`

**Behavior**:
- 如果没有提供 API Key，尝试使用模拟浏览器头部的轻量级 Google/Bing 爬虫。
- 如果配置了 Key，优先使用结构化 API。

### 4.2 `xweb fetch <url>`

Convert web page content into LLM-friendly format.

**Args**:
- `-f, --format` — output format: `markdown` (default), `text`, `html`, `json`
- `--raw` — skip cleaning, output raw content (similar to curl)
- `--selector` — CSS selector to extract specific parts only

**LLM-Friendly Features**:
- **Readability**: 自动剔除 `<nav>`, `<footer>`, `<script>`, `<iframe>` 及广告。
- **Link Mapping**: 将重要的超链接保留在 Markdown 底部或作为元数据。
- **Image Alt**: 保留图片的 `alt` 描述，帮助多模态 Agent 理解。

### 4.3 `xweb explore <url>`

Discover internal links or sitemap for a given domain/URL.

**Intent**: 帮助 Agent 在不知道具体 URL 的情况下，"逛一逛"某个文档中心。

## 5. Implementation Details

### 5.1 Mock Search Provider

在没有 API Key 时，`xweb` 内部实现一套简单的模拟逻辑：

1. 构造带有随机 User-Agent 的请求。
2. 请求 `https://www.google.com/search?q={query}`。
3. 使用正则或轻量级解析器提取 `div.g` 下的标题和链接。
4. 封装成与 Brave/Tavily 一致的 JSON 格式返回。

### 5.2 Web Fetch Pipeline

- **HTML to Markdown**: 推荐使用类似 `turndown` (Node.js) 的库。
- **动态渲染的网页**: 暂不支持，未来本地安装了 browser 命令后再增加。

## 6. Output Format

### 6.1 stdout / stderr Contract

- `stdout`: Command result data (search results, fetched content, link list).
- `stderr`: Progress, debug, error, and warning messages.

### 6.2 Human / Machine Readability

- Default output is human-readable Markdown.
- `--json` enables structured JSON output.
- TTY auto-detection: TTY → Markdown, Pipe → JSON.

### 6.3 Response Examples

#### `xweb search "rust vs go" --json`

```json
[
  {
    "index": 1,
    "title": "Rust vs Go in 2026",
    "url": "https://tech-blog.com/rust-go",
    "snippet": "A comprehensive comparison of memory safety and performance..."
  }
]
```

#### `xweb fetch "url"`

```markdown
---
title: Rust vs Go in 2026
source: https://tech-blog.com/rust-go
---

# Rust vs Go in 2026

Both languages have evolved...

[1] Benchmark details: https://tech-blog.com/benchmarks
```

## 7. Error Handling & Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Logic error (fetch failed, no search results, etc.) |
| `2` | Usage/argument error (missing required args, invalid URL, etc.) |

Error output to `stderr`, format `Error: <what went wrong> - <how to fix>`.

## 8. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| (None) | xweb reads config from its config file | `~/.config/xweb/default.json` |
