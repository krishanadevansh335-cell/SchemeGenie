import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import UploadCard from './ui/UploadCard';
import './DocumentsPage.css';

const DocumentsPage = () => {
  const { t } = useLanguage();
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [userDocuments, setUserDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'Other',
    description: ''
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expiryStatus, setExpiryStatus] = useState({ expired: [], expiringSoon: [], valid: [] });
  const [showExpiryCheck, setShowExpiryCheck] = useState(false);

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
      const userDocsResponse = await axios.get('http://localhost:5002/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserDocuments(userDocsResponse.data);
      setAvailableDocuments(systemDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setAvailableDocuments(systemDocuments);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;

    // File validation
    const validTypes = ['application/pdf', 'application/msword', 
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a PDF, DOC, DOCX, JPG, or PNG file.');
      return;
    }

    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 10MB.');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('name', uploadForm.name || file.name.split('.')[0]);
    formData.append('category', uploadForm.category);
    formData.append('description', uploadForm.description);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5002/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(progress);
          
          if (progress === 100) {
            setTimeout(() => {
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
            }, 500);
          }
        }
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
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
      // Start upload immediately when file is selected
      handleUpload(file);
    }
  };

  const renderUploadStatus = () => {
    if (!uploadStatus) return null;

    switch (uploadStatus) {
      case 'uploading':
        return (
          <div className="upload-status-container">
            <UploadCard
              status="uploading"
              progress={uploadProgress}
              title="Uploading Document..."
              description={`Upload in progress: ${uploadProgress}%`}
              primaryButtonText="Cancel"
              onPrimaryButtonClick={() => {
                setUploadStatus(null);
                setUploadFile(null);
              }}
              secondaryButtonText=""
              onSecondaryButtonClick={null}
            />
          </div>
        );
      case 'success':
        return (
          <div className="upload-status-container">
            <UploadCard
              status="success"
              progress={100}
              title="Upload Complete!"
              description="Your document has been successfully uploaded."
              primaryButtonText="Done"
              onPrimaryButtonClick={() => {
                setUploadStatus(null);
                setShowUploadModal(false);
                setUploadFile(null);
                setUploadForm({
                  name: '',
                  category: 'Other',
                  description: ''
                });
                fetchDocuments();
              }}
              secondaryButtonText=""
              onSecondaryButtonClick={null}
            />
          </div>
        );
      case 'error':
        return (
          <div className="upload-status-container">
            <UploadCard
              status="error"
              progress={0}
              title="Upload Failed"
              description="There was an error uploading your document. Please try again."
              primaryButtonText="Retry"
              onPrimaryButtonClick={() => uploadFile && handleUpload(uploadFile)}
              secondaryButtonText="Cancel"
              onSecondaryButtonClick={() => {
                setUploadStatus(null);
                setUploadFile(null);
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Rest of your component code...
  // [Previous JSX and other functions go here]

  return (
    <div className="documents-page">
      {/* Your existing JSX */}
    </div>
  );
};

export default DocumentsPage;
