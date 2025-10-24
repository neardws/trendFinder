import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

interface Story {
  headline: string;
  link: string;
  date_posted: string;
  imageUrl?: string;
  author?: string;
  pubDate?: string;
  source: "account" | "search";
  searchQuery?: string;
  qualityScore?: {
    relevance: number;
    quality: number;
    novelty: number;
    impact: number;
    finalScore: number;
  };
}

export interface Topic {
  id: string;
  name: string;
  summary: string;
  storyCount: number;
  stories: Story[];
  keywords: string[];
}

/**
 * AI-powered topic clustering
 * Automatically groups stories into 5-8 thematic topics
 */
export class TopicClustering {
  private deepseek: OpenAI;

  constructor() {
    this.deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
  }

  /**
   * Cluster stories into topics using AI
   */
  async clusterStories(stories: Story[]): Promise<Topic[]> {
    console.log(`🔍 Clustering ${stories.length} stories into topics...`);

    if (stories.length === 0) {
      return [];
    }

    // Step 1: Use AI to identify topics and assign stories
    const topicAssignments = await this.identifyTopics(stories);

    // Step 2: Group stories by topic
    const topics = this.groupStoriesByTopic(stories, topicAssignments);

    console.log(`✅ Identified ${topics.length} topics`);
    topics.forEach((topic) => {
      console.log(`   - ${topic.name}: ${topic.storyCount} stories`);
    });

    return topics;
  }

  /**
   * Use AI to identify topics and assign each story to a topic
   */
  private async identifyTopics(stories: Story[]): Promise<{
    topics: Array<{ id: string; name: string; summary: string; keywords: string[] }>;
    assignments: { [storyIndex: number]: string }; // storyIndex -> topicId
  }> {
    // Prepare story summaries for AI
    const storySummaries = stories.map((story, index) => ({
      index,
      headline: story.headline,
      author: story.author || "Unknown",
    }));

    const prompt = `分析以下 ${stories.length} 条 AI 领域的推文/新闻，将它们自动聚类为 5-8 个主题。

要求：
1. 识别核心主题（如：大模型产品、AI研究、行业动态、政策法规、投融资等）
2. 为每个主题生成：
   - 主题名称（简洁，5字内）
   - 主题摘要（50字内，概括核心内容）
   - 关键词列表（3-5个）
3. 将每条内容分配到最相关的主题

内容列表：
${storySummaries.map((s) => `[${s.index}] ${s.headline} (by @${s.author})`).join("\n")}

输出严格的 JSON 格式：
{
  "topics": [
    {
      "id": "t1",
      "name": "主题名称",
      "summary": "主题摘要（50字内）",
      "keywords": ["关键词1", "关键词2", "关键词3"]
    }
  ],
  "assignments": {
    "0": "t1",
    "1": "t2",
    "2": "t1"
  }
}`;

    try {
      const completion = await this.deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是 AI 趋势分析专家，擅长将 AI 领域的内容进行主题聚类和分类。",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return result;
    } catch (error: any) {
      console.error("Error identifying topics:", error.message);
      // Fallback: create a single "其他" topic
      return {
        topics: [
          {
            id: "t1",
            name: "AI动态",
            summary: "今日AI领域综合动态",
            keywords: ["AI", "技术", "产品"],
          },
        ],
        assignments: Object.fromEntries(stories.map((_, i) => [i.toString(), "t1"])),
      };
    }
  }

  /**
   * Group stories by topic based on AI assignments
   */
  private groupStoriesByTopic(
    stories: Story[],
    topicAssignments: {
      topics: Array<{ id: string; name: string; summary: string; keywords: string[] }>;
      assignments: { [storyIndex: number]: string };
    }
  ): Topic[] {
    const topicMap = new Map<string, Topic>();

    // Initialize topics
    topicAssignments.topics.forEach((topicInfo) => {
      topicMap.set(topicInfo.id, {
        id: topicInfo.id,
        name: topicInfo.name,
        summary: topicInfo.summary,
        keywords: topicInfo.keywords,
        storyCount: 0,
        stories: [],
      });
    });

    // Assign stories to topics
    Object.entries(topicAssignments.assignments).forEach(([indexStr, topicId]) => {
      const index = parseInt(indexStr);
      if (index >= 0 && index < stories.length) {
        const topic = topicMap.get(topicId);
        if (topic) {
          topic.stories.push(stories[index]);
          topic.storyCount++;
        }
      }
    });

    // Filter out empty topics and sort by story count
    return Array.from(topicMap.values())
      .filter((topic) => topic.storyCount > 0)
      .sort((a, b) => b.storyCount - a.storyCount);
  }
}
