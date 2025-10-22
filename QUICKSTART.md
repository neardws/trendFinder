# 🚀 快速部署到 GitHub Actions

## 3 步完成部署（5 分钟内）

### 第 1 步：推送代码到 GitHub

```bash
# 如果还没有推送到 GitHub
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

### 第 2 步：配置 Secrets

1. 访问：`https://github.com/YOUR_USERNAME/trendFinder/settings/secrets/actions`

2. 点击 **New repository secret**，添加以下 3 个 Secrets：

| Secret 名称 | 值 |
|-------------|-----|
| `DEEPSEEK_API_KEY` | 你的 DeepSeek API 密钥 |
| `RSSHUB_INSTANCE` | `https://你的rsshub域名.up.railway.app` |
| `SERVERCHAN_SENDKEY` | 你的 Server酱 SendKey |

### 第 3 步：测试运行

1. 进入 Actions 标签页：`https://github.com/YOUR_USERNAME/trendFinder/actions`

2. 点击 **Daily AI Trends Finder**

3. 点击 **Run workflow** → **Run workflow** 按钮

4. 等待几分钟，查看运行结果

5. 检查微信是否收到推送

---

## ✅ 完成！

从现在开始，你的 AI 趋势报告会：
- ⏰ 每天北京时间下午 5:00 自动运行
- 📱 自动推送到你的微信
- 💰 完全免费，无需任何服务器

---

## 🎯 下一步

### 修改运行时间

编辑 `.github/workflows/daily-trends.yml` 第 6 行：

```yaml
- cron: '0 9 * * *'  # UTC 09:00 = 北京时间 17:00
```

改为你想要的时间，例如：
- `'0 1 * * *'` = 北京时间 09:00
- `'0 13 * * *'` = 北京时间 21:00

### 查看运行历史

访问：`https://github.com/YOUR_USERNAME/trendFinder/actions`

### 手动触发

Actions → Daily AI Trends Finder → Run workflow

---

## 🐛 遇到问题？

查看详细指南：[GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)
