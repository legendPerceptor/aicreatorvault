const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { User } = require('../models');
const { generateTokens, verifyToken, sendTokens, clearTokens } = require('../utils/auth');
const { authenticate } = require('../middleware/auth');

// 登录速率限制：5分钟内最多 10 次尝试
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 分钟
  max: 10,
  message: { error: '登录尝试次数过多，请 5 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 注册速率限制：1小时内最多 5 次
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 5,
  message: { error: '注册请求过多，请 1 小时后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create user
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      username,
      email,
      password_hash: passwordHash,
    });

    // Generate tokens
    const tokens = generateTokens(user.id);
    sendTokens(res, tokens);

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate password
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const tokens = generateTokens(user.id);
    sendTokens(res, tokens);

    // Also send refreshToken in body for localStorage backup
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken, // Include for localStorage backup
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout and clear refresh token cookie
 */
router.post('/logout', (req, res) => {
  clearTokens(res);
  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token cookie
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if user still exists
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);
    sendTokens(res, tokens);

    res.json({
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    console.error('[Auth] Refresh error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'is_default', 'created_at'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('[Auth] Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
