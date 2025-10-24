import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { TopicClustering } from "./analysis/topicClustering";
import { DeepAnalysis } from "./analysis/deepAnalysis";
import { ChartGenerator } from "./visualization/chartGenerator";

dotenv.config();

interface ReportSettings {
  reportSettings: {
    detailLevel: string;
    enableTopicClustering: boolean;
    enableDeepAnalysis: boolean;
    enableVisualization: boolean;
    enableRecommendations: boolean;
  };
}

/**
 * Generate enhanced AI trend report with topic clustering and deep analysis
 */
export async function generateDraft(rawStories: string) {
  console.log(`Generating enhanced report with ${rawStories.length} characters of data...`);

  try {
    const stories = JSON.parse(rawStories);

    if (!stories || stories.length === 0) {
      return generateFallbackReport();
    }

    // Load settings
    const settings = loadReportSettings();

    const currentDate = new Date().toLocaleDateString("zh-CN");

    // Step 1: Topic Clustering
    console.log("\n📑 Step 1: Topic Clustering...");
    const topicClustering = new TopicClustering();
    const topics = await topicClustering.clusterStories(stories);

    if (topics.length === 0) {
      return generateFallbackReport();
    }

    // Step 2: Deep Analysis
    let analyses = new Map();
    if (settings.reportSettings.enableDeepAnalysis) {
      console.log("\n🔬 Step 2: Deep Analysis...");
      const deepAnalysis = new DeepAnalysis();
      analyses = await deepAnalysis.analyzeTopics(topics);
    }

    // Step 3: Generate Visualizations
    let charts = { topicDistribution: "", accountActivity: "", keywordCloud: "" };
    if (settings.reportSettings.enableVisualization) {
      console.log("\n📊 Step 3: Generating Visualizations...");
      const chartGenerator = new ChartGenerator();
      charts = chartGenerator.generateCharts(topics, stories);
    }

    // Step 4: Build Enhanced Report
    console.log("\n✍️  Step 4: Building Report...");
    const report = buildEnhancedReport(currentDate, topics, analyses, charts, stories, settings);

    console.log("✅ Enhanced report generated successfully\n");
    return report;
  } catch (error) {
    console.error("Error generating enhanced draft:", error);
    return generateFallbackReport();
  }
}

/**
 * Build the enhanced markdown report
 */
