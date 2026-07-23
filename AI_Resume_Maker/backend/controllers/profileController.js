import { profileService } from '../core/services/user/ProfileService.js';
import bcrypt from 'bcryptjs';

// GET /profile - Get user profile with extended fields for autofill
export const getProfile = async (req, res, next) => {
  try {
    const result = await profileService.getProfile(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// PUT /profile - Update user profile
export const updateProfile = async (req, res, next) => {
  try {
    const result = await profileService.updateProfile(req.user.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// DELETE /profile - Delete user account
export const deleteProfile = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Password is required' }
      });
    }
    
    const result = await profileService.deleteAccount(req.user.id, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};