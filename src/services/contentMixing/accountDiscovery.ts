import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

interface ScoredStory {
  headline: string;
  link: string;
  date_posted: string;
  imageUrl?: string;
  author?: string;
  pubDate?: string;
  source: "account" | "search";
  searchQuery?: string;
  qualityScore: {
    relevance: number;
    quality: number;
    novelty: number;
    impact: number;
    finalScore: number;
  };
}

interface SourceConfig {
  metadata: {
    lastUpdated: string;
    version: string;
    totalSources: number;
  };
  sources: Array<{
    username: string;
    url: string;
    category: string;
    addedDate: string;
    status: string;
    qualityScore?: number;
    lastActiveDate?: string;
  }>;
  candidates: Array<{
    username: string;
    url: string;
    category: string;
    discoveredDate: string;
    qualityScore: number;
    reason: string;
  }>;
  archived: Array<any>;
}

interface MixingRules {
  discoveryRules: {
    minQualityScore: number;
    minContentCount: number;
    autoAddThreshold: number;
    minFollowers?: number;
    minRelevance?: number;
  };
}

interface AccountCandidate {
  username: string;
  qualityScore: number;
  contentCount: number;
  category: string;
  reason: string;
}

/**
 * Discover new accounts from search results
 */
export class AccountDiscovery {
  private deepseek: OpenAI;
  private rules: MixingRules;
  private sourcesPath: string;

  constructor() {
    this.deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });

    const rulesPath = path.join(process.cwd(), "config", "mixing-rules.json");
    this.rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));

    this.sourcesPath = path.join(process.cwd(), "config", "sources.json");
  }

  /**
   * Discover new accounts from search results
   */
  async discoverAccounts(searchStories: ScoredStory[]): Promise<{
    newAccounts: number;
    newCandidates: number;
  }> {
    if (searchStories.length === 0) {
      console.log("⏭️  No search stories to analyze for account discovery");
      return { newAccounts: 0, newCandidates: 0 };
    }

    console.log(`🔎 Discovering accounts from ${searchStories.length} search results...`);

    // Extract unique authors from search results
    const authorCounts = this.extractAuthors(searchStories);

    console.log(`   Found ${authorCounts.size} unique authors in search results`);

    // Load existing sources
    const sourceConfig: SourceConfig = JSON.parse(fs.readFileSync(this.sourcesPath, "utf-8"));
    const existingUsernames = new Set(sourceConfig.sources.map((s) => s.username.toLowerCase()));
    const existingCandidates = new Set(
      sourceConfig.candidates.map((c) => c.username.toLowerCase())
    );

    // Filter out already tracked accounts
    const newAuthors = Array.from(authorCounts.entries()).filter(
      ([username]) =>
        !existingUsernames.has(username.toLowerCase()) &&
        !existingCandidates.has(username.toLowerCase())
    );

    console.log(`   ${newAuthors.length} new authors to evaluate`);

    // Filter by minimum content count
    const qualifiedAuthors = newAuthors.filter(
      ([_, count]) => count >= this.rules.discoveryRules.minContentCount
    );

    console.log(
      `   ${qualifiedAuthors.length} authors meet minimum content count (${this.rules.discoveryRules.minContentCount})`
    );

    // Evaluate each author
    const candidates: AccountCandidate[] = [];

    for (const [username, contentCount] of qualifiedAuthors.slice(0, 10)) {
      // Limit to 10 evaluations per run
      try {
        const evaluation = await this.evaluateAccount(username, contentCount, searchStories);

        if (
          evaluation &&
          evaluation.qualityScore >= this.rules.discoveryRules.minQualityScore
        ) {
          candidates.push({
            username,
            qualityScore: evaluation.qualityScore,
            contentCount,
            category: evaluation.category,
            reason: evaluation.reason,
          });
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Error evaluating @${username}:`, error.message);
      }
    }

    console.log(`   ${candidates.length} accounts passed quality threshold`);

    // Add to sources or candidates
    let newAccounts = 0;
    let newCandidates = 0;

    for (const candidate of candidates) {
      if (candidate.qualityScore >= this.rules.discoveryRules.autoAddThreshold) {
        // Auto-add to sources
        sourceConfig.sources.push({
          username: candidate.username,
          url: `https://x.com/${candidate.username}`,
          category: candidate.category,
          addedDate: new Date().toISOString().split("T")[0],
          status: "active",
          qualityScore: candidate.qualityScore,
          lastActiveDate: new Date().toISOString().split("T")[0],
        });
        newAccounts++;
        console.log(`   ✅ Auto-added: @${candidate.username} (score: ${candidate.qualityScore})`);
      } else {
        // Add to candidates for manual review
        sourceConfig.candidates.push({
          username: candidate.username,
          url: `https://x.com/${candidate.username}`,
          category: candidate.category,
          discoveredDate: new Date().toISOString().split("T")[0],
          qualityScore: candidate.qualityScore,
          reason: candidate.reason,
        });
        newCandidates++;
        console.log(
          `   📋 Added to candidates: @${candidate.username} (score: ${candidate.qualityScore})`
        );
      }
    }

    // Update metadata
    sourceConfig.metadata.lastUpdated = new Date().toISOString().split("T")[0];
    sourceConfig.metadata.totalSources = sourceConfig.sources.length;

    // Save updated config
    fs.writeFileSync(this.sourcesPath, JSON.stringify(sourceConfig, null, 2));

    console.log(`✅ Account discovery complete:`);
    console.log(`   ${newAccounts} accounts auto-added`);
    console.log(`   ${newCandidates} candidates added for review`);

    return { newAccounts, newCandidates };
  }

  /**
   * Extract unique authors and their content count
   */
  private extractAuthors(stories: ScoredStory[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (const story of stories) {
      if (story.author) {
        const author = story.author.replace("@", "");
        counts.set(author, (counts.get(author) || 0) + 1);
      }
    }

    return counts;
  }

  /**
   * Evaluate account using AI
   */
  private async evaluateAccount(
    username: string,
    contentCount: number,
    stories: ScoredStory[]
  ): Promise<{ qualityScore: number; category: string; reason: string } | null> {
    // Get sample content from this author
    const authorStories = stories
      .filter((s) => s.author?.replace("@", "") === username)
      .slice(0, 3);

    const sampleContent = authorStories.map((s) => s.headline).join("\n- ");

    const prompt = `评估 X (Twitter) 账号 @${username} 是否值得加入 AI 趋势监控系统。

**账号数据：**
- 搜索发现的内容数量: ${contentCount}
- 内容质量分数: ${authorStories.map((s) => s.qualityScore.finalScore).join(", ")}
- 示例内容:
${sampleContent}

**评估标准：**
1. AI 领域相关性（0-100）
2. 内容质量和深度（0-100）
3. 影响力和权威性（0-100）
4. 内容更新频率和活跃度（0-100）

输出严格的 JSON 格式：
{
  "isRelevant": true/false,
  "qualityScore": 0-100,
  "category": "AI Research/AI Entrepreneur/AI Company/AI Media/AI Developer/Other",
  "reason": "简短说明推荐理由（50字内）"
}`;

    try {
      const completion = await this.deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是 AI 领域专家，擅长识别和评估 AI 相关账号的价值。客观公正评分。",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      if (result.isRelevant && result.qualityScore >= this.rules.discoveryRules.minQualityScore) {
        return {
          qualityScore: result.qualityScore,
          category: result.category,
          reason: result.reason,
        };
      }

      return null;
    } catch (error: any) {
      console.error(`Error evaluating account @${username}:`, error.message);
      return null;
    }
  }
}
