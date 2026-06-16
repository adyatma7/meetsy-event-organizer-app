const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify staff JWT tokens
 */
function staffAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role === 'admin') {
      req.admin = { id: decoded.adminId };
      return next();
    }

    if (decoded.role !== 'staff') {
      return res.status(403).json({ success: false, message: 'Forbidden: Requires staff access' });
    }

    req.staff = {
      eventId: decoded.eventId
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = staffAuth;
