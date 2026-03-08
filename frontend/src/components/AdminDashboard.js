import axios from 'axios';
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle, Clock,
  Database,
  Download,
  FileText,
  MessageCircle,
  RefreshCw,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingApps, setPendingApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month'); // 'today', 'week', 'month', 'year'
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [activities, setActivities] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [feedbackQueue, setFeedbackQueue] = useState([]);

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'info',
    sendToAll: true,
    selectedUsers: []
  });
  const [allUsers, setAllUsers] = useState([]);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      navigate('/login');
      return;
    }

    fetchDashboardData();
    fetchPendingApplications();
    fetchActivities();
    fetchSystemHealth();
    fetchFeedbackQueue();
    fetchAllUsers();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchSystemHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [navigate, dateRange]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5002/api/admin/dashboard?range=${dateRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchPendingApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/applications/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingApps(response.data);
    } catch (error) {
      console.error('Error fetching pending apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/admin/activities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(response.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Mock data if API not available
      setActivities([
        { type: 'user', message: 'New user registered: John Doe', time: '2 minutes ago', icon: 'user' },
        { type: 'application', message: 'Application submitted for PM-KISAN', time: '5 minutes ago', icon: 'file' },
        { type: 'approval', message: 'Application approved for scheme benefits', time: '10 minutes ago', icon: 'check' },
        { type: 'document', message: 'Document uploaded by user', time: '15 minutes ago', icon: 'upload' },
      ]);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/health', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemHealth(response.data || {});
    } catch (error) {
      console.error('Error fetching system health:', error);
      setSystemHealth({ status: 'unknown', uptime: 0 });
    }
  };

  const fetchFeedbackQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/feedback?status=open&limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedbackQueue(response.data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      setFeedbackQueue([]);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsers([]);
    }
  };

  // Calculate trends (mock calculation - you can enhance with real data)
  const calculateTrend = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Mock chart data - replace with real data from your API
  const applicationsChartData = [
    { name: 'Mon', applications: 12 },
    { name: 'Tue', applications: 19 },
    { name: 'Wed', applications: 15 },
    { name: 'Thu', applications: 25 },
    { name: 'Fri', applications: 22 },
    { name: 'Sat', applications: 18 },
    { name: 'Sun', applications: 20 },
  ];

  const statusDistributionData = [
    { name: 'Pending', value: dashboardData?.stats?.pendingApplications || 0, color: '#ff9800' },
    { name: 'Approved', value: dashboardData?.stats?.approvedApplications || 0, color: '#4caf50' },
    { name: 'Rejected', value: dashboardData?.stats?.rejectedApplications || 0, color: '#f44336' },
    { name: 'Under Review', value: dashboardData?.stats?.underReviewApplications || 0, color: '#2196f3' },
  ];

  const topSchemesData = [
    { name: 'PM-KISAN', applications: 45 },
    { name: 'Ayushman Bharat', applications: 38 },
    { name: 'PM Awas Yojana', applications: 32 },
    { name: 'Sukanya Samriddhi', applications: 28 },
    { name: 'PMAY', applications: 25 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/admin/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schemeseva-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const handleBackup = async () => {
    if (!window.confirm('Create a database backup? This may take a few moments.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5002/api/admin/backup', {}, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `schemeseva-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      alert('Database backup created successfully!');
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Error creating backup. Please try again.');
    }
  };

  const handleImportSchemes = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5002/api/admin/import-schemes', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      alert(`Successfully imported ${response.data.count || 0} schemes!`);
      setShowImportModal(false);
      setImportFile(null);
      fetchDashboardData();
    } catch (error) {
      console.error('Error importing schemes:', error);
      alert(error.response?.data?.message || 'Error importing schemes. Please check the file format.');
    }
  };

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      alert('Please fill in title and message');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5002/api/admin/send-notification', {
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        sendToAll: notificationData.sendToAll,
        userIds: notificationData.sendToAll ? [] : notificationData.selectedUsers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Notification sent successfully!');
      setShowNotificationModal(false);
      setNotificationData({
        title: '',
        message: '',
        type: 'info',
        sendToAll: true,
        selectedUsers: []
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error sending notification. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading premium dashboard...</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-premium">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="search-section">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search users, applications, schemes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="top-actions">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="date-range-selector"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          {/* Notifications */}
          <div className="notification-bell" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} />
            {pendingApps.length > 0 && <span className="badge">{pendingApps.length}</span>}

            {showNotifications && (
              <div className="notifications-dropdown">
                <h4>Notifications</h4>
                {pendingApps.slice(0, 5).map(app => (
                  <div key={app._id} className="notification-item">
                    <AlertCircle size={16} />
                    <span>New application: {app.schemeId?.name}</span>
                  </div>
                ))}
                <Link to="/admin/applications" className="view-all">View All</Link>
              </div>
            )}
          </div>

          {/* Admin Profile */}
          <div className="admin-profile">
            <div className="avatar">
              <Shield size={20} />
            </div>
            <div className="admin-info">
              <span className="admin-name">Admin</span>
              <span className="admin-role">System Administrator</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="page-header">
          <div>
            <h1>🛠️ Admin Dashboard</h1>
            <p>Comprehensive overview of your government scheme management system</p>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={fetchDashboardData}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card-premium">
            <div className="stat-icon users">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData?.stats?.totalUsers || 0}</div>
              <div className="stat-label">Total Users</div>
              <div className="stat-trend positive">
                <TrendingUp size={14} />
                <span>+12.5%</span>
              </div>
            </div>
          </div>

          <div className="stat-card-premium">
            <div className="stat-icon applications">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData?.stats?.totalApplications || 0}</div>
              <div className="stat-label">Total Applications</div>
              <div className="stat-trend positive">
                <TrendingUp size={14} />
                <span>+8.3%</span>
              </div>
            </div>
          </div>

          <div className="stat-card-premium">
            <div className="stat-icon pending">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData?.stats?.pendingApplications || 0}</div>
              <div className="stat-label">Pending Applications</div>
              <div className="stat-trend negative">
                <TrendingDown size={14} />
                <span>-3.2%</span>
              </div>
            </div>
          </div>

          <div className="stat-card-premium">
            <div className="stat-icon approved">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData?.stats?.approvedApplications || 0}</div>
              <div className="stat-label">Approved Applications</div>
              <div className="stat-trend positive">
                <TrendingUp size={14} />
                <span>+15.7%</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Health Monitor */}
        <div className="system-health">
          <h3><Activity size={20} /> System Health</h3>
          <div className="health-grid">
            <div className="health-item">
              <div className="health-icon">
                <Database size={20} />
              </div>
              <div className="health-info">
                <span className="health-label">Database</span>
                <span className={`health-status ${systemHealth?.status === 'ok' ? 'healthy' : 'warning'}`}>
                  {systemHealth?.status === 'ok' ? 'Healthy' : 'Unknown'}
                </span>
              </div>
            </div>

            <div className="health-item">
              <div className="health-icon">
                <Zap size={20} />
              </div>
              <div className="health-info">
                <span className="health-label">API Response</span>
                <span className="health-status healthy">Fast</span>
              </div>
            </div>

            <div className="health-item">
              <div className="health-icon">
                <Users size={20} />
              </div>
              <div className="health-info">
                <span className="health-label">Active Users</span>
                <span className="health-value">{dashboardData?.stats?.activeUsers || 0}</span>
              </div>
            </div>

            <div className="health-item">
              <div className="health-icon">
                <Clock size={20} />
              </div>
              <div className="health-info">
                <span className="health-label">Uptime</span>
                <span className="health-value">{Math.floor(systemHealth?.uptime / 3600) || 0}h</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Left Column */}
          <div className="left-column">
            {/* Charts Section */}
            <div className="chart-card">
              <h3>📈 Applications Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={applicationsChartData}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="applications" stroke="#667eea" fillOpacity={1} fill="url(#colorApps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="charts-row">
              <div className="chart-card half">
                <h3>📊 Application Status</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="legend">
                  {statusDistributionData.map((item, index) => (
                    <div key={index} className="legend-item">
                      <span className="legend-color" style={{ background: item.color }}></span>
                      <span>{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card half">
                <h3>🏆 Top Schemes</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topSchemesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="applications" fill="#667eea" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3><Zap size={20} /> Quick Actions</h3>
              <div className="actions-grid">
                <button className="action-btn" onClick={handleExportData}>
                  <Download size={20} />
                  <span>Export Data</span>
                </button>
                <button className="action-btn" onClick={() => setShowImportModal(true)}>
                  <Upload size={20} />
                  <span>Import Schemes</span>
                </button>
                <button className="action-btn" onClick={handleBackup}>
                  <Database size={20} />
                  <span>Backup DB</span>
                </button>
                <Link to="/admin/users" className="action-btn">
                  <Users size={20} />
                  <span>Manage Users</span>
                </Link>
                <button className="action-btn" onClick={() => setShowNotificationModal(true)}>
                  <Bell size={20} />
                  <span>Send Notification</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            {/* Activity Timeline */}
            <div className="activity-timeline">
              <h3><Activity size={20} /> Recent Activity</h3>
              <div className="timeline">
                {activities.map((activity, index) => (
                  <div key={index} className="timeline-item">
                    <div className={`timeline-icon ${activity.type}`}>
                      {activity.icon === 'user' && <Users size={16} />}
                      {activity.icon === 'file' && <FileText size={16} />}
                      {activity.icon === 'check' && <CheckCircle size={16} />}
                      {activity.icon === 'upload' && <Upload size={16} />}
                    </div>
                    <div className="timeline-content">
                      <p>{activity.message}</p>
                      <span className="timeline-time">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Queue */}
            {feedbackQueue.length > 0 && (
              <div className="feedback-queue">
                <h3><MessageCircle size={20} /> Pending Feedback</h3>
                <div className="feedback-list">
                  {feedbackQueue.map((feedback, index) => (
                    <div key={index} className="feedback-item">
                      <div className="feedback-header">
                        <span className={`feedback-type ${feedback.type}`}>{feedback.type}</span>
                        <span className="feedback-priority">{feedback.priority}</span>
                      </div>
                      <p className="feedback-title">{feedback.title}</p>
                      <div className="feedback-footer">
                        <span>by {feedback.userId?.name || 'User'}</span>
                        <Link to="/feedback" className="btn-sm">Review</Link>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/feedback" className="view-all-link">View All Feedback →</Link>
              </div>
            )}

            {/* Admin Navigation */}
            <div className="admin-navigation-compact">
              <h3>🛠️ Management</h3>
              <div className="nav-list">
                <Link to="/admin/applications" className="nav-item">
                  <FileText size={18} />
                  <span>Applications</span>
                  <span className="badge-count">{dashboardData?.stats?.totalApplications || 0}</span>
                </Link>
                <Link to="/admin/users" className="nav-item">
                  <Users size={18} />
                  <span>Users</span>
                  <span className="badge-count">{dashboardData?.stats?.totalUsers || 0}</span>
                </Link>
                <Link to="/admin/documents" className="nav-item">
                  <FileText size={18} />
                  <span>Documents</span>
                </Link>
                <Link to="/admin/scheme-approval" className="nav-item">
                  <CheckCircle size={18} />
                  <span>Approvals</span>
                  <span className="badge-count pending">{dashboardData?.stats?.pendingApplications || 0}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Schemes Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import Schemes</h2>
              <button className="close-btn" onClick={() => setShowImportModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Upload a JSON file containing scheme data. The file should be an array of scheme objects.
              </p>
              <div className="file-upload-area" onClick={() => fileInputRef.current?.click()}>
                <Upload size={40} style={{ color: '#667eea', marginBottom: '10px' }} />
                <p>{importFile ? importFile.name : 'Click to select file or drag and drop'}</p>
                <p style={{ fontSize: '0.85rem', color: '#999' }}>JSON files only</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleImportSchemes} disabled={!importFile}>
                Import Schemes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Notification</h2>
              <button className="close-btn" onClick={() => setShowNotificationModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={notificationData.title}
                  onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
                  placeholder="Enter notification title"
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                  placeholder="Enter notification message"
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={notificationData.type}
                  onChange={(e) => setNotificationData({ ...notificationData, type: e.target.value })}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={notificationData.sendToAll}
                    onChange={(e) => setNotificationData({ ...notificationData, sendToAll: e.target.checked })}
                  />
                  Send to all users
                </label>
              </div>
              {!notificationData.sendToAll && (
                <div className="form-group">
                  <label>Select Users</label>
                  <select
                    multiple
                    value={notificationData.selectedUsers}
                    onChange={(e) => setNotificationData({
                      ...notificationData,
                      selectedUsers: Array.from(e.target.selectedOptions, option => option.value)
                    })}
                    style={{ height: '150px' }}
                  >
                    {allUsers.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#666' }}>Hold Ctrl/Cmd to select multiple users</small>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNotificationModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSendNotification}>
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default AdminDashboard;
