import * as Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import juice from "juice";

export interface HTMLReportData {
  title: string;
  date: string;
  overview: {
    totalStories: number;
    totalTopics: number;
    avgQualityScore: number;
    topAccounts: number;
  };
  topics: Array<{
    emoji: string;
    name: string;
    summary: string;
    keywords: string[];
    stories: Array<{
      headline: string;
      author?: string;
      date: string;
      link: string;
      source: string;
    }>;
    analysis?: {
      technical?: string;
      impact?: string;
    };
    insights?: string[];
  }>;
  entities?: Array<{
    name: string;
    type: string;
    context: string;
  }>;
  influence?: Array<{
    rank: number;
    account: string;
    score: number;
    trend: string;
  }>;
}

/**
 * Generate HTML reports from report data
 */
export class HTMLGenerator {
  private template: HandlebarsTemplateDelegate;

  constructor() {
    // Load and compile template
    const templatePath = path.join(__dirname, "templates", "report.hbs");
    const templateSource = fs.readFileSync(templatePath, "utf-8");
    this.template = Handlebars.compile(templateSource);

    // Register helpers
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers() {
    // Format date helper
    Handlebars.registerHelper("formatDate", (date: string) => {
      return new Date(date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    });

    // Trend icon helper
    Handlebars.registerHelper("trendIcon", (trend: string) => {
      switch (trend) {
        case "rising":
          return "📈";
        case "declining":
          return "📉";
        default:
          return "➡️";
      }
    });

    // Entity type icon helper
    Handlebars.registerHelper("entityIcon", (type: string) => {
      switch (type) {
        case "person":
          return "👤";
        case "company":
          return "🏢";
        case "product":
          return "📱";
        case "technology":
          return "🔧";
        default:
          return "📌";
      }
    });
  }

  /**
   * Generate HTML report
   */
  async generate(data: HTMLReportData): Promise<string> {
    console.log("🎨 Generating HTML report...");

    try {
      // Build content HTML
      const content = this.buildContent(data);

      // Render template
      const html = this.template({
        title: data.title,
        date: data.date,
        content,
        generatedAt: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      });

      // Inline CSS for better email compatibility
      const inlinedHTML = juice(html);

      console.log("✅ HTML report generated");
      return inlinedHTML;
    } catch (error) {
      console.error("Error generating HTML:", error);
      throw error;
    }
  }

  /**
   * Build content HTML
   */
  private buildContent(data: HTMLReportData): string {
    let html = "";

    // Overview section
    html += this.buildOverview(data.overview);

    // Topics section
    if (data.topics && data.topics.length > 0) {
      html += this.buildTopics(data.topics);
    }

    // Entities section
    if (data.entities && data.entities.length > 0) {
      html += this.buildEntities(data.entities);
    }

    // Influence section
    if (data.influence && data.influence.length > 0) {
      html += this.buildInfluence(data.influence);
    }

    return html;
  }

  /**
   * Build overview section
   */
  private buildOverview(overview: HTMLReportData["overview"]): string {
    return `
      <div class="overview">
        <h2>📈 今日概览</h2>
        <div class="stats">
          <div class="stat-card">
            <div class="label">收集内容</div>
            <div class="value">${overview.totalStories}</div>
          </div>
          <div class="stat-card">
            <div class="label">识别主题</div>
            <div class="value">${overview.totalTopics}</div>
          </div>
          <div class="stat-card">
            <div class="label">质量评分</div>
            <div class="value">${overview.avgQualityScore}</div>
          </div>
          <div class="stat-card">
            <div class="label">活跃账号</div>
            <div class="value">${overview.topAccounts}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build topics section
   */
  private buildTopics(topics: HTMLReportData["topics"]): string {
    let html = `<div class="section"><h2 class="section-title">📑 专题报告</h2>`;

    topics.forEach((topic, index) => {
      html += `
        <div class="topic">
          <div class="topic-header">
            <div class="topic-emoji">${topic.emoji}</div>
            <div class="topic-title">专题${index + 1}：${topic.name}</div>
          </div>

          <div class="topic-summary">
            <strong>📝 专题概述</strong><br>
            ${topic.summary}
          </div>

          <div class="keywords">
            ${topic.keywords.map(kw => `<span class="keyword">${kw}</span>`).join("")}
          </div>

          <h3 style="margin-top: 25px; color: #666;">🔍 核心事件</h3>
      `;

      topic.stories.forEach((story, storyIndex) => {
        html += `
          <div class="story">
            <div class="story-title">${storyIndex + 1}. ${story.headline}</div>
            <div class="story-meta">
              <span>👤 ${story.author || "Unknown"}</span>
              <span>📅 ${new Date(story.date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              <span>📍 ${story.source === "account" ? "账号追踪" : "关键词搜索"}</span>
            </div>
            <a href="${story.link}" class="story-link" target="_blank">🔗 查看原文</a>
          </div>
        `;
      });

      // Add analysis if available
      if (topic.analysis) {
        html += `<div class="analysis">`;
        if (topic.analysis.technical) {
          html += `
            <div class="analysis-title">🔬 技术解读</div>
            <p>${topic.analysis.technical}</p>
          `;
        }
        if (topic.analysis.impact) {
          html += `
            <div class="analysis-title" style="margin-top: 15px;">📊 影响评估</div>
            <p>${topic.analysis.impact}</p>
          `;
        }
        html += `</div>`;
      }

      // Add insights if available
      if (topic.insights && topic.insights.length > 0) {
        html += `
          <div class="insights">
            <div class="insights-title">💡 核心洞察</div>
            <ul>
              ${topic.insights.map(insight => `<li>${insight}</li>`).join("")}
            </ul>
          </div>
        `;
      }

      html += `</div>`; // close topic
    });

    html += `</div>`; // close section
    return html;
  }

  /**
   * Build entities section
   */
  private buildEntities(entities: HTMLReportData["entities"]): string {
    if (!entities || entities.length === 0) {
      return "";
    }

    let html = `
      <div class="section">
        <h2 class="section-title">🔍 实体识别</h2>
        <div class="entity-section">
          <div class="entity-grid">
    `;

    entities.forEach(entity => {
      const icon = this.getEntityIcon(entity.type);
      html += `
        <div class="entity-card">
          <div class="entity-name">${icon} ${entity.name}</div>
          <div class="entity-type">${this.getEntityTypeLabel(entity.type)}</div>
          <div class="entity-context">${entity.context}</div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Build influence section
   */
  private buildInfluence(influence: HTMLReportData["influence"]): string {
    if (!influence || influence.length === 0) {
      return "";
    }

    let html = `
      <div class="section">
        <h2 class="section-title">🏆 影响力排行</h2>
        <div class="influence-section">
    `;

    influence.forEach(item => {
      const trendClass = item.trend === "rising" ? "trend-up" : item.trend === "declining" ? "trend-down" : "";
      const trendIcon = item.trend === "rising" ? "📈" : item.trend === "declining" ? "📉" : "➡️";

      html += `
        <div class="influence-rank">
          <div class="rank-number">#${item.rank}</div>
          <div class="rank-account">@${item.account} <span class="${trendClass}">${trendIcon}</span></div>
          <div class="rank-score">${item.score}</div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Get entity type icon
   */
  private getEntityIcon(type: string): string {
    switch (type) {
      case "person":
        return "👤";
      case "company":
        return "🏢";
      case "product":
        return "📱";
      case "technology":
        return "🔧";
      default:
        return "📌";
    }
  }

  /**
   * Get entity type label
   */
  private getEntityTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      person: "人物",
      company: "公司",
      product: "产品",
      technology: "技术",
      organization: "组织",
    };
    return labels[type] || type;
  }
}
