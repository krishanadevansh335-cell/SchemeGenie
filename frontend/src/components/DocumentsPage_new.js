import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import UploadCard from './ui/UploadCard';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, X, Plus, Search } from 'lucide-react';
import './DocumentsPage.css';

const DocumentsPage = () => {
  const { t } = useLanguage();
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [userDocuments, setUserDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // ... (Keep all the existing useEffect and functions as they are)

  const renderDocumentCard = (doc, isUploaded = false) => {
    const isExpired = expiryStatus.expired.some(d => d.documentId === doc.id);
    const isExpiringSoon = expiryStatus.expiringSoon.some(d => d.documentId === doc.id);
    const status = isExpired ? 'expired' : isExpiringSoon ? 'expiring' : 'valid';
    
    return (
      <div key={doc.id} className={`document-card ${status}`}>
        <div className="document-icon">
          <FileText size={24} />
        </div>
        <div className="document-details">
          <h4>{doc.name}</h4>
          <p className="document-category">{doc.category}</p>
          <p className="document-description">{doc.description}</p>
          
          {isUploaded ? (
            <div className="document-status">
              {status === 'expired' && (
                <span className="status-badge error">
                  <AlertCircle size={14} /> Expired
                </span>
              )}
              {status === 'expiring' && (
                <span className="status-badge warning">
                  <Clock size={14} /> Expiring Soon
                </span>
              )}
              {status === 'valid' && (
                <span className="status-badge success">
                  <CheckCircle size={14} /> Verified
                </span>
              )}
            </div>
          ) : (
            <button 
              className="upload-btn"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={16} /> Upload Now
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h2>My Documents</h2>
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search documents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          className="upload-new-btn"
          onClick={() => setShowUploadModal(true)}
        >
          <Plus size={18} /> Upload New Document
        </button>
      </div>

      <div className="documents-tabs">
        <button 
          className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          Required Documents
        </button>
        <button 
          className={`tab-btn ${activeTab === 'uploaded' ? 'active' : ''}`}
          onClick={() => setActiveTab('uploaded')}
        >
          My Uploads
        </button>
      </div>

      <div className="documents-grid">
        {loading ? (
          <div className="loading-spinner">Loading documents...</div>
        ) : activeTab === 'available' ? (
          availableDocuments.map(doc => renderDocumentCard(doc, false))
        ) : (
          userDocuments.length > 0 ? (
            userDocuments.map(doc => renderDocumentCard(doc, true))
          ) : (
            <div className="empty-state">
              <FileText size={48} className="empty-icon" />
              <h3>No documents uploaded yet</h3>
              <p>Upload your first document to get started</p>
              <button 
                className="primary-btn"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload size={16} /> Upload Document
              </button>
            </div>
          )
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="upload-modal">
            <div className="modal-header">
              <h3>Upload New Document</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadStatus(null);
                  setUploadFile(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-content">
              {uploadStatus ? (
                <UploadCard
                  status={uploadStatus}
                  progress={uploadProgress}
                  title={
                    uploadStatus === 'uploading' ? 'Uploading...' :
                    uploadStatus === 'success' ? 'Upload Complete!' :
                    'Upload Failed'
                  }
                  description={
                    uploadStatus === 'uploading' ? `Upload in progress: ${uploadProgress}%` :
                    uploadStatus === 'success' ? 'Your document has been successfully uploaded.' :
                    'There was an error uploading your document. Please try again.'
                  }
                  primaryButtonText={
                    uploadStatus === 'uploading' ? 'Cancel' :
                    uploadStatus === 'success' ? 'Done' :
                    'Retry'
                  }
                  onPrimaryButtonClick={
                    uploadStatus === 'uploading' ? () => setUploadStatus(null) :
                    uploadStatus === 'success' ? () => {
                      setShowUploadModal(false);
                      setUploadStatus(null);
                      fetchDocuments();
                    } :
                    () => uploadFile && handleUpload(uploadFile)
                  }
                  secondaryButtonText={
                    uploadStatus === 'error' ? 'Cancel' : ''
                  }
                  onSecondaryButtonClick={
                    uploadStatus === 'error' ? () => {
                      setUploadStatus(null);
                      setUploadFile(null);
                    } : undefined
                  }
                />
              ) : (
                <div className="upload-area">
                  <div className="upload-icon">
                    <Upload size={48} />
                  </div>
                  <h4>Drag & drop files here</h4>
                  <p>or</p>
                  <label className="file-input-label">
                    <input 
                      type="file" 
                      className="file-input"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <span className="browse-btn">Browse Files</span>
                  </label>
                  <p className="file-types">Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
                  
                  <div className="upload-form">
                    <div className="form-group">
                      <label>Document Name</label>
                      <input 
                        type="text" 
                        value={uploadForm.name}
                        onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                        placeholder="Enter document name"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Category</label>
                      <select 
                        value={uploadForm.category}
                        onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
                      >
                        {documentCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Description (Optional)</label>
                      <textarea 
                        value={uploadForm.description}
                        onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                        placeholder="Add a description for this document"
                        rows="3"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
