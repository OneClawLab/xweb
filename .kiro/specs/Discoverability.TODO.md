# xweb 可发现性整改清单

基于 ProgressiveDiscovery.md 规范逐项检查。

## 高优先级 (MUST 违规)

### 1. 缺少 `--help --verbose` 支持
- 规范要求: MUST 支持 `--help --verbose` 输出当前命令层级的完整信息
- 现状: 使用 commander 默认 --help，不支持 --verbose
- 影响: 所有层级（xweb, xweb search, xweb fetch, xweb explore）
- 整改: 自定义 help 处理逻辑

### 2. USAGE 缺少 examples
- 规范要求: MUST 有 examples
- 现状: `--help` 输出中没有 examples（USAGE.md 中已有完整 examples）
- 影响: 所有子命令
- 整改: 在各子命令的 help text 中添加 examples

### 3. 退出码不符合规范
- 规范要求: MUST 遵循 0=成功, 1=一般错误, 2=参数/用法错误
- 现状: 所有错误统一 `process.exit(1)`，未区分参数错误和运行时错误
- 整改: XwebError 体系中区分参数错误（退出码 2）和运行时错误（退出码 1）

### 4. 自动 --help 时退出码应为 2
- 规范要求: 因参数错误触发自动 --help 时退出码 MUST 为 2
- 现状: `xweb` 无参数时显示 help 但退出码为 1（应为 0）。`xweb search`（缺少 query）退出码为 1（应为 2）
- 整改: 无参数显示 help 时退出码为 0；参数错误时退出码为 2
- 注意: xweb 已配置 `.showHelpAfterError(true)`，这点做得好

### 5. 环境与前置依赖未在 --help 中说明
- 规范要求: 如果依赖外部服务，MUST 在 USAGE 中说明
- 现状: USAGE.md 中已详细说明 provider 配置和 fallback 行为，但 --help 中没有提及
- 整改: 在 --help 中简要提示，并引用 USAGE.md 获取详情

### 6. 机器可读输出说明不足
- 规范要求: 如果支持 --json，MUST 在 USAGE 中说明
- 现状: USAGE.md 中已详细说明各命令的 JSON 输出结构，但 --help 中没有
- 整改: 在 --help 中简要提示 JSON 输出格式，或引用 USAGE.md

### 7. 配置文件路径未在 --help 中提及
- 规范要求: 如果有配置数据，SHOULD 告诉使用者在哪里
- 现状: USAGE.md 中已说明配置文件路径 `~/.config/xweb/config.json`，但 --help 中没有
- 整改: 在主命令 help 中注明配置文件路径

### 8. 子命令规范 — 每个子命令的 USAGE
- 规范要求: 每个子命令 MUST 有独立的 USAGE，遵循相同规范
- 现状: 子命令有基本 help（commander 自动生成），但缺少 examples 和详细说明
- 整改: 为 search / fetch / explore 各自添加 examples 和输出格式说明

## 中优先级 (SHOULD 违规)

### 9. 错误输出缺少修复建议
- 规范要求: 错误信息 SHOULD 包含"什么错了"+"怎么修"
- 现状: 错误格式为 `Error [CODE]: message`，大部分没有修复建议
- 示例: ProviderError 应补充 "Check your API key in ~/.config/xweb/config.json"
- 整改: 审查所有 XwebError 子类，补充修复建议

### 10. --json 模式下错误未以 JSON 输出
- 规范要求: `--json` 模式下错误 MUST 也以 JSON 格式输出
- 现状: 错误始终是纯文本到 stderr
- 整改: 全局错误处理中检测 --json 模式，是则输出 JSON 格式错误

### ~~11. 缺少 USAGE.md~~ ✅ 已完成
- USAGE.md 已创建，覆盖所有子命令的用法、选项、输出格式、配置、退出码

### 12. 退出码在 --help 中未说明
- 规范要求: 自定义退出码 MUST 在 USAGE 或文档中说明
- 现状: USAGE.md 中已有退出码表，但 --help 中仍未列出
- 整改: 在 --help --verbose 中包含退出码，或在 --help 末尾引用 USAGE.md

### 13. --version 输出过于简单
- 现状: 只输出 `1.0.0`，且硬编码在代码中（`program.version('1.0.0')`）
- 整改: 从 package.json 读取，输出格式改为 `xweb 1.0.0`

## 低优先级 (MAY / 建议)

### 14. examples 格式统一
- 规范要求: SHOULD 使用 `$` 前缀并附带注释
- 整改: 随高优先级 #2 一起处理

### 15. fetch 的 --format 选项值未在 help 中完整列出
- 现状: help 显示 `--format <type>  输出格式: markdown|text|html|json`，这个做得可以
- 无需整改，但 examples 中应覆盖不同 format 的用法

### 16. explore 功能较简单，但仍应有 examples
- 整改: 随高优先级 #2 一起处理

### 17. 命令描述语言混用
- 现状: 主命令描述用中文（"AI Agent 互联网访问 CLI 工具"），子命令也用中文，但 commander 自带文本是英文（"display help for command"）
- 建议: 统一语言风格，或者接受混用（中文描述 + 英文框架文本）
