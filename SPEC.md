既然要构建一个与 `xdb` 协同的工具链，`xweb` 的设计核心应当是 **“将非结构化的互联网转换为 Agent 可理解的数据流”**。它不应该只是一个简单的下载器，而是一个**互联网感知层**。

以下是 `xweb` 的完整设计规范。

---

# CLI Specification: `xweb` (The Agentic Web Access Tool)

**Version:** 1.0.0
**Status:** Stable-Design
**Philosophy:** Web as a Data Source (WaaS)

---

## 1. 核心定位 (Core Positioning)

`xweb` 是为 AI Agent 设计的互联网出口。它将复杂的网络请求、反爬处理、内容提取和搜索聚合抽象为简单的语义指令，输出标准的、经由 LLM 优化的 Markdown 或 JSON。

## 2. 命令规范 (Command Structure)

### 2.1 搜索：`xweb search <query>`

聚合多个搜索引擎接口，返回结构化的搜索结果。

* **参数:**
* `-p, --provider`: 显式指定 `google` (默认), `brave`, `tavily`, `serper`。
* `-n, --limit`: 返回结果条数（默认 5-10）。
* `--deep`: 深度搜索模式（如果 Provider 支持，如 Tavily 的 research 模式）。
* `--json`: 强制输出纯 JSON 数组，包含 `title`, `url`, `snippet`。


* **默认行为:**
* 如果没有提供 API Key，尝试使用模拟浏览器头部的轻量级 Google/Bing 爬虫。
* 如果配置了 Key，优先使用结构化 API。



### 2.2 抓取：`xweb fetch <url>`

将网页内容转化为 LLM 友好的格式。

* **参数:**
* `-f, --format`: 输出格式，可选 `markdown` (默认), `text`, `html`, `json`。
* `--raw`: 不进行清洗，直接输出内容（类似 curl）。
* `--selector`: 指定 CSS 选择器，仅提取特定部分。


* **LLM Friendly 特性:**
* **Readability:** 自动剔除 `<nav>`, `<footer>`, `<script>`, `<iframe>` 及广告。
* **Link Mapping:** 将重要的超链接保留在 Markdown 底部或作为元数据。
* **Image Alt:** 保留图片的 `alt` 描述，帮助多模态 Agent 理解。


### 2.3 发现：`xweb explore <url>`

针对给定域名或 URL，发现其内部链接或 Sitemap。

* **意图:** 帮助 Agent 在不知道具体 URL 的情况下，“逛一逛”某个文档中心。

---

## 3. 设计细节 (Design Details)

### 3.1 核心 Provider 配置

配置文件位于 `~/.config/xweb/default.json`:

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

---

## 4. 技术实现要点 (Implementation)

### 4.1 Web Search 模拟逻辑 (Mock Provider)

在没有 API Key 时，`xweb` 内部实现一套简单的模拟逻辑：

1. 构造带有随机 User-Agent 的请求。
2. 请求 `https://www.google.com/search?q={query}`。
3. 使用正则或轻量级解析器提取 `div.g` 下的标题和链接。
4. 封装成与 Brave/Tavily 一致的 JSON 格式返回。

### 4.2 Web Fetch 转化逻辑

* **HTML to Markdown:** 推荐使用类似 `turndown` (Node.js) 的库。
* **动态渲染的网页:** 暂不支持，未来本地安装了 browser 命令 后 再增加。

---

## 5. 接口响应示例 (Response)

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

