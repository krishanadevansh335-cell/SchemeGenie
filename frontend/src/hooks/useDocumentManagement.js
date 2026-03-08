import { useState, useCallback } from 'react';
import axios from 'axios';

const useDocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expiryStatus, setExpiryStatus] = useState({ 
    expired: [], 
    expiringSoon: [], 
    valid: [] 
  });
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Other',
    description: ''
  });
  const [uploadFile, setUploadFile] = useState(null);

  // System documents that users need for schemes
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

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch user's uploaded documents
      const userDocsResponse = await axios.get('http://localhost:5002/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDocuments(userDocsResponse.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Still show system documents even if API fails
      setDocuments(systemDocuments);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkDocumentExpiry = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5002/api/documents/expiry-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpiryStatus(response.data);
      return response.data;
    } catch (error) {
      console.error('Error checking document expiry:', error);
      return null;
    }
  }, []);

  const handleUpload = useCallback(async (file) => {
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
      
      // Refresh documents after successful upload
      await fetchDocuments();
      
      // Reset form after success
      setTimeout(() => {
        setUploadStatus(null);
        setUploadFile(null);
        setUploadForm({
          name: '',
          category: 'Other',
          description: ''
        });
      }, 2000);
      
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      setUploadStatus('error');
      throw new Error(error.response?.data?.message || 'Failed to upload document');
    }
  }, [uploadForm, fetchDocuments]);

  const handleDeleteDocument = useCallback(async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5002/api/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh documents after deletion
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  }, [fetchDocuments]);

  const handleReportWrongFile = useCallback((documentId, documentName) => {
    const message = `Report issue with document: ${documentName}\n\nPlease describe the issue:`;
    const userMessage = prompt(message, '');
    
    if (userMessage) {
      // Here you would typically send this to your backend
      console.log(`Report for document ${documentId}: ${userMessage}`);
      alert('Thank you for reporting this issue. We will look into it.');
    }
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      
      // Auto-populate name if empty
      if (!uploadForm.name) {
        const fileName = file.name.split('.')[0];
        setUploadForm(prev => ({
          ...prev,
          name: fileName
        }));
      }
    }
  }, [uploadForm.name]);

  return {
    documents,
    loading,
    expiryStatus,
    uploadStatus,
    uploadProgress,
    uploadForm,
    uploadFile,
    setUploadForm,
    fetchDocuments,
    checkDocumentExpiry,
    handleUpload,
    handleDeleteDocument,
    handleReportWrongFile,
    handleFileChange
  };
};

export default useDocumentManagement;
