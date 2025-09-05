# QFlow CLI 登录认证优先级改造 - 实现任务清单

## 项目概述

基于 PRD-login.md 的需求，实现自动化的认证优先级检查，当检测到自定义LLM配置时，优先使用自定义Agent，无需用户登录认证。

## 总体目标

- ✅ 实现自动化的认证优先级检查
- ✅ 当有 `.env` 文件或环境变量中的 `CUSTOM_LLM_*` 参数时，自动跳过登录认证
- ✅ 保持向后兼容，不影响现有功能
- ✅ 最小化对原有代码的修改

## 实施阶段

### 阶段1：核心功能开发（1-2天）

#### 1.1 添加CUSTOM_LLM认证类型

**任务描述**：在核心模块中添加新的认证类型

**文件**：`packages/core/src/core/contentGenerator.ts`

**具体任务**：

- [ ] 在 `AuthType` 枚举中添加 `CUSTOM_LLM = 'custom-llm'`
- [ ] 在 `ContentGeneratorConfig` 类型中添加 `customLlmConfig?: CustomLlmConfig` 字段
- [ ] 更新相关的类型定义和接口

**验收标准**：

- [ ] AuthType 枚举包含 CUSTOM_LLM 类型
- [ ] ContentGeneratorConfig 支持 customLlmConfig 字段
- [ ] 类型定义完整且正确

**预估时间**：0.5天

#### 1.2 修改认证优先级检查逻辑

**任务描述**：修改环境变量检查顺序，优先检查自定义LLM配置

**文件**：`packages/cli/src/validateNonInterActiveAuth.ts`

**具体任务**：

- [ ] 修改 `getAuthTypeFromEnv()` 函数
- [ ] 添加自定义LLM配置检查（CUSTOM_LLM_API_KEY、CUSTOM_LLM_ENDPOINT、CUSTOM_LLM_MODEL_NAME）
- [ ] 调整检查优先级：CUSTOM_LLM → GEMINI_API_KEY → GOOGLE_GENAI_USE_VERTEXAI → GOOGLE_GENAI_USE_GCA
- [ ] 添加相应的注释和文档

**验收标准**：

- [ ] 自定义LLM配置检查优先级最高
- [ ] 其他认证方式按正确顺序检查
- [ ] 代码逻辑清晰，注释完整

**预估时间**：0.5天

#### 1.3 添加自定义LLM认证验证

**任务描述**：在认证验证逻辑中添加自定义LLM支持

**文件**：`packages/cli/src/config/auth.ts`

**具体任务**：

- [ ] 在 `validateAuthMethod()` 函数中添加 CUSTOM_LLM 验证分支
- [ ] 调用现有的 `validateCustomLlmConfig()` 函数进行配置验证
- [ ] 处理验证错误，返回清晰的错误信息
- [ ] 确保异步导入正确

**验收标准**：

- [ ] CUSTOM_LLM 认证类型能够正确验证
- [ ] 配置错误时返回清晰的错误信息
- [ ] 异步导入正常工作

**预估时间**：0.5天

#### 1.4 修改ContentGenerator配置逻辑

**任务描述**：在ContentGenerator配置中添加自定义LLM支持

**文件**：`packages/core/src/core/contentGenerator.ts`

**具体任务**：

- [ ] 修改 `createContentGeneratorConfig()` 函数
- [ ] 添加 CUSTOM_LLM 分支处理
- [ ] 调用 `loadCustomLlmConfig()` 加载自定义配置
- [ ] 设置正确的模型名称和配置

**验收标准**：

- [ ] CUSTOM_LLM 类型能够正确创建配置
- [ ] 自定义配置正确加载和应用
- [ ] 配置结构完整

**预估时间**：0.5天

#### 1.5 修改ContentGenerator创建逻辑

**任务描述**：在ContentGenerator创建时支持自定义LLM

**文件**：`packages/core/src/core/contentGenerator.ts`

**具体任务**：

