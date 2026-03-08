import axios from 'axios';
import { useEffect, useState } from 'react';
import {
  FiAward,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiEye,
  FiFileText,
  FiInfo,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUser,
  FiX,
  FiXCircle
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [editingApplication, setEditingApplication] = useState(null);
  const [viewingApplication, setViewingApplication] = useState(null);

  // Helper function to update form fields
  const updateField = (section, field, value) => {
    setEditingApplication(prev => ({
      ...prev,
      applicationData: {
        ...prev.applicationData,
        [section]: {
          ...prev.applicationData[section],
          [field]: value
        }
      }
    }));
  };
  // Language context is kept for future internationalization
  // const { t } = useLanguage();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data);
    } catch (error) {
      // Error handling for fetching applications
    }
    setLoading(false);
  };

  const getStatusVariant = (status) => {
    const variants = {
      draft: {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-200',
        icon: <FiFileText className="mr-1.5 h-4 w-4" />,
        label: 'Draft'
      },
      submitted: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        icon: <FiClock className="mr-1.5 h-4 w-4" />,
        label: 'Submitted'
      },
      under_review: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        icon: <FiRefreshCw className="mr-1.5 h-4 w-4 animate-spin" />,
        label: 'Under Review'
      },
      approved: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        icon: <FiCheckCircle className="mr-1.5 h-4 w-4" />,
        label: 'Approved'
      },
      final_approved: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        icon: <FiCheckCircle className="mr-1.5 h-4 w-4" />,
        label: 'Benefits Granted'
      },
      rejected: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        icon: <FiXCircle className="mr-1.5 h-4 w-4" />,
        label: 'Rejected'
      },
      final_rejected: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        icon: <FiXCircle className="mr-1.5 h-4 w-4" />,
        label: 'Benefits Denied'
      },
      requires_resubmission: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-800 dark:text-purple-300',
        icon: <FiRefreshCw className="mr-1.5 h-4 w-4" />,
        label: 'Resubmit Required'
      }
    };
    return variants[status] || variants.draft;
  };

  const handleEdit = (application) => {
    setEditingApplication({
      ...application,
      applicationData: {
        personalInfo: {
          fullName: '',
          dateOfBirth: '',
          gender: '',
          phone: '',
          address: '',
          state: '',
          district: '',
          pincode: '',
          ...application.applicationData?.personalInfo
        },
        eligibilityInfo: {
          income: '',
          caste: '',
          education: '',
          employment: '',
          ...application.applicationData?.eligibilityInfo
        },
        documents: application.applicationData?.documents || []
      }
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5002/api/applications/${editingApplication._id}`,
        {
          applicationData: editingApplication.applicationData,
          status: editingApplication.status
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Application updated successfully!');
      setEditingApplication(null);
      fetchApplications();
    } catch (error) {
      alert('Error updating application. Please try again.');
    }
  };

  const handleDelete = async (applicationId) => {
    if (!applicationId) {
      console.error('No application ID provided for deletion');
      alert('Error: No application ID provided');
      return;
    }

    if (window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        console.log('Attempting to delete application with ID:', applicationId);
        const response = await axios.delete(
          `http://localhost:5002/api/applications/${applicationId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('Delete response:', response);
        if (response.status === 200) {
          alert('Application deleted successfully!');
          // Refresh the applications list
          fetchApplications();
        } else {
          throw new Error(`Unexpected status code: ${response.status}`);
        }
      } catch (error) {
        console.error('Error deleting application:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });
        alert(`Error deleting application: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleSubmit = async (applicationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5002/api/applications/${applicationId}`,
        { status: 'submitted' },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Application submitted successfully!');
      fetchApplications();
    } catch (error) {
      console.error('Error submitting application:', error);
      const errorMessage = (error.response?.data?.message || error.message || 'Error submitting application') +
        (error.response?.data?.error ? `: ${error.response.data.error}` : '');
      alert(errorMessage);
    }
  };

  const navigate = useNavigate();

  const handleTrackApplication = (applicationId) => {
    // Navigate to the scheme tracking page
    navigate('/scheme-tracking');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your applications...</p>
        </div>
      </div>
    );
  }

  // Count applications by status
  const stats = applications.reduce((acc, app) => {
    acc.total++;
    // Count final_approved as approved
    if (app.status === 'approved' || app.status === 'final_approved') {
      acc.approved = (acc.approved || 0) + 1;
    }
    // Count final_rejected as rejected
    if (app.status === 'rejected' || app.status === 'final_rejected') {
      acc.rejected = (acc.rejected || 0) + 1;
    }
    // Count other statuses normally
    if (!['approved', 'final_approved', 'rejected', 'final_rejected'].includes(app.status)) {
      acc[app.status] = (acc[app.status] || 0) + 1;
    }
    return acc;
  }, { total: 0, approved: 0, rejected: 0, pending: 0, submitted: 0, draft: 0, under_review: 0 });

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'final_approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected':
      case 'final_rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'under_review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'submitted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'final_approved':
        return '✅';
      case 'rejected':
      case 'final_rejected':
        return '❌';
      case 'under_review': return '🔍';
      case 'submitted': return '⏳';
      case 'draft': return '📝';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            📊 Scheme Tracking Dashboard
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300 sm:mt-4">
            Track your scheme applications and discover new opportunities
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {[
            { name: 'Applied', value: stats.total, icon: '📋', color: 'bg-blue-500' },
            { name: 'Approved', value: stats.approved, icon: '✅', color: 'bg-green-500' },
            { name: 'Pending', value: stats.pending + stats.under_review, icon: '⏳', color: 'bg-yellow-500' },
            { name: 'Eligible', value: stats.submitted + stats.draft, icon: '🎯', color: 'bg-purple-500' },
          ].map((stat) => (
            <div key={stat.name} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                    <span className="text-white text-2xl">{stat.icon}</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stat.value}
                      </div>
                    </dd>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Applications List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Applied Schemes</h2>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                All ({stats.total})
              </button>
              <button className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Approved ({stats.approved})
              </button>
              <button className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                Pending ({stats.pending + stats.under_review})
              </button>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-500">
                <svg className="mx-auto h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No applications found</h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">You haven&apos;t applied to any schemes yet.</p>
              <div className="mt-6">
                <a
                  href="/schemes"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiSearch className="mr-2 h-4 w-4" />
                  Browse Available Schemes
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {applications.map((app) => (
                <div key={app._id} className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl mr-4">
                          {getStatusIcon(app.status)}
                        </div>
                        <div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                            {app.schemeId?.name || 'Unnamed Scheme'}
                          </h3>
                          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            Application ID: {app._id}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                        {app.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <dl>
                      <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Applied On</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2">
                          {new Date(app.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </dd>
                      </div>
                      <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Last Updated</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2">
                          {new Date(app.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          <span className="text-gray-400 dark:text-gray-500 ml-2">
                            ({Math.ceil((new Date() - new Date(app.updatedAt)) / (1000 * 60 * 60 * 24))} days ago)
                          </span>
                        </dd>
                      </div>
                      {app.status === 'approved' && app.approvalDate && (
                        <div className="bg-green-50 dark:bg-green-900/20 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-green-800 dark:text-green-200">Approval Date</dt>
                          <dd className="mt-1 text-sm text-green-700 dark:text-green-300 sm:mt-0 sm:col-span-2">
                            {new Date(app.approvalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Missing Documents Warning Banner */}
                  {(!app.applicationData?.documents || app.applicationData.documents.length === 0) && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 px-4 py-3 sm:px-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <span className="text-lg">⚠️</span>
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-red-800 dark:text-red-300">
                            No documents uploaded. Please upload required documents to proceed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-4 sm:px-6 flex justify-between items-center">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleTrackApplication(app._id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FiRefreshCw className="mr-1.5 h-3.5 w-3.5" /> Track Status
                      </button>
                      <button
                        onClick={() => setViewingApplication(app)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FiEye className="mr-1.5 h-3.5 w-3.5" /> View Details
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      {(app.status === 'draft' || app.status === 'requires_resubmission') && (
                        <button
                          onClick={() => handleEdit(app)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          <FiEdit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(app._id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <FiTrash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View Application Modal */}
          {selectedApplication && (
            <div className="modal-overlay" onClick={() => setSelectedApplication(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Application Details</h2>
                  <button className="close-btn" onClick={() => setSelectedApplication(null)}>×</button>
                </div>

                <div className="modal-content">
                  <div className="section">
                    <h3>Scheme Information</h3>
                    <p><strong>Name:</strong> {selectedApplication.schemeId?.name}</p>
                    <p><strong>Category:</strong> {selectedApplication.schemeId?.category}</p>
                  </div>

                  <div className="section">
                    <h3>Personal Information</h3>
                    <div className="info-grid">
                      <p><strong>Full Name:</strong> {selectedApplication.applicationData?.personalInfo?.fullName || 'Not provided'}</p>
                      <p><strong>Date of Birth:</strong> {selectedApplication.applicationData?.personalInfo?.dateOfBirth || 'Not provided'}</p>
                      <p><strong>Gender:</strong> {selectedApplication.applicationData?.personalInfo?.gender || 'Not provided'}</p>
                      <p><strong>Phone:</strong> {selectedApplication.applicationData?.personalInfo?.phone || 'Not provided'}</p>
                      <p><strong>Address:</strong> {selectedApplication.applicationData?.personalInfo?.address || 'Not provided'}</p>
                      <p><strong>State:</strong> {selectedApplication.applicationData?.personalInfo?.state || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="section">
                    <h3>Application Status</h3>
                    <div className="status-timeline">
                      <div className={`status-step ${selectedApplication.status === 'draft' || ['submitted', 'under_review', 'approved', 'rejected', 'requires_resubmission'].includes(selectedApplication.status) ? 'completed' : ''}`}>
                        <div className="status-icon">📝</div>
                        <div className="status-text">Draft</div>
                        <div className="status-date">{new Date(selectedApplication.createdAt).toLocaleDateString()}</div>
                      </div>

                      <div className={`status-step ${['submitted', 'under_review', 'approved', 'rejected', 'requires_resubmission'].includes(selectedApplication.status) ? 'completed' : ''}`}>
                        <div className="status-icon">✅</div>
                        <div className="status-text">Submitted</div>
                        <div className="status-date">{selectedApplication.submittedAt ? new Date(selectedApplication.submittedAt).toLocaleDateString() : 'Not submitted'}</div>
                      </div>

                      <div className={`status-step ${['under_review', 'approved', 'rejected', 'requires_resubmission'].includes(selectedApplication.status) ? 'completed' : ''}`}>
                        <div className="status-icon">⏳</div>
                        <div className="status-text">Under Verification</div>
                        <div className="status-date">{selectedApplication.reviewedAt ? new Date(selectedApplication.reviewedAt).toLocaleDateString() : 'Not started'}</div>
                      </div>

                      <div className={`status-step ${selectedApplication.status === 'approved' ? 'completed' : selectedApplication.status === 'rejected' ? 'rejected' : ''}`}>
                        <div className="status-icon">{selectedApplication.status === 'rejected' ? '❌' : selectedApplication.status === 'approved' ? '✅' : '❓'}</div>
                        <div className="status-text">{selectedApplication.status === 'approved' ? 'Approved' : selectedApplication.status === 'rejected' ? 'Rejected' : 'Pending'}</div>
                        <div className="status-date">{selectedApplication.completedAt ? new Date(selectedApplication.completedAt).toLocaleDateString() : 'Pending'}</div>
                      </div>
                    </div>

                    <p className="flex items-center">
                      <strong>Current Status:</strong>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getStatusVariant(selectedApplication.status).bg} ${getStatusVariant(selectedApplication.status).text}`}
                      >
                        {getStatusVariant(selectedApplication.status).icon}
                        {getStatusVariant(selectedApplication.status).label}
                      </span>
                    </p>

                    {/* Documents Section */}
                    {selectedApplication.applicationData?.documents && selectedApplication.applicationData.documents.length > 0 && (
                      <div className="section mt-6 border-t pt-4">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-3">📎 Submitted Documents</h3>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedApplication.applicationData.documents.map((doc, idx) => (
                            <div key={idx} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                              <span className="text-lg mr-2">📄</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                                  {typeof doc === 'string' ? doc : doc.name || 'Document'}
                                </p>
                                {doc.uploadedAt && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              {doc._id && (
                                <button
                                  className="ml-2 px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                  onClick={() => window.open(`/api/documents/${doc._id}`, '_blank')}
                                >
                                  View
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View Application Details Modal (Read-Only) */}
          {viewingApplication && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 pt-24 z-40 overflow-y-auto" onClick={() => setViewingApplication(null)}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Application Details</h2>
                  <button
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
                    onClick={() => setViewingApplication(null)}
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 space-y-8">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FiUser className="h-5 w-5 text-blue-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Personal Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.applicationData?.personalInfo?.fullName || 'Not provided'}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.applicationData?.personalInfo?.dateOfBirth || 'Not provided'}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.applicationData?.personalInfo?.phone || 'Not provided'}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.applicationData?.personalInfo?.gender || 'Not provided'}</p>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.applicationData?.personalInfo?.address || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FiAward className="h-5 w-5 text-green-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Eligibility Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Annual Income (INR)</label>
                        <p className="text-gray-900 dark:text-gray-100">₹{viewingApplication.applicationData?.eligibilityInfo?.income || 'Not provided'}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Caste Category</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.applicationData?.eligibilityInfo?.caste || 'Not provided'}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Highest Education</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.applicationData?.eligibilityInfo?.education || 'Not provided'}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employment Status</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.applicationData?.eligibilityInfo?.employment || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Scheme Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FiInfo className="h-5 w-5 text-purple-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Scheme Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Scheme Name</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.schemeId?.name || 'Not provided'}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                        <p className="text-gray-900 dark:text-gray-100">{viewingApplication.schemeId?.category || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FiFileText className="h-5 w-5 text-orange-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Documents Status</h3>
                    </div>

                    {/* Submitted Documents */}
                    {viewingApplication.applicationData?.documents && viewingApplication.applicationData.documents.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-500 font-bold">✓</span>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            {viewingApplication.applicationData.documents.length} Document(s) Uploaded
                          </p>
                        </div>
                        <div className="space-y-3">
                          {viewingApplication.applicationData.documents.map((doc, index) => (
                            <div key={doc._id || index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-between bg-gray-50 dark:bg-gray-700/30">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                                  <FiFileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.filename || doc.name || `Document ${index + 1}`}</p>
                                  <div className="flex flex-col gap-1 mt-1">
                                    {doc.category && (
                                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 w-fit">
                                        {doc.category}
                                      </span>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date not available'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <a
                                href={doc.url || `http://localhost:5002/api/documents/${doc._id}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                View
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Documents Warning */}
                    {(!viewingApplication.applicationData?.documents || viewingApplication.applicationData.documents.length === 0) && (
                      <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 rounded">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <span className="text-2xl">⚠️</span>
                          </div>
                          <div className="ml-3 flex-1">
                            <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">No Documents Uploaded</h4>
                            <p className="mt-2 text-sm text-red-700 dark:text-red-200">
                              You haven&apos;t uploaded any documents for this application yet. Please upload the required documents to complete your application.
                            </p>
                            {viewingApplication.schemeId?.documents && viewingApplication.schemeId.documents.length > 0 && (
                              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-800">
                                <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-3">Required Documents:</p>
                                <div className="space-y-2">
                                  {viewingApplication.schemeId.documents.map((doc, index) => (
                                    <div key={index} className="flex items-start p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                      <span className="mr-2 text-red-600 dark:text-red-400 flex-shrink-0">•</span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-red-800 dark:text-red-200">{doc}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                setViewingApplication(null);
                                navigate(`/apply/${viewingApplication.schemeId?._id}`);
                              }}
                              className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Upload Documents Now
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with close button only */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setViewingApplication(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Application Modal */}
          {editingApplication && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 pt-24 z-40 overflow-y-auto" onClick={() => setEditingApplication(null)}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Application</h2>
                  <button
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
                    onClick={() => setEditingApplication(null)}
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 space-y-8">
                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FiUser className="h-5 w-5 text-blue-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Personal Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          value={editingApplication.applicationData.personalInfo.fullName || ''}
                          onChange={(e) => updateField('personalInfo', 'fullName', e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          value={editingApplication.applicationData.personalInfo.dateOfBirth || ''}
                          onChange={(e) => updateField('personalInfo', 'dateOfBirth', e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                        <input
                          type="tel"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          value={editingApplication.applicationData.personalInfo.phone || ''}
                          onChange={(e) => updateField('personalInfo', 'phone', e.target.value)}
                          placeholder="+91 XXXXXXXXXX"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          value={editingApplication.applicationData.personalInfo.gender || ''}
                          onChange={(e) => updateField('personalInfo', 'gender', e.target.value)}
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          value={editingApplication.applicationData.personalInfo.address || ''}
                          onChange={(e) => updateField('personalInfo', 'address', e.target.value)}
                          placeholder="Full address with city, state, and PIN code"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Information Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FiAward className="h-5 w-5 text-green-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Eligibility Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Annual Income (INR)</label>
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400">₹</span>
                          </div>
                          <input
                            type="number"
                            className="pl-8 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            value={editingApplication.applicationData.eligibilityInfo.income || ''}
                            onChange={(e) => updateField('eligibilityInfo', 'income', e.target.value)}
                            placeholder="500000"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Caste Category</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          value={editingApplication.applicationData.eligibilityInfo.caste || ''}
                          onChange={(e) => updateField('eligibilityInfo', 'caste', e.target.value)}
                        >
                          <option value="">Select Caste</option>
                          <option value="general">General</option>
                          <option value="obc">OBC</option>
                          <option value="sc">SC</option>
                          <option value="st">ST</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Highest Education</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          value={editingApplication.applicationData.eligibilityInfo.education || ''}
                          onChange={(e) => updateField('eligibilityInfo', 'education', e.target.value)}
                        >
                          <option value="">Select Education</option>
                          <option value="below_10th">Below 10th</option>
                          <option value="10th_pass">10th Pass</option>
                          <option value="12th_pass">12th Pass</option>
                          <option value="graduate">Graduate</option>
                          <option value="post_graduate">Post Graduate</option>
                          <option value="doctorate">Doctorate</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employment Status</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          value={editingApplication.applicationData.eligibilityInfo.employment || ''}
                          onChange={(e) => updateField('eligibilityInfo', 'employment', e.target.value)}
                        >
                          <option value="">Select Employment Status</option>
                          <option value="employed">Employed</option>
                          <option value="unemployed">Unemployed</option>
                          <option value="student">Student</option>
                          <option value="self_employed">Self-Employed</option>
                          <option value="retired">Retired</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FiFileText className="h-5 w-5 text-purple-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Required Documents</h3>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <FiInfo className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Please ensure all required documents are uploaded before submitting your application. You can upload documents from the Documents section.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with action buttons */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setEditingApplication(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={handleSave}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationsPage;
