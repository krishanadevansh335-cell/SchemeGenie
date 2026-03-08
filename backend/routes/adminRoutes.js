
import express from 'express';
import { isAdmin, protect } from '../middleware/authMiddleware.js';
import Application from '../models/application.js';
import User from '../models/user.js';

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private/Admin
router.get('/dashboard', protect, isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalApplications = await Application.countDocuments();
        const pendingApplications = await Application.countDocuments({ status: 'submitted' });
        const approvedApplications = await Application.countDocuments({ status: 'approved' });
        const rejectedApplications = await Application.countDocuments({ status: 'rejected' });
        const underReviewApplications = await Application.countDocuments({ status: 'under_review' });

        // Mock active users for now (or use a time window like last login in 24h)
        const activeUsers = await User.countDocuments({ updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

        res.json({
            stats: {
                totalUsers,
                totalApplications,
                pendingApplications,
                approvedApplications,
                rejectedApplications,
                underReviewApplications,
                activeUsers
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ msg: 'Server error fetching dashboard stats' });
    }
});

// @route   GET /api/admin/activities
// @desc    Get recent activities
// @access  Private/Admin
router.get('/activities', protect, isAdmin, async (req, res) => {
    try {
        // Fetch recent applications
        const recentApps = await Application.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'name')
            .populate('schemeId', 'name');

        const activities = recentApps.map(app => {
            let type = 'application';
            let message = `New application for ${app.schemeId?.name || 'Unknown Scheme'}`;
            let icon = 'file';

            if (app.status === 'approved') {
                type = 'approval';
                message = `Application approved for ${app.userId?.name || 'User'}`;
                icon = 'check';
            } else if (app.status === 'rejected') {
                type = 'rejection';
                message = `Application rejected for ${app.userId?.name || 'User'}`;
                icon = 'x';
            }

            return {
                type,
                message,
                time: new Date(app.updatedAt || app.createdAt).toLocaleString(),
                icon
            };
        });

        // Add some mock user registrations if needed, or fetch from Users
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3);
        recentUsers.forEach(user => {
            activities.push({
                type: 'user',
                message: `New user registered: ${user.name}`,
                time: new Date(user.createdAt).toLocaleString(),
                icon: 'user'
            });
        });

        // Sort by time (descending)
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json(activities.slice(0, 10));
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ msg: 'Server error fetching activities' });
    }
});

export default router;
