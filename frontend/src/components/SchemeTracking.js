import axios from 'axios';
import jsPDF from 'jspdf';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Globe,
  Loader2,
  Package,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import translations from '../translations/trackingTranslations';
import './SchemeTracking.css';

// Timeline steps with descriptions and estimated days
const timelineSteps = [
  {
    id: 'applied',
    title: 'Application Submitted',
    description: 'Your application has been successfully submitted.',
    icon: FileText,
    estimatedDays: 0,
    status: 'completed'
  },
  {
    id: 'documents',
    title: 'Documents Verification',
    description: 'Verifying your submitted documents and details.',
    icon: FileText,
    estimatedDays: 2,
    status: 'pending'
  },
  {
    id: 'verification',
    title: 'Field Verification',
    description: 'Your details are being verified by our team.',
    icon: UserCheck,
    estimatedDays: 3,
    status: 'pending'
  },
  {
    id: 'approval',
    title: 'Approval Process',
    description: 'Your application is under final review.',
    icon: ShieldCheck,
    estimatedDays: 5,
    status: 'pending'
  },
  {
    id: 'completion',
    title: 'Scheme Disbursement',
    description: 'Scheme benefits will be processed upon approval.',
    icon: CheckCircle,
    estimatedDays: 7,
    status: 'pending'
  },
];