- [ ] 修改 `createContentGenerator()` 函数
- [ ] 添加 CUSTOM_LLM 分支处理
- [ ] 创建 CustomLLMAgent 装饰器实例
- [ ] 创建 OpenAIContentGenerator 实例
- [ ] 创建 Gemini ContentGenerator 作为回退
- [ ] 确保异步导入正确

**验收标准**：

- [ ] CUSTOM_LLM 类型能够正确创建 ContentGenerator
- [ ] 装饰器模式正确实现
- [ ] 回退机制正常工作

**预估时间**：1天

### 阶段2：集成测试（1天）

#### 2.1 单元测试

**任务描述**：为新增功能编写单元测试

**文件**：

- `packages/core/src/core/contentGenerator.test.ts`
- `packages/cli/src/validateNonInterActiveAuth.test.ts`
- `packages/cli/src/config/auth.test.ts`

**具体任务**：

- [ ] 测试 AuthType.CUSTOM_LLM 枚举值
- [ ] 测试 getAuthTypeFromEnv() 函数的优先级检查
- [ ] 测试 validateAuthMethod() 对 CUSTOM_LLM 的验证
- [ ] 测试 createContentGeneratorConfig() 的 CUSTOM_LLM 分支
- [ ] 测试 createContentGenerator() 的 CUSTOM_LLM 分支
- [ ] 测试各种错误情况的处理

**验收标准**：

- [ ] 所有新增功能都有对应的测试用例
- [ ] 测试覆盖率达到90%以上
- [ ] 测试用例覆盖正常和异常情况

**预估时间**：0.5天

#### 2.2 集成测试

**任务描述**：测试完整的认证流程

**文件**：`integration-tests/`

**具体任务**：

- [ ] 测试自定义LLM配置完整时的认证流程
- [ ] 测试自定义LLM配置不完整时的降级流程
- [ ] 测试自定义LLM调用失败时的回退机制
- [ ] 测试不同环境变量组合的认证优先级
- [ ] 测试与现有认证方式的兼容性

**验收标准**：

- [ ] 自定义LLM认证流程正常工作
- [ ] 降级机制正确工作
- [ ] 回退机制正确工作
- [ ] 与现有功能完全兼容

**预估时间**：0.5天

### 阶段3：文档和优化（0.5天）

#### 3.1 更新文档

**任务描述**：更新相关文档

**文件**：

- `docs/cli/authentication.md`
- `README.md`
- `PRD-login.md`

**具体任务**：

- [ ] 更新认证文档，添加自定义LLM说明
- [ ] 更新README，添加自定义LLM配置示例
- [ ] 完善PRD-login.md的技术细节
- [ ] 添加配置示例和故障排除指南

**验收标准**：

- [ ] 文档内容准确完整
- [ ] 配置示例可执行
- [ ] 故障排除指南实用

**预估时间**：0.25天

#### 3.2 优化用户体验

**任务描述**：优化用户界面和错误提示

**文件**：

- `packages/cli/src/ui/hooks/useAuthCommand.ts`
- `packages/cli/src/ui/components/AuthDialog.tsx`

**具体任务**：

- [ ] 优化认证成功/失败的用户提示
- [ ] 添加自定义LLM配置状态的显示
- [ ] 优化错误信息的显示格式
- [ ] 添加配置验证的实时反馈

**验收标准**：

- [ ] 用户提示清晰友好
- [ ] 错误信息准确有用
- [ ] 界面交互流畅

**预估时间**：0.25天

## 详细任务分解

### 核心文件修改清单

#### packages/core/src/core/contentGenerator.ts

- [ ] 添加 `CUSTOM_LLM = 'custom-llm'` 到 AuthType 枚举
- [ ] 在 ContentGeneratorConfig 中添加 `customLlmConfig?: CustomLlmConfig`
- [ ] 修改 `createContentGeneratorConfig()` 函数添加 CUSTOM_LLM 分支
- [ ] 修改 `createContentGenerator()` 函数添加 CUSTOM_LLM 分支

#### packages/cli/src/validateNonInterActiveAuth.ts

- [ ] 修改 `getAuthTypeFromEnv()` 函数添加自定义LLM检查
- [ ] 调整认证优先级顺序
- [ ] 添加相应的注释和文档

