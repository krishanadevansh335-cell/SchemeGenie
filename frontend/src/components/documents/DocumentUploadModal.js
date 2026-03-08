import React, { useState, useRef, useEffect } from 'react';
import { X, Upload as UploadIcon, FileText, XCircle, CheckCircle } from 'lucide-react';

const DocumentUploadModal = ({
  isOpen,
  onClose,
  uploadStatus,
  uploadProgress,
  uploadForm,
  onFormChange,
  onFileChange,
  onUpload,
  uploadFile
}) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [localFile, setLocalFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file) => {
    // Validate file type and size
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a PDF, DOC, DOCX, JPG, or PNG file.');
      return;
    }

    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 10MB.');
      return;
    }

    setLocalFile(file);
    onFileChange({ target: { files: [file] } });
    
    // Auto-populate name if empty
    if (!uploadForm.name) {
      const fileName = file.name.split('.')[0];
      onFormChange({ name: fileName });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (localFile) {
      onUpload(localFile);
    }
  };

  const resetForm = () => {
    setLocalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Upload New Document
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                    disabled={uploadStatus === 'uploading'}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {uploadStatus ? (
                  <div className="text-center py-8">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                      {uploadStatus === 'uploading' ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      ) : uploadStatus === 'success' ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      ) : (
                        <XCircle className="h-8 w-8 text-red-600" />
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {uploadStatus === 'uploading' 
                        ? 'Uploading...' 
                        : uploadStatus === 'success' 
                          ? 'Upload successful!' 
                          : 'Upload failed'}
                    </h3>
                    {uploadStatus === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                    {uploadStatus === 'success' && (
                      <p className="text-sm text-gray-500 mt-2">
                        Your document has been uploaded successfully.
                      </p>
                    )}
                    {uploadStatus === 'error' && (
                      <p className="text-sm text-red-600 mt-2">
                        There was an error uploading your document. Please try again.
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Document Name
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        value={uploadForm.name}
                        onChange={(e) => onFormChange({ name: e.target.value })}
                        placeholder="Enter document name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        value={uploadForm.category}
                        onChange={(e) => onFormChange({ category: e.target.value })}
                        required
                      >
                        <option value="Identity">Identity</option>
                        <option value="Income">Income</option>
                        <option value="Category">Category</option>
                        <option value="Banking">Banking</option>
                        <option value="Address">Address</option>
                        <option value="Education">Education</option>
                        <option value="Legal">Legal</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        value={uploadForm.description}
                        onChange={(e) => onFormChange({ description: e.target.value })}
                        placeholder="Add a brief description of this document"
                      />
                    </div>

                    <div>
                      <div 
                        className={`mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                      >
                        <div className="space-y-1 text-center">
                          {localFile ? (
                            <div className="text-sm text-gray-600">
                              <FileText className="mx-auto h-12 w-12 text-gray-400" />
                              <p className="mt-2 font-medium">{localFile.name}</p>
                              <p className="text-xs text-gray-500">
                                {(localFile.size / 1024).toFixed(1)} KB
                              </p>
                              <button
                                type="button"
                                className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resetForm();
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex text-sm text-gray-600 justify-center">
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                                >
                                  <span>Upload a file</span>
                                  <input
                                    id="file-upload"
                                    name="file-upload"
                                    type="file"
                                    className="sr-only"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleFileSelect(e.target.files[0]);
                                      }
                                    }}
                                    ref={fileInputRef}
                                  />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                PDF, DOC, DOCX, JPG, PNG up to 10MB
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                      <button
                        type="submit"
                        disabled={!localFile || uploadStatus === 'uploading'}
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white ${
                          !localFile || uploadStatus === 'uploading'
                            ? 'bg-blue-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm`}
                      >
                        {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Document'}
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                        onClick={onClose}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
