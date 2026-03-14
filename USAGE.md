# xweb 使用指南

`xweb` 是为 AI Agent 设计的互联网访问 CLI 工具，将非结构化的网页内容转换为 LLM 友好的数据流。

## 安装

```bash
npm install
npm run build
npm link   # 全局安装 xweb 命令
```

## 快速开始

```bash
# 搜索互联网（无需 API key，内置 fallback 搜索）
xweb search "rust vs go 2026"

# 抓取网页内容，转为 Markdown
xweb fetch "https://example.com/article"

# 发现网站内部链接
xweb explore "https://docs.example.com"
```

## 命令详解

### `xweb search <query>`

聚合多个搜索引擎，返回结构化搜索结果。

```bash
# 基本搜索
$ xweb search "how to use docker compose"

# 指定搜索引擎
$ xweb search "kubernetes networking" --provider brave

# 限制结果数量
$ xweb search "rust async" --limit 3

# JSON 输出（适合脚本和 LLM Agent）
$ xweb search "python web frameworks" --json

# 深度搜索（如果 Provider 支持）
$ xweb search "machine learning trends" --deep
```

**选项:**
- `--provider <name>` — 指定搜索引擎: `simple`(默认 fallback), `brave`, `tavily`, `serper`
- `--limit <n>` — 返回结果数量（默认 5）
- `--deep` — 深度搜索模式
- `--json` — 输出 JSON 格式

**Provider 选择逻辑:**
1. 如果指定了 `--provider`，使用该 provider
2. 如果配置了默认 provider 且有 API key，使用默认 provider
3. 否则 fallback 到内置 simple provider（模拟浏览器搜索，无需 API key）

**输出格式:**

人类可读（默认）:
```
1. Docker Compose Tutorial
   URL: https://docs.docker.com/compose/
   Learn how to define and run multi-container applications...

2. Getting Started with Docker Compose
   URL: https://example.com/docker-compose
   A beginner's guide to...
```

JSON (`--json`):
```json
[
  {
    "index": 1,
    "title": "Docker Compose Tutorial",
    "url": "https://docs.docker.com/compose/",
    "snippet": "Learn how to define and run multi-container applications..."
  }
]
```

### `xweb fetch <url>`

抓取网页内容并转换为 LLM 友好的格式。自动剔除导航栏、页脚、脚本、广告等噪音内容。

```bash
# 默认输出 Markdown（含 YAML front matter）
$ xweb fetch "https://example.com/article"

# 纯文本输出
$ xweb fetch "https://example.com/article" --format text

# JSON 输出（含 title、source、content）
$ xweb fetch "https://example.com/article" --format json

# 原始 HTML 输出（跳过清洗）
$ xweb fetch "https://example.com" --raw

# CSS 选择器提取特定部分
$ xweb fetch "https://example.com" --selector "article.main-content"

# 清洗后的 HTML
$ xweb fetch "https://example.com/article" --format html
```

**选项:**
- `--format <type>` — 输出格式: `markdown`(默认), `text`, `html`, `json`
- `--raw` — 跳过 HTML 清洗，直接输出
- `--selector <css>` — CSS 选择器，仅提取匹配的 HTML 片段

**输出格式:**

Markdown（默认）— 含 YAML front matter:
```markdown
---
title: "Article Title"
source: "https://example.com/article"
---

# Article Title

Content here...
```

JSON (`--format json`):
```json
{
  "title": "Article Title",
  "source": "https://example.com/article",
  "content": "# Article Title\n\nContent here..."
}
```

**LLM 友好特性:**
- 自动剔除 `<nav>`, `<footer>`, `<script>`, `<iframe>` 及广告
- 保留重要超链接
- 保留图片 `alt` 描述
- 超过 max_length（默认 50000 字符）自动截断

### `xweb explore <url>`

发现网站内部链接。优先解析 sitemap.xml，无 sitemap 时从页面提取内部链接。

```bash
# 发现文档站点的所有页面
$ xweb explore "https://docs.example.com"

# JSON 输出
$ xweb explore "https://docs.example.com" --json
```

**选项:**
- `--json` — 输出 JSON 格式

**处理逻辑:**
1. 尝试获取 `{origin}/sitemap.xml`
2. 如果 sitemap 存在且有效，解析其中的 URL
3. 否则抓取目标页面，提取同域名的内部链接
4. 去重、规范化、按 URL 排序

**输出格式:**

人类可读（默认）:
```
1. Getting Started
   https://docs.example.com/getting-started

2. API Reference
   https://docs.example.com/api
```

JSON (`--json`):
```json
[
  { "url": "https://docs.example.com/getting-started", "title": "Getting Started" },
  { "url": "https://docs.example.com/api", "title": "API Reference" }
]
```

## 配置

配置文件位于 `~/.config/xweb/config.json`。无配置文件时使用默认值。

```json
{
  "default_provider": "google",
  "providers": {
    "brave": { "api_key": "BSA-xxx", "base_url": "..." },
    "tavily": { "api_key": "tvly-xxx" },
    "serper": { "api_key": "xxx" }
  },
  "fetch_settings": {
    "user_agent": "Mozilla/5.0 (compatible; xweb/1.0)",
    "timeout": 30,
    "max_length": 50000
  }
}
```

- `default_provider` — 默认搜索引擎（配置了对应 API key 时生效）
- `providers` — 各搜索引擎的 API key 和可选 base_url
- `fetch_settings.timeout` — HTTP 请求超时（秒）
- `fetch_settings.max_length` — HTML 最大长度（字符），超出截断

无需 API key 即可使用 `search`（fallback 到 simple provider）和 `fetch`/`explore`。
配置 API key 可获得更好的搜索质量。

## 在 LLM Agent 中使用

```bash
# 搜索 → 获取第一个结果的 URL → 抓取内容
$ url=$(xweb search "docker compose tutorial" --json | jq -r '.[0].url')
$ xweb fetch "$url"

# 探索文档站点 → 抓取特定页面
$ xweb explore "https://docs.example.com" --json | jq -r '.[].url'

# 搜索结果直接给 LLM 消费
$ xweb search "kubernetes pod lifecycle" --json
```

## 退出码

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | 运行时错误（网络故障、超时、Provider 错误等） |
| 2 | 参数/用法错误（无效 URL、缺少必需参数等） |
