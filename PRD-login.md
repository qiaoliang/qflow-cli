# QFlow CLI 登录认证优先级改造 PRD

## 项目概述

### 背景

当前 Gemini CLI 的认证流程需要用户手动选择认证方式，我们希望实现自动化的认证优先级检查，当检测到自定义LLM配置时，优先使用自定义Agent，无需用户登录认证。

### 目标

- 实现自动化的认证优先级检查
- 当有 `.env` 文件或环境变量中的 `CUSTOM_LLM_*` 参数时，自动跳过登录认证
- 保持向后兼容，不影响现有功能
- 最小化对原有代码的修改

## 功能需求

### 1. 认证优先级顺序

按以下优先级自动选择认证方式：

1. **自定义LLM** (CUSTOM*LLM*\* 配置完整)
   - 检查环境变量：`CUSTOM_LLM_API_KEY`、`CUSTOM_LLM_ENDPOINT`、`CUSTOM_LLM_MODEL_NAME`
   - 如果配置完整，直接使用自定义Agent，跳过登录认证

2. **Gemini API Key** (GEMINI_API_KEY)
   - 检查环境变量：`GEMINI_API_KEY`
   - 如果存在，使用Gemini API认证

3. **Google Cloud** (GOOGLE_API_KEY 或 GOOGLE_CLOUD_PROJECT + GOOGLE_CLOUD_LOCATION)
   - 检查环境变量：`GOOGLE_API_KEY` 或 `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION`
   - 如果存在，使用Vertex AI认证

4. **Google OAuth** (LOGIN_WITH_GOOGLE)
   - 默认OAuth登录方式

5. **Cloud Shell** (CLOUD_SHELL=true)
   - 特殊环境下的认证方式

### 2. 自动认证检查

- 在APP启动时自动检查环境变量
- 如果检测到自定义LLM配置，直接使用，不显示认证对话框
- 如果自定义LLM配置不完整，自动尝试下一个优先级
- 只有在所有认证方式都不可用时才显示认证对话框

### 3. 优雅降级

- 自定义LLM配置不完整时，自动尝试其他认证方式
- 自定义LLM调用失败时，自动回退到Gemini
- 提供清晰的日志信息，说明当前使用的认证方式

## 启动并登录流程

### 整体流程图

```mermaid
flowchart TD
    A[APP启动] --> B[加载环境变量]
    B --> C[检查CUSTOM_LLM配置]
    C --> D{自定义LLM配置完整?}

    D -->|是| E[使用自定义LLM Agent]
    E --> F[跳过登录认证]
    F --> G[直接进入主界面]

    D -->|否| H[检查GEMINI_API_KEY]
    H --> I{GEMINI_API_KEY存在?}

    I -->|是| J[使用Gemini API认证]
    J --> K[跳过登录认证]
    K --> G

    I -->|否| L[检查Google Cloud配置]
    L --> M{Google Cloud配置完整?}

    M -->|是| N[使用Vertex AI认证]
    N --> O[跳过登录认证]
    O --> G

    M -->|否| P[检查Google OAuth]
    P --> Q{需要OAuth认证?}

    Q -->|是| R[显示认证对话框]
    R --> S[用户选择认证方式]
    S --> T[执行OAuth流程]
    T --> U[认证成功]
    U --> G

    Q -->|否| V[检查Cloud Shell]
    V --> W{Cloud Shell环境?}

    W -->|是| X[使用Cloud Shell认证]
    W -->|否| Y[显示错误信息]
    Y --> Z[退出程序]

    X --> G
    U --> G
```

### 详细认证检查流程

