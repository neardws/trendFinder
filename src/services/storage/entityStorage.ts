import { getDatabase } from "./initDatabase";
import { Entity, EntityMention, EntityRelationship } from "../analysis/entityRecognition";

/**
 * Storage service for entity data
 */
export class EntityStorage {
  private db;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Save entities to database
   */
  saveEntities(entities: Entity[]): void {
    console.log(`💾 Saving ${entities.length} entities to database...`);

    const upsertEntity = this.db.prepare(`
      INSERT INTO entities (name, type, context, first_seen, last_seen, mention_count, avg_confidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        type = excluded.type,
        context = excluded.context,
        last_seen = excluded.last_seen,
        mention_count = mention_count + 1,
        avg_confidence = (avg_confidence * mention_count + excluded.avg_confidence) / (mention_count + 1)
    `);

    const saveMany = this.db.transaction((entities: Entity[]) => {
      const now = new Date().toISOString();
      entities.forEach((entity) => {
        upsertEntity.run(
          entity.name,
          entity.type,
          entity.context,
          now,
          now,
          1,
          entity.confidence,
          now
        );
      });
    });

    saveMany(entities);
    console.log(`✅ Entities saved`);
  }

  /**
   * Save entity mentions
   */
  saveEntityMentions(mentions: EntityMention[]): void {
    console.log(`💾 Saving ${mentions.length} entity mentions...`);

    const insertMention = this.db.prepare(`
      INSERT INTO entity_mentions (entity_id, story_link, context, confidence, mentioned_at)
      SELECT id, ?, ?, ?, ? FROM entities WHERE name = ?
    `);

    const saveMany = this.db.transaction((mentions: EntityMention[]) => {
      mentions.forEach((mention) => {
        insertMention.run(
          mention.storyLink,
          mention.context,
          0.8, // Default confidence if not specified
          mention.timestamp,
          mention.entityName
        );
      });
    });

    saveMany(mentions);
    console.log(`✅ Entity mentions saved`);
  }

  /**
   * Save entity relationships
   */
  saveEntityRelationships(relationships: EntityRelationship[]): void {
    console.log(`💾 Saving ${relationships.length} entity relationships...`);

    const upsertRelationship = this.db.prepare(`
      INSERT INTO entity_relationships (entity1_id, entity2_id, relationship_type, confidence, first_seen, last_seen, mention_count)
      SELECT
        e1.id, e2.id, ?, ?, ?, ?, ?
      FROM entities e1, entities e2
      WHERE e1.name = ? AND e2.name = ?
      ON CONFLICT(entity1_id, entity2_id, relationship_type) DO UPDATE SET
        last_seen = excluded.last_seen,
        mention_count = mention_count + 1,
        confidence = (confidence * mention_count + excluded.confidence) / (mention_count + 1)
    `);

    const saveMany = this.db.transaction((relationships: EntityRelationship[]) => {
      const now = new Date().toISOString();
      relationships.forEach((rel) => {
        upsertRelationship.run(
          rel.relationshipType,
          rel.confidence,
          now,
          now,
          1,
          rel.entity1,
          rel.entity2
        );
      });
    });

    saveMany(relationships);
    console.log(`✅ Entity relationships saved`);
  }

  /**
   * Get top entities by type
   */
  getTopEntitiesByType(type: string, limit: number = 10): any[] {
    const query = `
      SELECT name, type, context, mention_count, avg_confidence
      FROM entities
      WHERE type = ?
      ORDER BY mention_count DESC, avg_confidence DESC
      LIMIT ?
    `;
    return this.db.prepare(query).all(type, limit);
  }

  /**
   * Get entity relationships
   */
  getEntityRelationships(entityName: string): any[] {
    const query = `
      SELECT
        e1.name as entity1,
        e2.name as entity2,
        er.relationship_type,
        er.confidence,
        er.mention_count
      FROM entity_relationships er
      JOIN entities e1 ON er.entity1_id = e1.id
      JOIN entities e2 ON er.entity2_id = e2.id
      WHERE e1.name = ? OR e2.name = ?
      ORDER BY er.mention_count DESC
    `;
    return this.db.prepare(query).all(entityName, entityName);
  }

  /**
   * Get all entities
   */
  getAllEntities(limit: number = 100): any[] {
    const query = `
      SELECT name, type, context, mention_count, avg_confidence, last_seen
      FROM entities
      ORDER BY mention_count DESC, avg_confidence DESC
      LIMIT ?
    `;
    return this.db.prepare(query).all(limit);
  }

  /**
   * Search entities by name
   */
  searchEntities(searchTerm: string): any[] {
    const query = `
      SELECT name, type, context, mention_count, avg_confidence
      FROM entities
      WHERE name LIKE ?
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return this.db.prepare(query).all(`%${searchTerm}%`);
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}
