import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['question', 'feedback', 'guidance'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['General', 'Schemes', 'Application', 'Documents', 'Technical', 'Other'],
        default: 'General'
    },
    status: {
        type: String,
        enum: ['open', 'answered', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    responses: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: {
            type: String,
            required: true
        },
        isAdminResponse: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    views: {
        type: Number,
        default: 0
    },
    isResolved: {
        type: Boolean,
        default: false
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for better query performance
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ category: 1, createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);
