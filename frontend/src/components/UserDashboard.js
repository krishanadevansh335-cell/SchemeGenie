import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Info
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './UserDashboard.css';

const SchemeCard = ({ scheme }) => (
  <div className="scheme-card">
    <div className="scheme-badge">
      <span className={`status-badge ${scheme.status}`}>
        {scheme.status === 'approved' ? 'Approved' : scheme.status === 'pending' ? 'Pending' : 'Eligible'}
      </span>
    </div>
    <div className="scheme-content">
      <h3 className="scheme-title">{scheme.name}</h3>
      <p className="scheme-description">{scheme.description}</p>
      <div className="scheme-details">
        <div className="detail-item">
          <Calendar size={16} className="detail-icon" />
          <span>Deadline: {scheme.deadline}</span>
        </div>
        <div className="detail-item">
          <Clock size={16} className="detail-icon" />
          <span>{scheme.daysLeft} days left</span>
        </div>
      </div>
      <button className="apply-now-btn">
        {scheme.status === 'eligible' ? 'Apply Now' : 'View Details'}
      </button>
    </div>
  </div>
);

const UserDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [userStats, setUserStats] = useState({
    applied: 12,
    approved: 8,
    pending: 3,
    eligible: 15,
    profileCompletion: 65,
    applicationsSubmitted: 12,
    applicationsApproved: 8,
    savedSchemes: 5,
    totalBenefits: 45000,
    documentsUploaded: 8
  });

  const [appliedSchemes, setAppliedSchemes] = useState([
    {
      id: 1,
      name: 'PM Kisan Samman Nidhi',
      date: '15 Nov 2023',
      status: 'approved',
      progress: 100
    },
    {
      id: 2,
      name: 'Ayushman Bharat',
      date: '10 Nov 2023',
      status: 'pending',
      progress: 60
    },
    {
      id: 3,
      name: 'PM Awas Yojana',
      date: '5 Nov 2023',
      status: 'pending',
      progress: 30
    }
  ]);

  const [eligibleSchemes, setEligibleSchemes] = useState([
    {
      id: 4,
      name: 'PM Kisan Samman Nidhi',
      date: 'Eligible',
      status: 'eligible',
      progress: 0
    },
    {
      id: 5,
      name: 'Ayushman Bharat',
      date: 'Eligible',
      status: 'eligible',
      progress: 0
    },
    {
      id: 6,
      name: 'PM Awas Yojana',
      date: 'Eligible',
      status: 'eligible',
      progress: 0
    }
  ]);

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      title: 'PM-KISAN Application Approved',
      description: 'Your application for PM-KISAN has been approved. Next installment: ₹2,000',
      time: '2 hours ago',
      status: 'success',
      icon: <CheckCircle2 size={20} />
    },
    {
      id: 2,
      title: 'Income Certificate Expiring Soon',
      description: 'Your income certificate will expire in 15 days. Renew to avoid application delays.',
      time: '1 day ago',
      status: 'warning',
      icon: <AlertTriangle size={20} />
    },
    {
      id: 3,
      title: 'New Scheme Available',
      description: 'PMAY-Urban scheme is now available in your area. Check eligibility.',
      time: '3 days ago',
      status: 'info',
      icon: <Info size={20} />
    }
  ]);

  const quickActions = [
    {
      title: 'Find Schemes',
      description: 'Discover schemes you might be eligible for',
      icon: '🔍',
      link: '/schemes',
      color: 'blue'
    },
    {
      title: t('dashboard.quickActions.checkApplications', 'Check Applications'),
      description: t('dashboard.quickActions.checkApplicationsDesc', 'Track your application status'),
      icon: '📋',
      link: '/applications',
      color: 'green'
    },
    {
      title: t('dashboard.quickActions.updateProfile', 'Update Profile'),
      description: t('dashboard.quickActions.updateProfileDesc', 'Keep your information current'),
      icon: '👤',
      link: '/profile',
      color: 'purple'
    },
    {
      title: t('dashboard.quickActions.manageDocuments', 'Manage Documents'),
      description: t('dashboard.quickActions.manageDocumentsDesc', 'Upload and organize your documents'),
      icon: '📄',
      link: '/documents',
      color: 'orange'
    }
  ];

  const [upcomingDeadlines] = useState([
    {
      scheme: 'PMAY-Urban',
      deadline: '2024-01-15',
      daysLeft: 12,
      status: 'urgent'
    },
    {
      scheme: 'Scholarship Application',
      deadline: '2024-01-25',
      daysLeft: 22,
      status: 'normal'
    },
    {
      scheme: 'MUDRA Loan',
      deadline: '2024-02-10',
      daysLeft: 38,
      status: 'normal'
    }
  ]);

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 60) return '#FF9800';
    return '#f44336';
  };

  const getStatusColor = (status) => {
    const colors = {
      success: '#4CAF50',
      warning: '#FF9800',
      info: '#2196F3',
      error: '#f44336'
    };
    return colors[status] || '#2196F3';
  };

  return (
    <div className="user-dashboard" style={{
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      padding: '2rem',
      color: '#333',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    }}>
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1 className="dashboard-title">
              {t('dashboard.welcome', 'Welcome back!')}, <span className="user-name">Kris</span>
            </h1>
            <p className="dashboard-subtitle">
              {t('dashboard.subtitle', 'Here\'s your personalized government schemes dashboard')}
            </p>
          </div>
          <div className="profile-completion">
            <div className="completion-circle">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path
                  className="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${userStats.profileCompletion}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="percentage">{userStats.profileCompletion}%</div>
            </div>
            <div className="completion-text">
              <span className="completion-label">{t('dashboard.profileCompletion', 'Profile Complete')}</span>
              <Link to="/profile" className="complete-link">
                {t('dashboard.completeProfile', 'Complete Profile')}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon applications">📝</div>
            <div className="stat-content">
              <div className="stat-number">{userStats.applicationsSubmitted}</div>
              <div className="stat-label">{t('dashboard.stats.applications', 'Applications')}</div>
              <div className="stat-change positive">+2 {t('dashboard.thisMonth', 'this month')}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon approved">✅</div>
            <div className="stat-content">
              <div className="stat-number">{userStats.applicationsApproved}</div>
              <div className="stat-label">{t('dashboard.stats.approved', 'Approved')}</div>
              <div className="stat-change positive">+1 {t('dashboard.thisWeek', 'this week')}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon saved">💾</div>
            <div className="stat-content">
              <div className="stat-number">{userStats.savedSchemes}</div>
              <div className="stat-label">{t('dashboard.stats.saved', 'Saved Schemes')}</div>
              <div className="stat-change neutral">+3 {t('dashboard.thisMonth', 'this month')}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon benefits">💰</div>
            <div className="stat-content">
              <div className="stat-number">₹{userStats.totalBenefits.toLocaleString()}</div>
              <div className="stat-label">{t('dashboard.stats.benefits', 'Total Benefits')}</div>
              <div className="stat-change positive">+₹15,000 {t('dashboard.thisMonth', 'this month')}</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="dashboard-content">
          {/* Quick Actions */}
          <div className="dashboard-section">
            <h2 className="section-title">{t('dashboard.quickActions.title', 'Quick Actions')}</h2>
            <div className="quick-actions-grid">
              {quickActions.map((action, index) => (
                <Link key={index} to={action.link} className={`quick-action-card ${action.color}`}>
                  <div className="action-icon">{action.icon}</div>
                  <div className="action-content">
                    <h3 className="action-title">{action.title}</h3>
                    <p className="action-description">{action.description}</p>
                  </div>
                  <div className="action-arrow">→</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity & Upcoming Deadlines */}
          <div className="dashboard-row">
            {/* Recent Activity */}
            <div className="dashboard-section">
              <h2 className="section-title">{t('dashboard.recentActivity', 'Recent Activity')}</h2>
              <div className="activity-list">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon" style={{ color: getStatusColor(activity.status) }}>
                      {activity.icon}
                    </div>
                    <div className="activity-content">
                      <h4 className="activity-title">{activity.title}</h4>
                      <p className="activity-description">{activity.description}</p>
                      <span className="activity-timestamp">{activity.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/activity" className="view-all-link">
                {t('dashboard.viewAllActivity', 'View All Activity')} →
              </Link>
            </div>

            {/* Upcoming Deadlines */}
            <div className="dashboard-section">
              <h2 className="section-title">{t('dashboard.upcomingDeadlines', 'Upcoming Deadlines')}</h2>
              <div className="deadlines-list">
                {upcomingDeadlines.map((deadline, index) => (
                  <div key={index} className={`deadline-item ${deadline.status}`}>
                    <div className="deadline-info">
                      <h4 className="deadline-scheme">{deadline.scheme}</h4>
                      <p className="deadline-date">{deadline.deadline}</p>
                    </div>
                    <div className="deadline-countdown">
                      <span className="days-left">{deadline.daysLeft}</span>
                      <span className="days-label">{t('dashboard.daysLeft', 'days left')}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/deadlines" className="view-all-link">
                {t('dashboard.viewAllDeadlines', 'View All Deadlines')} →
              </Link>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="dashboard-section">
          <h2 className="section-title">{t('dashboard.yourProgress', 'Your Progress')}</h2>
          <div className="progress-cards">
            <div className="progress-card">
              <div className="progress-header">
                <h3>{t('dashboard.progress.documentsUploaded', 'Documents Uploaded')}</h3>
                <span className="progress-count">{userStats.documentsUploaded}/15</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(userStats.documentsUploaded / 15) * 100}%`,
                    backgroundColor: getProgressColor((userStats.documentsUploaded / 15) * 100)
                  }}
                ></div>
              </div>
              <p className="progress-description">
                {t('dashboard.progress.documentsDesc', 'Upload all required documents to speed up applications')}
              </p>
            </div>

            <div className="progress-card">
              <div className="progress-header">
                <h3>{t('dashboard.progress.profileCompletion', 'Profile Completion')}</h3>
                <span className="progress-count">{userStats.profileCompletion}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${userStats.profileCompletion}%`,
                    backgroundColor: getProgressColor(userStats.profileCompletion)
                  }}
                ></div>
              </div>
              <p className="progress-description">
                {t('dashboard.progress.profileDesc', 'Complete your profile for better scheme recommendations')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
