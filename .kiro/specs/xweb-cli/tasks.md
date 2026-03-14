# 实现计划: xweb-cli

## 概述

基于设计文档，将 xweb CLI 工具的实现分解为增量式的编码任务。技术栈：TypeScript、ESM、commander、tsup、vitest、fast-check，与 pai/cmds/xdb 保持一致。

## 任务

- [x] 1. 项目初始化与核心类型定义
  - [x] 1.1 初始化项目结构（package.json、tsconfig.json、tsup.config.ts、vitest.config.ts），参照 pai/cmds 的配置
    - 创建 `package.json`（name: xweb-cli, type: module, bin: xweb）
    - 创建 `tsconfig.json`（module: nodenext, target: esnext, strict: true）
    - 创建 `tsup.config.ts`（entry: src/index.ts, format: esm, banner: shebang）
    - 创建 `vitest.config.ts`（globals: true, environment: node, watch: false）
    - _Requirements: 7.1_
  - [x] 1.2 定义核心类型和接口（`src/types.ts`）
    - 定义 SearchResult、SearchOptions、SearchProvider、FetchOptions、FetchedContent、ExploreResult、XwebConfig、ProviderConfig、FetchSettings 接口
    - 定义 XwebError、NetworkError、TimeoutError、ValidationError、ProviderError 错误类
    - _Requirements: 1.8, 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x]* 1.3 编写 SearchResult 序列化往返属性测试
    - **Property 1: SearchResult 序列化往返一致性**
    - **Validates: Requirements 1.7, 5.1, 5.2, 5.3**
  - [x]* 1.4 编写 Config 序列化往返属性测试
    - **Property 2: Config 序列化往返一致性**
    - **Validates: Requirements 4.5**

- [x] 2. 配置管理模块
  - [x] 2.1 实现 Config Manager（`src/config.ts`）
    - 实现 loadConfig()：从 ~/.config/xweb/config.json 加载配置
    - 实现默认配置回退逻辑（文件不存在或 JSON 无效时）
    - 实现 getDefaultConfig() 返回内置默认配置
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x]* 2.2 编写无效 JSON 配置回退属性测试
    - **Property 16: 无效 JSON 配置回退到默认值**
    - **Validates: Requirements 4.3**
  - [x]* 2.3 编写 Config Manager 单元测试
    - 测试配置文件不存在时使用默认配置
    - 测试有效配置文件的加载
    - _Requirements: 4.1, 4.2_

- [x] 3. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 4. 输出格式化模块
  - [x] 4.1 实现 Output Formatter（`src/formatter.ts`）
    - 实现 formatSearchResults()：编号列表格式和 JSON 格式
    - 实现 formatExploreResults()：编号列表格式和 JSON 格式
    - 实现 formatFetchedContent()：Markdown（含 YAML front matter）、text、html、json 格式
    - _Requirements: 8.1, 8.2, 8.3, 1.7, 3.3_
  - [x]* 4.2 编写搜索结果默认格式属性测试
    - **Property 13: 搜索结果默认格式包含所有字段**
    - **Validates: Requirements 8.2**
  - [x]* 4.3 编写 Explore 结果默认格式属性测试
    - **Property 14: Explore 结果默认格式包含所有字段**
    - **Validates: Requirements 8.3**
  - [x]* 4.4 编写 Markdown 输出 YAML Front Matter 属性测试
    - **Property 15: Markdown 输出包含 YAML Front Matter**
    - **Validates: Requirements 8.1**

