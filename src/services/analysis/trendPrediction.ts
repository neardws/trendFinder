import { HistoryStorage } from "../storage/historyStorage";
import { Topic } from "./topicClustering";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export interface PredictionResult {
  emergingTopics: Array<{
    name: string;
    confidence: number;
    reasoning: string;
  }>;
  topicForecasts: Array<{
    name: string;
    currentTrend: "rising" | "stable" | "declining";
    nextWeekPrediction: string;
    confidence: number;
  }>;
  marketInsights: {
    opportunities: string[];
    risks: string[];
    recommendations: string[];
  };
  summary: string;
}

/**
 * AI-powered trend prediction based on historical data
 */
export class TrendPrediction {
  private historyStorage: HistoryStorage;
  private deepseek: OpenAI;

  constructor() {
    this.historyStorage = new HistoryStorage();
    this.deepseek = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  /**
   * Generate trend predictions
   */
  async predict(currentTopics: Topic[], comparisonData: any): Promise<PredictionResult> {
    console.log("🔮 Generating trend predictions...");

    try {
      // Get historical data
      const history30Days = this.historyStorage.getHistoricalData(30);
      const trendingTopics30Days = this.historyStorage.getTrendingTopics(30);

      // Prepare data for AI analysis
      const historicalContext = this.prepareHistoricalContext(
        history30Days,
        trendingTopics30Days
      );

      // Use AI to generate predictions
      const predictions = await this.generateAIPredictions(
        currentTopics,
        comparisonData,
        historicalContext
      );

      console.log("✅ Trend predictions complete");
      return predictions;
    } catch (error) {
      console.error("Error generating predictions:", error);
      return this.generateFallbackPredictions(currentTopics);
    }
  }

  /**
   * Prepare historical context for AI
   */
  private prepareHistoricalContext(history30Days: any[], trendingTopics30Days: any[]) {
    // Summarize historical data
    const totalStories = history30Days.reduce((sum: number, h: any) => sum + h.total_stories, 0);
    const avgQuality =
      history30Days.reduce((sum: number, h: any) => sum + h.avg_quality_score, 0) /
      history30Days.length;

    // Top trending topics
    const topTopics = trendingTopics30Days
      .sort((a: any, b: any) => b.total_frequency - a.total_frequency)
      .slice(0, 10)
      .map((t: any) => ({ name: t.topic_name, frequency: t.total_frequency }));

    return {
      period: "30天",
      totalStories,
      avgQuality: Math.round(avgQuality),
      topTopics,
      dataPoints: history30Days.length,
    };
  }

  /**
   * Generate AI-powered predictions
   */
  private async generateAIPredictions(
    currentTopics: Topic[],
    comparisonData: any,
    historicalContext: any
  ): Promise<PredictionResult> {
    const prompt = `你是 AI 领域趋势预测专家。基于以下数据进行趋势预测：

**当前话题 (今日):**
${currentTopics.map((t) => `- ${t.name} (${t.storyCount} 条内容)`).join("\n")}

**历史对比数据:**
- 新增话题: ${comparisonData.trendingTopics.new.join("、")}
- 持续热议: ${comparisonData.trendingTopics.continuing.join("、")}
- 热度下降: ${comparisonData.trendingTopics.declining.join("、")}
- 活跃账号趋势: ${comparisonData.accountActivity.rising.length} 个账号活跃度上升

**历史统计 (${historicalContext.period}):**
- 总内容数: ${historicalContext.totalStories}
- 平均质量: ${historicalContext.avgQuality} 分
- 热门话题: ${historicalContext.topTopics.map((t: any) => t.name).join("、")}

请预测未来 7 天的 AI 领域趋势，包括：

1. **潜在新兴话题** (3-5个): 基于当前趋势推断可能出现的新话题
2. **话题发展预测**: 对当前热门话题的未来走势预测
3. **市场洞察**: 机会、风险、建议

以 JSON 格式返回，结构如下：
{
  "emergingTopics": [
    {"name": "话题名", "confidence": 0.8, "reasoning": "推理依据"}
  ],
  "topicForecasts": [
    {"name": "话题名", "currentTrend": "rising", "nextWeekPrediction": "预测描述", "confidence": 0.75}
  ],
  "marketInsights": {
    "opportunities": ["机会1", "机会2"],
    "risks": ["风险1", "风险2"],
    "recommendations": ["建议1", "建议2"]
  },
  "summary": "一句话总结未来趋势"
}`;

    const completion = await this.deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "你是 AI 领域趋势预测专家，擅长基于历史数据和当前趋势进行准确预测。",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return {
      emergingTopics: result.emergingTopics || [],
      topicForecasts: result.topicForecasts || [],
      marketInsights: result.marketInsights || {
        opportunities: [],
        risks: [],
        recommendations: [],
      },
      summary: result.summary || "未来趋势保持稳定发展",
    };
  }

  /**
   * Generate fallback predictions if AI fails
   */
  private generateFallbackPredictions(currentTopics: Topic[]): PredictionResult {
    return {
      emergingTopics: [],
      topicForecasts: currentTopics.slice(0, 3).map((topic) => ({
        name: topic.name,
        currentTrend: "stable" as const,
        nextWeekPrediction: "预计保持当前热度",
        confidence: 0.5,
      })),
      marketInsights: {
        opportunities: ["持续关注热门话题发展"],
        risks: ["数据不足，预测可能不准确"],
        recommendations: ["积累更多历史数据以提高预测准确性"],
      },
      summary: "数据积累中，预测功能将在积累更多历史数据后提供更准确的结果",
    };
  }

  /**
   * Close database connection
   */
  close() {
    this.historyStorage.close();
  }
}
