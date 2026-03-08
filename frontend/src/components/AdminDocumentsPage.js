import axios from 'axios';
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  Search,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Modal State
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchDocuments();
  }, [navigate]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/admin/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (documentId, status, remarks = '') => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5002/api/admin/documents/${documentId}`,
        { status, adminRemarks: remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDocuments();
      alert(`Document ${status} successfully!`);
    } catch (error) {
      console.error('Error verifying document:', error);
      alert('Error verifying document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesFilter = filter === 'all' || doc.verificationStatus === filter;
    const matchesSearch = searchTerm === '' ||
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-premium">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>📄 Documents Management</h1>
            <p>Review and verify user documents</p>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={fetchDocuments}>
              Refresh List
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="stats-grid">
          <div className="stat-card-premium">
            <div className="stat-icon pending">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {documents.filter(doc => doc.verificationStatus === 'pending').length}
              </div>
              <div className="stat-label">Pending Review</div>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-icon approved">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {documents.filter(doc => doc.verificationStatus === 'verified').length}
              </div>
              <div className="stat-label">Verified Documents</div>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-icon negative">
              <XCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {documents.filter(doc => doc.verificationStatus === 'rejected').length}
              </div>
              <div className="stat-label">Rejected Documents</div>
            </div>
          </div>
          <div className="stat-card-premium">
            <div className="stat-icon users">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{documents.length}</div>
              <div className="stat-label">Total Documents</div>
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
                placeholder="Search documents by name, user or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-tabs" style={{ display: 'flex', gap: '10px' }}>
              {['all', 'pending', 'verified', 'rejected'].map((status) => (
                <button
                  key={status}
                  className={`filter-tab ${filter === status ? 'active' : ''}`}
                  onClick={() => setFilter(status)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: filter === status ? '#667eea' : '#2d2d2d',
                    color: filter === status ? 'white' : '#aaa',
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

        {/* Documents Grouped by User and Scheme */}
        <div className="documents-by-user" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {(() => {
            // Group documents by user first, then by scheme
            const groupedByUser = {};
            filteredDocuments.forEach(doc => {
              const userId = doc.userId?._id || 'unknown';
              if (!groupedByUser[userId]) {
                groupedByUser[userId] = {
                  user: doc.userId,
                  schemeGroups: {}
                };
              }

              // Group by scheme within user
              const schemes = doc.relatedApplications || [];
              const schemeKey = schemes.length > 0 ? schemes[0].schemeName : 'No Scheme';

              if (!groupedByUser[userId].schemeGroups[schemeKey]) {
                groupedByUser[userId].schemeGroups[schemeKey] = {
                  schemeName: schemeKey,
                  appId: schemes[0]?.appId,
                  documents: []
                };
              }

              groupedByUser[userId].schemeGroups[schemeKey].documents.push(doc);
            });

            const userGroups = Object.values(groupedByUser);

            if (userGroups.length === 0) {
              return (
                <div className="no-data" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  <h3>No documents found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </div>
              );
            }

            return userGroups.map((group, groupIndex) => {
              const { user, schemeGroups } = group;
              const schemeGroupsArray = Object.values(schemeGroups);

              return (
                <div key={user?._id || groupIndex} style={{
                  background: '#1a1a1a',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #333'
                }}>
                  {/* User Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '15px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '15px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        {user?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>
                          {user?.name || 'Unknown User'}
                        </h3>
                        <p style={{ margin: '2px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                          {user?.email || 'No email'}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '3px' }}>
                          🎯 Schemes
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>
                          {schemeGroupsArray.length}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '3px' }}>
                          � Total Documents
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>
                          {schemeGroupsArray.reduce((sum, sg) => sum + sg.documents.length, 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scheme Groups */}
                  <div style={{ padding: '20px' }}>
                    {schemeGroupsArray.map((schemeGroup, schemeIndex) => {
                      const { schemeName, documents: schemeDocs } = schemeGroup;
                      const firstDoc = schemeDocs[0];
                      const appDate = firstDoc?.uploadDate || new Date();

                      return (
                        <div key={schemeIndex}>
                          {/* Scheme Header */}
                          <div style={{
                            background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                            padding: '12px 15px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            border: '1px solid rgba(102, 126, 234, 0.3)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.2rem' }}>🎯</span>
                              <div>
                                <div style={{ color: '#667eea', fontWeight: '600', fontSize: '1rem' }}>
                                  {schemeName}
                                </div>
                                <div style={{ color: '#999', fontSize: '0.75rem', marginTop: '2px' }}>
                                  {schemeDocs.length} document{schemeDocs.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: '#999', marginBottom: '2px' }}>
                                � Uploaded
                              </div>
                              <div style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: '500' }}>
                                {new Date(appDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                                {' '}
                                {new Date(appDate).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Documents for this Scheme */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '15px',
                            marginBottom: schemeIndex < schemeGroupsArray.length - 1 ? '30px' : '0'
                          }}>
                            {schemeDocs.map(doc => (
                              <div key={doc._id} style={{
                                background: '#2d2d2d',
                                borderRadius: '10px',
                                padding: '15px',
                                border: '1px solid #444',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                              }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-4px)';
                                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                {/* Document Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      marginBottom: '6px'
                                    }}>
                                      <FileText size={18} color="#667eea" />
                                      <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: '600' }}>
                                        {doc.name}
                                      </h4>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{doc.category}</span>
                                  </div>
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    background: doc.verificationStatus === 'verified' ? '#4caf50' :
                                      doc.verificationStatus === 'rejected' ? '#f44336' : '#ff9800',
                                    color: 'white'
                                  }}>
                                    {doc.verificationStatus}
                                  </span>
                                </div>

                                {/* Document Details */}
                                <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '12px' }}>
                                  <div style={{ marginBottom: '4px' }}>
                                    📅 {new Date(doc.uploadDate).toLocaleDateString()}
                                  </div>
                                  <div>
                                    💾 {(doc.size / 1024).toFixed(2)} KB
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                  {doc.verificationStatus === 'pending' ? (
                                    <>
                                      <button
                                        onClick={() => handleVerifyDocument(doc._id, 'verified')}
                                        style={{
                                          flex: 1,
                                          padding: '8px',
                                          background: '#2e7d32',
                                          border: 'none',
                                          borderRadius: '6px',
                                          color: 'white',
                                          fontSize: '0.8rem',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '5px',
                                          transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#1b5e20'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#2e7d32'}
                                      >
                                        <CheckCircle size={14} /> Verify
                                      </button>
                                      <button
                                        onClick={() => {
                                          setCurrentDocument(doc);
                                          setActionType('rejected');
                                          setRemarks('');
                                          setShowRemarksModal(true);
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: '8px',
                                          background: '#c62828',
                                          border: 'none',
                                          borderRadius: '6px',
                                          color: 'white',
                                          fontSize: '0.8rem',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '5px',
                                          transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#b71c1c'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#c62828'}
                                      >
                                        <XCircle size={14} /> Reject
                                      </button>
                                    </>
                                  ) : (
                                    <div style={{
                                      flex: 1,
                                      textAlign: 'center',
                                      padding: '8px',
                                      color: '#888',
                                      fontSize: '0.85rem',
                                      fontStyle: 'italic'
                                    }}>
                                      {doc.verificationStatus === 'verified' ? '✓ Verified' : '✕ Rejected'}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (doc.fileName) {
                                        window.open(`http://localhost:5002/uploads/${doc.fileName}`, '_blank');
                                      } else {
                                        alert('Document file not available');
                                      }
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      background: '#444',
                                      border: 'none',
                                      borderRadius: '6px',
                                      color: 'white',
                                      cursor: 'pointer',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#555'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#444'}
                                  >
                                    <Eye size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Separator Line between schemes */}
                          {schemeIndex < schemeGroupsArray.length - 1 && (
                            <div style={{
                              height: '1px',
                              background: 'linear-gradient(90deg, transparent 0%, rgba(102, 126, 234, 0.5) 50%, transparent 100%)',
                              margin: '30px 0'
                            }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Remarks Modal */}
      {showRemarksModal && (
        <div className="modal-overlay" onClick={() => setShowRemarksModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {actionType === 'rejected' ? 'Reject Document' : 'Verify Document'}
              </h2>
              <button className="modal-close" onClick={() => setShowRemarksModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="remarks">
                  {actionType === 'rejected' ? 'Rejection Reason *' : 'Admin Remarks'}
                </label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    actionType === 'rejected'
                      ? "Enter reason for rejection (required)"
                      : "Enter optional remarks for this document"
                  }
                  rows="4"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRemarksModal(false)}>
                Cancel
              </button>
              <button
                className={`btn ${actionType === 'verified' ? 'btn-success' : 'btn-danger'}`}
                onClick={() => {
                  if (actionType === 'rejected' && !remarks.trim()) {
                    alert('Please enter a reason for rejection');
                    return;
                  }
                  handleVerifyDocument(currentDocument._id, actionType, remarks);
                  setShowRemarksModal(false);
                }}
              >
                {actionType === 'verified' ? '✅ Verify' : '❌ Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDocumentsPage;
