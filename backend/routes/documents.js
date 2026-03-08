import express from 'express';
import UserDocument from '../models/userDocument.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// Delete a document
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const document = await UserDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if the user is the owner or an admin
    if (document.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }

    await document.remove();
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
