import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../services/postgres.js';

const createAccessToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'development-secret', { expiresIn: '15m' });
const createRefreshToken = (user) => jwt.sign({ id: user.id, type: 'refresh' }, process.env.JWT_SECRET || 'development-secret', { expiresIn: '7d' });

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// Get current session - checks refresh token cookie and returns user info
export const getSession = async (req, res, next) => {
  try {
    // First check for refresh token cookie (session-based auth)
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(200).json({ authenticated: false });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'development-secret');
    
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(200).json({ authenticated: false });
    }

    // Get user from database
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, role FROM "User" WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(200).json({ authenticated: false });
    }

    // Return session info
    const accessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);
    setRefreshCookie(res, newRefreshToken);

    res.status(200).json({
      authenticated: true,
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    // Token expired or invalid - return not authenticated
    res.status(200).json({ authenticated: false });
  }
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const pool = getPool();

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM "User" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Create new user
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO "User" (email, "passwordHash", name, role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, name, role`,
      [email, passwordHash, name || null, 'user']
    );

    const user = result.rows[0];
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const pool = getPool();

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, email, name, role, "passwordHash" FROM "User" WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      message: 'Logged in successfully',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, role FROM "User" WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const accessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);
    setRefreshCookie(res, newRefreshToken);

    res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax' });
  res.status(200).json({ message: 'Logged out successfully' });
};

export const currentUser = async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, role FROM "User" WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    next(error);
  }
};