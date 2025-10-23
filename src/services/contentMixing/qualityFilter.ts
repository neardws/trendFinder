import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

interface EnhancedStory {
  headline: string;
  link: string;
  date_posted: string;
  imageUrl?: string;
  author?: string;
  pubDate?: string;
  source: "account" | "search";
  searchQuery?: string;
}

interface ScoredStory extends EnhancedStory {
  qualityScore: {
    relevance: number;
    quality: number;
    novelty: number;
    impact: number;
    finalScore: number;
  };
}

interface MixingRules {
  qualityThreshold: {
    relevance: number;
    quality: number;
    novelty: number;
    impact: number;
    finalScoreMin: number;
  };
}

/**
 * AI-powered quality scoring and filtering
 */
export class QualityFilter {
  private deepseek: OpenAI;
  private rules: MixingRules;

  constructor() {
    this.deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });

    const rulesPath = path.join(process.cwd(), "config", "mixing-rules.json");
    this.rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));
  }

  /**
   * Score and filter stories using AI
   */
  async filterAndScore(stories: EnhancedStory[]): Promise<ScoredStory[]> {
    console.log(`🎯 Starting quality filter for ${stories.length} stories...`);

    const scoredStories: ScoredStory[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < stories.length; i += batchSize) {
      const batch = stories.slice(i, i + batchSize);

      const batchPromises = batch.map((story) => this.scoreStory(story));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === "fulfilled" && result.value) {
          scoredStories.push(result.value);
        }
      }

      // Rate limiting
      if (i + batchSize < stories.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Filter by threshold
    const filtered = scoredStories.filter(
      (s) => s.qualityScore.finalScore >= this.rules.qualityThreshold.finalScoreMin
    );

    // Sort by final score (descending)
    filtered.sort((a, b) => b.qualityScore.finalScore - a.qualityScore.finalScore);

    console.log(`✅ Quality filter complete: ${filtered.length}/${stories.length} passed`);
    console.log(`   Average score: ${this.calculateAverageScore(filtered).toFixed(1)}`);

    return filtered;
  }

  /**
   * Score a single story using AI
   */
  private async scoreStory(story: EnhancedStory): Promise<ScoredStory | null> {
    try {
      const prompt = `评估这条 AI 内容的质量（1-100分）：

标题：${story.headline}
作者：${story.author || "未知"}
来源：${story.source === "account" ? "追踪账号" : "关键词搜索"}
${story.searchQuery ? `搜索词：${story.searchQuery}` : ""}

评分标准：
1. **相关性 (relevance)**: 是否与 AI/LLM 领域高度相关？
2. **质量 (quality)**: 内容是否有深度、准确性、专业性？
3. **新颖性 (novelty)**: 是否包含新信息、新观点、新进展？
4. **影响力 (impact)**: 是否来自权威来源？是否有广泛影响？

输出严格的 JSON 格式：
{
  "relevance": 0-100,
  "quality": 0-100,
  "novelty": 0-100,
  "impact": 0-100,
  "reason": "简短说明评分理由（50字内）"
}`;

      const completion = await this.deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是 AI 内容质量评估专家。客观公正地评分，避免过高或过低的分数。",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      // Calculate final score (weighted average)
      const finalScore =
        result.relevance * 0.3 +
        result.quality * 0.3 +
        result.novelty * 0.2 +
        result.impact * 0.2;

      return {
        ...story,
        qualityScore: {
          relevance: result.relevance,
          quality: result.quality,
          novelty: result.novelty,
          impact: result.impact,
          finalScore: Math.round(finalScore),
        },
      };
    } catch (error: any) {
      console.error(`Error scoring story: ${story.headline.substring(0, 50)}...`, error.message);
      return null;
    }
  }

  /**
   * Calculate average quality score
   */
  private calculateAverageScore(stories: ScoredStory[]): number {
    if (stories.length === 0) return 0;
    const sum = stories.reduce((acc, s) => acc + s.qualityScore.finalScore, 0);
    return sum / stories.length;
  }
}