```mermaid
flowchart TD
    A[开始认证检查] --> B[getAuthTypeFromEnv函数]

    B --> C[检查CUSTOM_LLM_API_KEY]
    C --> D[检查CUSTOM_LLM_ENDPOINT]
    D --> E[检查CUSTOM_LLM_MODEL_NAME]
    E --> F{三个变量都存在?}

    F -->|是| G[返回AuthType.CUSTOM_LLM]
    F -->|否| H[检查GEMINI_API_KEY]

    H --> I{GEMINI_API_KEY存在?}
    I -->|是| J[返回AuthType.USE_GEMINI]
    I -->|否| K[检查GOOGLE_GENAI_USE_VERTEXAI]

    K --> L{GOOGLE_GENAI_USE_VERTEXAI=true?}
    L -->|是| M[返回AuthType.USE_VERTEX_AI]
    L -->|否| N[检查GOOGLE_GENAI_USE_GCA]

    N --> O{GOOGLE_GENAI_USE_GCA=true?}
    O -->|是| P[返回AuthType.LOGIN_WITH_GOOGLE]
    O -->|否| Q[返回undefined]

    G --> R[validateAuthMethod验证]
    J --> R
    M --> R
    P --> R
    Q --> S[显示认证对话框]

    R --> T{验证通过?}
    T -->|是| U[创建ContentGenerator]
    T -->|否| V[显示错误信息]

    U --> W[认证完成]
    V --> S
    S --> X[用户手动选择认证]
    X --> U
```

### 自定义LLM认证流程

```mermaid
flowchart TD
    A[检测到CUSTOM_LLM配置] --> B[validateCustomLlmConfig验证]
    B --> C{配置验证通过?}

    C -->|否| D[显示配置错误信息]
    D --> E[尝试下一个认证方式]

    C -->|是| F[loadCustomLlmConfig加载配置]
    F --> G[创建OpenAIContentGenerator]
    G --> H[创建Gemini ContentGenerator作为回退]
    H --> I[创建CustomLLMAgent装饰器]
    I --> J[返回CustomLLMAgent实例]

    J --> K[开始使用自定义LLM]
    K --> L{LLM调用成功?}

    L -->|是| M[继续使用自定义LLM]
    L -->|否| N[记录警告日志]
    N --> O[自动回退到Gemini]
    O --> P[继续使用Gemini]

    M --> Q[认证流程完成]
    P --> Q
```

### 错误处理和降级流程

```mermaid
flowchart TD
    A[认证过程中出现错误] --> B{错误类型判断}

    B -->|配置错误| C[显示具体配置错误信息]
    C --> D[提供修复建议]
    D --> E[尝试下一个认证方式]

    B -->|网络错误| F[记录网络错误日志]
    F --> G[等待重试]
    G --> H{重试次数<最大重试次数?}

    H -->|是| I[重新尝试当前认证方式]
    H -->|否| J[尝试下一个认证方式]

    B -->|认证失败| K[记录认证失败日志]
    K --> L[尝试下一个认证方式]

    B -->|LLM调用失败| M[记录LLM调用失败日志]
    M --> N[自动回退到Gemini]
    N --> O[继续正常使用]

    E --> P{还有其他认证方式?}
    J --> P
    L --> P

    P -->|是| Q[尝试下一个认证方式]
    P -->|否| R[显示所有认证方式都不可用]
    R --> S[提供配置指导]
    S --> T[退出程序]

    Q --> U[继续认证流程]
    O --> V[认证成功]
    U --> V
```

## 技术方案

### 架构设计

采用**优先级检查 + 最小化修改**的策略：

1. **优先级检查**：在现有认证流程前添加自定义LLM检查
2. **最小化修改**：只修改认证相关的核心文件
3. **保持向后兼容**：不影响现有代码逻辑和功能
4. **优雅降级**：自定义LLM失败时自动回退到Gemini

### 核心修改文件

```text
packages/core/src/core/
├── contentGenerator.ts          # 添加 CUSTOM_LLM AuthType
├── customLlmAuth.ts            # 自定义LLM认证配置 ✅
├── customLlmAgent.ts           # 自定义LLM代理类 ✅
└── openaiContentGenerator.ts   # OpenAI兼容的ContentGenerator ✅

packages/cli/src/
├── config/auth.ts              # 添加自定义LLM认证验证
├── validateNonInterActiveAuth.ts # 添加自定义LLM优先级检查
└── ui/hooks/useAuthCommand.ts  # 修改认证流程逻辑
```

### 实现步骤

#### 步骤1：添加CUSTOM_LLM认证类型

在 `packages/core/src/core/contentGenerator.ts` 中添加：

```typescript
export enum AuthType {
  LOGIN_WITH_GOOGLE = 'oauth-personal',
  USE_GEMINI = 'gemini-api-key',
  USE_VERTEX_AI = 'vertex-ai',
  CLOUD_SHELL = 'cloud-shell',
  CUSTOM_LLM = 'custom-llm', // 新增
}
```

