import { getDatabase } from "./initDatabase";
import { Topic } from "../analysis/topicClustering";

interface Story {
  headline: string;
  link: string;
  author?: string;
  date_posted: string;
  source: "account" | "search";
  qualityScore?: {
    finalScore: number;
  };
}

/**
 * History storage for tracking trends over time
 */
export class HistoryStorage {
  private db;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Save daily report data
   */
  saveDailyReport(
    stories: Story[],
    topics: Topic[],
    avgQualityScore: number
  ): number {
    const date = new Date().toISOString().split("T")[0];

    console.log("💾 Saving daily report to database...");

    try {
      // Insert daily report
      const insertReport = this.db.prepare(`
        INSERT INTO daily_reports (date, total_stories, quality_passed, avg_quality_score, topic_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = insertReport.run(
        date,
        stories.length,
        stories.length,
        avgQualityScore,
        topics.length,
        new Date().toISOString()
      );

      const reportId = result.lastInsertRowid as number;

      // Insert stories
      const insertStory = this.db.prepare(`
        INSERT INTO daily_stories (report_id, headline, link, author, date_posted, source, quality_score, topic_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertManyStories = this.db.transaction((stories: Story[], topics: Topic[]) => {
        // Create story to topic mapping
        const storyToTopic = new Map<string, string>();
        topics.forEach((topic) => {
          topic.stories.forEach((story) => {
            storyToTopic.set(story.link, topic.id);
          });
        });

        stories.forEach((story) => {
          insertStory.run(
            reportId,
            story.headline,
            story.link,
            story.author || null,
            story.date_posted,
            story.source,
            story.qualityScore?.finalScore || null,
            storyToTopic.get(story.link) || null,
            new Date().toISOString()
          );
        });
      });

      insertManyStories(stories, topics);

      // Insert topics
      const insertTopic = this.db.prepare(`
        INSERT INTO daily_topics (report_id, topic_id, topic_name, topic_summary, story_count, keywords, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertManyTopics = this.db.transaction((topics: Topic[]) => {
        topics.forEach((topic) => {
          insertTopic.run(
            reportId,
            topic.id,
            topic.name,
            topic.summary,
            topic.storyCount,
            JSON.stringify(topic.keywords),
            new Date().toISOString()
          );
        });
      });

      insertManyTopics(topics);

      // Update trending topics
      this.updateTrendingTopics(date, topics);

      // Update account activity
      this.updateAccountActivity(date, stories);

      console.log(`✅ Saved report (ID: ${reportId}) with ${stories.length} stories and ${topics.length} topics`);

      return reportId;
    } catch (error: any) {
      console.error("Error saving daily report:", error.message);
      throw error;
    }
  }

  /**
   * Update trending topics table
   */
  private updateTrendingTopics(date: string, topics: Topic[]) {
    const insertTrending = this.db.prepare(`
      INSERT INTO trending_topics (date, topic_name, frequency, avg_quality, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((topics: Topic[]) => {
      topics.forEach((topic) => {
        const avgQuality = this.calculateAvgQuality(topic.stories);
        insertTrending.run(
          date,
          topic.name,
          topic.storyCount,
          avgQuality,
          new Date().toISOString()
        );
      });
    });

    insertMany(topics);
  }

  /**
   * Update account activity table
   */
  private updateAccountActivity(date: string, stories: Story[]) {
    const accountStats = new Map<string, { count: number; totalQuality: number }>();

    stories.forEach((story) => {
      if (story.author) {
        const stats = accountStats.get(story.author) || { count: 0, totalQuality: 0 };
        stats.count++;
        stats.totalQuality += story.qualityScore?.finalScore || 0;
        accountStats.set(story.author, stats);
      }
    });

    const insertActivity = this.db.prepare(`
      INSERT INTO account_activity (date, account, tweet_count, avg_quality, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((entries: [string, any][]) => {
      entries.forEach(([account, stats]) => {
        const avgQuality = stats.count > 0 ? stats.totalQuality / stats.count : 0;
        insertActivity.run(
          date,
          account,
          stats.count,
          avgQuality,
          new Date().toISOString()
        );
      });
    });

    insertMany(Array.from(accountStats.entries()));
  }

  /**
   * Calculate average quality score
   */
  private calculateAvgQuality(stories: any[]): number {
    if (stories.length === 0) return 0;
    const sum = stories.reduce(
      (acc, s) => acc + (s.qualityScore?.finalScore || 0),
      0
    );
    return sum / stories.length;
  }

  /**
   * Get historical data for last N days
   */
  getHistoricalData(days: number = 7) {
    const query = `
      SELECT * FROM daily_reports
      WHERE date >= date('now', '-${days} days')
      ORDER BY date DESC
    `;
    return this.db.prepare(query).all();
  }

  /**
   * Get trending topics for last N days
   */
  getTrendingTopics(days: number = 7) {
    const query = `
      SELECT topic_name, SUM(frequency) as total_frequency, AVG(avg_quality) as avg_quality
      FROM trending_topics
      WHERE date >= date('now', '-${days} days')
      GROUP BY topic_name
      ORDER BY total_frequency DESC
    `;
    return this.db.prepare(query).all();
  }

  /**
   * Get account activity for last N days
   */
  getAccountActivity(days: number = 7) {
    const query = `
      SELECT account, SUM(tweet_count) as total_tweets, AVG(avg_quality) as avg_quality
      FROM account_activity
      WHERE date >= date('now', '-${days} days')
      GROUP BY account
      ORDER BY total_tweets DESC
    `;
    return this.db.prepare(query).all();
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}
