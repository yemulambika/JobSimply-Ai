/**
 * Auth Service
 * Business logic for authentication operations
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../../../services/postgres.js';
import { logger } from '../../logger/index.js';
import { AuthenticationError, ConflictError, NotFoundError } from '../../errors/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

export class AuthService {
  createAccessToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  createRefreshToken(user) {
    return jwt.sign(
      { id: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  setRefreshCookie(res, token) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearRefreshCookie(res) {
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax' });
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token expired');
      }
      throw new AuthenticationError('Invalid token');
    }
  }

  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== 'refresh') {
        throw new AuthenticationError('Invalid refresh token');
      }
      return decoded;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  async getSession(refreshToken) {
    const decoded = this.verifyRefreshToken(refreshToken);
    
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, role FROM "User" WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];
    if (!user) {
      return { authenticated: false };
    }

    // Return new tokens
    return {
      authenticated: true,
      token: this.createAccessToken(user),
      refreshToken: this.createRefreshToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async register(email, password, name = null) {
    logger.info('Registering new user', { email });
    
    const pool = getPool();

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM "User" WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('User already exists');
    }

    // Create new user
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO "User" (email, "passwordHash", name, role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, name, role`,
      [email, passwordHash, name, 'user']
    );

    const user = result.rows[0];
    
    logger.info('User registered successfully', { userId: user.id });
    
    return {
      user,
      accessToken: this.createAccessToken(user),
      refreshToken: this.createRefreshToken(user),
    };
  }

  async login(email, password) {
    logger.info('User login attempt', { email });
    
    const pool = getPool();

    const result = await pool.query(
      'SELECT id, email, name, role, "passwordHash" FROM "User" WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      logger.warn('Login failed: user not found', { email });
      throw new AuthenticationError('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      logger.warn('Login failed: invalid password', { email });
      throw new AuthenticationError('Invalid credentials');
    }

    logger.info('User logged in successfully', { userId: user.id });
    
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken: this.createAccessToken(user),
      refreshToken: this.createRefreshToken(user),
    };
  }

  async refreshAccessToken(refreshToken) {
    const decoded = this.verifyRefreshToken(refreshToken);
    
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, role FROM "User" WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];
    if (!user) {
      throw new NotFoundError('User');
    }

    logger.info('Token refreshed', { userId: user.id });
    
    return {
      accessToken: this.createAccessToken(user),
      refreshToken: this.createRefreshToken(user),
    };
  }

  async getCurrentUser(userId) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, role FROM "User" WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      throw new NotFoundError('User');
    }

    return { user };
  }
}

export const authService = new AuthService();
export default authService;