#### 步骤2：修改认证优先级检查

在 `packages/cli/src/validateNonInterActiveAuth.ts` 中修改 `getAuthTypeFromEnv()` 函数：

```typescript
function getAuthTypeFromEnv(): AuthType | undefined {
  // 1. 优先检查自定义LLM配置
  if (
    process.env['CUSTOM_LLM_API_KEY'] &&
    process.env['CUSTOM_LLM_ENDPOINT'] &&
    process.env['CUSTOM_LLM_MODEL_NAME']
  ) {
    return AuthType.CUSTOM_LLM;
  }

  // 2. 检查Gemini API Key
  if (process.env['GEMINI_API_KEY']) {
    return AuthType.USE_GEMINI;
  }

  // 3. 检查Google Cloud配置
  if (process.env['GOOGLE_GENAI_USE_VERTEXAI'] === 'true') {
    return AuthType.USE_VERTEX_AI;
  }

  // 4. 检查Google OAuth
  if (process.env['GOOGLE_GENAI_USE_GCA'] === 'true') {
    return AuthType.LOGIN_WITH_GOOGLE;
  }

  return undefined;
}
```

#### 步骤3：添加自定义LLM认证验证

在 `packages/cli/src/config/auth.ts` 中添加：

```typescript
export function validateAuthMethod(authMethod: string): string | null {
  loadEnvironment(loadSettings().merged);

  // 添加自定义LLM验证
  if (authMethod === AuthType.CUSTOM_LLM) {
    const { validateCustomLlmConfig } = await import('@google/gemini-cli-core');
    const validation = validateCustomLlmConfig();
    if (!validation.isValid) {
      return validation.errors.join('\n');
    }
    return null;
  }

  // ... 现有验证逻辑
}
```

#### 步骤4：修改ContentGenerator创建逻辑

在 `packages/core/src/core/contentGenerator.ts` 中修改 `createContentGeneratorConfig()` 函数：

```typescript
export function createContentGeneratorConfig(
  config: Config,
  authType: AuthType | undefined,
): ContentGeneratorConfig {
  // ... 现有逻辑

  // 添加自定义LLM配置
  if (authType === AuthType.CUSTOM_LLM) {
    const { loadCustomLlmConfig } = await import('./customLlmAuth.js');
    const customConfig = loadCustomLlmConfig();
    if (customConfig) {
      contentGeneratorConfig.model = customConfig.modelName;
      contentGeneratorConfig.customLlmConfig = customConfig;
    }
    return contentGeneratorConfig;
  }

  // ... 现有逻辑
}
```

#### 步骤5：修改ContentGenerator创建逻辑

在 `packages/core/src/core/contentGenerator.ts` 中修改 `createContentGenerator()` 函数：

```typescript
export async function createContentGenerator(
  config: ContentGeneratorConfig,
  gcConfig: Config,
  sessionId?: string,
): Promise<ContentGenerator> {
  // 如果配置了自定义LLM，创建CustomLLMAgent
  if (config.authType === AuthType.CUSTOM_LLM && config.customLlmConfig) {
    const { CustomLLMAgent } = await import('./customLlmAgent.js');
    const { OpenAIContentGenerator } = await import(
      './openaiContentGenerator.js'
    );

    // 创建Gemini ContentGenerator作为回退
    const geminiGenerator = await createGeminiContentGenerator(
      config,
      gcConfig,
      sessionId,
    );

    // 创建自定义LLM ContentGenerator
    const customGenerator = new OpenAIContentGenerator(config.customLlmConfig);

    // 返回装饰器模式的CustomLLMAgent
    return new CustomLLMAgent(geminiGenerator, customGenerator);
  }

  // ... 现有逻辑
}
```

### 配置示例

#### .env 文件配置

```bash
# 自定义LLM配置（优先级最高）
CUSTOM_LLM_API_KEY=sk-xxx
CUSTOM_LLM_ENDPOINT=https://apis.iflow.cn/v1
CUSTOM_LLM_MODEL_NAME=deepseek-v3.1
CUSTOM_LLM_TEMPERATURE=0.7
CUSTOM_LLM_MAX_TOKENS=4096

# 其他认证方式（作为回退）
GEMINI_API_KEY=your-gemini-key
GOOGLE_API_KEY=your-google-key
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_CLOUD_LOCATION=us-central1
```

