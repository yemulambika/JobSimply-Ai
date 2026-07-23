/**
 * Profile Service
 * Business logic for user profile operations
 */

import { userRepository } from '../../database/repositories/UserRepository.js';
import { resumeRepository } from '../../database/repositories/ResumeRepository.js';
import bcrypt from 'bcryptjs';
import { logger } from '../../logger/index.js';
import { NotFoundError, ValidationError, AuthenticationError } from '../../errors/AppError.js';

export class ProfileService {
  async getProfile(userId) {
    logger.info('Getting user profile', { userId });
    
    const profile = await userRepository.getProfileWithCompletion(userId);
    
    if (!profile) {
      throw new NotFoundError('User');
    }
    
    // Check if resume exists
    const hasResume = await resumeRepository.findLatestByUserId(userId);
    
    return {
      success: true,
      profile: {
        ...profile,
        hasResume: !!hasResume,
        completion: profile.completion + (hasResume ? 10 : 0),
      },
    };
  }

  async updateProfile(userId, profileData) {
    logger.info('Updating user profile', { userId, fields: Object.keys(profileData) });
    
    // Validate profile data
    this.validateProfileData(profileData);
    
    // Update profile
    const updatedProfile = await userRepository.updateProfile(userId, profileData);
    
    if (!updatedProfile) {
      throw new NotFoundError('User');
    }
    
    // Calculate new completion
    const completion = await userRepository.calculateProfileCompletion(updatedProfile);
    
    // Check if resume exists
    const hasResume = await resumeRepository.findLatestByUserId(userId);
    
    logger.info('Profile updated successfully', { userId });
    
    return {
      success: true,
      profile: {
        ...updatedProfile,
        hasResume: !!hasResume,
        completion: completion + (hasResume ? 10 : 0),
      },
    };
  }

  async deleteAccount(userId, password) {
    logger.info('Deleting user account', { userId });
    
    // Get user
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      throw new AuthenticationError('Password is incorrect');
    }
    
    // Delete user (cascade will handle related records)
    await userRepository.deleteUser(userId, user.passwordHash);
    
    logger.info('Account deleted successfully', { userId });
    
    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  async getPublicProfile(userId) {
    logger.info('Getting public profile', { userId });
    
    const profile = await userRepository.findPublicProfile(userId);
    
    if (!profile) {
      throw new NotFoundError('User');
    }
    
    return {
      success: true,
      profile,
    };
  }

  validateProfileData(data) {
    const errors = [];
    
    // Email validation
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }
    
    // URL validation
    const urlFields = ['linkedin', 'github', 'portfolio'];
    const urlRegex = /^https?:\/\/.+/;
    
    for (const field of urlFields) {
      if (data[field] && !urlRegex.test(data[field])) {
        errors.push(`${field} must be a valid URL`);
      }
    }
    
    // Phone validation (basic)
    if (data.phone) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(data.phone) || data.phone.length < 10) {
        errors.push('Invalid phone number format');
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Invalid profile data', errors);
    }
  }
}

export const profileService = new ProfileService();
export default profileService;
