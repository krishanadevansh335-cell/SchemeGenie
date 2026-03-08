import axios from 'axios';
import {
  ChevronLeft, ChevronRight,
  Download, Eye,
  FileText,
  Search,
  Shield,
  User,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css'; // Reuse premium styles

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5002/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserDetails(response.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  // Delete user (admin only)
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5002/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + (error.response?.data?.msg || error.message));
    }
  };

  // Filter and Search Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesRole = false;
    if (filterRole === 'all') {
      matchesRole = true;
    } else if (filterRole === 'inactive') {
      // Assuming inactive users have a boolean flag `isActive` false or role 'demo'
      matchesRole = user.isActive === false || user.role === 'demo';
    } else {
      matchesRole = user.role === filterRole;
    }
    return matchesSearch && matchesRole;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading users...</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-premium">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>👥 Users Management</h1>
            <p>Manage and monitor all registered users</p>
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
            <div className="stat-icon users">
              <User size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{users.length}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-icon approved">
              <Shield size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{users.filter(u => u.role === 'admin').length}</div>
              <div className="stat-label">Admins</div>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-icon pending">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {users.reduce((total, user) => total + (user.documentsCount || 0), 0)}
              </div>
              <div className="stat-label">Total Documents</div>
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
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-tabs" style={{ display: 'flex', gap: '10px' }}>
              {['all', 'user', 'admin', 'inactive'].map((role) => (
                <button
                  key={role}
                  className={`filter-tab ${filterRole === role ? 'active' : ''}`}
                  onClick={() => setFilterRole(role)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: filterRole === role ? '#667eea' : '#f0f2f5',
                    color: filterRole === role ? 'white' : '#666',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {role === 'all' ? 'All Users' : role === 'inactive' ? 'Inactive/Demo' : role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="chart-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  <th>Docs</th>
                  <th>Apps</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user._id}>
                      <td style={{ fontWeight: '500' }}>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`status-badge ${user.role === 'admin' ? 'success' : 'neutral'}`}>
                          {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                          {user.role}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>{user.documentsCount || 0}</td>
                      <td>{user.applicationsCount || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-icon"
                            title="View Details"
                            onClick={() => fetchUserDetails(user._id)}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #eee', background: 'white', cursor: 'pointer' }}
                          >
                            <Eye size={16} color="#667eea" />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              className="btn-icon"
                              title="Delete User"
                              onClick={() => handleDeleteUser(user._id)}
                              style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e53935', background: '#ffebee', cursor: 'pointer' }}
                            >
                              <XCircle size={16} color="#e53935" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      No users found matching your criteria.
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

      {/* User Details Modal */}
      {userDetails && (
        <div className="modal-overlay" onClick={() => setUserDetails(null)}>
          <div className="modal-content premium-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #333' }}>
              <h2>👤 {userDetails.user.name}</h2>
              <button className="modal-close" onClick={() => setUserDetails(null)} style={{ color: '#aaa' }}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px' }}>
              {/* User Profile */}
              <div className="user-profile-card" style={{ marginBottom: '25px', padding: '20px', background: '#252525', borderRadius: '12px', border: '1px solid #333' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</p>
                    <p style={{ margin: '0', fontWeight: '500', color: '#fff' }}>{userDetails.user.email}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</p>
                    <span className={`status-badge ${userDetails.user.role === 'admin' ? 'success' : 'neutral'}`}>
                      {userDetails.user.role}
                    </span>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined Date</p>
                    <p style={{ margin: '0', fontWeight: '500', color: '#fff' }}>{new Date(userDetails.user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User ID</p>
                    <p style={{ margin: '0', fontFamily: 'monospace', fontSize: '0.9rem', color: '#aaa' }}>{userDetails.user._id}</p>
                  </div>
                </div>
              </div>

              {/* Applications with Documents */}
              <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#fff', borderLeft: '4px solid #667eea', paddingLeft: '10px' }}>Applications & Documents</h3>

              {userDetails.applications.length > 0 ? (
                <div className="applications-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {userDetails.applications.map(app => {
                    // Filter docs for this app
                    const appDocs = app.applicationData?.documents || [];
                    const linkedDocs = userDetails.documents.filter(doc =>
                      appDocs.some(ad => ad.url && doc.fileName && ad.url.includes(doc.fileName))
                    );

                    return (
                      <div key={app._id} className="application-card-dark" style={{ background: '#252525', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden' }}>
                        <div className="app-header" style={{ padding: '15px', background: '#2d2d2d', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{app.schemeId?.name}</h4>
                            <span style={{ fontSize: '0.8rem', color: '#888', fontFamily: 'monospace' }}>ID: #{app._id.slice(-6).toUpperCase()}</span>
                          </div>
                          <span className={`status-badge ${app.status.toLowerCase()}`}>{app.status}</span>
                        </div>

                        {/* Attached Documents */}
                        <div className="app-documents" style={{ padding: '15px' }}>
                          <h5 style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={14} /> Attached Documents ({linkedDocs.length})
                          </h5>
                          {linkedDocs.length > 0 ? (
                            <div className="docs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                              {linkedDocs.map(doc => (
                                <div key={doc._id} className="doc-chip" style={{ background: '#1a1a1a', padding: '10px', borderRadius: '8px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ background: '#333', padding: '6px', borderRadius: '6px' }}>
                                    <FileText size={16} color="#667eea" />
                                  </div>
                                  <div style={{ overflow: 'hidden' }}>
                                    <span style={{ display: 'block', fontSize: '0.9rem', color: '#e0e0e0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</span>
                                    <span className={`status-text ${doc.verificationStatus || 'pending'}`} style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                                      {doc.verificationStatus || 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9rem', margin: 0 }}>No documents attached to this application.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#888', textAlign: 'center', padding: '20px', background: '#252525', borderRadius: '8px' }}>No applications found for this user.</p>
              )}

              {/* Unlinked Documents */}
              {(() => {
                // Find docs not linked to any displayed application
                const allLinkedDocIds = new Set();
                userDetails.applications.forEach(app => {
                  const appDocs = app.applicationData?.documents || [];
                  userDetails.documents.forEach(doc => {
                    if (appDocs.some(ad => ad.url && doc.fileName && ad.url.includes(doc.fileName))) {
                      allLinkedDocIds.add(doc._id);
                    }
                  });
                });

                const unlinkedDocs = userDetails.documents.filter(doc => !allLinkedDocIds.has(doc._id));

                if (unlinkedDocs.length > 0) {
                  return (
                    <div className="unlinked-docs-section" style={{ marginTop: '30px' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#fff', borderLeft: '4px solid #aaa', paddingLeft: '10px' }}>📂 Other Documents</h3>
                      <div className="docs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {unlinkedDocs.map(doc => (
                          <div key={doc._id} className="doc-card-small" style={{ background: '#252525', padding: '12px', borderRadius: '8px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: '#333', padding: '8px', borderRadius: '6px' }}>
                              <FileText size={18} color="#aaa" />
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <span style={{ display: 'block', fontSize: '0.9rem', color: '#e0e0e0', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</span>
                              <span style={{ fontSize: '0.8rem', color: '#888' }}>{doc.category}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
