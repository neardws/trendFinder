import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

/**
 * Initialize SQLite database for historical data
 */
export function initDatabase(): Database.Database {
  const dbPath = path.join(process.cwd(), "data", "trendFinder.db");

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create tables
  createTables(db);

  console.log("✅ Database initialized");
  return db;
}

/**
 * Create database tables
 */
function createTables(db: Database.Database) {
  // Table: daily_reports
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_stories INTEGER NOT NULL,
      quality_passed INTEGER NOT NULL,
      avg_quality_score REAL NOT NULL,
      topic_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Table: daily_stories
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      headline TEXT NOT NULL,
      link TEXT NOT NULL,
      author TEXT,
      date_posted TEXT NOT NULL,
      source TEXT NOT NULL,
      quality_score REAL,
      topic_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    )
  `);

  // Table: daily_topics
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      topic_id TEXT NOT NULL,
      topic_name TEXT NOT NULL,
      topic_summary TEXT NOT NULL,
      story_count INTEGER NOT NULL,
      keywords TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    )
  `);

  // Table: trending_topics (for tracking topic trends)
  db.exec(`
    CREATE TABLE IF NOT EXISTS trending_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      topic_name TEXT NOT NULL,
      frequency INTEGER NOT NULL,
      avg_quality REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Table: account_activity (for tracking account activity)
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      account TEXT NOT NULL,
      tweet_count INTEGER NOT NULL,
      avg_quality REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_stories_report_id ON daily_stories(report_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_topics_report_id ON daily_topics(report_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_trending_topics_date ON trending_topics(date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_account_activity_date ON account_activity(date)`);
}

/**
 * Get database connection
 */
export function getDatabase(): Database.Database {
  const dbPath = path.join(process.cwd(), "data", "trendFinder.db");
  if (!fs.existsSync(dbPath)) {
    return initDatabase();
  }
  return new Database(dbPath);
}
