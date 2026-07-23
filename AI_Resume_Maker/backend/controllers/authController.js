import { authService } from '../core/services/auth/AuthService.js';

// Get current session - checks refresh token cookie and returns user info
export const getSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(200).json({ authenticated: false });
    }

    const result = await authService.getSession(refreshToken);
    
    if (result.authenticated) {
      authService.setRefreshCookie(res, result.refreshToken);
    }

    res.status(200).json(result);
  } catch (error) {
    // Token expired or invalid - return not authenticated
    res.status(200).json({ authenticated: false });
  }
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.validated || req.body;
    const result = await authService.register(email, password, name);
    
    authService.setRefreshCookie(res, result.refreshToken);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.validated || req.body;
    const result = await authService.login(email, password);
    
    authService.setRefreshCookie(res, result.refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'AUTHENTICATION_ERROR', message: 'Refresh token missing' }
      });
    }

    const result = await authService.refreshAccessToken(token);
    authService.setRefreshCookie(res, result.refreshToken);

    res.status(200).json({ 
      success: true,
      accessToken: result.accessToken 
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  authService.clearRefreshCookie(res);
  res.status(200).json({ 
    success: true,
    message: 'Logged out successfully' 
  });
};

export const currentUser = async (req, res, next) => {
  try {
    const result = await authService.getCurrentUser(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
