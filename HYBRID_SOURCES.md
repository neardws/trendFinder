# 混合数据源系统使用说明

## 🎯 功能概述

TrendFinder 现在支持两种数据源：
1. **账号追踪** - 监控指定 AI 专家账号
2. **关键词搜索** - 通过 RSSHub 搜索 AI 相关内容

系统会智能混合两种来源的内容，自动去重，AI 评分排序。

## 🔧 配置步骤

### 1. 配置 RSSHub 认证（Railway）

访问你的 Railway RSSHub 实例，添加环境变量：

```bash
TWITTER_AUTH_TOKEN=你的Twitter认证Token
TWITTER_THIRD_PARTY_API=rsshub
```

**获取 AUTH_TOKEN：**
1. 登录 X (Twitter)
2. F12 打开开发者工具 → Network
3. 刷新页面，找到任意 API 请求
4. 复制请求头中的 `Authorization: Bearer xxx` 的 token

### 2. 自定义搜索关键词

编辑 `config/search-queries.json`：

```json
{
  "keywords": [
    {
      "query": "你的关键词",
      "weight": 10,
      "category": "product",
      "enabled": true
    }
  ]
}
```

**支持的查询语法：**
- 话题标签：`#AI #MachineLearning`
- 关键词：`GPT-5 breakthrough`
- 布尔运算：`(OpenAI OR Anthropic) AND release`
- 中文：`AI模型发布`

### 3. 调整混合比例

编辑 `config/mixing-rules.json`：

```json
{
  "dynamicRatio": {
    "accountsMin": 30,  // 账号内容最少占比
    "accountsMax": 70,  // 账号内容最多占比
    "searchMin": 30,    // 搜索内容最少占比
    "searchMax": 70     // 搜索内容最多占比
  }
}
```

## 📊 工作流程

```
每日运行
    ↓
抓取 37 个账号 (账号追踪)
    ↓
搜索 5 个关键词 (主动搜索)
    ↓
AI 质量评分 + 去重
    ↓
动态调整混合比例
    ↓
生成报告（标注来源）
```

## 🎯 预期效果

- **内容多样性 +50%**
- **发现新账号 +60%**
- **时效性 +30%**

## ⚠️ 注意事项

1. **RSSHub 限流**：每天限制搜索 5-10 次
2. **成本控制**：免费 RSSHub 有速率限制
3. **Token 有效期**：AUTH_TOKEN 可能过期，需定期更新

## 🔍 故障排查

**搜索无结果：**
- 检查 RSSHub 认证配置
- 验证 TWITTER_AUTH_TOKEN 是否有效
- 查看 Railway 日志

**重复内容过多：**
- 调整 `mixing-rules.json` 中的去重阈值
- 减少相似关键词

**质量分数过低：**
- 降低 `qualityThreshold.finalScoreMin`
- 调整搜索关键词更精准

## 📝 当前状态

- ✅ 配置文件已创建
- ✅ 搜索模块已实现
- ⏳ 需要配置 RSSHub 认证
- ⏳ 需要运行完整测试

## 🚀 下一步

1. 在 Railway 配置 Twitter 认证
2. 运行测试：`npm run build && node dist/index.js`
3. 查看搜索结果是否正常
4. 调整关键词和过滤规则
