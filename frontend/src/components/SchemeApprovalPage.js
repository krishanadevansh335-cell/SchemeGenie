import axios from 'axios';
import {
  Award,
  CheckCircle,
  ChevronLeft, ChevronRight,
  Eye,
  Search,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const SchemeApprovalPage = () => {
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
    fetchApprovedApplications();
  }, [navigate]);

  const fetchApprovedApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/admin/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // We want to show applications that are at least 'approved' (ready for final grant)
      // or already processed ('final_approved', 'final_rejected')
      const relevantApps = response.data.filter(app =>
        ['approved', 'final_approved', 'final_rejected', 'rejected'].includes(app.status)
      );
      setApplications(relevantApps);
    } catch (error) {
      console.error('Error fetching approved applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchemeApproval = async (applicationId, action, remarks = '') => {
    try {
      const token = localStorage.getItem('token');
      // Send the action directly as the status (final_approved or final_rejected)
      const payload = {
        status: action,
        adminRemarks: remarks
      };

      console.log('Sending approval request:', { applicationId, payload });

      await axios.patch(
        `http://localhost:5002/api/applications/verify/${applicationId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchApprovedApplications();
      alert(`Scheme ${action === 'final_approved' ? 'granted' : 'held'} successfully!`);
    } catch (error) {
      console.error('Error processing scheme approval:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alert(`Error processing scheme approval: ${error.response?.data?.msg || error.response?.data?.message || error.message}`);
    }
  };

  // Filter Logic
  const filteredApplications = applications.filter(app => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch = searchTerm === '' ||
      app.schemeId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApps = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading Scheme Approvals...</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-premium">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>🏆 Scheme Final Approval</h1>
            <p>Grant final benefits to approved applicants</p>
          </div>
          <div className="header-actions">
            <Link to="/admin/dashboard" className="btn-refresh">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="stats-grid">
          <div className="stat-card-premium">
            <div className="stat-icon pending">
              <Award size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {applications.filter(app => app.status === 'approved').length}
              </div>
              <div className="stat-label">Pending Grant</div>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-icon approved">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {applications.filter(app => app.status === 'final_approved').length}
              </div>
              <div className="stat-label">Benefits Granted</div>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-icon negative">
              <XCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {applications.filter(app => app.status === 'final_rejected').length}
              </div>
              <div className="stat-label">Benefits Held</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="quick-actions" style={{ marginBottom: '20px' }}>
          <div className="filter-bar" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-section" style={{ flex: 1, minWidth: '300px' }}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Search by scheme, applicant or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-tabs" style={{ display: 'flex', gap: '10px' }}>
              {[
                { id: 'approved', label: 'Pending Grant' },
                { id: 'final_approved', label: 'Granted' },
                { id: 'final_rejected', label: 'Held' },
                { id: 'all', label: 'All' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`filter-tab ${filter === tab.id ? 'active' : ''}`}
                  onClick={() => setFilter(tab.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: filter === tab.id ? '#667eea' : '#2d2d2d',
                    color: filter === tab.id ? 'white' : '#aaa',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {tab.label}
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
                  <th>Approved Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedApps.length > 0 ? (
                  paginatedApps.map((app) => (
                    <tr key={app._id}>
                      <td style={{ fontFamily: 'monospace', color: '#667eea' }}>
                        #{app._id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ fontWeight: '500' }}>{app.schemeId?.name}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500' }}>{app.userId?.name}</span>
                          <span style={{ fontSize: '0.8rem', color: '#888' }}>{app.userId?.email}</span>
                        </div>
                      </td>
                      <td>{new Date(app.reviewedAt || app.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${app.status === 'final_approved' ? 'success' :
                          app.status === 'final_rejected' ? 'error' : 'warning'
                          }`}>
                          {app.status === 'approved' ? 'Pending Grant' :
                            app.status === 'final_approved' ? 'Granted' : 'Held'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-icon"
                            title="View Details"
                            onClick={() => navigate(`/admin/applications/${app._id}`)}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #444', background: '#2d2d2d', cursor: 'pointer' }}
                          >
                            <Eye size={16} color="#667eea" />
                          </button>

                          {app.status === 'approved' && (
                            <>
                              <button
                                className="btn-icon"
                                title="Grant Benefits"
                                onClick={() => {
                                  const remarks = prompt('Enter final approval notes (optional):');
                                  if (remarks !== null) {
                                    handleSchemeApproval(app._id, 'final_approved', remarks || 'Final approval granted');
                                  }
                                }}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #444', background: '#2d2d2d', cursor: 'pointer' }}
                              >
                                <CheckCircle size={16} color="#4caf50" />
                              </button>
                              <button
                                className="btn-icon"
                                title="Hold Benefits"
                                onClick={() => {
                                  const remarks = prompt('Enter reason for holding benefits (required):');
                                  if (remarks && remarks.trim()) {
                                    handleSchemeApproval(app._id, 'final_rejected', remarks);
                                  } else {
                                    alert('Reason is required for holding benefits');
                                  }
                                }}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #444', background: '#2d2d2d', cursor: 'pointer' }}
                              >
                                <XCircle size={16} color="#f44336" />
                              </button>
                            </>
                          )}
                          {app.status !== 'approved' && (
                            <span style={{ color: '#888', fontStyle: 'italic' }}>No actions available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                      No applications found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '20px', borderTop: '1px solid #333' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                style={{ padding: '8px 12px', border: '1px solid #444', borderRadius: '6px', background: '#2d2d2d', color: currentPage === 1 ? '#666' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', color: '#aaa' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                style={{ padding: '8px 12px', border: '1px solid #444', borderRadius: '6px', background: '#2d2d2d', color: currentPage === totalPages ? '#666' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchemeApprovalPage;