function buildEnhancedReport(
  currentDate: string,
  topics: any[],
  analyses: Map<string, any>,
  charts: any,
  allStories: any[],
  settings: ReportSettings
): string {
  let report = `# 🤖 AI 趋势专题报告 | ${currentDate}\n\n`;

  // === Section 1: Overview ===
  report += `## 📈 今日概览\n\n`;
  report += `> 📊 **监控账号:** 37 个 | **收集内容:** ${allStories.length} 条 | **质量通过:** ${allStories.length} 条\n`;
  report += `> 🎯 **识别主题:** ${topics.length} 个 | **深度分析:** ${analyses.size} 个专题\n\n`;

  const avgQuality =
    allStories.length > 0
      ? Math.round(
          allStories.reduce((sum, s) => sum + (s.qualityScore?.finalScore || 75), 0) /
            allStories.length
        )
      : 75;
  report += `📌 **质量评分:** 平均 ${avgQuality} 分 | **数据来源:** 账号追踪 + 关键词搜索\n\n`;

  // Core Trends Summary
  const topTopicNames = topics.slice(0, 3).map((t) => t.name).join("、");
  report += `💡 **核心趋势:** ${topTopicNames}等${topics.length}个主题，涵盖产品发布、技术进展、行业动态等多个维度\n\n`;

  report += `---\n\n`;

  // === Section 2: Data Visualizations ===
  if (settings.reportSettings.enableVisualization) {
    report += `## 📊 数据可视化\n\n`;

    // Topic Distribution
    if (charts.topicDistribution) {
      report += `### 主题分布\n\n`;
      report += `${charts.topicDistribution}\n\n`;
    }

    // Keyword Cloud
    if (charts.keywordCloud) {
      report += `### 热门关键词\n\n`;
      report += `${charts.keywordCloud}\n\n`;
    }

    report += `---\n\n`;
  }

  // === Section 3: Topic Reports ===
  report += `## 📑 专题报告\n\n`;

  topics.forEach((topic, topicIndex) => {
    const analysis = analyses.get(topic.id);

    // Topic Header
    const emoji = getTopicEmoji(topicIndex);
    report += `### ${emoji} 专题${topicIndex + 1}：${topic.name}\n\n`;

    // Topic Summary
    report += `**📝 专题概述**\n\n`;
    report += `${topic.summary}\n\n`;
    report += `**🏷️ 关键词:** ${topic.keywords.join("、")}\n\n`;

    // Core Events
    report += `#### 🔍 核心事件\n\n`;

    topic.stories.forEach((story: any, storyIndex: number) => {
      report += `**${storyIndex + 1}. ${story.headline.substring(0, 50)}${story.headline.length > 50 ? "..." : ""}**\n\n`;

      // Image
      if (story.imageUrl) {
        report += `![](${story.imageUrl})\n\n`;
      }

      // Brief description
      const description =
        story.description || `来自 @${story.author || "Unknown"} 的重要动态`;
      report += `${description}\n\n`;

      // Metadata
      report += `👤 ${story.author || "Unknown"} | 📅 ${new Date(story.date_posted).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
      if (story.source) {
        report += ` | 📍 来源：${story.source === "account" ? "账号追踪" : "关键词搜索"}`;
      }
      report += `\n\n`;

      report += `🔗 [查看原文](${story.link})\n\n`;
      report += `---\n\n`;
    });

    // Deep Analysis (if enabled)
    if (analysis && settings.reportSettings.enableDeepAnalysis) {
      report += `#### 🔬 深度分析\n\n`;

      // Technical Analysis
      if (analysis.technicalAnalysis) {
        report += `**技术解读**\n\n`;
        report += `${analysis.technicalAnalysis}\n\n`;
      }

      // Impact Assessment
      if (analysis.impactAssessment) {
        report += `**影响评估**\n\n`;
        report += `📍 **短期影响 (1-3个月)**\n\n`;
        report += `${analysis.impactAssessment.shortTerm}\n\n`;
        report += `📍 **长期影响 (6-12个月)**\n\n`;
        report += `${analysis.impactAssessment.longTerm}\n\n`;
      }

      // Key Insights
      if (analysis.keyInsights && analysis.keyInsights.length > 0) {
        report += `**💡 核心洞察**\n\n`;
        analysis.keyInsights.forEach((insight: string) => {
          report += `- ${insight}\n`;
        });
        report += `\n`;
      }

      // Recommendations
      if (
        settings.reportSettings.enableRecommendations &&
        analysis.recommendations
      ) {
        report += `**📚 相关推荐**\n\n`;

        if (analysis.recommendations.papers && analysis.recommendations.papers.length > 0) {
          report += `📄 **相关论文:**\n`;
          analysis.recommendations.papers.forEach((paper: any) => {
            report += `- ${paper.title}: ${paper.description}\n`;
          });
          report += `\n`;
        }

        if (analysis.recommendations.tools && analysis.recommendations.tools.length > 0) {
          report += `🔧 **推荐工具:**\n`;
          analysis.recommendations.tools.forEach((tool: any) => {
            report += `- ${tool.name}: ${tool.description}\n`;
          });
          report += `\n`;
        }

        if (
          analysis.recommendations.accounts &&
          analysis.recommendations.accounts.length > 0
        ) {
          report += `👤 **值得关注:**\n`;
          analysis.recommendations.accounts.forEach((account: any) => {
            report += `- ${account.handle}: ${account.reason}\n`;
          });
          report += `\n`;
        }
      }

      report += `---\n\n`;
    }

    report += `\n`;
  });

  // === Footer ===
  report += `## 📅 报告信息\n\n`;
  report += `- **生成时间:** ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}\n`;
  report += `- **数据来源:** X (Twitter) 账号追踪 + 关键词搜索\n`;
  report += `- **分析模型:** DeepSeek AI\n`;
  report += `- **报告版本:** 2.0 增强版\n\n`;
  report += `---\n\n`;
  report += `🤖 由 [TrendFinder](https://github.com/neardws/trendFinder) 自动生成\n`;

  return report;
}

/**
 * Get emoji for topic
 */
function getTopicEmoji(index: number): string {
  const emojis = ["🚀", "🧪", "💼", "📱", "🌐", "🎯", "⚡", "🔮"];
  return emojis[index % emojis.length];
}

/**
 * Load report settings
 */
function loadReportSettings(): ReportSettings {
  try {
    const settingsPath = path.join(process.cwd(), "config", "report-settings.json");
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch (error) {
    console.warn("Could not load report settings, using defaults");
    return {
      reportSettings: {
        detailLevel: "enhanced",
        enableTopicClustering: true,
        enableDeepAnalysis: true,
        enableVisualization: true,
        enableRecommendations: true,
      },
    };
  }
}

/**
 * Generate fallback report if no stories
 */
function generateFallbackReport(): string {
  const currentDate = new Date().toLocaleDateString("zh-CN");
  return `# 🤖 AI 趋势专题报告 | ${currentDate}\n\n今日暂无 AI 趋势内容。\n`;
}
