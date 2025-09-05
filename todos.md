# QFlow CLI 自定义LLM支持改造 - 任务清单

## 项目概览

基于PRD文档，将Gemini CLI改造为支持自定义LLM API，特别是OpenAI兼容接口。
采用**装饰器模式 + 最小化修改**策略，只修改一个核心文件。

## 阶段1：核心模块开发 ✅

### 1.1 创建自定义LLM认证配置模块

- [✅] **创建文件**: `packages/core/src/core/customLlmAuth.ts`
- [✅] 定义 `CustomLlmConfig` 接口
- [✅] 实现 `loadCustomLlmConfig()` 函数
  - [✅] 从环境变量加载配置
  - [✅] 验证必需字段（API_KEY, ENDPOINT, MODEL_NAME）
  - [✅] 设置默认值（temperature, maxTokens, topP）
- [✅] 实现 `shouldUseCustomLlm()` 函数
- [✅] 添加JSDoc注释
- [✅] 编写单元测试
  - [✅] 测试完整配置加载
  - [✅] 测试缺失配置情况
  - [✅] 测试默认值设置

### 1.2 创建OpenAI兼容ContentGenerator

- [✅] **创建文件**: `packages/core/src/core/openaiContentGenerator.ts`
- [✅] 实现 `OpenAIContentGenerator` 类
  - [✅] 实现 `generateContent()` 方法
    - [✅] 转换Gemini格式到OpenAI格式
    - [✅] 调用OpenAI API
    - [✅] 转换响应格式
  - [✅] 实现 `generateContentStream()` 方法
    - [✅] 处理流式响应
    - [✅] 转换流式数据格式
  - [✅] 实现 `countTokens()` 方法
  - [✅] 实现 `embedContent()` 方法（抛出不支持错误）
- [✅] 添加错误处理
  - [✅] API调用错误处理
  - [✅] 网络错误处理
  - [✅] 格式转换错误处理
- [✅] 添加重试逻辑
- [✅] 编写单元测试
  - [✅] 测试API调用
  - [✅] 测试格式转换
  - [✅] 测试错误处理
  - [✅] 测试流式响应
- [✅] 修复测试问题
  - [✅] 修复响应格式不匹配问题
  - [✅] 修复系统指令处理问题
  - [✅] 修复流式响应接口问题

## 阶段2：代理层开发 ✅

### 2.1 创建自定义LLM代理（装饰器模式）

- [✅] **创建文件**: `packages/core/src/core/customLlmAgent.ts`
- [✅] 实现 `CustomLLMAgent` 类
  - [✅] 实现构造函数，接收Gemini和自定义LLM ContentGenerator
    - [✅] `constructor(geminiGenerator: ContentGenerator, customGenerator?: ContentGenerator)`
  - [✅] 实现 `generateContent()` 方法
    - [✅] 优先尝试自定义LLM
    - [✅] 失败时回退到Gemini
    - [✅] 保持响应格式一致
    - [✅] 类型签名：`async generateContent(request: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>`
  - [✅] 实现 `generateContentStream()` 方法
    - [✅] 优先尝试自定义LLM流式响应
    - [✅] 失败时回退到Gemini流式响应
    - [✅] 类型签名：`async generateContentStream(request: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>`
  - [✅] 实现 `countTokens()` 方法
    - [✅] 优先使用自定义LLM
    - [✅] 失败时回退到Gemini
    - [✅] 类型签名：`async countTokens(request: CountTokensParameters): Promise<CountTokensResponse>`
  - [✅] 实现 `embedContent()` 方法
    - [✅] 优先使用自定义LLM
    - [✅] 失败时回退到Gemini
    - [✅] 类型签名：`async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>`
- [✅] 实现 `tryCustomLlm()` 私有方法
  - [✅] 统一的错误处理和回退逻辑
  - [✅] 详细的错误日志记录
  - [✅] 类型签名：`private async tryCustomLlm<T>(operation: () => Promise<T>): Promise<T>`
  - [✅] 处理自定义LLM不可用的情况
  - [✅] 实现优雅降级到Gemini
- [✅] 编写单元测试
  - [✅] 测试自定义LLM优先使用
  - [✅] 测试优雅降级机制
  - [✅] 测试所有接口方法
  - [✅] 测试错误处理
  - [✅] 测试tryCustomLlm方法
  - [✅] 测试构造函数参数处理
  - [✅] 测试流式响应降级
  - [✅] 测试token计算降级
  - [✅] 测试嵌入功能降级

## 阶段3：集成修改 🔄

### 3.1 修改ContentGenerator核心文件（最小化修改）

