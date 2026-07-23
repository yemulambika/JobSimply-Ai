/**
 * Base Repository
 * Provides common database operations for all repositories
 */

import { getPool } from '../../../services/postgres.js';
import { logger } from '../../../logger/index.js';
import { DatabaseError } from '../../../errors/AppError.js';

export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = null;
  }

  getPool() {
    if (!this.pool) {
      this.pool = getPool();
    }
    return this.pool;
  }

  async getClient() {
    return await this.getPool().connect();
  }

  async findById(id, userId = null) {
    const startTime = Date.now();
    const client = await this.getClient();
    try {
      let query = `SELECT * FROM "${this.tableName}" WHERE id = $1`;
      const params = [id];
      
      if (userId) {
        query += ` AND "userId" = $2`;
        params.push(userId);
      }
      
      query += ' LIMIT 1';
      
      const result = await client.query(query, params);
      logger.logQuery(`SELECT FROM ${this.tableName}`, Date.now() - startTime);
      
      return result.rows[0] || null;
    } catch (err) {
      logger.error(`Database error in ${this.tableName}.findById`, { error: err.message });
      throw new DatabaseError(`Failed to find ${this.tableName}`);
    } finally {
      client.release();
    }
  }

  async findAll(userId = null, options = {}) {
    const startTime = Date.now();
    const client = await this.getClient();
    try {
      let query = `SELECT * FROM "${this.tableName}"`;
      const params = [];
      const conditions = [];
      
      if (userId) {
        conditions.push(`"userId" = $${params.length + 1}`);
        params.push(userId);
      }
      
      if (options.where) {
        for (const [key, value] of Object.entries(options.where)) {
          conditions.push(`${key} = $${params.length + 1}`);
          params.push(value);
        }
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      if (options.orderBy) {
        query += ` ORDER BY "${options.orderBy.field}" ${options.orderBy.direction || 'DESC'}`;
      } else {
        query += ' ORDER BY "createdAt" DESC';
      }
      
      if (options.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(options.limit);
      }
      
      if (options.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
      
      const result = await client.query(query, params);
      logger.logQuery(`SELECT FROM ${this.tableName}`, Date.now() - startTime);
      
      return result.rows;
    } catch (err) {
      logger.error(`Database error in ${this.tableName}.findAll`, { error: err.message });
      throw new DatabaseError(`Failed to find ${this.tableName} records`);
    } finally {
      client.release();
    }
  }

  async count(userId = null, conditions = {}) {
    const startTime = Date.now();
    const client = await this.getClient();
    try {
      let query = `SELECT COUNT(*) as count FROM "${this.tableName}"`;
      const params = [];
      const whereConditions = [];
      
      if (userId) {
        whereConditions.push(`"userId" = $${params.length + 1}`);
        params.push(userId);
      }
      
      for (const [key, value] of Object.entries(conditions)) {
        whereConditions.push(`${key} = $${params.length + 1}`);
        params.push(value);
      }
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const result = await client.query(query, params);
      logger.logQuery(`COUNT FROM ${this.tableName}`, Date.now() - startTime);
      
      return parseInt(result.rows[0].count, 10);
    } catch (err) {
      logger.error(`Database error in ${this.tableName}.count`, { error: err.message });
      throw new DatabaseError(`Failed to count ${this.tableName} records`);
    } finally {
      client.release();
    }
  }

  async create(data) {
    const startTime = Date.now();
    const client = await this.getClient();
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const columns = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO "${this.tableName}" (${columns})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      logger.logQuery(`INSERT INTO ${this.tableName}`, Date.now() - startTime);
      
      return result.rows[0];
    } catch (err) {
      logger.error(`Database error in ${this.tableName}.create`, { error: err.message });
      throw new DatabaseError(`Failed to create ${this.tableName}`);
    } finally {
      client.release();
    }
  }

  async update(id, data, userId = null) {
    const startTime = Date.now();
    const client = await this.getClient();
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      
      let query = `UPDATE "${this.tableName}" SET ${setClause}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1}`;
      const params = [...values, id];
      
      if (userId) {
        query += ` AND "userId" = $${params.length + 1}`;
        params.push(userId);
      }
      
      query += ' RETURNING *';
      
      const result = await client.query(query, params);
      logger.logQuery(`UPDATE ${this.tableName}`, Date.now() - startTime);
      
      return result.rows[0] || null;
    } catch (err) {
      logger.error(`Database error in ${this.tableName}.update`, { error: err.message });
      throw new DatabaseError(`Failed to update ${this.tableName}`);
    } finally {
      client.release();
    }
  }

  async delete(id, userId = null) {
    const startTime = Date.now();
    const client = await this.getClient();
    try {
      let query = `DELETE FROM "${this.tableName}" WHERE id = $1`;
      const params = [id];
      
      if (userId) {
        query += ` AND "userId" = $2`;
        params.push(userId);
      }
      
      query += ' RETURNING id';
      
      const result = await client.query(query, params);
      logger.logQuery(`DELETE FROM ${this.tableName}`, Date.now() - startTime);
      
      return result.rows[0] || null;
    } catch (err) {
      logger.error(`Database error in ${this.tableName}.delete`, { error: err.message });
      throw new DatabaseError(`Failed to delete ${this.tableName}`);
    } finally {
      client.release();
    }
  }

  async upsert(data, conflictTarget, updateColumns) {
    const startTime = Date.now();
    const client = await this.getClient();
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const columns = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      
      const setClause = updateColumns.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
      
      const query = `
        INSERT INTO "${this.tableName}" (${columns})
        VALUES (${placeholders})
        ON CONFLICT (${conflictTarget}) DO UPDATE SET ${setClause}
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      logger.logQuery(`UPSERT INTO ${this.tableName}`, Date.now() - startTime);
      
      return result.rows[0];
    } catch (err) {
      logger.error(`Database error in ${this.tableName}.upsert`, { error: err.message });
      throw new DatabaseError(`Failed to upsert ${this.tableName}`);
    } finally {
      client.release();
    }
  }
}

export default BaseRepository;
