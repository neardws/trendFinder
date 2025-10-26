import { getDatabase } from "./initDatabase";
import { InfluenceScore } from "../analysis/influenceScoring";

/**
 * Storage service for influence score data
 */
export class InfluenceStorage {
  private db;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Save influence scores to database
   */
  saveInfluenceScores(scores: InfluenceScore[]): void {
    console.log(`💾 Saving influence scores for ${scores.length} accounts...`);

    const date = new Date().toISOString().split("T")[0];

    const insertScore = this.db.prepare(`
      INSERT INTO influence_scores (
        date, account, overall_score, reach_score, quality_score,
        relevance_score, consistency_score, engagement_score,
        rank, trend, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const saveMany = this.db.transaction((scores: InfluenceScore[]) => {
      const now = new Date().toISOString();
      scores.forEach((score) => {
        insertScore.run(
          date,
          score.account,
          score.overallScore,
          score.dimensions.reach,
          score.dimensions.quality,
          score.dimensions.relevance,
          score.dimensions.consistency,
          score.dimensions.engagement,
          score.rank,
          score.trend,
          now
        );
      });
    });

    saveMany(scores);
    console.log(`✅ Influence scores saved`);
  }

  /**
   * Get influence score history for an account
   */
  getAccountHistory(account: string, days: number = 30): any[] {
    const query = `
      SELECT date, overall_score, reach_score, quality_score,
             relevance_score, consistency_score, engagement_score,
             rank, trend
      FROM influence_scores
      WHERE account = ?
        AND date >= date('now', '-${days} days')
      ORDER BY date DESC
    `;
    return this.db.prepare(query).all(account);
  }

  /**
   * Get top accounts by influence score
   */
  getTopAccounts(date?: string, limit: number = 20): any[] {
    const targetDate = date || new Date().toISOString().split("T")[0];

    const query = `
      SELECT account, overall_score, reach_score, quality_score,
             relevance_score, consistency_score, engagement_score,
             rank, trend
      FROM influence_scores
      WHERE date = ?
      ORDER BY overall_score DESC
      LIMIT ?
    `;
    return this.db.prepare(query).all(targetDate, limit);
  }

  /**
   * Get rising stars (accounts with positive trend)
   */
  getRisingStars(days: number = 7): any[] {
    const query = `
      SELECT account, overall_score, rank, trend,
             AVG(overall_score) as avg_score
      FROM influence_scores
      WHERE date >= date('now', '-${days} days')
        AND trend = 'rising'
      GROUP BY account
      ORDER BY avg_score DESC
      LIMIT 10
    `;
    return this.db.prepare(query).all();
  }

  /**
   * Get influence score trends
   */
  getInfluenceTrends(days: number = 30): any {
    const query = `
      SELECT date,
             AVG(overall_score) as avg_score,
             AVG(reach_score) as avg_reach,
             AVG(quality_score) as avg_quality,
             AVG(relevance_score) as avg_relevance,
             COUNT(DISTINCT account) as account_count
      FROM influence_scores
      WHERE date >= date('now', '-${days} days')
      GROUP BY date
      ORDER BY date DESC
    `;
    return this.db.prepare(query).all();
  }

  /**
   * Compare account influence over time
   */
  compareAccounts(accounts: string[], days: number = 7): any[] {
    const placeholders = accounts.map(() => "?").join(",");
    const query = `
      SELECT account, date, overall_score, rank, trend
      FROM influence_scores
      WHERE account IN (${placeholders})
        AND date >= date('now', '-${days} days')
      ORDER BY date DESC, overall_score DESC
    `;
    return this.db.prepare(query).all(...accounts);
  }

  /**
   * Get KOLs (Key Opinion Leaders)
   */
  getKOLs(date?: string): any[] {
    const targetDate = date || new Date().toISOString().split("T")[0];

    const query = `
      SELECT account, overall_score, rank, trend
      FROM influence_scores
      WHERE date = ?
        AND overall_score >= 75
      ORDER BY overall_score DESC
    `;
    return this.db.prepare(query).all(targetDate);
  }

  /**
   * Get influence statistics
   */
  getStatistics(days: number = 7): any {
    const query = `
      SELECT
        COUNT(DISTINCT account) as total_accounts,
        AVG(overall_score) as avg_score,
        MAX(overall_score) as max_score,
        MIN(overall_score) as min_score,
        SUM(CASE WHEN trend = 'rising' THEN 1 ELSE 0 END) as rising_count,
        SUM(CASE WHEN trend = 'declining' THEN 1 ELSE 0 END) as declining_count,
        SUM(CASE WHEN trend = 'stable' THEN 1 ELSE 0 END) as stable_count
      FROM influence_scores
      WHERE date >= date('now', '-${days} days')
    `;
    return this.db.prepare(query).get();
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}
