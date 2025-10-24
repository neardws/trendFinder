import { HistoryStorage } from "../storage/historyStorage";
import { Topic } from "./topicClustering";

export interface ComparisonResult {
  trendingTopics: {
    new: string[];
    continuing: string[];
    declining: string[];
  };
  accountActivity: {
    mostActive: Array<{ account: string; tweetCount: number; change: number }>;
    rising: Array<{ account: string; change: number }>;
  };
  qualityTrends: {
    current: number;
    average7Days: number;
    average30Days: number;
    trend: "rising" | "stable" | "declining";
  };
  topicTrends: Array<{
    name: string;
    currentFrequency: number;
    historicalFrequency: number;
    trend: "new" | "hot" | "stable" | "cooling";
  }>;
  summary: string;
}

/**
 * Compare current data with historical data to identify trends
 */
export class HistoricalComparison {
  private historyStorage: HistoryStorage;

  constructor() {
    this.historyStorage = new HistoryStorage();
  }

  /**
   * Generate comprehensive historical comparison
   */
  async compare(
    currentTopics: Topic[],
    currentStories: any[],
    avgQualityScore: number
  ): Promise<ComparisonResult> {
    console.log("📊 Analyzing historical trends...");

    // Get historical data
    const history7Days = this.historyStorage.getHistoricalData(7);
    const history30Days = this.historyStorage.getHistoricalData(30);
    const trendingTopics7Days = this.historyStorage.getTrendingTopics(7);
    const trendingTopics30Days = this.historyStorage.getTrendingTopics(30);
    const accountActivity7Days = this.historyStorage.getAccountActivity(7);

    // Analyze topic trends
    const topicTrends = this.analyzeTopicTrends(
      currentTopics,
      trendingTopics7Days,
      trendingTopics30Days
    );

    // Classify trending topics
    const trendingTopicsClassified = this.classifyTrendingTopics(topicTrends);

    // Analyze account activity
    const accountActivityAnalysis = this.analyzeAccountActivity(
      currentStories,
      accountActivity7Days
    );

    // Analyze quality trends
    const qualityTrends = this.analyzeQualityTrends(
      avgQualityScore,
      history7Days,
      history30Days
    );

    // Generate summary
    const summary = this.generateSummary(
      trendingTopicsClassified,
      accountActivityAnalysis,
      qualityTrends
    );

    console.log("✅ Historical comparison complete");

    return {
      trendingTopics: trendingTopicsClassified,
      accountActivity: accountActivityAnalysis,
      qualityTrends,
      topicTrends,
      summary,
    };
  }

  /**
   * Analyze topic trends over time
   */
  private analyzeTopicTrends(
    currentTopics: Topic[],
    trendingTopics7Days: any[],
    trendingTopics30Days: any[]
  ) {
    const topicMap7Days = new Map(
      trendingTopics7Days.map((t: any) => [t.topic_name, t.total_frequency])
    );
    const topicMap30Days = new Map(
      trendingTopics30Days.map((t: any) => [t.topic_name, t.total_frequency])
    );

    return currentTopics.map((topic) => {
      const historicalFrequency7 = topicMap7Days.get(topic.name) || 0;
      const historicalFrequency30 = topicMap30Days.get(topic.name) || 0;

      let trend: "new" | "hot" | "stable" | "cooling";

      if (historicalFrequency7 === 0 && historicalFrequency30 === 0) {
        trend = "new";
      } else if (topic.storyCount > historicalFrequency7 / 7) {
        trend = "hot";
      } else if (topic.storyCount < historicalFrequency7 / 7) {
        trend = "cooling";
      } else {
        trend = "stable";
      }

      return {
        name: topic.name,
        currentFrequency: topic.storyCount,
        historicalFrequency: historicalFrequency7,
        trend,
      };
    });
  }

  /**
   * Classify trending topics
   */
  private classifyTrendingTopics(topicTrends: any[]) {
    const newTopics: string[] = [];
    const continuingTopics: string[] = [];
    const decliningTopics: string[] = [];

    topicTrends.forEach((topic) => {
      if (topic.trend === "new") {
        newTopics.push(topic.name);
      } else if (topic.trend === "hot" || topic.trend === "stable") {
        continuingTopics.push(topic.name);
      } else if (topic.trend === "cooling") {
        decliningTopics.push(topic.name);
      }
    });

    return {
      new: newTopics,
      continuing: continuingTopics,
      declining: decliningTopics,
    };
  }

  /**
   * Analyze account activity trends
   */
  private analyzeAccountActivity(currentStories: any[], accountActivity7Days: any[]) {
    // Count current activity
    const currentActivity = new Map<string, number>();
    currentStories.forEach((story) => {
      if (story.author) {
        const count = currentActivity.get(story.author) || 0;
        currentActivity.set(story.author, count + 1);
      }
    });

    // Historical activity map
    const historicalActivity = new Map(
      accountActivity7Days.map((a: any) => [a.account, a.total_tweets / 7])
    );

    // Calculate changes
    const activityWithChange = Array.from(currentActivity.entries()).map(
      ([account, count]) => {
        const historicalAvg = historicalActivity.get(account) || 0;
        const change = historicalAvg > 0 ? ((count - historicalAvg) / historicalAvg) * 100 : 100;
        return { account, tweetCount: count, change };
      }
    );

    // Sort by count
    const mostActive = activityWithChange
      .sort((a, b) => b.tweetCount - a.tweetCount)
      .slice(0, 10);

    // Find rising accounts (positive change)
    const rising = activityWithChange
      .filter((a) => a.change > 50)
      .sort((a, b) => b.change - a.change)
      .slice(0, 5);

    return {
      mostActive,
      rising,
    };
  }

  /**
   * Analyze quality score trends
   */
  private analyzeQualityTrends(
    currentScore: number,
    history7Days: any[],
    history30Days: any[]
  ) {
    const avg7Days =
      history7Days.length > 0
        ? history7Days.reduce((sum: number, h: any) => sum + h.avg_quality_score, 0) /
          history7Days.length
        : currentScore;

    const avg30Days =
      history30Days.length > 0
        ? history30Days.reduce((sum: number, h: any) => sum + h.avg_quality_score, 0) /
          history30Days.length
        : currentScore;

    let trend: "rising" | "stable" | "declining";
    if (currentScore > avg7Days + 2) {
      trend = "rising";
    } else if (currentScore < avg7Days - 2) {
      trend = "declining";
    } else {
      trend = "stable";
    }

    return {
      current: Math.round(currentScore),
      average7Days: Math.round(avg7Days),
      average30Days: Math.round(avg30Days),
      trend,
    };
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    trendingTopics: any,
    accountActivity: any,
    qualityTrends: any
  ): string {
    const parts: string[] = [];

    // Topic trends
    if (trendingTopics.new.length > 0) {
      parts.push(`本周新增 ${trendingTopics.new.length} 个新话题`);
    }
    if (trendingTopics.continuing.length > 0) {
      parts.push(`${trendingTopics.continuing.length} 个话题持续热议`);
    }

    // Account activity
    if (accountActivity.rising.length > 0) {
      parts.push(`${accountActivity.rising.length} 个账号活跃度显著上升`);
    }

    // Quality trend
    const qualityDesc =
      qualityTrends.trend === "rising"
        ? "内容质量呈上升趋势"
        : qualityTrends.trend === "declining"
        ? "内容质量有所下降"
        : "内容质量保持稳定";
    parts.push(qualityDesc);

    return parts.join("，") + "。";
  }

  /**
   * Close database connection
   */
  close() {
    this.historyStorage.close();
  }
}
