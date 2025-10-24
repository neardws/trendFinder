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

  // Table: entities (for entity recognition)
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      context TEXT,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      mention_count INTEGER DEFAULT 1,
      avg_confidence REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Table: entity_mentions (track where entities appear)
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id INTEGER NOT NULL,
      story_link TEXT NOT NULL,
      context TEXT NOT NULL,
      confidence REAL NOT NULL,
      mentioned_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(id)
    )
  `);

  // Table: entity_relationships (track relationships between entities)
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity1_id INTEGER NOT NULL,
      entity2_id INTEGER NOT NULL,
      relationship_type TEXT NOT NULL,
      confidence REAL NOT NULL,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      mention_count INTEGER DEFAULT 1,
      FOREIGN KEY (entity1_id) REFERENCES entities(id),
      FOREIGN KEY (entity2_id) REFERENCES entities(id)
    )
  `);

  // Table: influence_scores (track account influence over time)
  db.exec(`
    CREATE TABLE IF NOT EXISTS influence_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      account TEXT NOT NULL,
      overall_score REAL NOT NULL,
      reach_score REAL NOT NULL,
      quality_score REAL NOT NULL,
      relevance_score REAL NOT NULL,
      consistency_score REAL NOT NULL,
      engagement_score REAL NOT NULL,
      rank INTEGER NOT NULL,
      trend TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Table: export_history (track report exports)
  db.exec(`
    CREATE TABLE IF NOT EXISTS export_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      format TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      exported_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES daily_reports(id)
    )
  `);

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_stories_report_id ON daily_stories(report_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_topics_report_id ON daily_topics(report_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_trending_topics_date ON trending_topics(date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_account_activity_date ON account_activity(date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity_id ON entity_mentions(entity_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_entity_relationships_entities ON entity_relationships(entity1_id, entity2_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_influence_scores_date_account ON influence_scores(date, account)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_export_history_report_id ON export_history(report_id)`);
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