#### 环境变量配置

```bash
export CUSTOM_LLM_API_KEY="sk-xxx"
export CUSTOM_LLM_ENDPOINT="https://apis.iflow.cn/v1"
export CUSTOM_LLM_MODEL_NAME="deepseek-v3.1"
```

## 测试方案

### 1. 单元测试

- 测试认证优先级检查逻辑
- 测试自定义LLM配置验证
- 测试优雅降级机制

### 2. 集成测试

- 测试完整的认证流程
- 测试自定义LLM调用和回退
- 测试不同环境变量组合

### 3. 用户测试

- 测试不同认证方式的切换
- 测试配置错误时的错误处理
- 测试用户体验的流畅性

## 风险评估

### 1. 技术风险

- **低风险**：修改量小，主要是添加新的认证类型和优先级检查
- **向后兼容**：不影响现有功能，只是添加新的认证方式

### 2. 用户体验风险

- **低风险**：用户体验更好，自动选择认证方式
- **降级机制**：即使自定义LLM失败，也能回退到Gemini

### 3. 维护风险

- **低风险**：代码结构清晰，易于维护
- **文档完善**：提供详细的配置说明和错误处理

## 实施计划

### 阶段1：核心功能开发（1-2天）

1. 添加CUSTOM_LLM认证类型
2. 修改认证优先级检查逻辑
3. 添加自定义LLM认证验证

### 阶段2：集成测试（1天）

1. 测试认证流程
2. 测试优雅降级
3. 修复发现的问题

### 阶段3：文档和优化（0.5天）

1. 更新文档
2. 优化用户体验
3. 代码审查

## 总结

这个方案通过最小化的代码修改，实现了自动化的认证优先级检查，当检测到自定义LLM配置时自动跳过登录认证，同时保持了向后兼容性和优雅降级机制。用户只需要配置环境变量，就能自动使用自定义Agent，大大提升了用户体验。

## 详细实现分析

### 当前认证流程分析

基于代码分析，当前的认证流程如下：

1. **启动时检查**：在 `packages/cli/src/gemini.tsx` 的 `main()` 函数中
2. **认证类型检测**：通过 `validateNonInterActiveAuth.ts` 中的 `getAuthTypeFromEnv()` 函数
3. **认证验证**：通过 `config/auth.ts` 中的 `validateAuthMethod()` 函数
4. **UI认证流程**：通过 `ui/hooks/useAuthCommand.ts` 处理交互式认证

### 关键修改点

#### 1. 认证优先级检查逻辑

当前 `getAuthTypeFromEnv()` 函数的检查顺序：

1. GOOGLE_GENAI_USE_GCA → LOGIN_WITH_GOOGLE
2. GOOGLE_GENAI_USE_VERTEXAI → USE_VERTEX_AI
3. GEMINI_API_KEY → USE_GEMINI

需要修改为：

1. CUSTOM*LLM*\* → CUSTOM_LLM (新增，最高优先级)
2. GEMINI_API_KEY → USE_GEMINI
3. GOOGLE_GENAI_USE_VERTEXAI → USE_VERTEX_AI
4. GOOGLE_GENAI_USE_GCA → LOGIN_WITH_GOOGLE

#### 2. 认证验证逻辑

需要在 `validateAuthMethod()` 中添加对 `CUSTOM_LLM` 类型的验证，调用现有的 `validateCustomLlmConfig()` 函数。

#### 3. ContentGenerator配置

需要在 `ContentGeneratorConfig` 类型中添加 `customLlmConfig` 字段，并在 `createContentGeneratorConfig()` 中处理自定义LLM配置。

#### 4. ContentGenerator创建

需要在 `createContentGenerator()` 中检测到 `CUSTOM_LLM` 类型时，创建 `CustomLLMAgent` 实例，使用装饰器模式包装现有的Gemini ContentGenerator。

### 最小化修改策略

1. **只修改必要的文件**：认证相关的核心文件
2. **保持现有接口不变**：不改变现有的函数签名和接口
3. **向后兼容**：现有功能完全不受影响
4. **优雅降级**：自定义LLM失败时自动回退到Gemini

这种设计确保了：

- 对现有代码的影响最小
- 后续升级时不会影响我们的修改
- 用户体验得到显著提升
- 代码维护成本最低
