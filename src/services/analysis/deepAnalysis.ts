import OpenAI from "openai";
import dotenv from "dotenv";
import { Topic } from "./topicClustering";

dotenv.config();

export interface TopicAnalysis {
  topicId: string;
  topicName: string;
  technicalAnalysis: string; // 300-500字技术解读
  impactAssessment: {
    shortTerm: string; // 1-3个月影响
    longTerm: string; // 6-12个月影响
  };
  recommendations: {
    papers: Array<{ title: string; description: string }>;
    tools: Array<{ name: string; description: string }>;
    accounts: Array<{ handle: string; reason: string }>;
  };
  keyInsights: string[]; // 3-5个核心洞察
}

/**
 * Deep analysis for each topic
 * Generates technical insights, impact assessment, and recommendations
 */
export class DeepAnalysis {
  private deepseek: OpenAI;

  constructor() {
    this.deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
  }

  /**
   * Analyze all topics in depth
   */
  async analyzeTopics(topics: Topic[]): Promise<Map<string, TopicAnalysis>> {
    console.log(`🔬 Performing deep analysis on ${topics.length} topics...`);

    const analyses = new Map<string, TopicAnalysis>();

    for (const topic of topics) {
      try {
        const analysis = await this.analyzeSingleTopic(topic);
        analyses.set(topic.id, analysis);
        console.log(`   ✅ Analyzed: ${topic.name}`);

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`   ❌ Error analyzing ${topic.name}:`, error.message);
      }
    }

    console.log(`✅ Deep analysis complete for ${analyses.size} topics`);
    return analyses;
  }

  /**
   * Analyze a single topic
   */
  private async analyzeSingleTopic(topic: Topic): Promise<TopicAnalysis> {
    // Prepare story summaries
    const storySummaries = topic.stories
      .map((story) => `- ${story.headline} (by @${story.author || "Unknown"})`)
      .join("\n");

    const prompt = `深度分析这个 AI 主题：

**主题名称:** ${topic.name}
**主题摘要:** ${topic.summary}
**关键词:** ${topic.keywords.join(", ")}
**内容数量:** ${topic.storyCount} 条

**相关内容:**
${storySummaries}

请生成以下分析（严格按JSON格式输出）：

1. **技术解读** (technicalAnalysis, 300-500字):
   - 技术背景和原理
   - 创新点和突破
   - 技术难点和解决方案
   - 与现有技术的对比

2. **影响评估** (impactAssessment):
   - 短期影响 (shortTerm, 150字): 1-3个月对行业、技术、产品的影响
   - 长期影响 (longTerm, 150字): 6-12个月的深远影响和潜在变革

3. **相关推荐** (recommendations):
   - 相关论文 (papers, 2-3篇): 标题和简短描述
   - 推荐工具 (tools, 2-3个): 名称和用途
   - 关注账号 (accounts, 2-3个): 账号名和推荐理由

4. **核心洞察** (keyInsights, 3-5条):
   - 关键发现和洞察
   - 每条30字内

输出严格的 JSON 格式：
{
  "technicalAnalysis": "技术解读内容...",
  "impactAssessment": {
    "shortTerm": "短期影响...",
    "longTerm": "长期影响..."
  },
  "recommendations": {
    "papers": [
      {"title": "论文标题", "description": "论文描述"}
    ],
    "tools": [
      {"name": "工具名称", "description": "工具描述"}
    ],
    "accounts": [
      {"handle": "@账号名", "reason": "推荐理由"}
    ]
  },
  "keyInsights": [
    "洞察1",
    "洞察2",
    "洞察3"
  ]
}`;

    const completion = await this.deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "你是资深 AI 技术专家和行业分析师，擅长深度技术解读和趋势分析。分析要客观、专业、有深度。",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return {
      topicId: topic.id,
      topicName: topic.name,
      technicalAnalysis: result.technicalAnalysis || "暂无技术解读",
      impactAssessment: result.impactAssessment || {
        shortTerm: "暂无短期影响评估",
        longTerm: "暂无长期影响评估",
      },
      recommendations: result.recommendations || {
        papers: [],
        tools: [],
        accounts: [],
      },
      keyInsights: result.keyInsights || [],
    };
  }
}
