import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './AdminPages.css';

const AdminApplicationDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showAllDocuments, setShowAllDocuments] = useState(false);

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `http://localhost:5002${path}`;
  };

  useEffect(() => {
    // Check if user is admin
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      navigate('/login');
      return;
    }

    fetchApplicationDetails();
  }, [id, navigate]);

  const fetchApplicationDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5002/api/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplication(response.data);
      // Fetch documents for this user
      fetchUserDocuments(response.data.userId._id || response.data.userId);
    } catch (error) {
      console.error('Error fetching application details:', error);
      setError('Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDocuments = async (userId) => {
    try {
      setDocumentsLoading(true);
      const token = localStorage.getItem('token');
      // Fetch all documents for the user
      const response = await axios.get(
        `http://localhost:5002/api/admin/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // The user details endpoint returns { user, documents, applications }
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDocumentVerification = async (docId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5002/api/admin/documents/${docId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh documents
      if (application?.userId?._id) {
        fetchUserDocuments(application.userId._id);
      }
      alert(`Document marked as ${status}`);
    } catch (error) {
      console.error('Error updating document status:', error);
      alert('Failed to update document status');
    }
  };

  const handleStatusUpdate = async (status, remarks = '') => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5002/api/applications/verify/${id}`,
        { status, rejectionReason: remarks, adminRemarks: remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh application details
      fetchApplicationDetails();
      alert(`Application ${status} successfully!`);
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Error updating application status');
    }
  };

  const handleFinalApproval = async (action, remarks = '') => {
    try {
      const token = localStorage.getItem('token');
      const finalStatus = action === 'grant' ? 'final_approved' : 'final_rejected';

      await axios.patch(`http://localhost:5002/api/applications/verify/${id}`,
        {
          status: finalStatus,
          finalApprovalRemarks: remarks,
          finalApprovedAt: new Date(),
          finalApprovedBy: 'admin'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchApplicationDetails();
      alert(`Scheme benefits ${action === 'grant' ? 'granted' : 'held'} successfully!`);
    } catch (error) {
      console.error('Error processing final approval:', error);
      alert('Error processing final approval');
    }
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  const handleDownloadDocument = async (document) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5002/api/admin/documents/${document._id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      const url = globalThis.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.name || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document');
    }
  };

  if (loading) {
    return (
      <div className="admin-applications-page">
        <div className="container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h3>Loading Application Details...</h3>
            <p>Please wait while we fetch the application information.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="admin-applications-page">
        <div className="container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Error Loading Application</h3>
            <p>{error || 'The requested application could not be found.'}</p>
            <button
              onClick={() => navigate('/admin/applications')}
              className="btn btn-primary"
            >
              ← Back to Applications
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-applications-page">
      <div className="container">
        <div className="application-details-header">
          <div>
            <h1>Application Details</h1>
            <p style={{ color: '#aaa', fontFamily: 'monospace', marginTop: '5px' }}>
              ID: #{application._id.slice(-6).toUpperCase()}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/applications')}
            className="btn btn-secondary"
          >
            ← Back to Applications
          </button>
        </div>

        {/* Application Overview */}
        <div className="application-overview">
          <div className="overview-card">
            <h3>{application.schemeId?.name}</h3>
            <p><strong>Category:</strong> {application.schemeId?.category}</p>
            <p><strong>Status:</strong>
              <span className={`status-badge status-${application.status?.toLowerCase()}`}>
                {application.status}
              </span>
            </p>
            <p><strong>Applied:</strong> {new Date(application.createdAt).toLocaleDateString()}</p>
            {application.trackingId && (
              <p><strong>Tracking ID:</strong> {application.trackingId}</p>
            )}
          </div>
        </div>

        {/* User Information */}
        <div className="details-section">
          <h2>👤 Applicant Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>Name:</strong> {application.userId?.name}
            </div>
            <div className="info-item">
              <strong>Email:</strong> {application.userId?.email}
            </div>
            <div className="info-item">
              <strong>Applied On:</strong> {new Date(application.createdAt).toLocaleDateString()}
            </div>
            {application.submittedAt && (
              <div className="info-item">
                <strong>Submitted On:</strong> {new Date(application.submittedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Application Data */}
        <div className="details-section">
          <h2>📋 Application Data</h2>
          {application.applicationData?.personalInfo && (
            <div className="data-section">
              <h3>Personal Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Full Name:</strong> {application.applicationData.personalInfo.fullName || 'Not provided'}
                </div>
                <div className="info-item">
                  <strong>Date of Birth:</strong> {application.applicationData.personalInfo.dateOfBirth || 'Not provided'}
                </div>
                <div className="info-item">
                  <strong>Gender:</strong> {application.applicationData.personalInfo.gender || 'Not provided'}
                </div>
                <div className="info-item">
                  <strong>Phone:</strong> {application.applicationData.personalInfo.phone || 'Not provided'}
                </div>
                <div className="info-item">
                  <strong>Address:</strong> {application.applicationData.personalInfo.address || 'Not provided'}
                </div>
                <div className="info-item">
                  <strong>State:</strong> {application.applicationData.personalInfo.state || 'Not provided'}
                </div>
              </div>
            </div>
          )}

          {application.applicationData?.eligibilityInfo && (
            <div className="data-section">
              <h3>Eligibility Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Annual Income:</strong> {application.applicationData.eligibilityInfo.income || 'Not provided'}
                </div>
                <div className="info-item">
                  <strong>Caste Category:</strong> {application.applicationData.eligibilityInfo.caste || 'Not provided'}
                </div>
                <div className="info-item">
                  <strong>Education:</strong> {application.applicationData.eligibilityInfo.education || 'Not provided'}
                </div>
                <div className="info-item">
                  <strong>Employment:</strong> {application.applicationData.eligibilityInfo.employment || 'Not provided'}
                </div>
              </div>
            </div>
          )}

          <div className="data-section">
            <h3>📄 Application Documents</h3>
            {(() => {
              // Get documents directly from the application data
              const appDocs = application.applicationData?.documents || [];

              if (documentsLoading) {
                return (
                  <div className="loading-state-small">
                    <p>Loading documents...</p>
                  </div>
                );
              }

              // Check if this application has embedded documents (new format)
              const hasEmbeddedDocs = appDocs.length > 0 && appDocs[0].url;

              // If there are documents embedded in the application, show them
              if (hasEmbeddedDocs) {
                return (
                  <div className="documents-container">
                    {/* Application Info Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '15px',
                      marginBottom: '20px',
                      padding: '15px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '8px',
                      color: 'white'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '5px' }}>📅 Application Date</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                          {new Date(application.submittedAt || application.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '5px' }}>🎯 Scheme Name</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                          {application.schemeId?.name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '5px' }}>📊 Status</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                          {application.status}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '5px' }}>📎 Documents</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                          {appDocs.length} Attached
                        </div>
                      </div>
                    </div>

                    {/* Documents Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '15px',
                      marginTop: '15px'
                    }}>
                      {appDocs.map((doc, index) => {
                        console.log('Document:', doc); // Debug log
                        return (
                          <div
                            key={doc._id || index}
                            style={{
                              background: 'white',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              padding: '15px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {/* Document Header */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                  {doc.name || doc.fileName || `Document ${index + 1}`}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                  {doc.category || doc.type || 'Document'}
                                </div>
                              </div>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                background: doc.verified ? '#4caf50' : '#ff9800',
                                color: 'white'
                              }}>
                                {doc.verified ? '✓ VERIFIED' : '⏳ PENDING'}
                              </span>
                            </div>

                            {/* Document Info */}
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '12px' }}>
                              📅 Submitted: {doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString() : new Date(application.submittedAt || application.createdAt).toLocaleDateString()}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (doc.url) {
                                    const fullUrl = getFullUrl(doc.url);
                                    console.log('Opening document:', fullUrl);
                                    window.open(fullUrl, '_blank');
                                  } else {
                                    alert('Document URL not available');
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  background: '#2196f3',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1976d2'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#2196f3'}
                              >
                                👁️ View
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (doc.url) {
                                    const fullUrl = getFullUrl(doc.url);
                                    const link = document.createElement('a');
                                    link.href = fullUrl;
                                    link.download = doc.fileName || doc.name || 'document';
                                    link.target = '_blank';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  } else {
                                    alert('Document URL not available');
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  background: '#9c27b0',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#7b1fa2'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#9c27b0'}
                              >
                                ⬇️ Download
                              </button>
                              {!doc.verified && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const token = localStorage.getItem('token');
                                      const response = await axios.patch(
                                        `http://localhost:5002/api/applications/${application._id}/documents/${index}/verify`,
                                        { verified: true },
                                        { headers: { Authorization: `Bearer ${token}` } }
                                      );
                                      console.log('Verification response:', response.data);
                                      alert('Document marked as verified');
                                      // Refresh application details
                                      fetchApplicationDetails();
                                    } catch (error) {
                                      console.error('Error verifying document:', error);
                                      console.error('Error details:', error.response?.data);
                                      alert(`Failed to verify document: ${error.response?.data?.msg || error.message}`);
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#388e3c'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#4caf50'}
                                >
                                  ✅ Verify Document
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Old application format - show message
              if (appDocs.length > 0 && !hasEmbeddedDocs) {
                return (
                  <div className="no-documents">
                    <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                      <p style={{ margin: 0, color: '#856404', fontWeight: 'bold' }}>⚠️ Old Application Format</p>
                      <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: '#856404' }}>
                        This application was created before the document embedding feature was implemented.
                        Documents are stored as IDs only: {JSON.stringify(appDocs)}
                      </p>
                      <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: '#856404' }}>
                        To see documents with full verification features, please create a new application.
                      </p>
                    </div>
                    {documents.length > 0 && (
                      <button
                        className="btn-text"
                        onClick={() => setShowAllDocuments(true)}
                        style={{ marginTop: '10px', color: '#667eea', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        View all user documents ({documents.length})
                      </button>
                    )}
                  </div>
                );
              }

              // Fallback: Try to match with user documents if no embedded documents
              const relevantDocs = documents.filter(doc =>
                appDocs.some(appDoc => appDoc.url && doc.fileName && appDoc.url.includes(doc.fileName))
              );

              if (relevantDocs.length === 0 && !showAllDocuments) {
                return (
                  <div className="no-documents">
                    <p>No documents found for this specific application.</p>
                    {documents.length > 0 && (
                      <button
                        className="btn-text"
                        onClick={() => setShowAllDocuments(true)}
                        style={{ marginTop: '10px', color: '#667eea', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        View all user documents ({documents.length})
                      </button>
                    )}
                  </div>
                );
              }

              const docsToShow = showAllDocuments ? documents : relevantDocs;

              return (
                <div className="documents-list">
                  {showAllDocuments && (
                    <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px' }}>
                      <span style={{ color: '#888' }}>Showing all {documents.length} user documents</span>
                      <button onClick={() => setShowAllDocuments(false)} className="btn-text" style={{ color: '#667eea', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Show only application documents
                      </button>
                    </div>
                  )}

                  {docsToShow.map((doc, index) => (
                    <div key={doc._id || index} className="document-item">
                      <div className="document-info">
                        <strong>{doc.name || `Document ${index + 1}`}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {' '}(Category: {doc.category || 'Document'})
                        </span>
                        <p style={{ fontSize: '0.8rem', marginTop: '5px' }}>
                          Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="document-actions">
                        <span className={`document-status ${doc.verificationStatus || 'pending'}`}>
                          {(doc.verificationStatus || 'pending').toUpperCase()}
                        </span>

                        <div className="action-buttons-row">
                          <button
                            className="btn-small btn-info"
                            onClick={() => handleViewDocument(doc)}
                            title="View document"
                          >
                            👁️ View
                          </button>
                          <button
                            className="btn-small btn-secondary"
                            onClick={() => handleDownloadDocument(doc)}
                            title="Download document"
                          >
                            ⬇️ Download
                          </button>

                          {/* Verification Actions */}
                          {doc.verificationStatus !== 'verified' && (
                            <button
                              className="btn-small btn-success"
                              onClick={() => handleDocumentVerification(doc._id, 'verified')}
                              title="Mark as Verified"
                            >
                              ✅ Verify
                            </button>
                          )}
                          {doc.verificationStatus !== 'rejected' && (
                            <button
                              className="btn-small btn-danger"
                              onClick={() => handleDocumentVerification(doc._id, 'rejected')}
                              title="Mark as Rejected"
                            >
                              ❌ Reject
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {!showAllDocuments && documents.length > relevantDocs.length && (
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowAllDocuments(true)}
                      >
                        View all user documents ({documents.length})
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Admin Actions */}
        {['pending', 'submitted', 'under_review'].includes(application.status) && (
          <div className="admin-actions">
            <h2>⚡ Admin Actions</h2>

            {/* Document Verification Warning */}
            {(() => {
              const appDocs = application.applicationData?.documents || [];
              // Check embedded documents directly
              const hasDocs = appDocs.length > 0;
              const allVerified = !hasDocs || appDocs.every(doc => doc.verified === true);

              if (hasDocs && !allVerified) {
                return (
                  <div className="alert alert-warning" style={{ marginBottom: '15px', padding: '10px', background: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)', borderRadius: '6px', color: '#ff9800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <div>
                      <strong>Cannot Approve Yet</strong>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>All documents must be verified before approving the application.</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="action-buttons">
              <button
                className="btn btn-success"
                onClick={() => {
                  // Check embedded documents again
                  const appDocs = application.applicationData?.documents || [];
                  const hasDocs = appDocs.length > 0;
                  const allVerified = !hasDocs || appDocs.every(doc => doc.verified === true);

                  if (hasDocs && !allVerified) {
                    alert('Please verify all documents first!');
                    return;
                  }

                  const remarks = prompt('Enter approval remarks (optional):');
                  if (remarks !== null) {
                    handleStatusUpdate('approved', remarks);
                  }
                }}
              >
                ✅ Approve Application
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  const remarks = prompt('Enter rejection reason (required):');
                  if (remarks && remarks.trim()) {
                    handleStatusUpdate('rejected', remarks);
                  } else {
                    alert('Rejection reason is required');
                  }
                }}
              >
                ❌ Reject Application
              </button>
            </div>
          </div>
        )}

        {/* Final Approval Actions for Approved Applications */}
        {application.status === 'approved' && (
          <div className="admin-actions">
            <h2>🏆 Scheme Approval Actions</h2>
            <div className="action-buttons">
              <button
                className="btn btn-success"
                onClick={() => {
                  if (window.confirm('Are you sure you want to grant benefits for this scheme?')) {
                    handleFinalApproval('grant', 'Benefits Granted');
                  }
                }}
              >
                ✅ Grant Scheme Benefits
              </button>
              <button
                className="btn btn-warning"
                onClick={() => {
                  const remarks = prompt('Enter reason for holding benefits:');
                  if (remarks) {
                    handleFinalApproval('hold', remarks);
                  }
                }}
              >
                ⏳ Hold Benefits
              </button>
            </div>
          </div>
        )}

        {/* Application Status History */}
        <div className="details-section">
          <h2>📊 Application Status</h2>
          <div className="status-timeline">
            <div className={`status-step ${application.status === 'draft' || ['submitted', 'under_review', 'approved', 'rejected', 'requires_resubmission'].includes(application.status) ? 'completed' : ''}`}>
              <div className="status-icon">📝</div>
              <div className="status-text">Draft</div>
              <div className="status-date">{new Date(application.createdAt).toLocaleDateString()}</div>
            </div>

            <div className={`status-step ${['submitted', 'under_review', 'approved', 'rejected', 'requires_resubmission'].includes(application.status) ? 'completed' : ''}`}>
              <div className="status-icon">✅</div>
              <div className="status-text">Submitted</div>
              <div className="status-date">{application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : 'Not submitted'}</div>
            </div>

            <div className={`status-step ${['under_review', 'approved', 'rejected', 'requires_resubmission'].includes(application.status) ? 'completed' : ''}`}>
              <div className="status-icon">⏳</div>
              <div className="status-text">Under Review</div>
              <div className="status-date">{application.reviewedAt ? new Date(application.reviewedAt).toLocaleDateString() : 'Not started'}</div>
            </div>

            <div className={`status-step ${application.status === 'approved' ? 'completed' : application.status === 'rejected' ? 'rejected' : ''}`}>
              <div className="status-icon">{application.status === 'rejected' ? '❌' : application.status === 'approved' ? '✅' : '❓'}</div>
              <div className="status-text">{application.status === 'approved' ? 'Approved' : application.status === 'rejected' ? 'Rejected' : 'Pending'}</div>
              <div className="status-date">{application.completedAt ? new Date(application.completedAt).toLocaleDateString() : 'Pending'}</div>
            </div>
          </div>

          {application.rejectionReason && (
            <div className="rejection-reason">
              <strong>Rejection Reason:</strong> {application.rejectionReason}
            </div>
          )}

          {application.adminRemarks && (
            <div className="admin-remarks">
              <strong>Admin Remarks:</strong> {application.adminRemarks}
            </div>
          )}
        </div>

        {/* Document Viewer Modal */}
        {showDocumentViewer && selectedDocument && (
          <div
            className="modal-overlay"
            onClick={() => setShowDocumentViewer(false)}
            role="presentation"
            onKeyDown={(e) => e.key === 'Escape' && setShowDocumentViewer(false)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="document-viewer-title"
            >
              <div className="modal-header">
                <h3>Document Viewer</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowDocumentViewer(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="document-details">
                  <p><strong>Document Name:</strong> {selectedDocument.name}</p>
                  <p><strong>Category:</strong> {selectedDocument.category}</p>
                  <p><strong>Status:</strong> <span className={`document-status ${selectedDocument.verificationStatus}`}>{selectedDocument.verificationStatus}</span></p>
                  {selectedDocument.adminRemarks && (
                    <p><strong>Admin Remarks:</strong> {selectedDocument.adminRemarks}</p>
                  )}
                </div>
                {(() => {
                  // Determine the document URL
                  const docUrl = selectedDocument.fileUrl || (selectedDocument.fileName ? `/uploads/${selectedDocument.fileName}` : '');

                  if (docUrl) {
                    return (
                      <div className="document-preview">
                        {docUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img
                            src={getFullUrl(docUrl)}
                            alt={selectedDocument.name}
                            style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/400x300?text=Preview+Not+Available';
                            }}
                          />
                        ) : (
                          <div className="file-download-prompt">
                            <p>This document cannot be previewed in the browser.</p>
                            <p>Please download it to view the full document.</p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDocumentViewer(false)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleDownloadDocument(selectedDocument)}
                >
                  ⬇️ Download Document
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApplicationDetailsPage;
