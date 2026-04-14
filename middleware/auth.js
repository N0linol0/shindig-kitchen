const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Not authorized' });
};

module.exports = { requireAuth, requireAdmin };