- [ ] **修改文件**: `packages/core/src/core/contentGenerator.ts`
- [ ] 添加导入语句（3行）
  - [ ] 导入 `CustomLLMAgent`
  - [ ] 导入 `shouldUseCustomLlm`
  - [ ] 导入 `loadCustomLlmConfig`
  - [ ] 导入 `OpenAIContentGenerator`
- [ ] 修改 `createContentGenerator()` 函数（10行）
  - [ ] 创建原有的ContentGenerator
  - [ ] 检查是否使用自定义LLM
  - [ ] 如果配置了自定义LLM，创建CustomLLMAgent包装
  - [ ] 返回包装后的ContentGenerator
  - [ ] 实现代码示例：

    ```typescript
    // 创建原有的ContentGenerator
    const originalGenerator = await createOriginalContentGenerator(
      config,
      gcConfig,
      sessionId,
    );

    // 如果配置了自定义LLM，则包装为CustomLLMAgent
    if (shouldUseCustomLlm()) {
      const customConfig = loadCustomLlmConfig();
      if (customConfig) {
        const customGenerator = new OpenAIContentGenerator(customConfig);
        return new CustomLLMAgent(originalGenerator, customGenerator);
      }
    }

    return originalGenerator;
    ```

- [ ] 运行现有测试确保无回归
- [ ] 添加集成测试
  - [ ] 测试自定义LLM配置创建
  - [ ] 测试ContentGenerator创建
  - [ ] 测试优雅降级
  - [ ] 测试装饰器模式包装
  - [ ] 测试透明切换机制
  - [ ] 测试现有功能保持不变

## 阶段4：测试与优化

### 4.1 单元测试完善

- [ ] 为 `customLlmAgent.ts` 添加完整的单元测试

### 4.2 集成测试

- [ ] 测试自定义LLM完整流程
- [ ] 测试优雅降级场景
- [ ] 测试装饰器模式切换
- [ ] 测试环境变量加载
- [ ] 测试配置验证
- [ ] 测试错误处理

## 阶段5：文档与部署

### 5.1 文档更新

- [ ] 更新README.md
  - [ ] 添加自定义LLM配置说明
  - [ ] 添加环境变量说明
  - [ ] 添加使用示例

## 验收标准

### 功能验收

- [ ] 支持通过环境变量配置自定义LLM
- [ ] 实现优雅降级，配置不完整时不退出
- [ ] 保持向后兼容，现有功能不受影响
- [ ] 支持流式和非流式API调用
- [ ] 支持多种LLM提供商

### 性能验收

- [ ] API调用延迟 < 2秒
- [ ] 内存使用增加 < 10%
- [ ] 启动时间增加 < 500ms

### 质量验收

- [ ] 代码覆盖率 > 80%
- [ ] 通过所有现有测试用例
- [ ] 无重大bug
- [ ] 通过代码审查

## 实现优势

### 最小化修改策略

- **只修改1个文件**：`packages/core/src/core/contentGenerator.ts`
- **现有代码不变**：所有业务逻辑、测试、配置都保持不变
- **向后兼容**：没有配置自定义LLM时行为完全一样
- **易于回滚**：出问题时只需要删除几行代码

### 装饰器模式优势

- **透明切换**：用户无感知地使用不同LLM
- **优雅降级**：自定义LLM失败时自动回退到Gemini
- **保持功能**：所有现有功能（rules、上下文管理等）都保持不变
- **易于扩展**：未来可以轻松添加更多LLM提供商

## 风险缓解

### 技术风险

- [ ] 建立API兼容性测试套件
- [ ] 实现详细的错误日志
- [ ] 提供降级机制
- [ ] 建立监控和告警

### 项目风险

- [ ] 分阶段实施，降低风险
- [ ] 保持现有功能稳定
- [ ] 建立回滚机制
- [ ] 定期进行集成测试

## 后续扩展计划

### 短期扩展（3个月内）

- [ ] 支持更多LLM提供商
- [ ] 添加模型参数配置UI
- [ ] 支持模型切换
- [ ] 添加性能监控

### 长期扩展（6个月内）

- [ ] 支持本地模型部署
- [ ] 实现智能模型选择
- [ ] 添加模型性能分析
- [ ] 支持多模型并行

## 任务状态说明

- [ ] 未开始
- [🔄] 进行中
- [✅] 已完成
- [❌] 已取消
- [⚠️] 有风险

## 注意事项

1. **优先级**：按照阶段顺序执行，每个阶段完成后进行测试
2. **测试**：每个任务完成后立即进行测试
3. **文档**：代码变更时同步更新相关文档
4. **兼容性**：确保不影响现有功能
5. **性能**：关注性能影响，及时优化
6. **最小化修改**：严格按照PRD方案，只修改必要文件

---

**最后更新**: 2025-01-27
**负责人**: 开发团队
**预计完成时间**: 2周（简化后）
