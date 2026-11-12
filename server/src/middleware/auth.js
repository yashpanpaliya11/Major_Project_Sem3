import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Verify the Bearer token and attach { id, role, email } to req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (!decoded?.id || !decoded?.role) {
      return res.status(401).json({ success: false, message: 'Invalid token payload.' });
    }

    req.user = { id: decoded.id, role: decoded.role, email: decoded.email };
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please sign in again.',
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

export default authenticate;
