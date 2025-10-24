export interface InfluenceScore {
  account: string;
  overallScore: number; // 0-100 综合影响力评分
  dimensions: {
    reach: number; // 覆盖度（基于粉丝数、转发等）
    quality: number; // 内容质量
    relevance: number; // 话题相关性
    consistency: number; // 发布一致性
    engagement: number; // 互动度（点赞、评论、转发）
  };
  rank: number; // 排名
  trend: "rising" | "stable" | "declining"; // 趋势
  keyContributions: string[]; // 关键贡献
}

export interface ContentInfluence {
  storyLink: string;
  headline: string;
  influenceScore: number;
  factors: {
    authorInfluence: number; // 作者影响力
    contentQuality: number; // 内容质量
    novelty: number; // 新颖性
    engagement: number; // 预测互动度
  };
  estimatedReach: number; // 预估覆盖人数
}

export interface InfluenceReport {
  topAccounts: InfluenceScore[];
  topContent: ContentInfluence[];
  kols: string[]; // 关键意见领袖列表
  risingStars: string[]; // 新兴影响力账号
  summary: string;
}

/**
 * Calculate influence scores for accounts and content
 */
export class InfluenceScoring {
  /**
   * Calculate influence scores for all accounts
   */
  calculateAccountInfluence(
    stories: any[],
    historicalData?: any
  ): InfluenceScore[] {
    console.log("📊 Calculating account influence scores...");

    // 按账号分组
    const accountStories = this.groupByAccount(stories);

    // 计算每个账号的评分
    const scores: InfluenceScore[] = [];

    accountStories.forEach((accountStories, account) => {
      const score = this.calculateSingleAccountScore(
        account,
        accountStories,
        stories.length,
        historicalData
      );
      scores.push(score);
    });

    // 排序并设置排名
    scores.sort((a, b) => b.overallScore - a.overallScore);
    scores.forEach((score, index) => {
      score.rank = index + 1;
    });

    console.log(`✅ Calculated influence scores for ${scores.length} accounts`);

    return scores;
  }

  /**
   * Calculate influence score for a single account
   */
  private calculateSingleAccountScore(
    account: string,
    accountStories: any[],
    totalStories: number,
    historicalData?: any
  ): InfluenceScore {
    // 1. 覆盖度 Reach (基于内容数量占比)
    const reach = this.calculateReach(accountStories, totalStories);

    // 2. 内容质量 Quality
    const quality = this.calculateQuality(accountStories);

    // 3. 话题相关性 Relevance
    const relevance = this.calculateRelevance(accountStories);

    // 4. 发布一致性 Consistency
    const consistency = this.calculateConsistency(accountStories, historicalData);

    // 5. 互动度 Engagement (基于质量分数推断)
    const engagement = this.calculateEngagement(accountStories);

    // 综合评分 (加权平均)
    const overallScore = Math.round(
      reach * 0.2 +
      quality * 0.3 +
      relevance * 0.2 +
      consistency * 0.15 +
      engagement * 0.15
    );

    // 判断趋势
    const trend = this.calculateTrend(account, accountStories, historicalData);

    // 提取关键贡献
    const keyContributions = this.extractKeyContributions(accountStories);

    return {
      account,
      overallScore,
      dimensions: { reach, quality, relevance, consistency, engagement },
      rank: 0, // 将在排序后设置
      trend,
      keyContributions,
    };
  }

