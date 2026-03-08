import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  X, 
  Trash2, 
  AlertTriangle, 
  Download,
  Plus
} from 'lucide-react';
import DocumentTable from './DocumentTable';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentCategories from './DocumentCategories';
import DocumentTips from './DocumentTips';
import { useDocumentManagement } from '../../hooks/useDocumentManagement';

const DocumentsPage = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('available');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExpiryCheck, setShowExpiryCheck] = useState(false);
  
  const {
    documents,
    loading,
    expiryStatus,
    uploadStatus,
    uploadProgress,
    uploadForm,
    uploadFile,
    handleUpload,
    handleFileChange,
    handleDeleteDocument,
    handleReportWrongFile,
    setUploadForm,
    fetchDocuments
  } = useDocumentManagement();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
          <p className="mt-2 text-gray-600">
            Manage and upload your important documents for scheme applications
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Upload Document
        </button>
      </div>

      {/* Document Table */}
      <DocumentTable 
        documents={documents}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDelete={handleDeleteDocument}
        onReport={handleReportWrongFile}
      />

      {/* Document Categories & Tips */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <DocumentCategories 
          onCategorySelect={(category) => {
            setUploadForm(prev => ({ ...prev, category }));
            setShowUploadModal(true);
          }} 
        />
        
        <DocumentTips 
          onUploadClick={() => setShowUploadModal(true)}
          onExpiryCheck={() => setShowExpiryCheck(true)}
        />
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadStatus(null);
          setUploadFile(null);
        }}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        uploadForm={uploadForm}
        onFormChange={(updates) => setUploadForm(prev => ({ ...prev, ...updates }))}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
        uploadFile={uploadFile}
      />
    </div>
  );
};

export default DocumentsPage;