#### packages/cli/src/config/auth.ts

- [ ] 在 `validateAuthMethod()` 中添加 CUSTOM_LLM 验证分支
- [ ] 调用 `validateCustomLlmConfig()` 进行配置验证
- [ ] 处理验证错误和错误信息

### 测试文件清单

#### 单元测试

- [ ] `packages/core/src/core/contentGenerator.test.ts` - 测试枚举和配置
- [ ] `packages/cli/src/validateNonInterActiveAuth.test.ts` - 测试优先级检查
- [ ] `packages/cli/src/config/auth.test.ts` - 测试认证验证

#### 集成测试

- [ ] `integration-tests/custom-llm-auth.test.ts` - 测试完整认证流程
- [ ] `integration-tests/auth-priority.test.ts` - 测试认证优先级
- [ ] `integration-tests/fallback-mechanism.test.ts` - 测试回退机制

### 配置示例

#### .env 文件示例

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

#### 环境变量示例

```bash
export CUSTOM_LLM_API_KEY="sk-xxx"
export CUSTOM_LLM_ENDPOINT="https://apis.iflow.cn/v1"
export CUSTOM_LLM_MODEL_NAME="deepseek-v3.1"
```

## 风险评估和缓解措施

### 技术风险

- **风险**：异步导入可能导致运行时错误
- **缓解**：充分测试异步导入，添加错误处理

### 兼容性风险

- **风险**：修改现有认证流程可能影响现有功能
- **缓解**：保持现有接口不变，只添加新功能

### 用户体验风险

- **风险**：配置错误时用户可能不知道如何修复
- **缓解**：提供清晰的错误信息和配置指导

## 验收标准

### 功能验收

- [ ] 自定义LLM配置完整时，自动跳过登录认证
- [ ] 自定义LLM配置不完整时，自动尝试其他认证方式
- [ ] 自定义LLM调用失败时，自动回退到Gemini
- [ ] 所有现有认证方式继续正常工作

### 性能验收

- [ ] 认证检查时间不超过现有流程的110%
- [ ] 自定义LLM调用失败时的回退时间不超过5秒
- [ ] 内存使用量不超过现有流程的105%

### 兼容性验收

- [ ] 现有功能完全不受影响
- [ ] 现有配置继续正常工作
- [ ] 升级后无需用户重新配置

## 时间安排

| 阶段     | 任务                         | 预估时间  | 实际时间 | 状态 |
| -------- | ---------------------------- | --------- | -------- | ---- |
| 1.1      | 添加CUSTOM_LLM认证类型       | 0.5天     | 0.5天    | ✅   |
| 1.2      | 修改认证优先级检查逻辑       | 0.5天     | 0.5天    | ✅   |
| 1.3      | 添加自定义LLM认证验证        | 0.5天     | 0.5天    | ✅   |
| 1.4      | 修改ContentGenerator配置逻辑 | 0.5天     | 0.5天    | ✅   |
| 1.5      | 修改ContentGenerator创建逻辑 | 1天       | 1天      | ✅   |
| 2.1      | 单元测试                     | 0.5天     |          | ⏳   |
| 2.2      | 集成测试                     | 0.5天     |          | ⏳   |
| 3.1      | 更新文档                     | 0.25天    |          | ⏳   |
| 3.2      | 优化用户体验                 | 0.25天    | 0.25天   | ✅   |
| **总计** |                              | **4.5天** |          |      |

## 注意事项

1. **最小化修改**：只修改必要的文件，保持现有接口不变
2. **向后兼容**：确保现有功能完全不受影响
3. **错误处理**：为所有新增功能添加完善的错误处理
4. **测试覆盖**：确保所有新增功能都有对应的测试用例
5. **文档更新**：及时更新相关文档和配置示例

## 完成标志

- [ ] 所有任务清单中的项目都已完成
- [ ] 所有测试用例都通过
- [ ] 文档已更新完成
- [ ] 代码审查通过
- [ ] 用户验收测试通过

---

**创建时间**：2024年12月19日
**最后更新**：2024年12月19日
**负责人**：开发团队
**状态**：待开始
