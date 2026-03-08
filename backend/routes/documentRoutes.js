const express = require('express');
const UserDocument = require('../models/userDocument');
const User = require('../models/user');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  console.log('Test document endpoint hit');
  res.json({ message: 'Document endpoint is working' });
});

// Delete document
router.delete('/:id', protect, async (req, res) => {
  try {
    console.log('Delete document request received for ID:', req.params.id);
    const document = await UserDocument.findById(req.params.id);
    
    if (!document) {
      console.log('Document not found');
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if the user is the owner or an admin
    const currentUser = await User.findOne({ email: req.user.email });
    if (!currentUser) {
      console.log('Current user not found');
      return res.status(404).json({ message: 'User not found' });
    }

    if (document.userId.toString() !== currentUser._id.toString() && !currentUser.isAdmin) {
      console.log('Not authorized to delete this document');
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    // Delete the file from the filesystem if it exists
    const filePath = path.join(process.cwd(), 'uploads', document.fileName);
    if (fs.existsSync(filePath)) {
      console.log('Deleting file:', filePath);
      fs.unlinkSync(filePath);
    }

    // Delete the document from the database
    console.log('Deleting document from database:', document._id);
    await document.deleteOne();

    console.log('Document deleted successfully');
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', {
      message: error.message,
      stack: error.stack,
      params: req.params,
      user: req.user
    });
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
