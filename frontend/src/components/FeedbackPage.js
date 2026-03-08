import { AlertCircle, CheckCircle, Clock, MessageCircle, Send, ThumbsUp, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import api from '../config/api';
import { useLanguage } from '../contexts/LanguageContext';
import './FeedbackPage.css';

const FeedbackPage = () => {
    const { t } = useLanguage();
    const [feedbacks, setFeedbacks] = useState([]);
    const [myFeedbacks, setMyFeedbacks] = useState([]);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
    const [filter, setFilter] = useState({ type: '', category: '', status: '' });
    const [responseText, setResponseText] = useState('');
    const [loading, setLoading] = useState(false);

    const [newFeedback, setNewFeedback] = useState({
        type: 'question',
        title: '',
        description: '',
        category: 'General',
        priority: 'medium'
    });

    // Fetch all feedbacks
    const fetchFeedbacks = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filter.type) params.append('type', filter.type);
            if (filter.category) params.append('category', filter.category);
            if (filter.status) params.append('status', filter.status);

            const response = await api.get(`/api/feedback?${params.toString()}`);
            setFeedbacks(response.data);
        } catch (error) {
            console.error('Error fetching feedbacks:', error);
        }
    }, [filter.type, filter.category, filter.status]);

    // Fetch user's feedbacks
    const fetchMyFeedbacks = useCallback(async () => {
        try {
            const response = await api.get('/api/feedback/my');
            setMyFeedbacks(response.data);
        } catch (error) {
            console.error('Error fetching my feedbacks:', error);
        }
    }, []);

    useEffect(() => {
        fetchFeedbacks();
        fetchMyFeedbacks();
    }, [fetchFeedbacks, fetchMyFeedbacks]);

    // Create new feedback
    const handleCreateFeedback = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/api/feedback', newFeedback);
            setShowCreateModal(false);
            setNewFeedback({
                type: 'question',
                title: '',
                description: '',
                category: 'General',
                priority: 'medium'
            });
            fetchFeedbacks();
            fetchMyFeedbacks();
            alert('Your question/feedback has been submitted successfully!');
        } catch (error) {
            console.error('Error creating feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Add response to feedback
    const handleAddResponse = async (feedbackId) => {
        if (!responseText.trim()) return;

        try {
            await api.post(`/api/feedback/${feedbackId}/response`, {
                message: responseText
            });
            setResponseText('');

            // Refresh the selected feedback
            const response = await api.get(`/api/feedback/${feedbackId}`);
            setSelectedFeedback(response.data);
            fetchFeedbacks();
        } catch (error) {
            console.error('Error adding response:', error);
            alert('Failed to add response. Please try again.');
        }
    };

    // Upvote feedback
    const handleUpvote = async (feedbackId) => {
        try {
            await api.put(`/api/feedback/${feedbackId}/upvote`);
            fetchFeedbacks();
            if (selectedFeedback && selectedFeedback._id === feedbackId) {
                const response = await api.get(`/api/feedback/${feedbackId}`);
                setSelectedFeedback(response.data);
            }
        } catch (error) {
            console.error('Error upvoting:', error);
        }
    };

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'open':
                return <Clock size={16} className="status-icon open" />;
            case 'answered':
                return <MessageCircle size={16} className="status-icon answered" />;
            case 'closed':
                return <CheckCircle size={16} className="status-icon closed" />;
            default:
                return <AlertCircle size={16} className="status-icon" />;
        }
    };

    const displayFeedbacks = activeTab === 'all' ? feedbacks : myFeedbacks;

    return (
        <div className="feedback-page">
            <div className="feedback-header">
                <h1>💬 Community Q&A & Feedback</h1>
                <p>Ask questions, share feedback, and get help from the community and admins</p>
                <button className="create-btn" onClick={() => setShowCreateModal(true)}>
                    + Ask Question / Give Feedback
                </button>
            </div>

            {/* Tabs */}
            <div className="feedback-tabs">
                <button
                    className={activeTab === 'all' ? 'active' : ''}
                    onClick={() => setActiveTab('all')}
                >
                    All Questions ({feedbacks.length})
                </button>
                <button
                    className={activeTab === 'my' ? 'active' : ''}
                    onClick={() => setActiveTab('my')}
                >
                    My Questions ({myFeedbacks.length})
                </button>
            </div>

            {/* Filters */}
            <div className="feedback-filters">
                <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
                    <option value="">All Types</option>
                    <option value="question">Questions</option>
                    <option value="feedback">Feedback</option>
                    <option value="guidance">Guidance</option>
                </select>

                <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
                    <option value="">All Categories</option>
                    <option value="General">General</option>
                    <option value="Schemes">Schemes</option>
                    <option value="Application">Application</option>
                    <option value="Documents">Documents</option>
                    <option value="Technical">Technical</option>
                    <option value="Other">Other</option>
                </select>

                <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="answered">Answered</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {/* Feedback List */}
            <div className="feedback-container">
                <div className="feedback-list">
                    {displayFeedbacks.map((feedback) => (
                        <div
                            key={feedback._id}
                            className={`feedback-card ${selectedFeedback?._id === feedback._id ? 'selected' : ''}`}
                            onClick={() => setSelectedFeedback(feedback)}
                        >
                            <div className="feedback-card-header">
                                <span className={`type-badge ${feedback.type}`}>
                                    {feedback.type}
                                </span>
                                {getStatusIcon(feedback.status)}
                            </div>

                            <h3>{feedback.title}</h3>
                            <p className="feedback-description">{feedback.description.substring(0, 100)}...</p>

                            <div className="feedback-meta">
                                <span className="category-tag">{feedback.category}</span>
                                <span className="upvotes">
                                    <ThumbsUp size={14} /> {feedback.upvotes?.length || 0}
                                </span>
                                <span className="responses">
                                    <MessageCircle size={14} /> {feedback.responses?.length || 0}
                                </span>
                                <span className="views">👁️ {feedback.views || 0}</span>
                            </div>

                            <div className="feedback-footer">
                                <span className="author">By {feedback.userId?.name || 'Anonymous'}</span>
                                <span className="date">{new Date(feedback.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}

                    {displayFeedbacks.length === 0 && (
                        <div className="no-feedback">
                            <MessageCircle size={48} />
                            <p>No questions or feedback found</p>
                            <button onClick={() => setShowCreateModal(true)}>
                                Be the first to ask!
                            </button>
                        </div>
                    )}
                </div>

                {/* Feedback Detail */}
                {selectedFeedback && (
                    <div className="feedback-detail">
                        <div className="detail-header">
                            <div>
                                <span className={`type-badge ${selectedFeedback.type}`}>
                                    {selectedFeedback.type}
                                </span>
                                {getStatusIcon(selectedFeedback.status)}
                            </div>
                            <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="upvote-btn"
                                    onClick={() => handleUpvote(selectedFeedback._id)}
                                >
                                    <ThumbsUp size={18} />
                                    {selectedFeedback.upvotes?.length || 0}
                                </button>
                                <button
                                    className="close-btn"
                                    onClick={() => setSelectedFeedback(null)}
                                    title="Close"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <h2>{selectedFeedback.title}</h2>
                        <p className="detail-description">{selectedFeedback.description}</p>

                        <div className="detail-meta">
                            <span>Category: <strong>{selectedFeedback.category}</strong></span>
                            <span>Priority: <strong>{selectedFeedback.priority}</strong></span>
                            <span>Views: <strong>{selectedFeedback.views}</strong></span>
                        </div>

                        <div className="detail-author">
                            Posted by <strong>{selectedFeedback.userId?.name}</strong> on{' '}
                            {new Date(selectedFeedback.createdAt).toLocaleString()}
                        </div>

                        {/* Responses */}
                        <div className="responses-section">
                            <h3>💬 Responses ({selectedFeedback.responses?.length || 0})</h3>

                            {selectedFeedback.responses?.map((response, index) => (
                                <div
                                    key={index}
                                    className={`response-card ${response.isAdminResponse ? 'admin-response' : ''}`}
                                >
                                    {response.isAdminResponse && (
                                        <span className="admin-badge">✓ Admin</span>
                                    )}
                                    <p>{response.message}</p>
                                    <div className="response-footer">
                                        <span>{response.userId?.name || 'Anonymous'}</span>
                                        <span>{new Date(response.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}

                            {/* Add Response */}
                            <div className="add-response">
                                <textarea
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    placeholder="Write your response..."
                                    rows={4}
                                />
                                <button
                                    onClick={() => handleAddResponse(selectedFeedback._id)}
                                    disabled={!responseText.trim()}
                                >
                                    <Send size={18} />
                                    Send Response
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Ask a Question or Give Feedback</h2>
                        <form onSubmit={handleCreateFeedback}>
                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    value={newFeedback.type}
                                    onChange={(e) => setNewFeedback({ ...newFeedback, type: e.target.value })}
                                    required
                                >
                                    <option value="question">Question</option>
                                    <option value="feedback">Feedback</option>
                                    <option value="guidance">Guidance Request</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={newFeedback.title}
                                    onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
                                    placeholder="Brief title for your question/feedback"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={newFeedback.description}
                                    onChange={(e) => setNewFeedback({ ...newFeedback, description: e.target.value })}
                                    placeholder="Provide details..."
                                    rows={6}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={newFeedback.category}
                                        onChange={(e) => setNewFeedback({ ...newFeedback, category: e.target.value })}
                                    >
                                        <option value="General">General</option>
                                        <option value="Schemes">Schemes</option>
                                        <option value="Application">Application</option>
                                        <option value="Documents">Documents</option>
                                        <option value="Technical">Technical</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Priority</label>
                                    <select
                                        value={newFeedback.priority}
                                        onChange={(e) => setNewFeedback({ ...newFeedback, priority: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading}>
                                    {loading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackPage;
