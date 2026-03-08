import jwt from 'jsonwebtoken';
import User from '../models/user.js';

export const protect = async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ 
        success: false,
        message: 'Not authorized, token failed' 
      });
    }
  }

  if (!token) {
    res.status(401).json({ 
      success: false,
      message: 'Not authorized, no token' 
    });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      message: 'Not authorized as an admin' 
    });
  }
};
