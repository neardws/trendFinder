import { Topic } from "./topicClustering";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export interface RelationshipResult {
  topicRelationships: Array<{
    topic1: string;
    topic2: string;
    relationship: string;
    strength: "strong" | "moderate" | "weak";
  }>;
  technologyConnections: Array<{
    technology: string;
    relatedTopics: string[];
    description: string;
  }>;
  crossTopicInsights: string[];
  relationshipGraph: string; // Mermaid diagram
}

/**
 * Analyze relationships between topics and technologies
 */
export class RelationshipAnalysis {
  private deepseek: OpenAI;

  constructor() {
    this.deepseek = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  /**
   * Analyze relationships between topics
   */
  async analyze(topics: Topic[]): Promise<RelationshipResult> {
    console.log("🔗 Analyzing topic relationships...");

    try {
      // Use AI to identify relationships
      const relationships = await this.identifyRelationships(topics);

      // Generate relationship graph
      const relationshipGraph = this.generateRelationshipGraph(
        topics,
        relationships.topicRelationships
      );

      console.log("✅ Relationship analysis complete");

      return {
        ...relationships,
        relationshipGraph,
      };
    } catch (error) {
      console.error("Error analyzing relationships:", error);
      return this.generateFallbackAnalysis(topics);
    }
  }

  /**
   * Use AI to identify relationships between topics
   */
  private async identifyRelationships(topics: Topic[]): Promise<Omit<RelationshipResult, "relationshipGraph">> {
    const prompt = `你是 AI 领域关系分析专家。分析以下 ${topics.length} 个话题之间的关联关系：

${topics.map((t, i) => `
**话题 ${i + 1}: ${t.name}**
- 概述: ${t.summary}
- 关键词: ${t.keywords.join("、")}
- 内容数: ${t.storyCount}
`).join("\n")}

请分析：

1. **话题关联**: 识别话题之间的关系（因果、并列、包含、对比等）
2. **技术连接**: 提取共同涉及的技术/概念，找出跨话题的技术趋势
3. **跨话题洞察**: 综合多个话题发现的深层次洞察

以 JSON 格式返回，结构如下：
{
  "topicRelationships": [
    {
      "topic1": "话题1名称",
      "topic2": "话题2名称",
      "relationship": "关系描述（如：技术应用关系、竞争关系、协同发展等）",
      "strength": "strong" | "moderate" | "weak"
    }
  ],
  "technologyConnections": [
    {
      "technology": "技术/概念名称",
      "relatedTopics": ["话题1", "话题2"],
      "description": "该技术如何连接这些话题"
    }
  ],
  "crossTopicInsights": [
    "洞察1: 综合多个话题发现的趋势",
    "洞察2: 跨领域的技术融合趋势"
  ]
}

要求：
- 只识别有意义的关联（strength 至少为 moderate）
- 技术连接至少涉及 2 个话题
- 跨话题洞察要具体且有价值`;

    const completion = await this.deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是 AI 领域关系分析专家，擅长发现话题和技术之间的深层关联。",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return {
      topicRelationships: result.topicRelationships || [],
      technologyConnections: result.technologyConnections || [],
      crossTopicInsights: result.crossTopicInsights || [],
    };
  }

  /**
   * Generate Mermaid relationship graph
   */
  private generateRelationshipGraph(
    topics: Topic[],
    relationships: Array<{ topic1: string; topic2: string; relationship: string; strength: string }>
  ): string {
    if (topics.length === 0 || relationships.length === 0) {
      return "";
    }

    // Build nodes
    const nodes = topics.map((topic, index) => {
      const nodeId = `T${index + 1}`;
      const shortName = topic.name.substring(0, 15) + (topic.name.length > 15 ? "..." : "");
      return `    ${nodeId}["${shortName}"]`;
    });

    // Build edges
    const topicNameToId = new Map(topics.map((t, i) => [t.name, `T${i + 1}`]));
    const edges = relationships
      .filter((r) => r.strength !== "weak")
      .map((r) => {
        const id1 = topicNameToId.get(r.topic1);
        const id2 = topicNameToId.get(r.topic2);
        if (!id1 || !id2) return null;

        const edgeStyle = r.strength === "strong" ? "==>" : "-->";
        const label = r.relationship.substring(0, 10) + (r.relationship.length > 10 ? "..." : "");
        return `    ${id1} ${edgeStyle}|${label}| ${id2}`;
      })
      .filter((e) => e !== null);

    if (edges.length === 0) {
      return "";
    }

    return `\`\`\`mermaid
graph TB
${nodes.join("\n")}
${edges.join("\n")}
\`\`\``;
  }

  /**
   * Generate fallback analysis if AI fails
   */
  private generateFallbackAnalysis(topics: Topic[]): RelationshipResult {
    // Simple keyword-based relationship detection
    const topicRelationships: any[] = [];

    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const topic1 = topics[i];
        const topic2 = topics[j];

        // Check keyword overlap
        const commonKeywords = topic1.keywords.filter((k) =>
          topic2.keywords.includes(k)
        );

        if (commonKeywords.length >= 2) {
          topicRelationships.push({
            topic1: topic1.name,
            topic2: topic2.name,
            relationship: `共同关注: ${commonKeywords.join("、")}`,
            strength: "moderate" as const,
          });
        }
      }
    }

    return {
      topicRelationships,
      technologyConnections: [],
      crossTopicInsights: ["多个话题共同关注的关键词表明技术趋势的交叉融合"],
      relationshipGraph: this.generateRelationshipGraph(topics, topicRelationships),
    };
  }
}
