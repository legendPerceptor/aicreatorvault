const { verifyToken } = require('../utils/auth');

/**
 * Authentication middleware
 * Requires valid access token - returns 401 if not authenticated
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication middleware
 * Allows guest access - req.user will be null if not authenticated
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = { id: decoded.userId };
    } else {
      req.user = null;
    }
    next();
  } catch (error) {
    // Token is invalid or expired - treat as guest
    req.user = null;
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuth,
};
