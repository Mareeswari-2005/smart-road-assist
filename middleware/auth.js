const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('Auth middleware - Token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'Invalid token - user not found.' });
    }

    console.log('User authenticated:', user.email, user.userType);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    
    res.status(401).json({ message: 'Authentication failed.', error: error.message });
  }
};

const mechanicAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.userType !== 'mechanic') {
        return res.status(403).json({ message: 'Access denied. Mechanic only.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed.' });
  }
};

const userAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.userType !== 'user') {
        return res.status(403).json({ message: 'Access denied. User only.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed.' });
  }
};

module.exports = { auth, mechanicAuth, userAuth };