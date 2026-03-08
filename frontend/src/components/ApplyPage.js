import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from '../hooks/useTranslation';

/**
 * @typedef {Object} FormData
 * @property {string} fullName - User's full name
 * @property {string} aadhaar - Aadhaar number
 * @property {string} phone - Phone number
 * @property {string} income - Annual income
 * @property {string} caste - Caste information
 * @property {Array} documents - Array of documents
 * @property {string} [address] - Optional address field
 */

// Simple text-based icons to avoid external dependencies
const FaArrowLeft = ({ className = '' }) => <span className={className}>←</span>;
const FaCheck = ({ className = '' }) => <span className={className}>✓</span>;
const FaFileAlt = ({ className = '' }) => <span className={className}>📄</span>;
const FaUpload = ({ className = '' }) => <span className={className}>↑</span>;
const FaSpinner = ({ className = '' }) => <span className={`animate-spin ${className}`}>⏳</span>;
const FaImage = ({ className = '' }) => <span className={className}>🖼️</span>;
const FaTimes = ({ className = '' }) => <span className={className}>✕</span>;

export default function ApplyPage() {
  const { schemeId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [scheme, setScheme] = useState(null);
  const [resolvedSchemeId, setResolvedSchemeId] = useState(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  /** @type {[FormData, React.Dispatch<React.SetStateAction<FormData>>]} */
  const [formData, setFormData] = useState({
    fullName: '',
    aadhaar: '',
    phone: '',
    income: '',
    caste: '',
    documents: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState('');

  // Document upload state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [selectedUploadedDocs, setSelectedUploadedDocs] = useState(new Set());

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          toast.error('Please log in to apply for schemes');
          navigate('/login', { state: { from: `/apply/${schemeId}` } });
          return;
        }

        const [schemesRes, docsRes] = await Promise.all([
          axios.get('http://localhost:5002/api/schemes'),
          axios.get('http://localhost:5002/api/documents', {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(err => {
            // If documents fetch fails due to auth, redirect to login
            if (err.response?.status === 401) {
              console.error('Authentication failed - token may be expired');
              localStorage.removeItem('token');
              toast.error('Your session has expired. Please log in again.');
              navigate('/login', { state: { from: `/apply/${schemeId}` } });
              throw err;
            }
            // If it's just that no documents exist, return empty array
            console.warn('Failed to fetch documents:', err.message);
            return { data: [] };
          })
        ]);

        // Find the scheme that matches the URL parameter (name/slug)
        const currentScheme = schemesRes.data.find(scheme => {
          // Check if URL parameter matches scheme _id (direct ObjectId)
          if (scheme._id === schemeId) return true;

          // Check if URL parameter matches slugified scheme name
          const slugifiedName = scheme.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
          if (slugifiedName === schemeId) return true;

          // Check if URL parameter matches scheme name case-insensitively
          if (scheme.name.toLowerCase() === schemeId.toLowerCase()) return true;

          return false;
        });

        console.log('Looking for scheme:', schemeId);
        console.log('Available schemes:', schemesRes.data.map(s => ({ id: s._id, name: s.name, slug: s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') })));
        console.log('Found scheme:', currentScheme);

        if (currentScheme) {
          setScheme(currentScheme);
          setResolvedSchemeId(currentScheme._id);
        } else {
          console.error('Scheme not found for ID:', schemeId);
          setScheme(null);
          setResolvedSchemeId(null);
        }

        setUserDocuments(docsRes.data || []);

        // Preselect all existing uploaded documents
        const pre = new Set((docsRes.data || []).map(d => d._id));
        setSelectedDocIds(pre);
      } catch (e) {
        console.error('Failed to load apply data', e);
        // Don't show error toast if we already redirected to login
        if (!e.response || e.response.status !== 401) {
          toast.error('Failed to load application form. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [schemeId, navigate]);

  const [errors, setErrors] = useState({});

  // Enhanced validation schema
  const validateField = (name, value) => {
    const validations = {
      fullName: {
        required: true,
        pattern: /^[A-Za-z\s]{3,}$/,
        message: 'Full name must be at least 3 characters and contain only letters and spaces'
      },
      aadhaar: {
        required: true,
        pattern: /^\d{12}$/,
        message: 'Aadhaar number must be exactly 12 digits'
      },
      phone: {
        required: true,
        pattern: /^\d{10}$/,
        message: 'Phone number must be exactly 10 digits'
      },
      income: {
        required: false,
        pattern: /^\d*(\.\d{0,2})?$/,
        message: 'Please enter a valid income amount'
      },
      caste: {
        required: false
      }
    };

    if (validations[name]?.required && !value.trim()) {
      return 'This field is required';
    }

    if (value && validations[name]?.pattern && !validations[name].pattern.test(value)) {
      return validations[name].message;
    }

    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const onAadhaarFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset file input to allow re-uploading the same file
    e.target.value = null;

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png|pdf)$/i)) {
      setOcrError('Please upload a valid image (JPEG, PNG) or PDF file');
      return;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setOcrError('File size should be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsOcrProcessing(true);
    setOcrError('');

    // Show loading toast
    const toastId = toast.loading('Processing Aadhaar card...');

    axios.post('http://localhost:5002/api/ocr/aadhaar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(response => {
        if (response.data.success) {
          const { data } = response.data;

          // Map the extracted data to form fields
          const extractedData = {
            fullName: data.name || '',
            aadhaar: data.aadhaarNumber || '',
            phone: data.mobile || '',
            address: data.address || '',
            // Map other fields as needed
          };

          // Update form data with extracted values
          setFormData(prev => ({
            ...prev,
            ...extractedData
          }));

          toast.update(toastId, {
            render: 'Aadhaar details extracted successfully!',
            type: 'success',
            isLoading: false,
            autoClose: 3000
          });
        } else {
          throw new Error(response.data.error || 'Failed to extract Aadhaar details');
        }
      })
      .catch(error => {
        console.error('Aadhaar OCR error:', error);
        setOcrError(error.response?.data?.message || error.message || 'Failed to process Aadhaar image');
        toast.error('Failed to extract Aadhaar details. Please try again or enter manually.');
      })
      .finally(() => {
        setIsOcrProcessing(false);
      });
  };


  // Handle direct file uploads on Apply page
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|pdf|doc|docx)$/i)) {
      toast.error('Please upload valid documents (JPEG, PNG, PDF, DOC, DOCX)');
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size should be less than 10MB');
      return;
    }

    setUploadingFile(file.name);
    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('document', file); // Backend expects 'document' field name
      formData.append('category', 'Application Document');
      formData.append('name', file.name);
      
      // Add scheme information if available
      if (resolvedSchemeId) {
        formData.append('schemeId', resolvedSchemeId);
      }
      if (scheme?.name) {
        formData.append('schemeName', scheme.name);
      }

      const response = await axios.post(
        'http://localhost:5002/api/documents/upload',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        const newDoc = {
          _id: response.data.document?.id || `temp-${Date.now()}`,
          name: response.data.document?.name || file.name,
          category: response.data.document?.category || 'Application Document',
          size: file.size,
          uploadedAt: new Date().toISOString(),
          isNewUpload: true
        };

        setUploadedFiles(prev => [newDoc, ...prev]);
        setSelectedUploadedDocs(prev => new Set([...prev, newDoc._id]));

        toast.update(toastId, {
          render: `${file.name} uploaded successfully!`,
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Log the full error data for debugging
      if (error.response?.data) {
        console.error('Server error response:', JSON.stringify(error.response.data, null, 2));
      }
      
      let errorMessage = 'Failed to upload document';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 413) {
        errorMessage = 'File is too large. Maximum size is 10MB.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.update(toastId, {
        render: errorMessage,
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
    } finally {
      setUploadingFile(null);
      e.target.value = '';
    }
  };

  const handleRemoveUploadedDoc = (docId) => {
    setUploadedFiles(prev => prev.filter(doc => doc._id !== docId));
    setSelectedUploadedDocs(prev => {
      const next = new Set(prev);
      next.delete(docId);
      return next;
    });
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      acceptedFiles.forEach(file => {
        const syntheticEvent = {
          target: {
            files: [file]
          }
        };
        handleFileUpload(syntheticEvent);
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    onError: (err) => {
      console.error('Dropzone error:', err);
      toast.error('Error uploading file. Please try again.');
    }
  });

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Validate all fields
    Object.keys(formData).forEach(field => {
      if (field === 'documents') return; // Skip documents as they're handled separately

      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    // Check if at least some documents are selected (either uploaded or new)
    const totalSelectedDocs = selectedDocIds.size + selectedUploadedDocs.size;
    if (scheme?.documents?.length > 0 && totalSelectedDocs === 0) {
      newErrors.documents = 'Please select or upload at least one document';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Combine selected document IDs from both existing and newly uploaded
      const allSelectedDocIds = [
        ...Array.from(selectedDocIds),
        ...Array.from(selectedUploadedDocs)
      ];

      const payload = {
        schemeId: resolvedSchemeId,
        applicationData: {
          ...formData,
          documents: allSelectedDocIds,
        },
      };
      console.log('Submitting application payload:', payload);
      const response = await axios.post(
        'http://localhost:5002/api/applications',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      toast.success('Application submitted successfully!');
      navigate('/applications', { state: { success: true } });
    } catch (error) {
      console.error('Submission error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      let errorMessage = 'Failed to submit application';

      if (error.response?.status === 401) {
        // Handle unauthorized (token expired, etc.)
        errorMessage = 'Your session has expired. Please log in again.';
        localStorage.removeItem('token');
        toast.error(errorMessage);
        navigate('/login', { state: { from: window.location.pathname } });
        return;
      } else if (error.response?.status === 503) {
        // Database or server error
        errorMessage = 'Server is temporarily unavailable. Please try again in a moment.';
        if (error.response?.data?.error) {
          console.error('Server error details:', error.response.data.error);
          errorMessage += ` (${error.response.data.error})`;
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'Scheme not found. Please try selecting a different scheme.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <FaSpinner className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">{t('common.loading', 'Loading application form...')}</p>
        </div>
      </div>
    );
  }

  if (!scheme) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">{t('errors.notFound', 'Scheme Not Found')}</h2>
        <p className="text-gray-300 mb-6">
          {t('applyPage.schemeNotFound', "The scheme you're looking for doesn't exist or has been removed.")}
        </p>
        <Link
          to="/schemes"
          className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <FaArrowLeft className="mr-2" /> {t('common.back', 'Back to Schemes')}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to={`/schemes/${scheme._id}`}
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <FaArrowLeft className="mr-2" /> {t('applyPage.backToScheme', 'Back to Scheme Details')}
        </Link>

        <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{t('applyPage.applyFor', 'Apply for')} {scheme.name}</h1>
            <p className="text-blue-100 mt-2">{t('applyPage.fillDetails', 'Fill in your details to submit your application')}</p>
          </div>

          {/* Progress Steps - Simplified without conditional rendering */}
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between max-w-md mx-auto mb-8">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white">
                  1
                </div>
                <span className="text-sm mt-2 text-blue-400">{t('applyPage.steps.step1', 'Personal Info')}</span>
              </div>
              <div className="flex-1 h-1 mx-2 bg-gray-700">
                <div className="h-full bg-gray-600" style={{ width: '50%' }}></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-gray-400">
                  2
                </div>
                <span className="text-sm mt-2 text-gray-500">{t('applyPage.review.title', 'Review & Submit')}</span>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Import from Profile Button */}
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-4 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">👤</span>
                  <div>
                    <h4 className="text-white font-semibold">Import from Profile</h4>
                    <p className="text-gray-300 text-sm">Auto-fill form with your saved profile information</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const response = await axios.get('http://localhost:5002/profile', {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      });

                      if (response.data) {
                        const profileData = response.data;
                        setFormData(prev => ({
                          ...prev,
                          fullName: profileData.name || prev.fullName,
                          phone: profileData.phone || prev.phone,
                          income: profileData.income || prev.income,
                          caste: profileData.caste || prev.caste,
                        }));
                        toast.success('Profile data imported successfully!');
                      }
                    } catch (error) {
                      console.error('Error importing profile:', error);
                      toast.error('Failed to import profile data');
                    }
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium flex items-center gap-2"
                >
                  <span>↓</span>
                  Import Details
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">{t('applyPage.form.fullName', 'Full Name')} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-3 rounded-lg bg-gray-700 border ${errors.fullName ? 'border-red-500' : 'border-gray-600'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder={t('applyPage.form.fullNamePlaceholder', 'Enter your full name')}
                    required
                  />
                  {formData.fullName && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, fullName: '' }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      title="Clear"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                {errors.fullName && <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <label htmlFor="aadhaar" style={{ marginBottom: 0 }}>{t('applyPage.form.aadhaar', 'Aadhaar Number')}</label>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <label
                        htmlFor="aadhaar-upload"
                        style={{
                          cursor: 'pointer',
                          color: '#4a6cf7',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FaImage className="w-3.5 h-3.5" />
                        {isOcrProcessing ? t('applyPage.processing', 'Processing...') : t('applyPage.scanAadhaar', 'Scan from Aadhaar')}
                      </label>
                      <input
                        id="aadhaar-upload"
                        type="file"
                        accept="image/*"
                        onChange={onAadhaarFileChange}
                        disabled={isOcrProcessing}
                        style={{ display: 'none' }}
                        capture="environment"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="aadhaar"
                      inputMode="numeric"
                      maxLength={12}
                      value={formData.aadhaar}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                        setFormData({ ...formData, aadhaar: value });
                      }}
                      className={`w-full px-4 py-3 rounded-lg bg-gray-700 border ${errors.aadhaar ? 'border-red-500' : 'border-gray-600'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder={t('applyPage.form.aadhaarPlaceholder', 'Enter Aadhaar number (12 digits)')}
                      required
                    />
                    {formData.aadhaar && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, aadhaar: '' }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        title="Clear"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                  {ocrError && (
                    <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '5px' }}>
                      {ocrError}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {t('applyPage.aadhaarHelper', 'Take a clear photo of your Aadhaar card to auto-fill details')}
                  </div>
                </div>
                {errors.aadhaar && <p className="mt-1 text-sm text-red-400">{errors.aadhaar}</p>}
                {ocrError && <p className="mt-1 text-sm text-yellow-400">{ocrError}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">{t('applyPage.form.phone', 'Phone Number')} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-400">+91</span>
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={10}
                    className={`w-full pl-12 pr-10 py-3 rounded-lg bg-gray-700 border ${errors.phone ? 'border-red-500' : 'border-gray-600'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder={t('applyPage.form.phonePlaceholder', 'Enter 10-digit number')}
                    required
                  />
                  {formData.phone && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, phone: '' }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      title="Clear"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">{t('applyPage.form.annualIncome', 'Annual Income')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-400">₹</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="income"
                    value={formData.income}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      if ((value.match(/\./g) || []).length <= 1) {
                        setFormData(prev => ({ ...prev, income: value }));
                      }
                    }}
                    onBlur={handleBlur}
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('applyPage.form.incomePlaceholder', 'Enter your annual income')}
                  />
                  {formData.income && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, income: '' }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      title="Clear"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                {errors.income && <p className="mt-1 text-sm text-red-400">{errors.income}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">{t('applyPage.form.category', 'Caste (if applicable)')}</label>
                <div className="relative">
                  <select
                    name="caste"
                    value={formData.caste}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full px-4 py-3 pr-10 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 appearance-none"
                  >
                    <option value="">{t('applyPage.form.selectCategory', 'Select Category')}</option>
                    <option value="General">{t('applyPage.caste.general', 'General')}</option>
                    <option value="OBC">{t('applyPage.caste.obc', 'OBC')}</option>
                    <option value="SC">{t('applyPage.caste.sc', 'SC')}</option>
                    <option value="ST">{t('applyPage.caste.st', 'ST')}</option>
                    <option value="Other">{t('applyPage.caste.other', 'Other')}</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {errors.caste && <p className="mt-1 text-sm text-red-400">{errors.caste}</p>}
              </div>
            </div>

            {/* Required Documents */}
            {Array.isArray(scheme.documents) && scheme.documents.length > 0 && (
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-medium text-gray-200 mb-3 flex items-center">
                  <FaFileAlt className="mr-2 text-blue-400" /> {t('applyPage.form.documents', 'Required Documents')}
                </h3>
                <ul className="space-y-2">
                  {scheme.documents.map((doc, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="flex-shrink-0 h-5 w-5 text-blue-400 mt-0.5">
                        <FaCheck />
                      </div>
                      <span className="ml-2 text-gray-300">{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Upload Documents Directly */}
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="text-lg font-medium text-gray-200 mb-3 flex items-center">
                <FaUpload className="mr-2 text-purple-400" /> {t('applyPage.form.uploadDocuments', 'Upload Documents')}
              </h3>
              <div className="space-y-3">
                <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors cursor-pointer bg-gray-700/20">
                  <input
                    type="file"
                    multiple={false}
                    onChange={handleFileUpload}
                    disabled={uploadingFile !== null}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  />
                  <div className="pointer-events-none">
                    {uploadingFile ? (
                      <>
                        <FaSpinner className="h-8 w-8 text-blue-400 mx-auto mb-2 animate-spin" />
                        <p className="text-gray-300 text-sm">{t('applyPage.uploading', 'Uploading')} {uploadingFile}...</p>
                      </>
                    ) : (
                      <>
                        <FaUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-300 font-medium">{t('applyPage.form.dragDrop', 'Click to upload or drag and drop')}</p>
                        <p className="text-gray-400 text-xs mt-1">{t('applyPage.form.fileTypes', 'Supported: PDF, DOC, DOCX, JPG, PNG (max 10MB)')}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600">
                    <p className="text-sm font-medium text-gray-300 mb-2">{t('applyPage.docsForApp', 'Documents for this application:')}</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uploadedFiles.map(doc => (
                        <div key={doc._id} className={`flex items-center p-2 rounded-lg ${selectedUploadedDocs.has(doc._id) ? 'bg-blue-900/30 border border-blue-700' : 'bg-gray-700 border border-gray-600'}`}>
                          <input
                            type="checkbox"
                            checked={selectedUploadedDocs.has(doc._id)}
                            onChange={(e) => {
                              setSelectedUploadedDocs(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(doc._id);
                                else next.delete(doc._id);
                                return next;
                              });
                            }}
                            className="h-4 w-4 text-blue-500 rounded border-gray-600 focus:ring-blue-500 bg-gray-800 cursor-pointer"
                          />
                          <FaFileAlt className="ml-2 text-gray-400 flex-shrink-0" />
                          <div className="ml-2 flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-200 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-400">{(doc.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveUploadedDoc(doc._id)}
                            className="ml-2 text-gray-400 hover:text-red-400 flex-shrink-0 transition-colors"
                            title="Remove document"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Your Documents */}
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-200 flex items-center">
                  <FaFileAlt className="mr-2 text-green-400" /> {t('applyPage.yourDocuments', 'Your Documents')}
                </h3>
                <Link
                  to="/documents"
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                >
                  <FaUpload className="mr-1" /> {t('applyPage.uploadNew', 'Upload New')}
                </Link>
              </div>

              {userDocuments.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-600 rounded-lg">
                  <p className="text-gray-400">{t('applyPage.noDocsUploaded', 'No documents uploaded yet.')}</p>
                  <Link
                    to="/documents"
                    className="mt-2 inline-flex items-center text-blue-400 hover:text-blue-300"
                  >
                    <FaUpload className="mr-1" /> {t('applyPage.form.uploadDocuments', 'Upload Documents')}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {userDocuments.map(doc => (
                    <label
                      key={doc._id}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedDocIds.has(doc._id) ? 'bg-blue-900/30 border border-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.has(doc._id)}
                        onChange={(e) => {
                          setSelectedDocIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(doc._id);
                            else next.delete(doc._id);
                            return next;
                          });
                        }}
                        className="h-5 w-5 text-blue-500 rounded border-gray-600 focus:ring-blue-500 bg-gray-800"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-200">{doc.name}</p>
                        <p className="text-xs text-gray-400">{doc.category}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Document Validation */}
            {scheme.documents?.length > 0 && selectedDocIds.size === 0 && errors.documents && (
              <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{errors.documents}</p>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-4 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                disabled={isSubmitting}
                className="px-6 py-3 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px]"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    <span>{t('applyPage.form.submitting', 'Submitting...')}</span>
                  </>
                ) : (
                  <span>{t('applyPage.form.submitApplication', 'Submit Application')}</span>
                )}
                {isSubmitting && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400/50 rounded-b overflow-hidden">
                    <span className="absolute top-0 left-0 bottom-0 bg-blue-400 animate-progress"></span>
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
