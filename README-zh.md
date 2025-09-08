# Tie CLI（中文）

[![Gemini CLI CI](https://github.com/qiaoliang/tie-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/qiaoliang/tie-cli/actions/workflows/ci.yml)
[![Version](https://img.shields.io/npm/v/@qiaoliang/tie-cli)](https://www.npmjs.com/package/@qiaoliang/tie-cli)
[![License](https://img.shields.io/github/license/google-gemini/gemini-cli)](https://github.com/qiaoliang/tie-cli/blob/main/LICENSE)

![Gemini CLI Screenshot](./docs/assets/gemini-screenshot.png)

Tie CLI 是一个开源的终端 AI Agent，让你在命令行里直接使用强大的 Gemini 能力。它为开发者提供轻量、直接、可扩展的 AI 工作流。

## 🚀 为什么选择 Tie CLI？

- **🎯 免费额度**：个人 Google 账号可用（60 次/分钟，1,000 次/天）
- **🧠 强大的 Gemini 2.5 Pro**：支持 1M Token 超长上下文
- **🔧 内置工具**：Google 搜索增强、文件操作、Shell、Web 获取
- **🔌 可扩展**：支持 MCP（Model Context Protocol）
- **💻 终端优先**：面向热爱命令行的开发者
- **🛡️ 开源**：Apache 2.0 许可

## 📦 安装

### 快速开始

#### 使用 npx 直接运行

```bash
# 无需安装，直接运行
npx https://github.com/google-gemini/tie-cli
```

#### 使用 npm 全局安装

```bash
npm install -g @qiaoliang/tie-cli
```

#### 系统要求

- Node.js 20 或更高版本
- macOS、Linux 或 Windows

## 发布节奏与标签

详见 [Releases](./docs/releases.md)。

### Preview（预览版）

- 每周二 UTC 20:00 发布上周 `preview` 的整合版本（含修复与验证）。使用 `latest` 标签。

```bash
npm install -g @qiaoliang/tie-cli@latest
```

## 📋 关键特性

### 代码理解与生成

- 查询并编辑大型代码库
- 基于 PDF、图片或草图多模态生成应用
- 自然语言调试与故障排查

### 自动化与集成

- 自动化操作任务（如查询 PR、复杂 rebase）
- 使用 MCP Server 扩展能力（如媒体生成：Imagen、Veo、Lyria）
- 非交互模式适合脚本化工作流

### 高级能力

- 借助内置 [Google 搜索增强](https://ai.google.dev/gemini-api/docs/grounding) 获取实时信息
- 会话检查点（Checkpointing），保存与恢复复杂对话
- 自定义上下文文件（TIE.md）

### GitHub 集成

将 Tie CLI 集成到 GitHub 工作流，参见 [GitHub Action（Gemini CLI）](https://github.com/google-github-actions/run-gemini-cli)：

- **PR 审查**：自动代码评审与建议
- **Issue 分流**：基于内容自动打标签与优先级
- **按需助手**：在 Issue 或 PR 中提及 `@gemini-cli` 获取帮助
- **自定义工作流**：构建定制、计划或按需工作流

## 🔐 认证方式

选择最适合你的认证方式：

### 方式 0：TIE 登录（使用你自己的 LLM API Key）

**适用场景**：个人开发者或已经拥有任意 LLM 服务 API Key 的用户。

设置以下环境变量：

```bash
export TIE_API_KEY="sk-xxxxxx"
export TIE_ENDPOINT="https://ai.example.com"
export TIE_MODEL_NAME="Qwen/Qwen3-8B"
tie
```

### 方式 1：OAuth 登录（使用 Google 账号）

**适用场景**：个人开发者或拥有 Gemini Code Assist 许可证的用户（限额见文档）。

**优势**：

- 免费额度：60 次/分钟，1,000 次/天
- Gemini 2.5 Pro，1M Token 上下文
- 无需管理 API Key，浏览器登录即可
- 自动使用最新模型

```bash
tie
# 若使用组织的付费 Code Assist 许可证，请设置 GCP 项目：
export GOOGLE_CLOUD_PROJECT="YOUR_PROJECT_NAME"
tie
```

### 方式 2：Gemini API Key（可选）

**适用场景**：需要精确控制模型或付费配额的开发者。

```bash
export GEMINI_API_KEY="YOUR_API_KEY"  # https://aistudio.google.com/apikey 获取
tie
```

### 方式 3：Vertex AI（可选）

**适用场景**：企业团队与生产环境工作负载。

```bash
export GOOGLE_API_KEY="YOUR_API_KEY"
export GOOGLE_GENAI_USE_VERTEXAI=true
tie
```

更多认证方式详见 [认证指南](./docs/cli/authentication.md)。

## 🚀 快速上手

### 基本用法

#### 在当前目录启动

```bash
tie
```

#### 包含多个目录

```bash
tie --include-directories ../lib,../docs
```

#### 指定模型

```bash
tie -m gemini-2.5-flash
```

#### 非交互脚本模式

```bash
tie -p "请解释该代码库的架构"
```

### 快速示例

#### 开始一个新项目

```bash
cd new-project/
tie
> 请为我编写一个 Discord 机器人，用我稍后提供的 FAQ.md 回答问题
```

#### 分析已有代码

```bash
git clone https://github.com/qiaoliang/tie-cli
cd tie-cli
tie
> 总结一下昨天合并的变更
```

## 📚 文档

### 入门

- [快速开始](./docs/cli/index.md)
- [认证配置](./docs/cli/authentication.md)
- [配置指南](./docs/cli/configuration.md)
- [键盘快捷键](./docs/keyboard-shortcuts.md)

### 核心功能

- [命令参考](./docs/cli/commands.md)（`/help`, `/chat`, `/mcp`, ...）
- [会话检查点](./docs/checkpointing.md)
- [记忆管理（TIE.md）](./docs/tools/memory.md)
- [Token 缓存](./docs/cli/token-caching.md)

### 工具与扩展

- [内置工具总览](./docs/tools/index.md)
  - [文件系统](./docs/tools/file-system.md)
  - [Shell 命令](./docs/tools/shell.md)
  - [Web 获取与搜索](./docs/tools/web-fetch.md)
  - [多文件操作](./docs/tools/multi-file.md)
- [MCP Server 集成](./docs/tools/mcp-server.md)
- [自定义扩展](./docs/extension.md)

### 进阶主题

- [架构总览](./docs/architecture.md)
- [IDE 集成](./docs/ide-integration.md)
- [沙箱与安全](./docs/sandbox.md)
- [企业部署](./docs/deployment.md)
- [遥测与监控](./docs/telemetry.md)
- [Tools API 开发](./docs/core/tools-api.md)

### 配置与自定义

- [设置参考](./docs/cli/configuration.md)
- [主题定制](./docs/cli/themes.md)
- [`.tie` 目录](./docs/gemini-ignore.md)
- [环境变量](./docs/cli/configuration.md#environment-variables)

### 故障排查与支持

- [故障排查指南](./docs/troubleshooting.md)
- [常见问题](./docs/troubleshooting.md#frequently-asked-questions)
- 使用 `/bug` 命令在 CLI 内直接反馈问题

### 使用 MCP Servers

在 `~/.tie/settings.json` 中配置 MCP Servers 来扩展 Tie CLI：

```text
> @github 列出我打开的 Pull Requests
> @slack 向 #dev 频道发送今天提交的摘要
> @database 运行查询以查找非活跃用户
```

详见 [MCP Server 集成指南](./docs/tools/mcp-server.md)。

## 🤝 参与贡献

我们欢迎所有形式的贡献！项目遵循 Apache 2.0 开源协议，欢迎：

- 报告问题与提交建议
- 改进文档
- 提交代码改进
- 分享你的 MCP Servers 与扩展

请参阅 [贡献指南](./CONTRIBUTING.md) 以了解开发环境、代码规范与提交 PR 的流程。

## 📖 资源

- **[NPM 包](https://www.npmjs.com/package/@qiaoliang/tie-cli)**
- **[GitHub Issues](https://github.com/qiaoliang/tie-cli/issues)**
- **[安全公告](https://github.com/qiaoliang/tie-cli/security/advisories)**

### 卸载

参见 [Uninstall 指南](docs/Uninstall.md)。

## 📄 法律

- **许可证**： [Apache License 2.0](LICENSE)
- **服务条款**： [Terms & Privacy](./docs/tos-privacy.md)
- **安全**： [Security Policy](SECURITY.md)


