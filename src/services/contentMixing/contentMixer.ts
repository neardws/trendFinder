import fs from "fs";
import path from "path";
import crypto from "crypto";

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

interface MixingRules {
  dynamicRatio: {
    enabled: boolean;
    accountsMin: number;
    accountsMax: number;
    searchMin: number;
    searchMax: number;
  };
  deduplication: {
    enabled: boolean;
    method: string;
    similarityThreshold: number;
  };
}

interface MixingStats {
  totalStories: number;
  accountStories: number;
  searchStories: number;
  duplicatesRemoved: number;
  accountRatio: number;
  searchRatio: number;
  averageQuality: {
    accounts: number;
    search: number;
    overall: number;
  };
}

/**
 * Content mixing and deduplication engine
 */
export class ContentMixer {
  private rules: MixingRules;

  constructor() {
    const rulesPath = path.join(process.cwd(), "config", "mixing-rules.json");
    this.rules = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));
  }

  /**
   * Mix account and search content with dynamic ratio
   */
  async mix(stories: ScoredStory[]): Promise<{ mixed: ScoredStory[]; stats: MixingStats }> {
    console.log(`🎨 Starting content mixing for ${stories.length} stories...`);

    // Separate by source
    const accountStories = stories.filter((s) => s.source === "account");
    const searchStories = stories.filter((s) => s.source === "search");

    console.log(`   Accounts: ${accountStories.length}, Search: ${searchStories.length}`);

    // Remove duplicates
    let deduplicated = stories;
    let duplicatesRemoved = 0;

    if (this.rules.deduplication.enabled) {
      const result = this.deduplicateStories(stories);
      deduplicated = result.unique;
      duplicatesRemoved = result.duplicates;
      console.log(`   Removed ${duplicatesRemoved} duplicates`);
    }

    // Calculate dynamic ratio
    const ratio = this.calculateDynamicRatio(
      deduplicated.filter((s) => s.source === "account"),
      deduplicated.filter((s) => s.source === "search")
    );

    console.log(`   Dynamic ratio: Accounts ${ratio.accountRatio}%, Search ${ratio.searchRatio}%`);

    // Apply ratio and mix
    const mixed = this.applyRatio(deduplicated, ratio.accountRatio, ratio.searchRatio);

    // Sort by quality score (descending)
    mixed.sort((a, b) => b.qualityScore.finalScore - a.qualityScore.finalScore);

    const stats: MixingStats = {
      totalStories: mixed.length,
      accountStories: mixed.filter((s) => s.source === "account").length,
      searchStories: mixed.filter((s) => s.source === "search").length,
      duplicatesRemoved,
      accountRatio: ratio.accountRatio,
      searchRatio: ratio.searchRatio,
      averageQuality: {
        accounts: this.calculateAverageScore(mixed.filter((s) => s.source === "account")),
        search: this.calculateAverageScore(mixed.filter((s) => s.source === "search")),
        overall: this.calculateAverageScore(mixed),
      },
    };

    console.log(`✅ Content mixing complete: ${stats.totalStories} stories`);
    console.log(`   Final mix: ${stats.accountStories} accounts, ${stats.searchStories} search`);

    return { mixed, stats };
  }

  /**
   * Remove duplicate stories using content fingerprinting
   */
  private deduplicateStories(stories: ScoredStory[]): {
    unique: ScoredStory[];
    duplicates: number;
  } {
    const seen = new Map<string, ScoredStory>();

    for (const story of stories) {
      const fingerprint = this.generateFingerprint(story);

      if (!seen.has(fingerprint)) {
        seen.set(fingerprint, story);
      } else {
        // Keep the one with higher quality score
        const existing = seen.get(fingerprint)!;
        if (story.qualityScore.finalScore > existing.qualityScore.finalScore) {
          seen.set(fingerprint, story);
        }
      }
    }

    return {
      unique: Array.from(seen.values()),
      duplicates: stories.length - seen.size,
    };
  }

  /**
   * Generate content fingerprint for deduplication
   */
  private generateFingerprint(story: ScoredStory): string {
    // Normalize headline (remove special chars, lowercase, trim)
    const normalized = story.headline
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, "")
      .trim();

    // Create hash
    return crypto.createHash("md5").update(normalized).digest("hex");
  }

  /**
   * Calculate dynamic ratio based on content quality
   */
  private calculateDynamicRatio(
    accountStories: ScoredStory[],
    searchStories: ScoredStory[]
  ): { accountRatio: number; searchRatio: number } {
    if (!this.rules.dynamicRatio.enabled) {
      // Fixed 50/50 ratio if dynamic is disabled
      return { accountRatio: 50, searchRatio: 50 };
    }

    // Calculate average quality scores
    const accountAvg = this.calculateAverageScore(accountStories);
    const searchAvg = this.calculateAverageScore(searchStories);

    // Calculate ratio based on quality (higher quality = higher ratio)
    let accountRatio = 50;
    let searchRatio = 50;

    if (accountAvg > 0 && searchAvg > 0) {
      const total = accountAvg + searchAvg;
      accountRatio = Math.round((accountAvg / total) * 100);
      searchRatio = 100 - accountRatio;

      // Apply min/max constraints
      accountRatio = Math.max(
        this.rules.dynamicRatio.accountsMin,
        Math.min(this.rules.dynamicRatio.accountsMax, accountRatio)
      );
      searchRatio = 100 - accountRatio;
    }

    return { accountRatio, searchRatio };
  }

  /**
   * Apply ratio to select stories
   */
  private applyRatio(
    stories: ScoredStory[],
    accountRatio: number,
    searchRatio: number
  ): ScoredStory[] {
    const accountStories = stories.filter((s) => s.source === "account");
    const searchStories = stories.filter((s) => s.source === "search");

    // Calculate target counts
    const targetTotal = Math.min(stories.length, 50); // Max 50 stories in final report
    const targetAccounts = Math.round((targetTotal * accountRatio) / 100);
    const targetSearch = targetTotal - targetAccounts;

    // Sort by quality
    accountStories.sort((a, b) => b.qualityScore.finalScore - a.qualityScore.finalScore);
    searchStories.sort((a, b) => b.qualityScore.finalScore - a.qualityScore.finalScore);

    // Select top stories
    const selectedAccounts = accountStories.slice(0, targetAccounts);
    const selectedSearch = searchStories.slice(0, targetSearch);

    return [...selectedAccounts, ...selectedSearch];
  }

  /**
   * Calculate average quality score
   */
  private calculateAverageScore(stories: ScoredStory[]): number {
    if (stories.length === 0) return 0;
    const sum = stories.reduce((acc, s) => acc + s.qualityScore.finalScore, 0);
    return Math.round(sum / stories.length);
  }
}
