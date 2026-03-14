# 需求文档

## 简介

`xweb` 是为 AI Agent 设计的互联网访问 CLI 工具，属于 pai/cmds/xdb 工具链生态的一部分。其核心理念是"将非结构化的互联网转换为 Agent 可理解的数据流"——不仅仅是一个下载器，而是一个互联网感知层。xweb 将复杂的网络请求、内容提取和搜索聚合抽象为简单的语义指令，输出标准的、经由 LLM 优化的 Markdown 或 JSON。

## 术语表

- **xweb**: 本 CLI 工具的名称，为 AI Agent 提供互联网出口
- **Search_Engine**: 搜索命令所使用的搜索引擎后端（如 Google、Brave、Tavily、Serper）
- **Search_Provider**: 封装了特定搜索引擎 API 调用逻辑的模块
- **Simple_Provider**: 在没有 API Key 时，通过模拟浏览器请求并解析 HTML 来获取搜索结果的内置 Provider
- **Fetch_Engine**: 负责抓取网页并将 HTML 转化为 LLM 友好格式的模块
- **Explore_Engine**: 负责发现给定 URL 的内部链接和 Sitemap 的模块
- **Config_Manager**: 负责加载、验证和管理 `~/.config/xweb/config.json` 配置文件的模块
- **Search_Result**: 搜索结果的结构化数据对象，包含 index、title、url、snippet 字段
- **Fetched_Content**: 抓取后经过清洗和格式转换的网页内容对象

## 需求

### 需求 1: 搜索命令

**用户故事:** 作为一个 AI Agent，我希望通过 `xweb search <query>` 聚合多个搜索引擎的结果，以便快速获取结构化的搜索信息。

#### 验收标准

1. WHEN 用户执行 `xweb search <query>` 且配置了有效的 API Key, THE Search_Provider SHALL 调用对应搜索引擎 API 并返回结构化的 Search_Result 数组
2. WHEN 用户执行 `xweb search <query>` 且未配置任何 API Key, THE Simple_Provider SHALL 通过模拟浏览器请求获取搜索结果并返回与 API Provider 格式一致的 Search_Result 数组
3. WHEN 用户指定 `--provider` 参数, THE xweb SHALL 使用指定的 Search_Provider 执行搜索
4. WHEN 用户指定 `--limit <n>` 参数, THE Search_Provider SHALL 返回不超过 n 条搜索结果
5. WHEN 用户未指定 `--limit` 参数, THE Search_Provider SHALL 返回默认 5 条搜索结果
6. WHEN 用户指定 `--deep` 参数, THE Search_Provider SHALL 启用深度搜索模式（Simple_Provider 通过增加请求页数实现，API Provider 通过调用其深度搜索接口实现）
7. WHEN 用户指定 `--json` 参数, THE xweb SHALL 输出纯 JSON 数组格式的搜索结果
8. THE Search_Result SHALL 包含 index、title、url 和 snippet 四个字段

### 需求 2: 抓取命令

**用户故事:** 作为一个 AI Agent，我希望通过 `xweb fetch <url>` 将网页内容转化为 LLM 友好的格式，以便直接理解和处理网页信息。

#### 验收标准

1. WHEN 用户执行 `xweb fetch <url>`, THE Fetch_Engine SHALL 抓取目标 URL 的 HTML 内容并转化为 Markdown 格式输出
2. WHEN 用户指定 `--format text`, THE Fetch_Engine SHALL 输出纯文本格式的内容
3. WHEN 用户指定 `--format html`, THE Fetch_Engine SHALL 输出清洗后的 HTML 内容
4. WHEN 用户指定 `--format json`, THE Fetch_Engine SHALL 输出包含 title、source、content 字段的 JSON 对象
5. WHEN 用户指定 `--raw` 参数, THE Fetch_Engine SHALL 跳过 Readability 启发式清洗，仅做 HTML 到目标格式的直接转换
6. WHEN 用户指定 `--selector <css>` 参数, THE Fetch_Engine SHALL 仅提取匹配 CSS 选择器的 HTML 片段进行转换
7. WHEN 转换 HTML 为 Markdown 时, THE Fetch_Engine SHALL 自动剔除 nav、footer、script、iframe 及广告相关元素
8. WHEN 转换 HTML 为 Markdown 时, THE Fetch_Engine SHALL 将重要超链接保留为 Markdown 引用链接格式置于文档底部
9. WHEN 转换 HTML 为 Markdown 时, THE Fetch_Engine SHALL 保留图片的 alt 描述文本

