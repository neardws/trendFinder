# GitHub Actions 部署指南

本项目已配置为使用 GitHub Actions 自动运行，每天北京时间下午 5:00 执行一次。

## 🚀 快速开始

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

### 2. 配置 GitHub Secrets

在 GitHub 仓库中设置以下 Secrets：

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加以下 Secrets：

| Secret 名称 | 说明 | 示例值 |
|-------------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | `sk-xxxxx` |
| `RSSHUB_INSTANCE` | RSSHub 实例 URL | `https://your-rsshub.up.railway.app` |
| `SERVERCHAN_SENDKEY` | Server酱推送密钥 | `SCTxxxxx` |

### 3. 完成！

配置完成后，工作流会自动运行：
- ⏰ **自动触发**：每天北京时间下午 5:00
- 🔘 **手动触发**：Actions 标签页 → Daily AI Trends Finder → Run workflow

---

## 📅 修改运行时间

编辑 `.github/workflows/daily-trends.yml` 文件中的 cron 表达式：

```yaml
schedule:
  - cron: '0 9 * * *'  # UTC 09:00 = 北京时间 17:00
```

### Cron 表达式示例

```
'0 1 * * *'   # 每天北京时间 09:00
'0 9 * * *'   # 每天北京时间 17:00 (当前设置)
'0 13 * * *'  # 每天北京时间 21:00
'0 0 * * *'   # 每天北京时间 08:00
'0 */6 * * *' # 每 6 小时一次
```

**注意**：GitHub Actions 使用 UTC 时间，北京时间需要减去 8 小时。

---

## 📊 查看运行结果

### 方法 1：查看 GitHub Actions 日志

1. 进入仓库的 **Actions** 标签页
2. 点击 **Daily AI Trends Finder** workflow
3. 选择任意一次运行记录
4. 展开步骤查看详细日志

### 方法 2：接收微信推送

配置了 Server酱后，每次运行完成会自动推送到微信。

---

## 🔧 本地测试

在本地运行项目测试：

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 运行一次
npm start

# 或直接运行
node dist/index.js
```

本地运行时会自动使用 `.env` 文件中的配置。

---

## 🐛 故障排查

### 问题 1：工作流没有运行

**可能原因：**
- 仓库是私有的，但没有 Actions 配额
- Secrets 配置错误
- Cron 表达式有误

**解决方法：**
- 检查 Actions 标签页是否有错误提示
- 验证 Secrets 配置是否正确
- 手动触发一次测试

### 问题 2：DeepSeek API 报错

**可能原因：**
- API 密钥无效或过期
- API 配额用尽
- 网络连接问题

**解决方法：**
- 检查 `DEEPSEEK_API_KEY` 是否正确
- 登录 DeepSeek 控制台查看配额
- 查看 Actions 日志中的详细错误信息

### 问题 3：RSSHub 抓取失败

**可能原因：**
- RSSHub 实例不可用
- Twitter auth_token 过期
- 网络问题

**解决方法：**
- 访问 `RSSHUB_INSTANCE` URL 检查是否在线
- 重新配置 RSSHub 的 Twitter auth_token
- 检查 Railway 服务状态

---

## 💡 高级配置

### 运行频率优化

如果想更频繁地运行（比如每 6 小时一次）：

```yaml
schedule:
  - cron: '0 */6 * * *'
```

**注意：** GitHub Actions 免费账户有 2000 分钟/月的限制，请合理安排运行频率。

### 添加多个时间点

```yaml
schedule:
  - cron: '0 1 * * *'   # 北京时间 09:00
  - cron: '0 9 * * *'   # 北京时间 17:00
  - cron: '0 13 * * *'  # 北京时间 21:00
```

### 仅在工作日运行

```yaml
schedule:
  - cron: '0 9 * * 1-5'  # 周一到周五
```

---

## 📦 资源消耗

每次运行大约消耗：
- ⏱️ **时间**：1-2 分钟
- 💾 **内存**：~500 MB
- 💰 **配额**：~2 分钟（来自 2000 分钟/月的免费额度）

每天运行一次，一个月大约消耗 60 分钟，完全在免费额度内。

---

## 🔐 安全建议

1. **不要**将 API 密钥提交到代码仓库
2. **使用** GitHub Secrets 存储敏感信息
3. **定期**更换 API 密钥
4. **限制** RSSHub 实例的访问（如果可能）
5. **监控** API 使用情况，防止滥用

---

## 🎯 常见问题

**Q: 为什么选择 GitHub Actions 而不是其他方案？**

A:
- ✅ 完全免费（2000 分钟/月）
- ✅ 无需维护服务器
- ✅ 原生支持定时任务
- ✅ 与代码仓库集成
- ✅ 安全的 Secrets 管理

**Q: 可以手动触发运行吗？**

A: 可以！进入 Actions → Daily AI Trends Finder → Run workflow 按钮。

**Q: 如何查看历史运行记录？**

A: Actions 标签页会保留最近 90 天的运行记录。

**Q: 可以同时部署到 GitHub Actions 和 Railway 吗？**

A: 可以！两个平台互不干扰。GitHub Actions 用于定时任务，Railway 可以提供 Web 界面（如果需要）。

---

## 📞 获取帮助

如果遇到问题：

1. 查看 GitHub Actions 运行日志
2. 检查 Secrets 配置
3. 在项目 Issues 中提问
4. 查阅 GitHub Actions 官方文档

---

## 📝 更新日志

- **2025-10-22**: 初始版本，添加 GitHub Actions 支持
