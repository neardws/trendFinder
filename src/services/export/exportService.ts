import { HTMLGenerator, HTMLReportData } from "./htmlGenerator";
import { PDFGenerator, PDFOptions } from "./pdfGenerator";
import * as fs from "fs";
import * as path from "path";
import { getDatabase } from "../storage/initDatabase";

// Re-export HTMLReportData for external use
export { HTMLReportData } from "./htmlGenerator";

export type ExportFormat = "html" | "pdf" | "json" | "markdown";

export interface ExportOptions {
  format: ExportFormat;
  outputDir?: string;
  filename?: string;
  pdfOptions?: PDFOptions;
}

export interface ExportResult {
  format: ExportFormat;
  filePath: string;
  fileSize: number;
  success: boolean;
  error?: string;
}

/**
 * Unified export service for generating reports in multiple formats
 */
export class ExportService {
  private htmlGenerator: HTMLGenerator;
  private pdfGenerator: PDFGenerator;
  private defaultOutputDir: string;

  constructor() {
    this.htmlGenerator = new HTMLGenerator();
    this.pdfGenerator = new PDFGenerator();
    this.defaultOutputDir = path.join(process.cwd(), "exports");

    // Ensure exports directory exists
    if (!fs.existsSync(this.defaultOutputDir)) {
      fs.mkdirSync(this.defaultOutputDir, { recursive: true });
    }
  }