### 需求 3: 发现命令

**用户故事:** 作为一个 AI Agent，我希望通过 `xweb explore <url>` 发现目标网站的内部链接和 Sitemap，以便在不知道具体 URL 的情况下浏览文档中心。

#### 验收标准

1. WHEN 用户执行 `xweb explore <url>`, THE Explore_Engine SHALL 抓取目标 URL 并提取页面中的所有内部链接
2. WHEN 目标网站存在 sitemap.xml, THE Explore_Engine SHALL 优先解析 Sitemap 获取链接列表
3. WHEN 用户指定 `--json` 参数, THE Explore_Engine SHALL 输出 JSON 数组格式的链接列表
4. THE Explore_Engine SHALL 对提取的链接进行去重和规范化处理

### 需求 4: 配置管理

**用户故事:** 作为一个用户，我希望通过配置文件管理搜索引擎的 API Key 和全局设置，以便灵活切换不同的搜索后端。

#### 验收标准

1. THE Config_Manager SHALL 从 `~/.config/xweb/config.json` 加载配置
2. WHEN 配置文件不存在, THE Config_Manager SHALL 使用内置默认配置正常运行
3. WHEN 配置文件包含无效的 JSON, THE Config_Manager SHALL 输出明确的错误信息并使用默认配置
4. THE Config_Manager SHALL 支持配置 default_provider、providers（含 api_key 和 base_url）以及 fetch_settings（含 user_agent、timeout、max_length）
5. THE Config_Manager SHALL 将配置序列化为 JSON 格式存储，并能从 JSON 反序列化恢复为等价的配置对象（往返一致性）

### 需求 5: 搜索结果序列化

**用户故事:** 作为一个 AI Agent，我希望搜索结果能以标准 JSON 格式输出，以便程序化地解析和处理。

#### 验收标准

1. THE xweb SHALL 将 Search_Result 对象序列化为 JSON 字符串输出
2. THE xweb SHALL 能将 JSON 字符串反序列化为等价的 Search_Result 对象（往返一致性）
3. WHEN 序列化 Search_Result 时, THE xweb SHALL 保留所有字段（index、title、url、snippet）的值不变

### 需求 6: 错误处理

**用户故事:** 作为一个 AI Agent，我希望在网络请求失败或参数错误时获得清晰的错误信息，以便做出合理的重试或替代决策。

#### 验收标准

1. WHEN 网络请求超时, THE xweb SHALL 返回包含超时信息的错误消息并以非零退出码退出
2. WHEN 目标 URL 返回 HTTP 错误状态码, THE xweb SHALL 返回包含状态码和错误描述的错误消息
3. WHEN 用户提供无效的 URL 格式, THE xweb SHALL 返回 URL 格式错误的提示信息
4. WHEN 指定的 Provider 不存在或未配置, THE xweb SHALL 返回 Provider 不可用的错误信息
5. IF 搜索引擎 API 返回错误响应, THEN THE Search_Provider SHALL 将 API 错误转换为统一的错误格式返回

### 需求 7: CLI 接口规范

**用户故事:** 作为一个用户，我希望 xweb 遵循与 pai、cmds 一致的 CLI 交互规范，以便在工具链中获得一致的使用体验。

#### 验收标准

1. THE xweb SHALL 使用 commander 库构建 CLI 命令结构
2. WHEN 用户执行 `xweb --version`, THE xweb SHALL 输出当前版本号
3. WHEN 用户执行 `xweb --help`, THE xweb SHALL 输出包含所有命令和选项的帮助信息
4. WHEN 用户执行未知命令, THE xweb SHALL 输出错误提示并显示帮助信息

### 需求 8: 输出格式化

**用户故事:** 作为一个 AI Agent，我希望 xweb 的默认输出是 LLM 友好的 Markdown 格式，以便直接作为上下文输入。

#### 验收标准

1. WHEN 输出 Markdown 格式的 Fetched_Content 时, THE xweb SHALL 在文档头部包含 YAML front matter（含 title 和 source 字段）
2. WHEN 输出搜索结果的默认格式时, THE xweb SHALL 以编号列表形式展示每条结果的标题、URL 和摘要
3. WHEN 输出 explore 结果的默认格式时, THE xweb SHALL 以编号列表形式展示每条链接的 URL 和标题
