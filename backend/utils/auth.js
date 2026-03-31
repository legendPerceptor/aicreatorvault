const jwt = require('jsonwebtoken');

// Default to 15 minutes if not set
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const AUTH_COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE === 'true';

/**
 * Generate access and refresh tokens for a user
 * @param {number} userId - The user's ID
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function generateTokens(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const accessToken = jwt.sign({ userId }, secret, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

/**
 * Verify a JWT token
 * @param {string} token - The token to verify
 * @returns {{ userId: number }}
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.verify(token, secret);
}

/**
 * Send tokens via httpOnly cookies
 * @param {object} res - Express response object
 * @param {{ accessToken: string, refreshToken: string }} tokens - Tokens to send
 */
function sendTokens(res, tokens) {
  const cookieOptions = {
    httpOnly: true,
    secure: AUTH_COOKIE_SECURE,
    sameSite: AUTH_COOKIE_SECURE ? 'strict' : 'lax',
  };

  res.cookie('refreshToken', tokens.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });

  // Access token is sent in the response body for client storage
  return tokens;
}

/**
 * Clear auth cookies
 * @param {object} res - Express response object
 */
function clearTokens(res) {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: AUTH_COOKIE_SECURE,
    sameSite: AUTH_COOKIE_SECURE ? 'strict' : 'lax',
    expires: new Date(0),
  });
}

module.exports = {
  generateTokens,
  verifyToken,
  sendTokens,
  clearTokens,
};
