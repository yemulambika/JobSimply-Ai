/**
 * User Repository
 * Handles all user-related database operations
 */

import { BaseRepository } from './BaseRepository.js';
import { migrationService } from '../migrations/MigrationService.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super('User');
  }

  async initialize() {
    await migrationService.ensureTable('user_extended_columns');
  }

  async findByEmail(email) {
    await this.initialize();
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async findPublicProfile(userId) {
    await this.initialize();
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT id, email, name, "firstName", "lastName", "currentCompany", designation, 
                linkedin, github, portfolio, skills
         FROM "User" 
         WHERE id = $1 LIMIT 1`,
        [userId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateProfile(userId, profileData) {
    await this.initialize();
    const client = await this.getClient();
    try {
      // Build dynamic update query
      const updates = [];
      const params = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(profileData)) {
        if (value !== undefined) {
          // Handle JSON fields
          if (['experience', 'education', 'skills', 'certifications'].includes(key)) {
            updates.push(`"${key}" = $${paramIndex}`);
            params.push(value ? JSON.stringify(value) : null);
          } else {
            updates.push(`"${key}" = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      }
      
      if (updates.length === 0) {
        return this.findById(userId);
      }
      
      updates.push('"updatedAt" = CURRENT_TIMESTAMP');
      params.push(userId);
      
      const query = `
        UPDATE "User" 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await client.query(query, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async calculateProfileCompletion(user) {
    const weights = {
      firstName: 6,
      lastName: 6,
      email: 6,
      phone: 6,
      address: 3,
      city: 2,
      state: 2,
      country: 2,
      zip: 3,
      linkedin: 10,
      github: 10,
      portfolio: 10,
      currentCompany: 5,
      designation: 5,
      skills: 15,
      education: 10,
      experience: 5,
    };
    
    let completion = 0;
    
    for (const [field, weight] of Object.entries(weights)) {
      const value = user[field];
      if (value) {
        if (Array.isArray(value) && value.length > 0) {
          completion += weight;
        } else if (typeof value === 'string' && value.trim()) {
          completion += weight;
        }
      }
    }
    
    return Math.min(100, completion);
  }

  async getProfileWithCompletion(userId) {
    await this.initialize();
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT id, email, name, role, "createdAt", "updatedAt",
                "firstName", "lastName", phone, address, city, state, country, zip,
                linkedin, github, portfolio, "currentCompany", designation,
                experience, education, skills, certifications
         FROM "User" 
         WHERE id = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      const completion = await this.calculateProfileCompletion(user);
      
      return {
        ...user,
        completion,
      };
    } finally {
      client.release();
    }
  }

  async deleteUser(userId, passwordHash) {
    await this.initialize();
    const client = await this.getClient();
    try {
      const result = await client.query(
        'DELETE FROM "User" WHERE id = $1 RETURNING id',
        [userId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}

export const userRepository = new UserRepository();
export default userRepository;