  /**
   * Export report in specified format
   */
  async export(
    data: HTMLReportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    console.log(`📦 Exporting report in ${options.format} format...`);

    try {
      const outputDir = options.outputDir || this.defaultOutputDir;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const baseFilename = options.filename || `ai-trend-report-${timestamp}`;

      switch (options.format) {
        case "html":
          return await this.exportHTML(data, outputDir, baseFilename);

        case "pdf":
          return await this.exportPDF(data, outputDir, baseFilename, options.pdfOptions);

        case "json":
          return await this.exportJSON(data, outputDir, baseFilename);

        case "markdown":
          return await this.exportMarkdown(data, outputDir, baseFilename);

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error(`Error exporting report:`, error);
      return {
        format: options.format,
        filePath: "",
        fileSize: 0,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Export all formats simultaneously
   */
  async exportAll(data: HTMLReportData, outputDir?: string): Promise<ExportResult[]> {
    console.log("📦 Exporting report in all formats...");

    const formats: ExportFormat[] = ["html", "pdf", "json", "markdown"];
    const results: ExportResult[] = [];

    for (const format of formats) {
      const result = await this.export(data, { format, outputDir });
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Exported ${successCount}/${formats.length} formats successfully`);

    return results;
  }

  /**
   * Export as HTML
   */
  private async exportHTML(
    data: HTMLReportData,
    outputDir: string,
    filename: string
  ): Promise<ExportResult> {
    const filePath = path.join(outputDir, `${filename}.html`);

    try {
      const html = await this.htmlGenerator.generate(data);
      fs.writeFileSync(filePath, html, "utf-8");

      const stats = fs.statSync(filePath);

      // Save export history
      this.saveExportHistory(0, "html", filePath, stats.size);

      return {
        format: "html",
        filePath,
        fileSize: stats.size,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export as PDF
   */
  private async exportPDF(
    data: HTMLReportData,
    outputDir: string,
    filename: string,
    pdfOptions?: PDFOptions
  ): Promise<ExportResult> {
    const filePath = path.join(outputDir, `${filename}.pdf`);

    try {
      // Generate HTML first
      const html = await this.htmlGenerator.generate(data);

      // Convert to PDF
      await this.pdfGenerator.generate(html, filePath, pdfOptions);

      const stats = fs.statSync(filePath);

      // Save export history
      this.saveExportHistory(0, "pdf", filePath, stats.size);

      return {
        format: "pdf",
        filePath,
        fileSize: stats.size,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export as JSON
   */
  private async exportJSON(
    data: HTMLReportData,
    outputDir: string,
    filename: string
  ): Promise<ExportResult> {
    const filePath = path.join(outputDir, `${filename}.json`);

    try {
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, json, "utf-8");

      const stats = fs.statSync(filePath);

      // Save export history
      this.saveExportHistory(0, "json", filePath, stats.size);

      return {
        format: "json",
        filePath,
        fileSize: stats.size,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export as Markdown
   */
  private async exportMarkdown(
    data: HTMLReportData,
    outputDir: string,
    filename: string
  ): Promise<ExportResult> {
    const filePath = path.join(outputDir, `${filename}.md`);

    try {
      let markdown = `# ${data.title}\n\n`;
      markdown += `**日期:** ${data.date}\n\n`;

      // Overview
      markdown += `## 📈 今日概览\n\n`;
      markdown += `- **收集内容:** ${data.overview.totalStories} 条\n`;
      markdown += `- **识别主题:** ${data.overview.totalTopics} 个\n`;
      markdown += `- **质量评分:** ${data.overview.avgQualityScore} 分\n`;
      markdown += `- **活跃账号:** ${data.overview.topAccounts} 个\n\n`;

      // Topics
      if (data.topics && data.topics.length > 0) {
        markdown += `## 📑 专题报告\n\n`;

        data.topics.forEach((topic, index) => {
          markdown += `### ${topic.emoji} 专题${index + 1}：${topic.name}\n\n`;
          markdown += `**📝 专题概述**\n\n${topic.summary}\n\n`;
          markdown += `**🏷️ 关键词:** ${topic.keywords.join("、")}\n\n`;

          markdown += `#### 🔍 核心事件\n\n`;
          topic.stories.forEach((story, storyIndex) => {
            markdown += `**${storyIndex + 1}. ${story.headline}**\n\n`;
            markdown += `👤 ${story.author || "Unknown"} | 📅 ${story.date} | 📍 ${story.source === "account" ? "账号追踪" : "关键词搜索"}\n\n`;
            markdown += `🔗 [查看原文](${story.link})\n\n`;
            markdown += `---\n\n`;
          });

          if (topic.analysis) {
            markdown += `#### 🔬 深度分析\n\n`;
            if (topic.analysis.technical) {
              markdown += `**技术解读**\n\n${topic.analysis.technical}\n\n`;
            }
            if (topic.analysis.impact) {
              markdown += `**影响评估**\n\n${topic.analysis.impact}\n\n`;
            }
          }

          if (topic.insights && topic.insights.length > 0) {
            markdown += `**💡 核心洞察**\n\n`;
            topic.insights.forEach(insight => {
              markdown += `- ${insight}\n`;
            });
            markdown += `\n`;
          }

          markdown += `\n`;
        });
      }

      // Entities
      if (data.entities && data.entities.length > 0) {
        markdown += `## 🔍 实体识别\n\n`;
        data.entities.forEach(entity => {
          const icon = this.getEntityIcon(entity.type);
          markdown += `- ${icon} **${entity.name}** (${this.getEntityTypeLabel(entity.type)}): ${entity.context}\n`;
        });
        markdown += `\n`;
      }

      // Influence
      if (data.influence && data.influence.length > 0) {
        markdown += `## 🏆 影响力排行\n\n`;
        data.influence.forEach(item => {
          const trendIcon = item.trend === "rising" ? "📈" : item.trend === "declining" ? "📉" : "➡️";
          markdown += `${item.rank}. **@${item.account}** ${trendIcon} - 评分: ${item.score}\n`;
        });
        markdown += `\n`;
      }

      // Footer
      markdown += `---\n\n`;
      markdown += `🤖 由 [TrendFinder](https://github.com/neardws/trendFinder) 自动生成\n`;

      fs.writeFileSync(filePath, markdown, "utf-8");

      const stats = fs.statSync(filePath);

      // Save export history
      this.saveExportHistory(0, "markdown", filePath, stats.size);

      return {
        format: "markdown",
        filePath,
        fileSize: stats.size,
        success: true,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save export history to database
   */
  private saveExportHistory(
    reportId: number,
    format: string,
    filePath: string,
    fileSize: number
  ) {
    try {
      const db = getDatabase();
      const insertHistory = db.prepare(`
        INSERT INTO export_history (report_id, format, file_path, file_size, exported_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertHistory.run(
        reportId,
        format,
        filePath,
        fileSize,
        new Date().toISOString()
      );
    } catch (error) {
      console.warn("Could not save export history:", error);
    }
  }

  /**
   * Get entity type icon
   */
  private getEntityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      person: "👤",
      company: "🏢",
      product: "📱",
      technology: "🔧",
      organization: "🏛️",
    };
    return icons[type] || "📌";
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