  /**
   * Calculate reach score (0-100)
   */
  private calculateReach(accountStories: any[], totalStories: number): number {
    const ratio = accountStories.length / totalStories;
    // 使用对数缩放，避免少数账号占据过高分数
    return Math.min(100, Math.round(Math.log(ratio * 100 + 1) * 30));
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQuality(accountStories: any[]): number {
    if (accountStories.length === 0) return 0;

    const avgQuality = accountStories.reduce((sum, story) => {
      return sum + (story.qualityScore?.finalScore || 70);
    }, 0) / accountStories.length;

    return Math.round(avgQuality);
  }

  /**
   * Calculate relevance score (0-100)
   */
  private calculateRelevance(accountStories: any[]): number {
    // 基于质量分数中的相关性维度
    if (accountStories.length === 0) return 0;

    const avgRelevance = accountStories.reduce((sum, story) => {
      return sum + (story.qualityScore?.relevance || 70);
    }, 0) / accountStories.length;

    return Math.round(avgRelevance);
  }

  /**
   * Calculate consistency score (0-100)
   */
  private calculateConsistency(accountStories: any[], historicalData?: any): number {
    // 如果没有历史数据，基于当前内容的时间分布
    if (!historicalData) {
      // 检查内容发布的时间分布是否均匀
      const dates = accountStories.map(s => new Date(s.date_posted).getTime());
      if (dates.length < 2) return 70; // 默认分数

      const intervals = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push(dates[i] - dates[i - 1]);
      }

      // 计算时间间隔的标准差，越小越一致
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2);
      }, 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      // 标准差越小，一致性越高
      const consistencyScore = Math.max(0, 100 - (stdDev / avgInterval) * 50);
      return Math.round(consistencyScore);
    }

    // 有历史数据时，对比历史发布频率
    // TODO: 实现基于历史数据的一致性评分
    return 75;
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagement(accountStories: any[]): number {
    // 基于质量分数推断互动度
    // 在实际应用中，可以从 Twitter API 获取真实的互动数据
    if (accountStories.length === 0) return 0;

    const avgEngagement = accountStories.reduce((sum, story) => {
      const quality = story.qualityScore?.finalScore || 70;
      const novelty = story.qualityScore?.novelty || 70;
      // 高质量 + 高新颖性 = 高互动
      return sum + (quality * 0.6 + novelty * 0.4);
    }, 0) / accountStories.length;

    return Math.round(avgEngagement);
  }

  /**
   * Calculate trend (rising/stable/declining)
   */
  private calculateTrend(
    account: string,
    currentStories: any[],
    historicalData?: any
  ): "rising" | "stable" | "declining" {
    if (!historicalData) return "stable";

    // 对比当前活跃度和历史平均值
    const currentActivity = currentStories.length;
    const historicalAverage = historicalData.averageActivity || currentActivity;

    if (currentActivity > historicalAverage * 1.2) {
      return "rising";
    } else if (currentActivity < historicalAverage * 0.8) {
      return "declining";
    }
    return "stable";
  }

  /**
   * Extract key contributions from stories
   */
  private extractKeyContributions(accountStories: any[]): string[] {
    // 提取质量最高的 3 个话题
    return accountStories
      .sort((a, b) => (b.qualityScore?.finalScore || 0) - (a.qualityScore?.finalScore || 0))
      .slice(0, 3)
      .map(story => story.headline.substring(0, 50) + (story.headline.length > 50 ? "..." : ""));
  }

  /**
   * Group stories by account
   */
  private groupByAccount(stories: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>();

    stories.forEach(story => {
      if (!story.author) return;

      const existing = map.get(story.author) || [];
      existing.push(story);
      map.set(story.author, existing);
    });

    return map;
  }

  /**
   * Calculate content influence scores
   */
  calculateContentInfluence(
    stories: any[],
    accountScores: Map<string, InfluenceScore>
  ): ContentInfluence[] {
    console.log("📊 Calculating content influence scores...");

    const contentScores: ContentInfluence[] = stories.map(story => {
      const authorScore = accountScores.get(story.author);
      const authorInfluence = authorScore ? authorScore.overallScore : 50;

      const contentQuality = story.qualityScore?.finalScore || 70;
      const novelty = story.qualityScore?.novelty || 70;

      // 综合影响力评分
      const influenceScore = Math.round(
        authorInfluence * 0.4 +
        contentQuality * 0.3 +
        novelty * 0.3
      );

      // 预估覆盖人数（简化模型）
      const estimatedReach = Math.round(influenceScore * 100);

      return {
        storyLink: story.link,
        headline: story.headline,
        influenceScore,
        factors: {
          authorInfluence,
          contentQuality,
          novelty,
          engagement: (contentQuality + novelty) / 2,
        },
        estimatedReach,
      };
    });

    // 排序
    contentScores.sort((a, b) => b.influenceScore - a.influenceScore);

    console.log(`✅ Calculated influence scores for ${contentScores.length} pieces of content`);

    return contentScores;
  }

  /**
   * Generate comprehensive influence report
   */
  generateInfluenceReport(
    stories: any[],
    historicalData?: any
  ): InfluenceReport {
    console.log("📊 Generating influence report...");

    // 计算账号影响力
    const accountScores = this.calculateAccountInfluence(stories, historicalData);

    // 创建快速查找映射
    const accountScoreMap = new Map(accountScores.map(score => [score.account, score]));

    // 计算内容影响力
    const contentScores = this.calculateContentInfluence(stories, accountScoreMap);

    // 识别 KOL (前 20%)
    const kolThreshold = accountScores.length * 0.2;
    const kols = accountScores
      .slice(0, Math.ceil(kolThreshold))
      .map(score => score.account);

    // 识别新兴影响力账号（高质量但内容数量不多）
    const risingStars = accountScores
      .filter(score =>
        score.trend === "rising" &&
        score.dimensions.quality >= 75 &&
        score.rank > kolThreshold
      )
      .slice(0, 5)
      .map(score => score.account);

    // 生成总结
    const summary = this.generateInfluenceSummary(accountScores, kols, risingStars);

    console.log("✅ Influence report generated");

    return {
      topAccounts: accountScores.slice(0, 20),
      topContent: contentScores.slice(0, 20),
      kols,
      risingStars,
      summary,
    };
  }

  /**
   * Generate influence summary
   */
  private generateInfluenceSummary(
    accountScores: InfluenceScore[],
    kols: string[],
    risingStars: string[]
  ): string {
    const avgScore = Math.round(
      accountScores.reduce((sum, score) => sum + score.overallScore, 0) / accountScores.length
    );

    let summary = `共分析 ${accountScores.length} 个账号，平均影响力评分 ${avgScore}。`;

    if (kols.length > 0) {
      summary += `识别出 ${kols.length} 个关键意见领袖（KOL）。`;
    }

    if (risingStars.length > 0) {
      summary += `发现 ${risingStars.length} 个新兴影响力账号值得关注。`;
    }

    return summary;
  }
}
