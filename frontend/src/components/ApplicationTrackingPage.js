import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './ApplicationTrackingPage.css';

const ApplicationTrackingPage = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (trackingId) {
      fetchApplicationByTrackingId();
    }
  }, [trackingId]);

  const fetchApplicationByTrackingId = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // First try to get application by tracking ID (requires authentication)
      const response = await axios.get(`http://localhost:5002/api/applications/track/${trackingId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { populate: 'schemeId' } // Request to populate scheme details
      });

      // If schemeId is a string (ID), it means population didn't work
      if (response.data && typeof response.data.schemeId === 'string') {
        // Fetch scheme details separately
        const schemeResponse = await axios.get(`http://localhost:5002/api/schemes/${response.data.schemeId}`);
        response.data.schemeId = schemeResponse.data;
      }

      setApplication(response.data);
    } catch (error) {
      // If not authenticated or application not found, show public tracking
      try {
        const publicResponse = await axios.get(`http://localhost:5002/api/applications/public-track/${trackingId}`, {
          params: { populate: 'schemeId' } // Also try to populate for public endpoint
        });
        
        // If schemeId is a string (ID), fetch scheme details separately
        if (publicResponse.data && typeof publicResponse.data.schemeId === 'string') {
          const schemeResponse = await axios.get(`http://localhost:5002/api/schemes/${publicResponse.data.schemeId}`);
          publicResponse.data.schemeId = schemeResponse.data;
        }
        
        setApplication(publicResponse.data);
      } catch (publicError) {
        setError('Application not found or tracking ID is invalid.');
        console.error('Error fetching application:', publicError);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'submitted': '#ffa500',
      'under_review': '#007bff',
      'approved': '#28a745',
      'rejected': '#dc3545',
      'requires_resubmission': '#ffc107',
      'draft': '#6c757d'
    };
    return statusColors[status] || '#6c757d';
  };

  const getStatusText = (status) => {
    const statusTexts = {
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'requires_resubmission': 'Requires Resubmission',
      'draft': 'Draft'
    };
    return statusTexts[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`http://localhost:5002/api/applications/track/${trackingId}/pdf`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `application-${application.trackingId}.pdf`);
      document.body.appendChild(link);
      link.click();

      // Clean up
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading application details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="application-tracking-page">
        <div className="container">
          <div className="error-message">
            <h2>⚠️ Application Not Found</h2>
            <p>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/schemes')}
            >
              Browse Available Schemes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="application-tracking-page">
        <div className="container">
          <div className="error-message">
            <h2>⚠️ Application Not Found</h2>
            <p>The tracking ID provided is invalid or the application does not exist.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/schemes')}
            >
              Browse Available Schemes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="application-tracking-page">
      <div className="container">
        <div className="tracking-header">
          <h1>📋 Application Tracking</h1>
          <div className="tracking-id">
            <strong>Tracking ID:</strong> {application.trackingId}
          </div>
        </div>

        <div className="application-card">
          <div className="application-header">
            <h2>{application.schemeId?.name || application.schemeName || 'Scheme Details'}</h2>
            <div className="status-badge" style={{ backgroundColor: getStatusColor(application.status) }}>
              {getStatusText(application.status)}
            </div>
          </div>

          <div className="application-details">
            <div className="detail-row">
              <div className="detail-item">
                <strong>Scheme Category:</strong>
                <span>{application.schemeId?.category || application.schemeCategory || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <strong>Applied Date:</strong>
                <span>{formatDate(application.createdAt)}</span>
              </div>
            </div>

            {application.submittedAt && (
              <div className="detail-row">
                <div className="detail-item">
                  <strong>Submitted Date:</strong>
                  <span>{formatDate(application.submittedAt)}</span>
                </div>
                <div className="detail-item">
                  <strong>Estimated Approval:</strong>
                  <span>{application.estimatedApprovalDays || 30} days</span>
                </div>
              </div>
            )}

            {application.reviewedAt && (
              <div className="detail-row">
                <div className="detail-item">
                  <strong>Review Started:</strong>
                  <span>{formatDate(application.reviewedAt)}</span>
                </div>
                <div className="detail-item">
                  <strong>Reviewed By:</strong>
                  <span>Admin Team</span>
                </div>
              </div>
            )}

            {application.completedAt && (
              <div className="detail-row">
                <div className="detail-item">
                  <strong>Completed Date:</strong>
                  <span>{formatDate(application.completedAt)}</span>
                </div>
              </div>
            )}

            {application.rejectionReason && (
              <div className="rejection-reason">
                <strong>Rejection Reason:</strong>
                <p>{application.rejectionReason}</p>
              </div>
            )}

            {application.adminRemarks && (
              <div className="admin-remarks">
                <strong>Admin Remarks:</strong>
                <p>{application.adminRemarks}</p>
              </div>
            )}
          </div>

          <div className="tracking-timeline">
            <h3>Application Timeline</h3>
            <div className="timeline">
              <div className={`timeline-item ${application.status !== 'draft' ? 'completed' : ''}`}>
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <h4>Application Created</h4>
                  <p>{formatDate(application.createdAt)}</p>
                </div>
              </div>

              {application.submittedAt && (
                <div className={`timeline-item ${['submitted', 'under_review', 'approved', 'rejected'].includes(application.status) ? 'completed' : ''}`}>
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>Application Submitted</h4>
                    <p>{formatDate(application.submittedAt)}</p>
                  </div>
                </div>
              )}

              {application.reviewedAt && (
                <div className={`timeline-item ${['under_review', 'approved', 'rejected'].includes(application.status) ? 'completed' : ''}`}>
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>Under Review</h4>
                    <p>{formatDate(application.reviewedAt)}</p>
                  </div>
                </div>
              )}

              {application.completedAt && (
                <div className={`timeline-item ${['approved', 'rejected'].includes(application.status) ? 'completed' : ''}`}>
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h4>{application.status === 'approved' ? 'Approved' : 'Completed'}</h4>
                    <p>{formatDate(application.completedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="tracking-actions">
            <button
              className="btn btn-primary"
              onClick={() => handleDownloadPDF()}
            >
              📄 Download PDF
            </button>

            {application.status === 'approved' && (
              <div className="success-message">
                <h3>🎉 Congratulations!</h3>
                <p>Your application has been approved. You can now proceed with the next steps.</p>
              </div>
            )}

            {application.status === 'rejected' && (
              <div className="error-message">
                <h3>❌ Application Rejected</h3>
                <p>Your application has been rejected. Please review the rejection reason above.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/schemes')}
                >
                  Apply for Other Schemes
                </button>
              </div>
            )}

            {application.status === 'requires_resubmission' && (
              <div className="warning-message">
                <h3>📝 Resubmission Required</h3>
                <p>Please review the admin remarks and resubmit your application with corrections.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/applications')}
                >
                  View My Applications
                </button>
              </div>
            )}

            {['submitted', 'under_review'].includes(application.status) && (
              <div className="info-message">
                <h3>⏳ Application in Progress</h3>
                <p>Your application is being processed. We&apos;ll notify you once there&apos;s an update.</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationTrackingPage;
