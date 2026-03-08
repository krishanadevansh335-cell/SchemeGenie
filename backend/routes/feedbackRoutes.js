import express from 'express';
import { isAdmin, protect } from '../middleware/authMiddleware.js';
import Feedback from '../models/feedback.js';
import User from '../models/user.js';

const router = express.Router();

// @route   GET /api/feedback
// @desc    Get all feedback/questions (with filters)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { type, category, status, sort = '-createdAt' } = req.query;

        const filter = {};
        if (type) filter.type = type;
        if (category) filter.category = category;
        if (status) filter.status = status;

        const feedbacks = await Feedback.find(filter)
            .populate('userId', 'name email')
            .populate('responses.userId', 'name email role')
            .populate('resolvedBy', 'name email')
            .sort(sort)
            .limit(50);

        res.json(feedbacks);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ msg: 'Server error fetching feedback' });
    }
});

// @route   GET /api/feedback/my
// @desc    Get user's own feedback/questions
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const feedbacks = await Feedback.find({ userId: user._id })
            .populate('responses.userId', 'name email role')
            .populate('resolvedBy', 'name email')
            .sort('-createdAt');

        res.json(feedbacks);
    } catch (error) {
        console.error('Error fetching user feedback:', error);
        res.status(500).json({ msg: 'Server error fetching feedback' });
    }
});

// @route   GET /api/feedback/:id
// @desc    Get single feedback/question by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('responses.userId', 'name email role')
            .populate('resolvedBy', 'name email');

        if (!feedback) {
            return res.status(404).json({ msg: 'Feedback not found' });
        }

        // Increment views
        feedback.views += 1;
        await feedback.save();

        res.json(feedback);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ msg: 'Server error fetching feedback' });
    }
});

// @route   POST /api/feedback
// @desc    Create new feedback/question
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { type, title, description, category, priority } = req.body;

        if (!type || !title || !description) {
            return res.status(400).json({ msg: 'Please provide type, title, and description' });
        }

        const user = await User.findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const feedback = new Feedback({
            userId: user._id,
            type,
            title,
            description,
            category: category || 'General',
            priority: priority || 'medium'
        });

        await feedback.save();

        const populatedFeedback = await Feedback.findById(feedback._id)
            .populate('userId', 'name email');

        res.status(201).json(populatedFeedback);
    } catch (error) {
        console.error('Error creating feedback:', error);
        res.status(500).json({ msg: 'Server error creating feedback' });
    }
});

// @route   POST /api/feedback/:id/response
// @desc    Add response to feedback/question
// @access  Private
router.post('/:id/response', protect, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ msg: 'Please provide a message' });
        }

        const user = await User.findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ msg: 'Feedback not found' });
        }

        const response = {
            userId: user._id,
            message,
            isAdminResponse: user.role === 'admin',
            createdAt: new Date()
        };

        feedback.responses.push(response);

        // Update status if admin responds
        if (user.role === 'admin' && feedback.status === 'open') {
            feedback.status = 'answered';
        }

        await feedback.save();

        const updatedFeedback = await Feedback.findById(feedback._id)
            .populate('userId', 'name email')
            .populate('responses.userId', 'name email role');

        res.json(updatedFeedback);
    } catch (error) {
        console.error('Error adding response:', error);
        res.status(500).json({ msg: 'Server error adding response' });
    }
});

// @route   PUT /api/feedback/:id/upvote
// @desc    Upvote a feedback/question
// @access  Private
router.put('/:id/upvote', protect, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ msg: 'Feedback not found' });
        }

        const upvoteIndex = feedback.upvotes.indexOf(user._id);

        if (upvoteIndex > -1) {
            // Remove upvote
            feedback.upvotes.splice(upvoteIndex, 1);
        } else {
            // Add upvote
            feedback.upvotes.push(user._id);
        }

        await feedback.save();

        res.json({ upvotes: feedback.upvotes.length, hasUpvoted: upvoteIndex === -1 });
    } catch (error) {
        console.error('Error upvoting feedback:', error);
        res.status(500).json({ msg: 'Server error upvoting feedback' });
    }
});

// @route   PUT /api/feedback/:id/resolve
// @desc    Mark feedback as resolved (Admin only)
// @access  Private/Admin
router.put('/:id/resolve', protect, isAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ msg: 'Feedback not found' });
        }

        feedback.isResolved = true;
        feedback.resolvedBy = user._id;
        feedback.resolvedAt = new Date();
        feedback.status = 'closed';

        await feedback.save();

        const updatedFeedback = await Feedback.findById(feedback._id)
            .populate('userId', 'name email')
            .populate('resolvedBy', 'name email');

        res.json(updatedFeedback);
    } catch (error) {
        console.error('Error resolving feedback:', error);
        res.status(500).json({ msg: 'Server error resolving feedback' });
    }
});

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback (Admin or owner only)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ msg: 'Feedback not found' });
        }

        // Check if user is admin or owner
        if (user.role !== 'admin' && feedback.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ msg: 'Not authorized to delete this feedback' });
        }

        await Feedback.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Feedback deleted successfully' });
    } catch (error) {
        console.error('Error deleting feedback:', error);
        res.status(500).json({ msg: 'Server error deleting feedback' });
    }
});

export default router;
