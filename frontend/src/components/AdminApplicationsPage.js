import axios from 'axios';
import {
  CheckCircle,
  ChevronLeft, ChevronRight,
  Clock,
  Download, Eye,
  FileText,
  Search,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css'; // Reuse premium styles

const AdminApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchApplications();
  }, [navigate]);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/admin/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyApplication = async (applicationId, status, remarks = '') => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5002/api/applications/verify/${applicationId}`,
        { status, rejectionReason: remarks, adminRemarks: remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchApplications();
      alert(`Application ${status} successfully!`);
    } catch (error) {
      console.error('Error verifying application:', error);
      alert('Error verifying application');
    }
  };

  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [currentApplication, setCurrentApplication] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState('');

  // Filter and Search Logic
  const filteredApplications = applications.filter(app => {
    const matchesFilter = filter === 'all' || app.status?.toLowerCase() === filter;
    const matchesSearch = searchTerm === '' ||
      app.schemeId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app._id.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <span className="status-badge success"><CheckCircle size={14} /> Approved</span>;
      case 'rejected':
        return <span className="status-badge error"><XCircle size={14} /> Rejected</span>;
      case 'pending':
        return <span className="status-badge warning"><Clock size={14} /> Pending</span>;
      default:
        return <span className="status-badge neutral">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading applications...</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-premium">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>📋 Applications Management</h1>
            <p>Review and manage all scheme applications</p>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={() => alert('Exporting CSV...')}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="stats-grid">
          <div className="stat-card-premium">
            <div className="stat-icon pending">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{applications.filter(app => app.status === 'pending').length}</div>
              <div className="stat-label">Pending Review</div>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-icon approved">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{applications.filter(app => app.status === 'approved').length}</div>
              <div className="stat-label">Approved</div>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-icon applications">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{applications.length}</div>
              <div className="stat-label">Total Applications</div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="quick-actions" style={{ marginBottom: '20px' }}>
          <div className="filter-bar" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-section" style={{ flex: 1, minWidth: '300px' }}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Search by ID, user, or scheme..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-tabs" style={{ display: 'flex', gap: '10px' }}>
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  className={`filter-tab ${filter === status ? 'active' : ''}`}
                  onClick={() => setFilter(status)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: filter === status ? '#667eea' : '#f0f2f5',
                    color: filter === status ? 'white' : '#666',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="chart-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Scheme Name</th>
                  <th>Applicant</th>
                  <th>Date Applied</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedApplications.length > 0 ? (
                  paginatedApplications.map((app) => (
                    <tr key={app._id}>
                      <td className="font-mono text-sm">#{app._id.slice(-6).toUpperCase()}</td>
                      <td style={{ fontWeight: '500' }}>{app.schemeId?.name}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500' }}>{app.userId?.name}</span>
                          <span style={{ fontSize: '0.8rem', color: '#999' }}>{app.userId?.email}</span>
                        </div>
                      </td>
                      <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td>
                        <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-icon"
                            title="View Details"
                            onClick={() => navigate(`/admin/applications/${app._id}`)}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #eee', background: 'white', cursor: 'pointer' }}
                          >
                            <Eye size={16} color="#667eea" />
                          </button>
                          {app.status === 'pending' && (
                            <>
                              <button
                                className="btn-icon"
                                title="Approve"
                                onClick={() => handleVerifyApplication(app._id, 'approved')}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #eee', background: 'white', cursor: 'pointer' }}
                              >
                                <CheckCircle size={16} color="#4caf50" />
                              </button>
                              <button
                                className="btn-icon"
                                title="Reject"
                                onClick={() => {
                                  setCurrentApplication(app);
                                  setActionType('rejected');
                                  setRemarks('');
                                  setShowRemarksModal(true);
                                }}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #eee', background: 'white', cursor: 'pointer' }}
                              >
                                <XCircle size={16} color="#f44336" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      No applications found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '20px', borderTop: '1px solid #eee' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: '6px', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: '6px', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Remarks Modal */}
      {showRemarksModal && (
        <div className="modal-overlay" onClick={() => setShowRemarksModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Application</h2>
              <button className="modal-close" onClick={() => setShowRemarksModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Rejection Reason *</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows="4"
                  required
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRemarksModal(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (!remarks.trim()) {
                    alert('Please enter a reason for rejection');
                    return;
                  }
                  handleVerifyApplication(currentApplication._id, 'rejected', remarks);
                  setShowRemarksModal(false);
                }}
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplicationsPage;
