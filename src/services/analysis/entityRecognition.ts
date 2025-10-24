import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export interface Entity {
  name: string;
  type: "person" | "company" | "product" | "technology" | "organization";
  context: string; // 出现的上下文
  confidence: number; // 0-1 置信度
}

export interface EntityMention {
  entityName: string;
  storyLink: string;
  context: string;
  timestamp: string;
}

export interface EntityRelationship {
  entity1: string;
  entity2: string;
  relationshipType: string; // 如 "创始人"、"竞争对手"、"使用"
  confidence: number;
}

export interface EntityRecognitionResult {
  entities: Entity[];
  relationships: EntityRelationship[];
  summary: string;
}

/**
 * AI-powered entity recognition for identifying persons, companies, products, and technologies
 */
export class EntityRecognition {
  private deepseek: OpenAI;

  constructor() {
    this.deepseek = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  /**
   * Extract entities from stories
   */
  async extractEntities(stories: any[]): Promise<EntityRecognitionResult> {
    console.log("🔍 Extracting entities from stories...");

    try {
      // Prepare content for AI analysis
      const content = this.prepareContent(stories);

      // Use AI to extract entities
      const result = await this.aiExtractEntities(content);

      console.log(`✅ Extracted ${result.entities.length} entities and ${result.relationships.length} relationships`);

      return result;
    } catch (error) {
      console.error("Error extracting entities:", error);
      return this.generateFallbackResult();
    }
  }

  /**
   * Prepare content for AI processing
   */
  private prepareContent(stories: any[]): string {
    return stories
      .slice(0, 50) // 限制处理数量
      .map((story, index) => {
        return `[${index + 1}] ${story.headline}\n${story.description || ""}`;
      })
      .join("\n\n");
  }

  /**
   * Use AI to extract entities and relationships
   */
  private async aiExtractEntities(content: string): Promise<EntityRecognitionResult> {
    const prompt = `你是一个专业的实体识别系统，专注于 AI/科技领域。请从以下内容中提取关键实体和它们之间的关系。

**内容:**
${content}

**任务:**
1. 识别所有重要实体并分类：
   - person: 人物（创始人、CEO、研究员等）
   - company: 公司（OpenAI、Google、Meta 等）
   - product: 产品（GPT-4、Claude、Gemini 等）
   - technology: 技术（Transformer、RAG、LoRA 等）
   - organization: 组织（大学、研究机构等）

2. 识别实体之间的关系：
   - 人物-公司关系（创始人、CEO、员工）
   - 公司-产品关系（开发、发布）
   - 产品-技术关系（使用、基于）
   - 竞争关系
   - 合作关系

3. 每个实体提供：
   - name: 实体名称
   - type: 类型
   - context: 简短上下文（一句话说明这个实体在做什么或代表什么）
   - confidence: 置信度 (0.5-1.0)

4. 提供一句话总结本批内容中的关键实体和趋势

以 JSON 格式返回：
{
  "entities": [
    {"name": "Sam Altman", "type": "person", "context": "OpenAI CEO", "confidence": 0.95},
    {"name": "OpenAI", "type": "company", "context": "AI 研究公司", "confidence": 1.0}
  ],
  "relationships": [
    {"entity1": "Sam Altman", "entity2": "OpenAI", "relationshipType": "CEO", "confidence": 0.95}
  ],
  "summary": "本批内容主要涉及..."
}

注意：
- 只提取确定性高的实体（confidence >= 0.7）
- 相同实体的不同表述统一为标准名称
- 关系必须明确且有依据`;

    const completion = await this.deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是专业的 AI 领域实体识别系统，精通识别科技公司、产品、技术和人物。",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // 降低温度以提高准确性
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return {
      entities: result.entities || [],
      relationships: result.relationships || [],
      summary: result.summary || "实体提取完成",
    };
  }

  /**
   * Merge entities from multiple batches
   */
  mergeEntities(results: EntityRecognitionResult[]): EntityRecognitionResult {
    const entityMap = new Map<string, Entity>();
    const relationshipSet = new Set<string>();
    const relationships: EntityRelationship[] = [];

    // 合并实体（去重，保留高置信度）
    results.forEach((result) => {
      result.entities.forEach((entity) => {
        const existing = entityMap.get(entity.name);
        if (!existing || entity.confidence > existing.confidence) {
          entityMap.set(entity.name, entity);
        }
      });

      // 合并关系（去重）
      result.relationships.forEach((rel) => {
        const key = `${rel.entity1}|${rel.entity2}|${rel.relationshipType}`;
        if (!relationshipSet.has(key)) {
          relationshipSet.add(key);
          relationships.push(rel);
        }
      });
    });

    return {
      entities: Array.from(entityMap.values()),
      relationships,
      summary: `共识别 ${entityMap.size} 个实体和 ${relationships.length} 个关系`,
    };
  }

  /**
   * Generate Mermaid graph for entity relationships
   */
  generateEntityGraph(entities: Entity[], relationships: EntityRelationship[]): string {
    if (entities.length === 0 || relationships.length === 0) {
      return "";
    }

    // 创建实体ID映射
    const entityToId = new Map<string, string>();
    entities.forEach((entity, index) => {
      entityToId.set(entity.name, `E${index + 1}`);
    });

    // 生成节点（按类型分组）
    const personNodes: string[] = [];
    const companyNodes: string[] = [];
    const productNodes: string[] = [];
    const techNodes: string[] = [];

    entities.forEach((entity) => {
      const id = entityToId.get(entity.name)!;
      const shortName = entity.name.length > 12 ? entity.name.substring(0, 12) + "..." : entity.name;
      const node = `    ${id}["${shortName}"]`;

      switch (entity.type) {
        case "person":
          personNodes.push(node);
          break;
        case "company":
          companyNodes.push(node);
          break;
        case "product":
          productNodes.push(node);
          break;
        case "technology":
          techNodes.push(node);
          break;
      }
    });

    // 生成边
    const edges = relationships
      .slice(0, 20) // 限制显示数量
      .map((rel) => {
        const id1 = entityToId.get(rel.entity1);
        const id2 = entityToId.get(rel.entity2);
        if (!id1 || !id2) return null;

        const label = rel.relationshipType.length > 6
          ? rel.relationshipType.substring(0, 6) + "..."
          : rel.relationshipType;
        return `    ${id1} -->|${label}| ${id2}`;
      })
      .filter((e) => e !== null);

    let graph = `\`\`\`mermaid\ngraph TB\n`;

    // 添加子图分组
    if (personNodes.length > 0) {
      graph += `    subgraph 人物\n${personNodes.map(n => "    " + n).join("\n")}\n    end\n`;
    }
    if (companyNodes.length > 0) {
      graph += `    subgraph 公司\n${companyNodes.map(n => "    " + n).join("\n")}\n    end\n`;
    }
    if (productNodes.length > 0) {
      graph += `    subgraph 产品\n${productNodes.map(n => "    " + n).join("\n")}\n    end\n`;
    }
    if (techNodes.length > 0) {
      graph += `    subgraph 技术\n${techNodes.map(n => "    " + n).join("\n")}\n    end\n`;
    }

    graph += `\n${edges.join("\n")}\n\`\`\``;

    return graph;
  }

  /**
   * Generate fallback result if AI fails
   */
  private generateFallbackResult(): EntityRecognitionResult {
    return {
      entities: [],
      relationships: [],
      summary: "实体提取失败，需要更多数据",
    };
  }

  /**
   * Get top entities by type
   */
  getTopEntitiesByType(entities: Entity[], type: Entity["type"], limit: number = 10): Entity[] {
    return entities
      .filter((e) => e.type === type)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
}