export default function SchemeTracking() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [currentDate] = useState(new Date());
  const [language, setLanguage] = useState('en');
  const pdfRef = useRef(null);

  // Memoize the translation function
  const t = useCallback(
    (key) => translations[language]?.[key] || translations['en']?.[key] || key,
    [language]
  );

  // Fetch user's applications
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5002/api/applications', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setSchemes(response.data);
      } catch (err) {
        console.error('Error fetching applications:', err);
        setError('Failed to load applications. Please try again later.');
        toast.error('Failed to load your applications');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  // Memoize filtered schemes
  const filteredSchemes = useMemo(() => {
    let result = [...schemes];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(scheme =>
        (scheme.schemeId?.name || scheme.name || '').toLowerCase().includes(searchLower) ||
        (scheme.schemeId?.category || scheme.category || '').toLowerCase().includes(searchLower) ||
        (scheme.status || '').toLowerCase().includes(searchLower)
      );
    }

    if (activeTab !== 'all') {
      result = result.filter(scheme => scheme.status === activeTab);
    }

    return result;
  }, [searchTerm, activeTab, schemes]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: schemes.length,
      approved: schemes.filter(s => s.status === 'approved').length,
      pending: schemes.filter(s => ['submitted', 'under_review', 'pending'].includes(s.status)).length,
      rejected: schemes.filter(s => s.status === 'rejected').length
    };
  }, [schemes]);

  // Calculate timeline dates
  const calculateTimelineDates = (appliedDate) => {
    const appDate = new Date(appliedDate);
    let prevDate = new Date(appDate);

    return timelineSteps.map(step => {
      const stepDate = new Date(prevDate);
      stepDate.setDate(stepDate.getDate() + step.estimatedDays);
      prevDate = new Date(stepDate);

      return {
        ...step,
        date: stepDate,
        isCompleted: currentDate >= stepDate
      };
    });
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate progress percentage
  const calculateProgress = (scheme) => {
    if (scheme.status === 'approved') return 100;
    if (scheme.status === 'rejected') return 100;
    if (scheme.status === 'pending' || scheme.status === 'under_review') return 50;
    if (scheme.status === 'submitted') return 25;
    return 0;
  };

  // Generate PDF
  const generatePDF = (e, scheme) => {
    e.stopPropagation();

    try {
      const doc = new jsPDF();

      // Colors
      const primaryColor = [33, 150, 243]; // Blue
      const secondaryColor = [26, 35, 126]; // Dark Blue for footer

      // Header Background
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 40, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Scheme Seva', 20, 20); // Fixed typo: Added space

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Application Receipt', 20, 30);

      // Reset Text Color
      doc.setTextColor(0, 0, 0);

      // Application Details Section
      let y = 60;

      // Helper for rows
      const addRow = (label, value, isError = false) => {
        doc.setFont('helvetica', 'bold');
        if (isError) doc.setTextColor(220, 53, 69); // Red for errors
        doc.text(label, 20, y);

        doc.setFont('helvetica', 'normal');
        if (isError) doc.setTextColor(220, 53, 69);
        else doc.setTextColor(0, 0, 0);

        // Handle long text wrapping
        const splitText = doc.splitTextToSize(value || 'N/A', 110);
        doc.text(splitText, 80, y);

        y += (splitText.length * 7) + 5; // Adjust spacing based on lines
      };

      const schemeName = scheme.schemeId?.name || scheme.name || 'Unknown Scheme';
      const category = scheme.schemeId?.category || scheme.category || 'General';
      const applicantName = scheme.applicationData?.personalInfo?.fullName || 'N/A';
      const status = scheme.status?.toUpperCase().replace('_', ' ') || 'PENDING';
      const appliedDate = formatDate(scheme.createdAt || scheme.appliedDate);
      const appId = scheme._id;
      const trackingId = scheme.trackingId || 'N/A';

      // Calculate Validity (AI Feature 1: Smart Date Calculation)
      const validUntil = scheme.status === 'approved'
        ? new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Subject to Approval';

      // Draw Details
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Application Details', 20, y - 10);
      doc.line(20, y - 8, 190, y - 8); // Underline

      doc.setFontSize(12);

      addRow('Application ID:', appId);
      addRow('Tracking ID:', trackingId);
      addRow('Scheme Name:', schemeName);
      addRow('Category:', category);
      addRow('Applicant Name:', applicantName);
      addRow('Status:', status);
      addRow('Applied Date:', appliedDate);
      addRow('Benefits Valid Until:', validUntil); // Added Validity Date

      if (scheme.rejectionReason) {
        y += 5;
        addRow('Rejection Reason:', scheme.rejectionReason, true);
      }

      // AI Smart Tips Section
      y += 10;
      doc.setFillColor(240, 248, 255); // Light Alice Blue
      doc.rect(15, y, 180, 35, 'F');
      doc.setDrawColor(33, 150, 243);
      doc.rect(15, y, 180, 35, 'S');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...secondaryColor);
      doc.text('AI Smart Tip 💡', 25, y + 10);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(50, 50, 50);

      // Generate Context-Aware Tip
      const getSmartTip = (cat, stat) => {
        if (stat === 'rejected') return "Don't worry! Review the rejection reason above and re-apply with corrected documents.";
        if (stat === 'approved') return "Congratulations! Keep this receipt safe. You may need to visit the nearest center for biometric verification.";

        const tips = {
          'Education': "Ensure you maintain 75% attendance to keep your scholarship active for the next academic year.",
          'Health': "Keep your health card and this receipt handy for emergency medical visits.",
          'Agriculture': "Regularly update your soil health card to maximize the benefits of this scheme.",
          'Housing': "Take photos of construction stages to speed up your next installment release.",
          'Financial': "Link your Aadhaar with your bank account to ensure direct benefit transfer (DBT) success.",
          'Women & Child': "Visit your local Anganwadi center for regular health checkups and nutritional support."
        };
        return tips[cat] || "Regularly check your application status on the Scheme Seva portal for real-time updates.";
      };

      const smartTip = getSmartTip(category, scheme.status);
      const splitTip = doc.splitTextToSize(smartTip, 160);
      doc.text(splitTip, 25, y + 20);

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('This is a computer generated receipt.', 20, pageHeight - 20);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, pageHeight - 15);
      doc.text('Scheme Seva - Empowering Citizens', 20, pageHeight - 10);

      doc.save(`scheme-receipt-${scheme._id}.pdf`);
      toast.success('Receipt downloaded successfully');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="st-page">
      <div className="st-inner">
        {/* Header Section */}
        <div className="st-header">
          <div>
            <h1>{t('header')}</h1>
            <p className="st-sub">{t('subheader')}</p>
          </div>

          <div className="language-selector">
            <Globe size={16} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="language-select"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="st-stats-grid">
          <div className="st-stat-card total">
            <div className="stat-icon"><Package size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Total Applications</span>
              <span className="stat-value">{stats.total}</span>
            </div>
          </div>
          <div className="st-stat-card approved">
            <div className="stat-icon"><CheckCircle size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Approved</span>
              <span className="stat-value">{stats.approved}</span>
            </div>
          </div>
          <div className="st-stat-card pending">
            <div className="stat-icon"><Clock size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">In Progress</span>
              <span className="stat-value">{stats.pending}</span>
            </div>
          </div>
          <div className="st-stat-card rejected">
            <div className="stat-icon"><XCircle size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Rejected</span>
              <span className="stat-value">{stats.rejected}</span>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="st-controls">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="tabs">
            <button
              className={activeTab === 'all' ? 'active' : ''}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={activeTab === 'pending' ? 'active' : ''}
              onClick={() => setActiveTab('pending')}
            >
              Pending
            </button>
            <button
              className={activeTab === 'approved' ? 'active' : ''}
              onClick={() => setActiveTab('approved')}
            >
              Approved
            </button>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="loading">
            <Loader2 className="animate-spin" size={32} />
            <span>Loading your applications...</span>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertCircle size={32} />
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : filteredSchemes.length > 0 ? (
          <div className="scheme-grid">
            {filteredSchemes.map((scheme) => (
              <div
                key={scheme._id}
                id={`scheme-card-${scheme._id}`}
                className={`scheme-card ${scheme.status}`}
                onClick={() => setSelectedScheme(scheme)}
              >
                <div className="card-header">
                  <div className="scheme-icon">
                    {scheme.status === 'approved' ? <CheckCircle size={20} /> :
                      scheme.status === 'rejected' ? <XCircle size={20} /> :
                        <Clock size={20} />}
                  </div>
                  <span className={`status-badge ${scheme.status}`}>
                    {scheme.status?.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="scheme-name">{scheme.schemeId?.name || scheme.name || 'Unnamed Scheme'}</h3>
                <p className="scheme-category">{scheme.schemeId?.category || scheme.category || 'General'}</p>

                <div className="progress-section">
                  <div className="progress-info">
                    <span>Progress</span>
                    <span>{calculateProgress(scheme)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${calculateProgress(scheme)}%` }}
                    />
                  </div>
                </div>

                <div className="card-footer">
                  <div className="date-info">
                    <Calendar size={14} />
                    <span>{formatDate(scheme.createdAt || scheme.appliedDate)}</span>
                  </div>
                  <button
                    className="download-btn"
                    onClick={(e) => generatePDF(e, scheme)}
                    title="Download Receipt"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Package size={48} />
            <h3>No Applications Found</h3>
            <p>You haven&apos;t applied for any schemes yet.</p>
            <Link to="/schemes" className="browse-btn">Browse Schemes</Link>
          </div>
        )}

        {/* Detail Modal */}
        {selectedScheme && (
          <div className="modal-overlay" onClick={() => setSelectedScheme(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Application Details</h2>
                <button className="close-btn" onClick={() => setSelectedScheme(null)}>×</button>
              </div>

              <div className="modal-body">
                <div className="detail-section">
                  <h3>Scheme Information</h3>
                  <div className="info-row">
                    <span className="label">Name:</span>
                    <span className="value">{selectedScheme.schemeId?.name || selectedScheme.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Category:</span>
                    <span className="value">{selectedScheme.schemeId?.category || selectedScheme.category}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className={`value status-${selectedScheme.status}`}>
                      {selectedScheme.status?.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  {selectedScheme.rejectionReason && (
                    <div className="info-row rejection">
                      <span className="label">Rejection Reason:</span>
                      <span className="value">{selectedScheme.rejectionReason}</span>
                    </div>
                  )}
                </div>

                <div className="timeline-section">
                  <h3>Tracking Timeline</h3>
                  <div className="timeline">
                    {calculateTimelineDates(selectedScheme.createdAt || selectedScheme.appliedDate).map((step, index) => (
                      <div key={step.id} className={`timeline-item ${step.isCompleted ? 'completed' : ''}`}>
                        <div className="timeline-marker">
                          {step.isCompleted ? <CheckCircle size={14} /> : <div className="dot" />}
                        </div>
                        <div className="timeline-content">
                          <h4>{step.title}</h4>
                          <p>{step.description}</p>
                          <span className="date">{formatDate(step.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setSelectedScheme(null)}>Close</button>
                <button className="btn-primary" onClick={(e) => generatePDF(e, selectedScheme)}>
                  <Download size={16} /> Download Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
