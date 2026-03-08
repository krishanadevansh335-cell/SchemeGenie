import axios from 'axios';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, Download, FileText, Filter, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import UploadModal from './UploadModal';

const DocumentsPage = () => {
  const { t } = useLanguage();
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [userDocuments, setUserDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Other',
    description: ''
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expiryStatus, setExpiryStatus] = useState({
    expired: [],
    expiringSoon: [],
    valid: []
  });
  const [showExpiryCheck, setShowExpiryCheck] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const documentCategories = [
    { value: 'Identity', label: 'Identity', icon: '🆔' },
    { value: 'Income', label: 'Income', icon: '💰' },
    { value: 'Category', label: 'Category', icon: '🏛️' },
    { value: 'Banking', label: 'Banking', icon: '🏦' },
    { value: 'Address', label: 'Address', icon: '🏠' },
    { value: 'Education', label: 'Education', icon: '📚' },
    { value: 'Legal', label: 'Legal', icon: '⚖️' },
    { value: 'Other', label: 'Other', icon: '📄' }
  ];

  // Available documents that users need for schemes
  const systemDocuments = [
    { id: 'aadhaar', name: 'Aadhaar Card', category: 'Identity', description: 'Required for identity verification', required: true },
    { id: 'income', name: 'Income Certificate', category: 'Income', description: 'Proof of annual income', required: true },
    { id: 'bank', name: 'Bank Account Details', category: 'Banking', description: 'Bank account for direct benefit transfer', required: true },
    { id: 'caste', name: 'Caste Certificate', category: 'Category', description: 'For SC/ST/OBC category benefits', required: true },
    { id: 'voter', name: 'Voter ID Card', category: 'Identity', description: 'Alternative identity proof', required: true },
    { id: 'ration', name: 'Ration Card', category: 'Address', description: 'Proof of residence and family details', required: true },
    { id: 'education', name: 'Educational Certificates', category: 'Education', description: 'For scholarship and education schemes', required: true },
    { id: 'death', name: 'Death Certificate', category: 'Legal', description: 'For family pension and survivor benefits', required: false }
  ];

  useEffect(() => {
    fetchDocuments();
    checkDocumentExpiry();
  }, []);

  const checkDocumentExpiry = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/documents/expiry-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpiryStatus(response.data);
      setShowExpiryCheck(true);
    } catch (error) {
      console.error('Error checking document expiry:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch user's uploaded documents
      const userDocsResponse = await axios.get('http://localhost:5002/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserDocuments(userDocsResponse.data);
      setAvailableDocuments(systemDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Still show system documents even if API fails
      setAvailableDocuments(systemDocuments);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) {
      console.error('No file selected');
      return;
    }

    // File size validation
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Maximum size is 10MB.');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('name', uploadForm.name || file.name.split('.')[0]);
    formData.append('category', uploadForm.category);
    formData.append('description', uploadForm.description || '');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      console.log('Sending upload request to server...');
      const response = await axios.post('http://localhost:5002/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(progress);

          if (progress === 100) {
            // Small delay to show 100% before switching to success
            setTimeout(() => setUploadStatus('processing'), 500);
          }
        }
      });

      console.log('Upload successful:', response.data);
      setUploadStatus('success');

      // Reset form after successful upload
      setTimeout(() => {
        setUploadStatus(null);
        setUploadFile(null);
        setUploadForm({
          name: '',
          category: 'Other',
          description: ''
        });
        fetchDocuments();
      }, 2000);

    } catch (error) {
      console.error('Error uploading document:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });

      setUploadStatus('error');
      // Show more detailed error message to user
      alert(`Upload failed: ${error.response?.data?.message || error.message}`);

      // Reset error after some time
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };





  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5002/api/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUserDocuments(userDocuments.filter(doc => doc._id !== documentId));
      alert('Document deleted successfully!');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'needs_review': return '⚠️';
      default: return '📄';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#4CAF50';
      case 'rejected': return '#f44336';
      case 'pending': return '#ff9800';
      case 'needs_review': return '#ff6b35';
      default: return '#2196F3';
    }
  };

  const getExpiryIcon = (document) => {
    if (document.isExpired) return '❌';
    if (expiryStatus.expiringSoon.some(doc => doc._id === document._id)) return '⚠️';
    return '✅';
  };

  const getExpiryText = (document) => {
    if (document.isExpired) return 'Expired';
    if (expiryStatus.expiringSoon.some(doc => doc._id === document._id)) return 'Expiring Soon';
    return 'Valid';
  };

  const getExpiryColor = (document) => {
    if (document.isExpired) return '#f44336';
    if (expiryStatus.expiringSoon.some(doc => doc._id === document._id)) return '#ff9800';
    return '#4CAF50';
  };


  const handleReportWrongFile = async (documentId, documentName) => {
    if (!window.confirm(`Are you sure you want to report that "${documentName}" is the wrong file? This will flag it for admin review.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5002/api/documents/${documentId}/report-wrong`,
        { reason: 'User reported wrong file' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh documents to show updated status
      fetchDocuments();
      alert('Document has been flagged for admin review. An admin will contact you soon.');
    } catch (error) {
      console.error('Error reporting wrong file:', error);
      alert('Error reporting wrong file. Please try again.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white p-4 rounded-lg shadow">
                  <div className="h-5 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main component return
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">My Documents</h1>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </button>
        </div>

        {/* Document Status Overview */}
        {showExpiryCheck && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Expired</p>
                  <p className="text-2xl font-semibold">{expiryStatus.expired.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Expiring Soon</p>
                  <p className="text-2xl font-semibold">{expiryStatus.expiringSoon.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Valid</p>
                  <p className="text-2xl font-semibold">{expiryStatus.valid.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-700">
          <div className="border-b border-gray-200">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('available')}
                className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'available'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700'}`}
              >
                Available Documents
              </button>
              <button
                onClick={() => setActiveTab('uploaded')}
                className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'uploaded'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700'}`}
              >
                My Uploads ({userDocuments.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'available' ? (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-200">Required Documents</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-200">
                  {availableDocuments
                    .filter(doc => doc.required)
                    .map((doc) => (
                      <div key={`required-${doc.id}`} className="group relative p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <FileText className="h-24 w-24 text-blue-500 transform rotate-12 translate-x-8 -translate-y-8" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                              <FileText className="h-6 w-6" />
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {doc.category}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{doc.name}</h3>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{doc.description}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <AlertCircle className="h-3 w-3 mr-1 text-red-400" />
                            <span className="text-red-400 font-medium">Mandatory Document</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                <h2 className="text-lg font-medium text-gray-200 mt-8">Optional Documents</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-200">
                  {availableDocuments
                    .filter(doc => !doc.required)
                    .map((doc) => (
                      <div key={`optional-${doc.id}`} className="group relative p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-500 transition-all duration-300 hover:shadow-xl overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <FileText className="h-24 w-24 text-gray-400 transform rotate-12 translate-x-8 -translate-y-8" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                              <FileText className="h-6 w-6" />
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">
                              {doc.category}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gray-300 transition-colors">{doc.name}</h3>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{doc.description}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <CheckCircle className="h-3 w-3 mr-1 text-gray-500" />
                            <span>Optional Document</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div>
                {userDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-200">No documents</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Get started by uploading a new document.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="-ml-1 mr-2 h-5 w-5" />
                        New Document
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                      <div className="flex-1 w-full md:max-w-md">
                        <div className="relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 w-full md:w-auto">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-4 w-4 text-gray-400" />
                          </div>
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="block w-full pl-10 pr-8 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm appearance-none"
                          >
                            <option value="All">All Categories</option>
                            {documentCategories.map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <Plus className="-ml-1 mr-2 h-5 w-5" />
                          Upload
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                          <div className="shadow-xl overflow-hidden border border-gray-700 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-700">
                              <thead className="bg-gray-800">
                                <tr>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Document
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Category
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Expiry
                                  </th>
                                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {userDocuments
                                  .filter(doc => {
                                    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
                                    const matchesCategory = filterCategory === 'All' || doc.category === filterCategory;
                                    return matchesSearch && matchesCategory;
                                  })
                                  .map((doc) => (
                                    <tr key={doc._id} className="hover:bg-gray-700/50 transition-colors">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <FileText className="h-5 w-5" />
                                          </div>
                                          <div className="ml-4">
                                            <div className="text-sm font-medium text-white">{doc.name}</div>
                                            <div className="text-gray-400 text-xs mt-0.5">Uploaded on {new Date(doc.uploadDate).toLocaleDateString()}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">
                                          {doc.category}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                          className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border"
                                          style={{
                                            backgroundColor: doc?.status ? `${getStatusColor(doc.status)}15` : '#374151',
                                            color: doc?.status ? getStatusColor(doc.status) : '#9CA3AF',
                                            borderColor: doc?.status ? `${getStatusColor(doc.status)}30` : '#4B5563'
                                          }}
                                        >
                                          {doc?.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1).replace('_', ' ') : 'Pending'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <span
                                            className="mr-2"
                                            style={{ color: getExpiryColor(doc) }}
                                          >
                                            {getExpiryIcon(doc)}
                                          </span>
                                          <span className="text-sm text-gray-300">
                                            {doc.expiryDate
                                              ? new Date(doc.expiryDate).toLocaleDateString()
                                              : 'N/A'}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-3">
                                          <a
                                            href={`http://localhost:5002/${doc.filePath}`}
                                            download
                                            className="text-gray-400 hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-gray-700"
                                            title="Download"
                                          >
                                            <Download className="h-5 w-5" />
                                          </a>
                                          <button
                                            onClick={() => handleReportWrongFile(doc._id, doc.name)}
                                            className="text-gray-400 hover:text-yellow-400 transition-colors p-1 rounded-md hover:bg-gray-700"
                                            title="Report Issue"
                                          >
                                            <AlertTriangle className="h-5 w-5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteDocument(doc._id)}
                                            className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-gray-700"
                                            title="Delete"
                                          >
                                            <Trash2 className="h-5 w-5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                {userDocuments.filter(doc => {
                                  const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
                                  const matchesCategory = filterCategory === 'All' || doc.category === filterCategory;
                                  return matchesSearch && matchesCategory;
                                }).length === 0 && (
                                    <tr>
                                      <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                        <FileText className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                                        <p className="text-lg font-medium text-gray-300">No documents found</p>
                                        <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                                      </td>
                                    </tr>
                                  )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        uploadForm={uploadForm}
        setUploadForm={setUploadForm}
        uploadFile={uploadFile}
        setUploadFile={setUploadFile}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        documentCategories={documentCategories}
      />

      {/* Document Categories & Tips Section */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document Categories */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Document Categories
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {documentCategories.map(cat => (
                  <div
                    key={cat.value}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center"
                    onClick={() => {
                      setUploadForm(prev => ({ ...prev, category: cat.value }));
                      setShowUploadModal(true);
                    }}
                  >
                    <div className="h-12 w-12 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 text-2xl mb-3">
                      {cat.icon}
                    </div>
                    <h3 className="font-medium text-gray-900">{cat.label}</h3>
                    <p className="text-sm text-gray-500 mt-1">Click to upload a new {cat.label.toLowerCase()} document</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-white mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Document Management Tips
              </h2>
              <div className="space-y-4">
                <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-500 bg-opacity-20 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-white">Digital Storage</h4>
                      <p className="mt-1 text-sm text-blue-100">Keep digital copies of all important documents for quick access during scheme applications.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-yellow-500 bg-opacity-20 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-white">Regular Updates</h4>
                      <p className="mt-1 text-sm text-blue-100">Update expired documents like income certificates annually to maintain eligibility.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-green-500 bg-opacity-20 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-white">Scheme-Specific</h4>
                      <p className="mt-1 text-sm text-blue-100">Check specific scheme requirements as some may need additional documents.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-purple-500 bg-opacity-20 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-white">Early Preparation</h4>
                      <p className="mt-1 text-sm text-blue-100">Start document collection early as some certificates take time to process.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document Now
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-sm font-medium text-gray-700">Download All Documents</span>
                <Download className="h-4 w-4 text-gray-400" />
              </button>
              <button
                onClick={() => setShowExpiryCheck(!showExpiryCheck)}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">Check Document Expiry</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;