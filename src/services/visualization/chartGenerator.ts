import { Topic } from "../analysis/topicClustering";

export interface ChartData {
  topicDistribution: string; // Mermaid pie chart
  accountActivity: string; // Mermaid bar chart
  keywordCloud: string; // Text-based word cloud
}

/**
 * Generate visualizations using Mermaid syntax
 * Mermaid charts are natively supported in Markdown
 */
export class ChartGenerator {
  /**
   * Generate all charts for the report
   */
  generateCharts(topics: Topic[], allStories: any[]): ChartData {
    console.log("📊 Generating visualizations...");

    const topicDistribution = this.generateTopicDistributionChart(topics);
    const accountActivity = this.generateAccountActivityChart(allStories);
    const keywordCloud = this.generateKeywordCloud(topics);

    console.log("✅ Visualizations generated");

    return {
      topicDistribution,
      accountActivity,
      keywordCloud,
    };
  }

  /**
   * Generate topic distribution pie chart
   */
  private generateTopicDistributionChart(topics: Topic[]): string {
    if (topics.length === 0) return "";

    const mermaidCode = topics.map((topic) => {
      return `    "${topic.name}" : ${topic.storyCount}`;
    }).join("\n");

    return `\`\`\`mermaid
pie title 主题分布
${mermaidCode}
\`\`\``;
  }

  /**
   * Generate account activity bar chart
   */
  private generateAccountActivityChart(stories: any[]): string {
    // Count tweets per account
    const accountCounts = new Map<string, number>();

    stories.forEach((story) => {
      if (story.author) {
        const count = accountCounts.get(story.author) || 0;
        accountCounts.set(story.author, count + 1);
      }
    });

    // Get top 10 accounts
    const topAccounts = Array.from(accountCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (topAccounts.length === 0) return "";

    const chartData = topAccounts.map(([account, count]) => {
      return `    ${account} : ${count}`;
    }).join("\n");

    return `\`\`\`mermaid
%%{init: {'theme':'base'}}%%
graph TB
    subgraph "账号活跃度 TOP 10"
${chartData}
    end
\`\`\``;
  }

  /**
   * Generate keyword cloud (text-based)
   */
  private generateKeywordCloud(topics: Topic[]): string {
    // Collect all keywords with frequency
    const keywordFrequency = new Map<string, number>();

    topics.forEach((topic) => {
      topic.keywords.forEach((keyword) => {
        const count = keywordFrequency.get(keyword) || 0;
        keywordFrequency.set(keyword, count + topic.storyCount);
      });
    });

    // Sort by frequency
    const sortedKeywords = Array.from(keywordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    if (sortedKeywords.length === 0) return "";

    // Generate text-based word cloud
    const wordCloud = sortedKeywords
      .map(([keyword, freq]: [string, number]) => {
        // Size based on frequency
        if (freq >= 5) return `**${keyword}** (${freq})`;
        if (freq >= 3) return `*${keyword}* (${freq})`;
        return `${keyword} (${freq})`;
      })
      .join(" • ");

    return `🏷️ **关键词热度:**\n\n${wordCloud}`;
  }

  /**
   * Generate topic relationship diagram
   */
  generateTopicRelationship(topic: Topic): string {
    // Simple relationship diagram showing main stories
    const topStories = topic.stories.slice(0, 5);

    if (topStories.length === 0) return "";

    const nodes = topStories.map((story: any, index: number) => {
      const shortTitle = story.headline.substring(0, 20) + "...";
      return `    Topic[${topic.name}] --> Story${index}["${shortTitle}"]`;
    }).join("\n");

    return `\`\`\`mermaid
graph LR
${nodes}
\`\`\``;
  }
}