- [x] 5. HTML 清洗与 Markdown 转换
  - [x] 5.1 实现 HTML Cleaner（`src/html-cleaner.ts`）
    - 实现 Readability 启发式清洗：移除 nav、footer、script、style、iframe 及广告相关元素
    - 实现 CSS 选择器提取逻辑
    - _Requirements: 2.7, 2.6_
  - [x] 5.2 实现 Markdown Converter（`src/markdown-converter.ts`）
    - 实现 HTML 到 Markdown 转换（使用 turndown 或类似库）
    - 实现引用链接收集并置于文档底部
    - 实现图片 alt 文本保留
    - 实现 YAML front matter 生成
    - 实现 HTML 到纯文本转换
    - _Requirements: 2.1, 2.2, 2.8, 2.9, 8.1_
  - [x]* 5.3 编写 HTML 清洗与 Raw 模式对偶性属性测试
    - **Property 5: HTML 清洗与 Raw 模式的对偶性**
    - **Validates: Requirements 2.5, 2.7**
  - [x]* 5.4 编写 Markdown 转换语义保留属性测试
    - **Property 6: Markdown 转换保留语义内容**
    - **Validates: Requirements 2.8, 2.9**
  - [x]* 5.5 编写 CSS 选择器精确提取属性测试
    - **Property 7: CSS 选择器精确提取**
    - **Validates: Requirements 2.6**
  - [x]* 5.6 编写 Text 格式剥离 HTML 标签属性测试
    - **Property 17: Text 格式剥离 HTML 标签**
    - **Validates: Requirements 2.2**
  - [x]* 5.7 编写 JSON 格式输出必需字段属性测试
    - **Property 18: JSON 格式输出包含必需字段**
    - **Validates: Requirements 2.4**

- [x] 6. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [x] 7. 搜索引擎与 Provider
  - [x] 7.1 实现 Provider Registry 和 Search Engine（`src/search.ts`）
    - 实现 Provider 注册和选择逻辑
    - 实现 executeSearch() 核心搜索函数
    - 实现 limit 参数截断逻辑
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  - [x] 7.2 实现 Simple Provider（`src/providers/simple.ts`）
    - 实现模拟浏览器请求的搜索逻辑
    - 实现 HTML 解析提取搜索结果
    - 实现 --deep 模式（多页请求）
    - _Requirements: 1.2, 1.6_
  - [x] 7.3 实现 API Providers 骨架（`src/providers/brave.ts`、`tavily.ts`、`serper.ts`）
    - 实现 SearchProvider 接口
    - 实现 API 调用和响应映射
    - 实现 --deep 模式参数传递
    - _Requirements: 1.1, 1.6_
  - [x]* 7.4 编写 Provider 输出格式一致性属性测试
    - **Property 3: Provider 输出格式一致性**
    - **Validates: Requirements 1.1, 1.2, 1.8**
  - [x]* 7.5 编写 Limit 参数约束属性测试
    - **Property 4: Limit 参数约束结果数量**
    - **Validates: Requirements 1.4**
  - [x]* 7.6 编写错误处理属性测试
    - **Property 11: 无效输入产生描述性错误**
    - **Property 12: HTTP/API 错误映射为统一格式**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

- [x] 8. Fetch 与 Explore 引擎
  - [x] 8.1 实现 Fetch Engine（`src/fetch.ts`）
    - 实现 executeFetch()：HTTP 请求 → 选择器提取 → 清洗 → 格式转换管道
    - 集成 HTML Cleaner 和 Markdown Converter
    - 实现 --raw 模式跳过清洗
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 8.2 实现 Explore Engine（`src/explore.ts`）
    - 实现 executeExplore()：Sitemap 优先 → HTML 链接提取
    - 实现 Sitemap XML 解析
    - 实现内部链接提取和去重规范化
    - _Requirements: 3.1, 3.2, 3.4_
  - [x]* 8.3 编写链接去重规范化幂等性属性测试
    - **Property 8: 链接去重与规范化的幂等性**
    - **Validates: Requirements 3.4**
  - [x]* 8.4 编写 Sitemap XML 解析属性测试
    - **Property 9: Sitemap XML 解析提取所有 URL**
    - **Validates: Requirements 3.2**
  - [x]* 8.5 编写内部链接提取属性测试
    - **Property 10: 内部链接提取完整性**
    - **Validates: Requirements 3.1**

- [x] 9. CLI 入口与命令组装
  - [x] 9.1 实现 CLI 入口（`src/index.ts`）
    - 使用 commander 构建 search、fetch、explore 三个子命令
    - 连接所有模块：Config → Engine → Formatter → stdout
    - 实现全局错误处理（捕获 XwebError 并格式化输出）
    - 实现 --version 和 --help
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x]* 9.2 编写 CLI 单元测试
    - 测试 --version 输出
    - 测试 --help 输出
    - 测试未知命令错误提示
    - _Requirements: 7.2, 7.3, 7.4_

- [x] 10. 最终 Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号以确保可追溯性
- Checkpoint 任务确保增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
