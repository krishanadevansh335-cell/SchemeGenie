import { AlertCircle, CheckCircle, FileText, UploadCloud, X } from 'lucide-react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const UploadModal = ({
  isOpen,
  onClose,
  onUpload,
  uploadForm,
  setUploadForm,
  uploadFile,
  setUploadFile,
  uploadStatus,
  uploadProgress,
  documentCategories
}) => {
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (file.size > maxSize) {
        alert('File is too large. Maximum size is 10MB.');
        return;
      }

      setUploadFile(file);
      if (!uploadForm.name) {
        const fileName = file.name.split('.')[0];
        setUploadForm(prev => ({
          ...prev,
          name: fileName
        }));
      }
    }
  }, [setUploadFile, setUploadForm, uploadForm.name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    disabled: uploadStatus === 'uploading'
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-900 opacity-75 backdrop-blur-sm"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-gray-800 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-700">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl leading-6 font-semibold text-white">Upload New Document</h3>
                  <button
                    type="button"
                    className="bg-transparent rounded-md text-gray-400 hover:text-white focus:outline-none transition-colors"
                    onClick={onClose}
                    disabled={uploadStatus === 'uploading'}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-2">
                  {uploadStatus ? (
                    <div className="text-center py-8">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-700 mb-6 relative">
                        {uploadStatus === 'uploading' ? (
                          <>
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500 opacity-25"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                            <UploadCloud className="h-8 w-8 text-blue-500" />
                          </>
                        ) : uploadStatus === 'success' ? (
                          <CheckCircle className="h-10 w-10 text-green-500" />
                        ) : (
                          <AlertCircle className="h-10 w-10 text-red-500" />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        {uploadStatus === 'uploading'
                          ? 'Uploading Document...'
                          : uploadStatus === 'success'
                            ? 'Upload Successful!'
                            : 'Upload Failed'}
                      </h3>
                      {uploadStatus === 'uploading' && (
                        <div className="w-full max-w-xs mx-auto mt-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {uploadStatus === 'success' && (
                        <p className="text-sm text-gray-400 mt-2">
                          Your document has been securely uploaded and is being processed.
                        </p>
                      )}
                      {uploadStatus === 'error' && (
                        <p className="text-sm text-red-400 mt-2">
                          There was an error uploading your document. Please try again.
                        </p>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (uploadFile) onUpload(uploadFile);
                    }} className="space-y-5">
                      <div>
                        <label htmlFor="document-name" className="block text-sm font-medium text-gray-300 mb-1.5">
                          Document Name
                        </label>
                        <input
                          type="text"
                          id="document-name"
                          value={uploadForm.name}
                          onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                          className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                          placeholder="e.g., Passport, Aadhaar Card"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="document-category" className="block text-sm font-medium text-gray-300 mb-1.5">
                          Category
                        </label>
                        <select
                          id="document-category"
                          value={uploadForm.category}
                          onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                          className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                          required
                        >
                          {documentCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>
                              {cat.icon} {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="document-description" className="block text-sm font-medium text-gray-300 mb-1.5">
                          Description (Optional)
                        </label>
                        <textarea
                          id="document-description"
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                          rows={3}
                          className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                          placeholder="Add any additional details..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                          Document File
                        </label>
                        <div
                          {...getRootProps()}
                          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${isDragActive
                              ? 'border-blue-500 bg-blue-500/10'
                              : uploadFile
                                ? 'border-green-500 bg-green-500/10'
                                : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                            }`}
                        >
                          <div className="space-y-1 text-center">
                            <input {...getInputProps()} />
                            {uploadFile ? (
                              <div className="flex flex-col items-center">
                                <FileText className="h-10 w-10 text-green-500 mb-2" />
                                <p className="text-sm text-green-400 font-medium truncate max-w-[200px]">
                                  {uploadFile.name}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                <p className="text-xs text-blue-400 mt-2 hover:underline">
                                  Click or drag to replace
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <UploadCloud className={`h-10 w-10 mb-2 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                                <div className="flex text-sm text-gray-400">
                                  <span className="font-medium text-blue-400 hover:text-blue-300">
                                    Click to upload
                                  </span>
                                  <span className="pl-1">or drag and drop</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                        <button
                          type="submit"
                          disabled={!uploadFile}
                          className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2.5 text-base font-medium text-white sm:col-start-2 sm:text-sm transition-all ${uploadFile
                              ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-blue-500/30'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                          Upload Document
                        </button>
                        <button
                          type="button"
                          onClick={onClose}
                          className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-600 shadow-sm px-4 py-2.5 bg-gray-700 text-base font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:col-start-1 sm:text-sm transition-colors"
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
    </div>
  );
};

export default UploadModal;
