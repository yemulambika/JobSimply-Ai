import { getPool } from '../services/postgres.js';
import bcrypt from 'bcryptjs';

// Profile field weights for completion calculation
const PROFILE_FIELD_WEIGHTS = {
  // Personal info (30%)
  firstName: 6,
  lastName: 6,
  email: 6,
  phone: 6,
  address: 3,
  city: 2,
  state: 2,
  country: 2,
  zip: 3,
  
  // Professional info (40%)
  linkedin: 10,
  github: 10,
  portfolio: 10,
  currentCompany: 5,
  designation: 5,
  
  // Skills (15%)
  skills: 15,
  
  // Education (10%)
  education: 10,
  
  // Experience (5%)
  experience: 5
};

// GET /profile - Get user profile with extended fields for autofill
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();

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
        return res.status(404).json({ message: 'User not found' });
      }

      const user = result.rows[0];
      
      // Calculate completion percentage
      let completion = 0;
      for (const [field, weight] of Object.entries(PROFILE_FIELD_WEIGHTS)) {
        if (user[field]) {
          completion += weight;
        }
      }
      
      // Check if resume exists
      const resumeCheck = await client.query(
        'SELECT id FROM "Resume" WHERE "userId" = $1 LIMIT 1',
        [userId]
      );
      if (resumeCheck.rows.length > 0) {
        completion += 10; // Resume adds 10% to completion
      }
      
      const profile = {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        zip: user.zip,
        linkedin: user.linkedin,
        github: user.github,
        portfolio: user.portfolio,
        currentCompany: user.currentCompany,
        designation: user.designation,
        experience: user.experience,
        education: user.education,
        skills: user.skills,
        certifications: user.certifications,
        completion: Math.min(100, completion)
      };

      res.status(200).json({
        success: true,
        profile,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// PUT /profile - Update user profile
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      firstName, lastName, phone, address, city, state, country, zip,
      linkedin, github, portfolio, currentCompany, designation,
      experience, education, skills, certifications 
    } = req.body;
    const client = await getPool().connect();

    try {
      // Ensure extended columns exist
      await ensureProfileColumns(client);

      // Update user with extended profile fields
      const result = await client.query(
        `UPDATE "User" SET 
          "firstName" = $1,
          "lastName" = $2,
          phone = $3,
          address = $4,
          city = $5,
          state = $6,
          country = $7,
          zip = $8,
          linkedin = $9,
          github = $10,
          portfolio = $11,
          "currentCompany" = $12,
          designation = $13,
          experience = $14,
          education = $15,
          skills = $16,
          certifications = $17,
          "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $18
         RETURNING id, email, name, "firstName", "lastName", phone, address, city, state, country, zip, linkedin, github, portfolio, "currentCompany", designation, experience, education, skills, certifications`,
        [
          firstName || null,
          lastName || null,
          phone || null,
          address || null,
          city || null,
          state || null,
          country || null,
          zip || null,
          linkedin || null,
          github || null,
          portfolio || null,
          currentCompany || null,
          designation || null,
          experience ? JSON.stringify(experience) : null,
          education ? JSON.stringify(education) : null,
          skills ? JSON.stringify(skills) : null,
          certifications ? JSON.stringify(certifications) : null,
          userId
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const updatedProfile = result.rows[0];
      
      // Calculate completion
      let completion = 0;
      for (const [field, weight] of Object.entries(PROFILE_FIELD_WEIGHTS)) {
        if (updatedProfile[field]) {
          completion += weight;
        }
      }
      
      res.status(200).json({
        success: true,
        profile: {
          ...updatedProfile,
          completion: Math.min(100, completion)
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
};

async function ensureProfileColumns(client) {
  const columns = [
    { name: '"firstName"', type: 'TEXT' },
    { name: '"lastName"', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'city', type: 'TEXT' },
    { name: 'state', type: 'TEXT' },
    { name: 'country', type: 'TEXT' },
    { name: 'zip', type: 'TEXT' },
    { name: 'linkedin', type: 'TEXT' },
    { name: 'github', type: 'TEXT' },
    { name: 'portfolio', type: 'TEXT' },
    { name: '"currentCompany"', type: 'TEXT' },
    { name: 'designation', type: 'TEXT' },
    { name: 'experience', type: 'JSONB' },
    { name: 'education', type: 'JSONB' },
    { name: 'skills', type: 'JSONB' },
    { name: 'certifications', type: 'JSONB' },
  ];
  
  for (const col of columns) {
    try {
      await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
    } catch (err) {
      // Column may already exist
    }
  }
}

// DELETE /profile - Delete user account
export const deleteProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;
    const client = await getPool().connect();

    try {
      // Verify password
      const userResult = await client.query(
        'SELECT "passwordHash" FROM "User" WHERE id = $1',
        [userId]
      );

      const isValid = await bcrypt.compare(password, userResult.rows[0]?.passwordHash || '');
      if (!isValid) {
        return res.status(400).json({ message: 'Password is incorrect' });
      }

      // Delete user (cascade will handle related records)
      await client.query('DELETE FROM "User" WHERE id = $1', [userId]);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};