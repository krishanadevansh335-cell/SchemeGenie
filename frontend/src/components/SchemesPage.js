import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './SchemesPage.css';

const SchemesPage = () => {
  const { t, currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [userApplicationData, setUserApplicationData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    'All', 'Agriculture', 'Education', 'Healthcare', 'Housing', 'Employment',
    'Financial', 'MSME', 'Social Security', 'Energy', 'Infrastructure',
    'Sanitation', 'Digital Services', 'Food Security', 'Women & Child Welfare',
    'Senior Citizens', 'Business', 'Disability'
  ];

  // Clean up any existing style elements on unmount
  useEffect(() => {
    return () => {
      const styleElement = document.querySelector('style[data-scheme-spinner]');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `http://localhost:5002/api/schemes?language=${currentLanguage}&_=${timestamp}`;
      console.log('Fetching schemes from:', url);
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response data:', response.data);

      if (Array.isArray(response.data)) {
        console.log(`Successfully fetched ${response.data.length} schemes`);
        setSchemes(response.data);
      } else if (response.data && Array.isArray(response.data.schemes)) {
        console.log(`Successfully fetched ${response.data.schemes.length} schemes from nested property`);
        setSchemes(response.data.schemes);
      } else {
        console.warn('Unexpected response format:', response.data);
        setSchemes([]);
      }
    } catch (error) {
      console.error('Error fetching schemes:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error data:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received. Request:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
      setError('Failed to load schemes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [currentLanguage]);

  // Filter schemes based on search term and selected category
  const filteredSchemes = React.useMemo(() => {
    if (!schemes) return [];

    return schemes.filter(scheme => {
      if (!scheme || !scheme.name || !scheme.description || !scheme.category) {
        return false;
      }

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        scheme.name.toLowerCase().includes(searchLower) ||
        scheme.description.toLowerCase().includes(searchLower) ||
        (scheme.category && scheme.category.toLowerCase().includes(searchLower));

      const matchesCategory =
        selectedCategory === 'All' ||
        scheme.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [schemes, searchTerm, selectedCategory]);

  // Function to fetch user's application data for a scheme
  const fetchUserApplicationData = async (schemeId) => {
    try {
      setLoadingUserData(true);
      const token = localStorage.getItem('token');

      // Fetch all applications for the current user
      const response = await axios.get('http://localhost:5002/api/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Find the application for this scheme
      const application = response.data.find(app => app.schemeId?._id === schemeId || app.schemeId === schemeId);

      if (application) {
        setUserApplicationData(application);
      } else {
        setUserApplicationData(null);
      }
    } catch (error) {
      console.error('Error fetching user application data:', error);
      setUserApplicationData(null);
    } finally {
      setLoadingUserData(false);
    }
  };

  // Function to handle applying for a scheme
  const handleApply = (schemeId) => {
    // Navigate to application form with scheme ID
    navigate(`/apply/${schemeId}`);
  };

  if (loading) {
    return (
      <div className="schemes-page" style={{ padding: '20px' }}>
        <div className="loading" style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '18px', marginBottom: '20px' }}>Loading schemes...</div>
          <div style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #3498db', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
        </div>
      </div>
    );
  }

  // Add CSS animation for the loading spinner
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleElement);

  return (
    <div className="schemes-page">
      {/* Scheme Details Modal */}
      {selectedScheme && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#2d3748',
            padding: '25px',
            borderRadius: '10px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: '#e2e8f0',
            position: 'relative'
          }}>
            <button
              onClick={() => {
                setSelectedScheme(null);
                setUserApplicationData(null);
              }}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                color: '#e2e8f0',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '5px 10px',
                borderRadius: '4px',
                backgroundColor: '#4a5568'
              }}
            >
              ×
            </button>

            <h2 style={{ color: '#ffffff', marginTop: 0 }}>{selectedScheme.name}</h2>

            <div style={{ marginBottom: '15px' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '12px',
                background: '#4a5568',
                color: '#90cdf4',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '15px'
              }}>
                {selectedScheme.category}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#ffffff', marginBottom: '8px' }}>Description:</h4>
              <p style={{ margin: 0, lineHeight: '1.6' }}>{selectedScheme.description}</p>
            </div>

            {selectedScheme.officialWebsite && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#ffffff', marginBottom: '8px' }}>Official Website:</h4>
                <a
                  href={selectedScheme.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#63b3ed',
                    textDecoration: 'none',
                    wordBreak: 'break-all',
                    display: 'inline-block',
                    padding: '8px 12px',
                    backgroundColor: '#4a5568',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#4a5568'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#4a5568'}
                >
                  {selectedScheme.officialWebsite}
                </a>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#ffffff', marginBottom: '8px' }}>Eligibility:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedScheme.eligibility.income && (
                  <span style={{
                    background: '#4a5568',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    color: '#e2e8f0'
                  }}>
                    Income: {selectedScheme.eligibility.income}
                  </span>
                )}
                {selectedScheme.eligibility.minAge && (
                  <span style={{
                    background: '#4a5568',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    color: '#e2e8f0'
                  }}>
                    Min Age: {selectedScheme.eligibility.minAge} years
                  </span>
                )}
                {selectedScheme.eligibility.caste && selectedScheme.eligibility.caste[0] !== 'All' && (
                  <span style={{
                    background: '#4a5568',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    color: '#e2e8f0'
                  }}>
                    Caste: {selectedScheme.eligibility.caste.join(', ')}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#ffffff', marginBottom: '8px' }}>Benefits:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {selectedScheme.benefits.map((benefit, index) => (
                  <li key={index} style={{ marginBottom: '6px' }}>{benefit}</li>
                ))}
              </ul>
            </div>

            {/* User Application Data Section */}
            {loadingUserData && (
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#4a5568', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#e2e8f0' }}>Loading your application data...</p>
              </div>
            )}

            {!loadingUserData && userApplicationData && (
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#4a5568', borderRadius: '8px', borderLeft: '4px solid #48bb78' }}>
                <h4 style={{ color: '#90cdf4', marginTop: 0, marginBottom: '12px' }}>📋 Your Application</h4>

                {userApplicationData.applicationData?.personalInfo && (
                  <div style={{ marginBottom: '12px' }}>
                    <h5 style={{ color: '#e2e8f0', margin: '0 0 8px 0', fontSize: '0.9rem' }}>Personal Information:</h5>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e0', lineHeight: '1.6' }}>
                      {userApplicationData.applicationData.personalInfo.fullName && (
                        <div>📝 Name: {userApplicationData.applicationData.personalInfo.fullName}</div>
                      )}
                      {userApplicationData.applicationData.personalInfo.phone && (
                        <div>📞 Phone: {userApplicationData.applicationData.personalInfo.phone}</div>
                      )}
                      {userApplicationData.applicationData.personalInfo.address && (
                        <div>📍 Address: {userApplicationData.applicationData.personalInfo.address}</div>
                      )}
                    </div>
                  </div>
                )}

                {userApplicationData.applicationData?.eligibilityInfo && (
                  <div style={{ marginBottom: '12px' }}>
                    <h5 style={{ color: '#e2e8f0', margin: '0 0 8px 0', fontSize: '0.9rem' }}>Eligibility Information:</h5>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e0', lineHeight: '1.6' }}>
                      {userApplicationData.applicationData.eligibilityInfo.income && (
                        <div>💰 Income: ₹{userApplicationData.applicationData.eligibilityInfo.income}</div>
                      )}
                      {userApplicationData.applicationData.eligibilityInfo.caste && (
                        <div>👥 Caste: {userApplicationData.applicationData.eligibilityInfo.caste}</div>
                      )}
                      {userApplicationData.applicationData.eligibilityInfo.education && (
                        <div>🎓 Education: {userApplicationData.applicationData.eligibilityInfo.education}</div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', color: '#cbd5e0' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#2d3748', color: '#90cdf4' }}>
                      Status: {userApplicationData.status}
                    </span>
                  </div>
                  {userApplicationData.submittedAt && (
                    <div>📅 Submitted: {new Date(userApplicationData.submittedAt).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedScheme(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4a5568',
                  border: 'none',
                  color: '#e2e8f0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4c5663'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#4a5568'}
              >
                Close
              </button>
              <button
                onClick={() => handleApply(selectedScheme._id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#48bb78',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#38a169'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#48bb78'}
              >
                Apply Now
              </button>
            </div>
          </div>
        </div>
      )}
      <h1>{t('schemes.title')}</h1>

      {/* Tab Navigation */}
      <div className="tabs" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
          style={{
            padding: '10px 20px',
            border: '1px solid #ddd',
            background: activeTab === 'all' ? '#007bff' : '#fff',
            color: activeTab === 'all' ? '#fff' : '#333',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          All Schemes (194)
        </button>
        <button
          className={`tab ${activeTab === 'categorized' ? 'active' : ''}`}
          onClick={() => setActiveTab('categorized')}
          style={{
            padding: '10px 20px',
            border: '1px solid #ddd',
            background: activeTab === 'categorized' ? '#007bff' : '#fff',
            color: activeTab === 'categorized' ? '#fff' : '#333',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          Categorized View
        </button>
      </div>

      {activeTab === 'all' ? (
        <div className="all-schemes-view">
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search schemes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px',
                width: '100%',
                maxWidth: '500px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                backgroundColor: '#2d3748',
                color: '#e2e8f0',
                fontSize: '16px'
              }}
            />
          </div>
          <div className="schemes-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
            padding: '20px 0'
          }}>
            {schemes
              .filter(scheme =>
                scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                scheme.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                scheme.category.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(scheme => (
                <div key={scheme._id} className="scheme-card" style={{
                  border: '1px solid #2d3748',
                  borderRadius: '10px',
                  padding: '20px',
                  backgroundColor: '#2d3748',
                  color: '#e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div className="scheme-category" style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: '#4a5568',
                    color: '#90cdf4',
                    fontSize: '12px',
                    margin: '0 0 12px 0',
                    fontWeight: '500',
                    alignSelf: 'flex-start'
                  }}>
                    {scheme.category}
                  </div>
                  <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '12px' }}>{scheme.name}</h3>
                  <p style={{ color: '#cbd5e0', marginBottom: '16px', flexGrow: 1 }}>
                    {scheme.description.length > 150
                      ? `${scheme.description.substring(0, 150)}...`
                      : scheme.description}
                  </p>

                  <div className="scheme-benefits" style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '0.95rem' }}>Benefits:</h4>
                    <ul style={{ paddingLeft: '20px', margin: '0' }}>
                      {scheme.benefits.slice(0, 2).map((benefit, index) => (
                        <li key={index} style={{ marginBottom: '6px', color: '#e2e8f0', fontSize: '0.9rem' }}>{benefit}</li>
                      ))}
                      {scheme.benefits.length > 2 && (
                        <li style={{ color: '#90cdf4', fontSize: '0.85rem' }}>+ {scheme.benefits.length - 2} more</li>
                      )}
                    </ul>
                  </div>

                  <div className="scheme-eligibility" style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '0.95rem' }}>Eligibility:</h4>
                    <div className="eligibility-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {scheme.eligibility.income && (
                        <span className="tag" style={{
                          background: '#4a5568',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          lineHeight: '1.2'
                        }}>
                          {scheme.eligibility.income}
                        </span>
                      )}
                      {scheme.eligibility.age && (
                        <span className="tag" style={{
                          background: '#4a5568',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          lineHeight: '1.2'
                        }}>
                          {scheme.eligibility.age}
                        </span>
                      )}
                      {scheme.eligibility.gender && (
                        <span className="tag" style={{
                          background: '#4a5568',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          lineHeight: '1.2'
                        }}>
                          {scheme.eligibility.gender}
                        </span>
                      )}
                      {scheme.eligibility.caste && scheme.eligibility.caste.length > 0 && (
                        <span className="tag" style={{
                          background: '#4a5568',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          lineHeight: '1.2'
                        }}>
                          {scheme.eligibility.caste.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="scheme-actions" style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                    <button
                      className="btn-view"
                      onClick={() => {
                        setSelectedScheme(scheme);
                        fetchUserApplicationData(scheme._id);
                      }}
                    >
                      View Details
                    </button>
                    <button
                      className="btn-apply"
                      onClick={() => handleApply(scheme._id)}
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="categorized-view">
          <div className="schemes-filters" style={{ marginBottom: '20px' }}>
            <div className="search-bar" style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder={t('schemes.searchPlaceholder', 'Search schemes...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '10px',
                  width: '100%',
                  maxWidth: '500px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              />
            </div>

            <div className="category-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {categories.map((category) => (
                <button
                  key={category}
                  className={`category-tag ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: `1px solid ${selectedCategory === category ? '#007bff' : '#ddd'}`,
                    background: selectedCategory === category ? '#e6f2ff' : '#fff',
                    color: selectedCategory === category ? '#007bff' : '#333',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="schemes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredSchemes.length > 0 ? (
              filteredSchemes.map((scheme) => (
                <div key={scheme._id} className="scheme-card" style={{
                  border: '1px solid #2d3748',
                  borderRadius: '10px',
                  padding: '20px',
                  backgroundColor: '#2d3748',
                  color: '#e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <h3 style={{ color: '#ffffff', marginTop: '0', marginBottom: '12px' }}>{scheme.name}</h3>
                  <p style={{ color: '#cbd5e0', marginBottom: '16px', flexGrow: 1 }}>{scheme.description}</p>

                  <div className="scheme-category" style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: '#4a5568',
                    color: '#90cdf4',
                    fontSize: '12px',
                    margin: '0 0 12px 0',
                    fontWeight: '500',
                    alignSelf: 'flex-start'
                  }}>
                    {scheme.category}
                  </div>

                  <div className="scheme-benefits" style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '0.95rem' }}>{t('schemes.card.benefits', 'Benefits:')}</h4>
                    <ul style={{ paddingLeft: '20px', margin: '0' }}>
                      {scheme.benefits.slice(0, 2).map((benefit, index) => (
                        <li key={index} style={{ marginBottom: '6px', color: '#e2e8f0', fontSize: '0.9rem' }}>{benefit}</li>
                      ))}
                      {scheme.benefits.length > 2 && (
                        <li style={{ color: '#90cdf4', fontSize: '0.85rem' }}>+ {scheme.benefits.length - 2} {t('schemes.card.moreItems', 'more')}</li>
                      )}
                    </ul>
                  </div>

                  <div className="scheme-eligibility" style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '0.95rem' }}>{t('schemes.card.eligibility', 'Eligibility:')}</h4>
                    <div className="eligibility-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {scheme.eligibility.income && (
                        <span className="tag" style={{
                          background: '#4a5568',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          lineHeight: '1.2'
                        }}>
                          {t('schemes.card.income', 'Income')}: {scheme.eligibility.income}
                        </span>
                      )}
                      {scheme.eligibility.minAge && (
                        <span className="tag" style={{
                          background: '#4a5568',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          lineHeight: '1.2'
                        }}>
                          {t('schemes.card.age', 'Age')}: {scheme.eligibility.minAge}+ years
                        </span>
                      )}
                      {scheme.eligibility.caste && scheme.eligibility.caste[0] !== 'All' && (
                        <span className="tag" style={{
                          background: '#4a5568',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#e2e8f0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          lineHeight: '1.2'
                        }}>
                          {t('schemes.card.caste', 'Caste')}: {scheme.eligibility.caste.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="scheme-actions" style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                    <button
                      className="btn-view"
                      onClick={() => {
                        setSelectedScheme(scheme);
                        fetchUserApplicationData(scheme._id);
                      }}
                    >
                      View Details
                    </button>
                    <button
                      className="btn-apply"
                      onClick={() => handleApply(scheme._id)}
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-schemes" style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#a0aec0',
                gridColumn: '1 / -1',
                backgroundColor: '#2d3748',
                borderRadius: '10px',
                border: '1px solid #4a5568'
              }}>
                <h3>No schemes found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchemesPage;
