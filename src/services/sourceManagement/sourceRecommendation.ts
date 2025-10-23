import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

interface SourceMetadata {
  username: string;
  url: string;
  category: string;
  addedDate: string;
  status: string;
  qualityScore: number;
  lastActiveDate: string;
}

interface SourceConfig {
  metadata: {
    lastUpdated: string;
    version: string;
    totalSources: number;
  };
  sources: SourceMetadata[];
  candidates: CandidateSource[];
  archived: any[];
}

interface CandidateSource {
  username: string;
  recommendedBy: string;
  score: number;
  reason: string;
  mentionCount?: number;
}

interface EnhancedStory {
  headline: string;
  link: string;
  date_posted: string;
  imageUrl?: string;
  author?: string;
  pubDate?: string;
}

/**
 * AI-powered source recommendation engine
 * Analyzes existing tweets to discover new valuable accounts
 */
export class SourceRecommendation {
  private deepseek: OpenAI;
  private configPath: string;

  constructor() {
    this.deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
    this.configPath = path.join(process.cwd(), "config", "sources.json");
  }

  /**
   * Analyze stories to extract mentioned accounts
   */
  private extractMentionedAccounts(stories: EnhancedStory[]): Map<string, number> {
    const mentions = new Map<string, number>();

    for (const story of stories) {
      // Extract @mentions from headline
      const mentionMatches = story.headline.matchAll(/@(\w+)/g);
      for (const match of mentionMatches) {
        const username = match[1];
        mentions.set(username, (mentions.get(username) || 0) + 1);
      }

      // Extract from links (RT sources)
      if (story.link && story.link.includes("x.com/")) {
        const linkMatch = story.link.match(/x\.com\/([^\/]+)/);
        if (linkMatch && linkMatch[1] !== story.author) {
          const username = linkMatch[1];
          mentions.set(username, (mentions.get(username) || 0) + 1);
        }
      }
    }

    return mentions;
  }

  /**
   * Use AI to evaluate account relevance and quality
   */
  private async evaluateAccount(username: string, mentionCount: number): Promise<{
    score: number;
    category: string;
    reason: string;
  } | null> {
    try {
      const prompt = `评估 X (Twitter) 账号 @${username} 是否值得加入 AI 趋势监控系统。

提及次数: ${mentionCount}

请基于以下标准评分（0-100分）：
1. AI 领域相关性（是否是 AI 研究者、从业者、媒体等）
2. 影响力和知名度
3. 内容质量预期

输出 JSON 格式：
{
  "isRelevant": true/false,
  "score": 0-100,
  "category": "AI Research/AI Entrepreneur/AI Company/AI Media/Other",
  "reason": "简短说明为什么推荐或不推荐（30字内）"
}`;

      const completion = await this.deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "你是 AI 领域专家，擅长识别和评估 AI 相关账号的价值。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      if (!result.isRelevant || result.score < 70) {
        return null;
      }

      return {
        score: result.score,
        category: result.category,
        reason: result.reason,
      };
    } catch (error) {
      console.error(`Error evaluating account @${username}:`, error);
      return null;
    }
  }

  /**
   * Generate recommendations based on current stories
   */
  async generateRecommendations(stories: EnhancedStory[]): Promise<CandidateSource[]> {
    console.log("🔍 Analyzing stories for account recommendations...");

    // Load existing sources
    const config: SourceConfig = JSON.parse(
      fs.readFileSync(this.configPath, "utf-8")
    );
    const existingUsernames = new Set(
      config.sources.map((s) => s.username.toLowerCase())
    );

    // Extract mentioned accounts
    const mentions = this.extractMentionedAccounts(stories);
    console.log(`Found ${mentions.size} unique mentioned accounts`);

    // Filter out existing accounts and low-mention accounts
    const candidates: CandidateSource[] = [];

    for (const [username, count] of mentions.entries()) {
      if (
        existingUsernames.has(username.toLowerCase()) ||
        count < 3 // Minimum 3 mentions
      ) {
        continue;
      }

      console.log(`Evaluating @${username} (${count} mentions)...`);

      // AI evaluation
      const evaluation = await this.evaluateAccount(username, count);
      if (evaluation && evaluation.score >= 85) {
        candidates.push({
          username,
          recommendedBy: "AI Analysis",
          score: evaluation.score,
          reason: evaluation.reason,
          mentionCount: count,
        });
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ Generated ${candidates.length} recommendations`);
    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Auto-add high-scoring candidates to sources
   */
  async autoAddCandidates(candidates: CandidateSource[]): Promise<number> {
    if (candidates.length === 0) {
      return 0;
    }

    const config: SourceConfig = JSON.parse(
      fs.readFileSync(this.configPath, "utf-8")
    );

    let addedCount = 0;
    const today = new Date().toISOString().split("T")[0];

    for (const candidate of candidates) {
      if (candidate.score >= 90) {
        // Auto-add high-scoring candidates
        config.sources.push({
          username: candidate.username,
          url: `https://x.com/${candidate.username}`,
          category: "AI Community",
          addedDate: today,
          status: "active",
          qualityScore: candidate.score,
          lastActiveDate: today,
        });
        addedCount++;
        console.log(`✅ Auto-added @${candidate.username} (score: ${candidate.score})`);
      } else {
        // Add to candidates list for review
        config.candidates.push(candidate);
      }
    }

    // Update metadata
    config.metadata.lastUpdated = today;
    config.metadata.totalSources = config.sources.length;

    // Save config
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));

    return addedCount;
  }
}
