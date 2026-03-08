import axios from 'axios';
import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import {
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiChevronDown,
  FiClock,
  FiFilter,
  FiGrid,
  FiHeart,
  FiHome,
  FiList,
  FiSearch,
  FiStar,
  FiUser,
  FiX,
  FiZap
} from 'react-icons/fi';
import { RiAiGenerate } from 'react-icons/ri';
import { useLanguage } from '../contexts/LanguageContext';

// Constants
const EDUCATION_LEVELS = [
  'Below 10th', '10th Pass', '12th Pass', 'Diploma',
  'Graduate', 'Post Graduate', 'Doctorate'
];

const EMPLOYMENT_TYPES = [
  'Employed', 'Unemployed', 'Student', 'Self-Employed', 'Retired'
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const CASTE_OPTIONS = ['General', 'OBC', 'SC', 'ST', 'Other'];

const INCOME_BRACKETS = [
  '< 1 Lakh', '1-3 Lakhs', '3-6 Lakhs', '> 6 Lakhs'
];

const STATES = [
  'Maharashtra', 'Delhi', 'Karnataka',
  'Tamil Nadu', 'Uttar Pradesh', 'Other'
];

/**
 * RecommendationsPage Component
 * 
 * Displays personalized government scheme recommendations based on user profile.
 */
const RecommendationsPage = (props) => {
  const {
    initialProfile = {
      age: '',
      income: '',
      caste: 'General',
      gender: 'Male',
      state: '',
      education: 'Graduate',
      employment: 'Employed'
    },
    onSchemeSelect = () => { },
    showFilters = true,
    defaultViewMode = 'grid',
    onFiltersChange = () => { },
    onApply = async () => { }
  } = props;

  // State for user profile
  const [profile, setProfile] = useState(initialProfile);

  // State for recommendations and UI
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [aiInsights, setAiInsights] = useState('Analyzing your profile...');
  const [showAiLoader, setShowAiLoader] = useState(false);
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [filters, setFilters] = useState({
    category: 'all',
    sortBy: 'relevance',
    searchQuery: '',
    showFilters: false,
    minBenefit: '',
    maxAge: ''
  });

  // Form fields configuration
  const formFields = [
    {
      name: 'age',
      label: 'Age',
      type: 'number',
      min: 18,
      max: 100,
      required: true
    },
    {
      name: 'gender',
      label: 'Gender',
      type: 'select',
      options: GENDER_OPTIONS,
      required: true
    },
    {
      name: 'income',
      label: 'Annual Income',
      type: 'select',
      options: INCOME_BRACKETS,
      required: true
    },
    {
      name: 'caste',
      label: 'Caste',
      type: 'select',
      options: CASTE_OPTIONS,
      required: true
    },
    {
      name: 'state',
      label: 'State',
      type: 'select',
      options: STATES,
      required: true
    },
    {
      name: 'education',
      label: 'Education',
      type: 'select',
      options: EDUCATION_LEVELS,
      required: true
    },
    {
      name: 'employment',
      label: 'Employment Status',
      type: 'select',
      options: EMPLOYMENT_TYPES,
      required: true
    }
  ];

  // Handle input changes in the profile form
  const handleInput = (e) => {
    const { name, value } = e.target;
    setProfile(prev => {
      const updatedProfile = {
        ...prev,
        [name]: value
      };
      return updatedProfile;
    });
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const updatedFilters = {
        ...prev,
        [name]: value
      };
      onFiltersChange(updatedFilters);
      return updatedFilters;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    const defaultFilters = {
      category: 'all',
      sortBy: 'relevance',
      searchQuery: '',
      showFilters: false,
      minBenefit: '',
      maxAge: ''
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  // Toggle favorite status
  const toggleFavorite = (schemeId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(schemeId)) {
        newFavorites.delete(schemeId);
      } else {
        newFavorites.add(schemeId);
      }
      return newFavorites;
    });
  };

  // Handle scheme application
  const handleApply = async (schemeId) => {
    try {
      setLoading(true);
      await onApply(schemeId);
      alert('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying to scheme:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get filtered and sorted recommendations
  const filteredRecommendations = useMemo(() => {
    let result = [...recommendations];

    // Apply category filter
    if (filters.category !== 'all') {
      result = result.filter(scheme => scheme.category === filters.category);
    }

    // Apply search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(scheme =>
        scheme.name.toLowerCase().includes(query) ||
        (scheme.description && scheme.description.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    if (filters.sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.sortBy === 'deadline') {
      result.sort((a, b) => {
        if (a.deadline && b.deadline) {
          const dateA = new Date(a.deadline).getTime();
          const dateB = new Date(b.deadline).getTime();
          return dateA - dateB;
        }
        return 0;
      });
    }

    return result;
  }, [recommendations, filters]);

  // Fetch AI recommendations
  const getRecommendations = async () => {
    try {
      setLoading(true);
      setShowAiLoader(true);
      setAiInsights('Analyzing your profile with AI...');

      // Prepare profile data for backend
      const profileData = {
        age: parseInt(profile.age) || 0,
        gender: profile.gender,
        income: profile.income,
        caste: profile.caste,
        state: profile.state,
        education: profile.education,
        employmentStatus: profile.employment,
        category: profile.caste
      };

      const response = await axios.post('http://localhost:5002/api/recommendations/ai', {
        profile: profileData
      });

      if (response.data.recommendations && response.data.recommendations.length > 0) {
        setRecommendations(response.data.recommendations);
        setAiInsights(`AI has found ${response.data.recommendations.length} personalized schemes for you!`);
      } else {
        setAiInsights('No specific recommendations found. Try updating your profile.');
        setRecommendations([]);
      }

      setHasSearched(true);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setAiInsights('Error connecting to AI service. Please try again.');
      setRecommendations([]);
    } finally {
      setLoading(false);
      setTimeout(() => setShowAiLoader(false), 1000);
    }
  };

  // Get translation function
  const { t } = useLanguage();

  // ------- Select Option Data -------
  const selectOptions = useMemo(
    () => ({
      income: [
        "Below 1 LPA",
        "Below 2 LPA",
        "2-5 LPA",
        "5-10 LPA",
        "10-18 LPA",
        "Above 18 LPA",
      ],
      caste: ["General", "SC", "ST", "OBC"],
      gender: ["Male", "Female", "Other"],
      state: [
        "Andhra Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Delhi",
        "Gujarat",
        "Haryana",
        "Karnataka",
        "Kerala",
        "Maharashtra",
        "Punjab",
        "Rajasthan",
        "Tamil Nadu",
        "Uttar Pradesh",
        "West Bengal",
        "All",
      ],
    }),
    []
  );

  // ------- Enhanced Categories with AI Tags -------
  const schemeCategories = [
    {
      id: "all",
      name: "All Categories",
      icon: <RiAiGenerate className="text-xl text-blue-500" />,
      count: 0,
      aiTag: "AI-Powered",
      color: 'bg-blue-50 text-blue-700'
    },
    {
      id: "education",
      name: "Education",
      icon: <FiBookOpen className="text-purple-500" />,
      count: 0,
      aiTag: "AI-Empowered",
      color: 'bg-purple-50 text-purple-700'
    },
    {
      id: "healthcare",
      name: "Healthcare",
      icon: <FiHeart className="text-red-400" />,
      count: 0,
      aiTag: "Health AI",
      color: 'bg-red-50 text-red-700'
    },
    {
      id: "employment",
      name: "Employment",
      icon: <FiBriefcase className="text-yellow-500" />,
      count: 0,
      aiTag: "Smart Living"
    },
    {
      id: "Employment",
      name: "Employment",
      icon: <FiAward className="text-blue-400" />,
      count: 0,
      aiTag: "Career AI"
    },
    {
      id: "Financial",
      name: "Financial",
      icon: <RiAiGenerate className="text-green-400" />,
      count: 0,
      aiTag: "FinTech"
    },
    {
      id: "Women & Child Welfare",
      name: "Women & Child",
      icon: <FiStar className="text-pink-400" />,
      count: 0,
      aiTag: "CareTech"
    },
    {
      id: "Senior Citizens",
      name: "Seniors",
      icon: <RiAiGenerate className="text-indigo-400" />,
      count: 0,
      aiTag: "ElderTech"
    },
    {
      id: "Business",
      name: "Business",
      icon: <RiAiGenerate className="text-purple-500" />,
      count: 0,
      aiTag: "BizAI"
    },
    {
      id: "MSME",
      name: "MSME",
      icon: <FiZap className="text-blue-500" />,
      count: 0,
      aiTag: "SME Tech"
    }
  ];

  // ------- Filtering and Sorting Logic -------
  // The filtering and sorting logic is now handled by the useMemo hook: filteredRecommendations
  // This useEffect was causing an infinite loop and is being removed.

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <div className="flex flex-col min-h-screen">
        {/* Header Section */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div className="mb-6 md:mb-0">
                <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-200">
                  AI-Powered Scheme Recommendations
                </h1>
                <p className="text-blue-100 font-medium text-lg">
                  Discover personalized government schemes based on your profile
                </p>
              </div>
              {showAiLoader && (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-b-white mr-2"></div>
                  <span>Analyzing your profile...</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Search and Filters */}
        <div className="bg-white/10 rounded-xl p-4 shadow-lg mx-4 mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search schemes by name or keyword..."
                className="w-full p-3 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange({ target: { name: 'searchQuery', value: e.target.value } })}
              />
              <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
            </div>
            <button
              onClick={() => setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
              className={`flex items - center gap - 2 px - 4 py - 2 border rounded - lg transition - colors ${filters.showFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
            >
              <FiFilter className="h-5 w-5" />
              <span>Filters</span>
              {filters.category !== 'all' || filters.sortBy !== 'relevance' ? (
                <span className="h-2 w-2 bg-blue-500 rounded-full ml-1"></span>
              ) : null}
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setViewMode('grid')}
                className={`p - 2.5 rounded - xl transition - all duration - 200 ${viewMode === 'grid'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'
                  }`}
              >
                <FiGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p - 2.5 rounded - xl transition - all duration - 200 ${viewMode === 'list'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'
                  } `}
              >
                <FiList className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Panel */}
            {filters.showFilters && (
              <div className="overflow-hidden">
                <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                    <div className="relative">
                      <select
                        className="w-full p-2.5 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-8"
                        value={filters.category}
                        onChange={(e) => handleFilterChange({ target: { name: 'category', value: e.target.value } })}
                      >
                        <option value="all">All Categories</option>
                        {schemeCategories?.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Sort By</label>
                    <div className="relative">
                      <select
                        name="sortBy"
                        value={filters.sortBy}
                        onChange={handleFilterChange}
                        className="w-full p-2.5 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-8"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="newest">Newest First</option>
                        <option value="benefit">Benefit Amount</option>
                        <option value="deadline">Deadline</option>
                      </select>
                      <FiChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2.5 text-sm font-medium text-blue-400 hover:text-blue-300"
                    >
                      Clear all filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 py-6">
          <div className="container mx-auto px-4">
            {/* Profile Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-gray-700/50">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">Your Profile</h2>
                  <button
                    onClick={getRecommendations}
                    disabled={loading}
                    className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-70 transition-all shadow-md"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Finding Schemes...
                      </>
                    ) : (
                      <>
                        <RiAiGenerate className="mr-2" />
                        Get AI Recommendations
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {formFields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-300">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-0.5">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <div className="relative group">
                          <select
                            name={field.name}
                            value={profile[field.name] || ''}
                            onChange={handleInput}
                            className="w-full p-3 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-10 hover:border-blue-400 transition-colors"
                            required={field.required}
                          >
                            <option value="" className="text-gray-400">Select {field.label}</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt} className="text-white bg-gray-800">{opt}</option>
                            ))}
                          </select>
                          <FiChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          value={profile[field.name] || ''}
                          onChange={handleInput}
                          min={field.min}
                          max={field.max}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-colors"
                          required={field.required}
                          placeholder={field.placeholder || ''}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations Section */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Recommended Schemes</h2>
                  {hasSearched && (
                    <p className="text-gray-500 mt-1">
                      Showing {filteredRecommendations.length} schemes
                      {filters.searchQuery && ` for "${filters.searchQuery}"`}
                    </p>
                  )}
                </div>

                {hasSearched && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2 sm:mt-0"
                  >
                    <FiX className="mr-1" /> Clear all filters
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : hasSearched && filteredRecommendations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <FiSearch className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex items-center mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mr-4">
                      <FiUser className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Your Profile</h2>
                      <p className="text-gray-300">Update your profile to get more accurate recommendations.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'}>
                  {filteredRecommendations.map((scheme) => (
                    <div
                      key={scheme.id}
                      className={viewMode === 'grid'
                        ? 'bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100'
                        : 'bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100'}
                    >
                      {viewMode === 'grid' ? (
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                {scheme.category === 'Education' ? (
                                  <FiBookOpen className="w-5 h-5 text-blue-600" />
                                ) : scheme.category === 'Housing' ? (
                                  <FiHome className="w-5 h-5 text-blue-600" />
                                ) : scheme.category === 'Employment' ? (
                                  <FiBriefcase className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <FiAward className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                              <span className="text-sm font-medium text-blue-800">
                                {scheme.category}
                              </span>
                              {scheme.matchScore && (
                                <span className="ml-2 text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                  {scheme.matchScore}% Match
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => toggleFavorite(scheme.id)}
                              className="text-gray-400 hover:text-red-500 focus:outline-none"
                            >
                              <FiHeart
                                className={`h - 5 w - 5 ${favorites.has(scheme.id) ? 'fill-red-500 text-red-500' : ''} `}
                              />
                            </button>
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{scheme.name}</h3>

                          {/* AI Insight Badge */}
                          {scheme.aiInsight && (
                            <div className="mb-3 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                              <div className="flex items-start">
                                <RiAiGenerate className="text-indigo-600 mt-1 mr-2 flex-shrink-0" />
                                <p className="text-xs text-indigo-800 italic">&ldquo;{scheme.aiInsight}&rdquo;</p>
                              </div>
                            </div>
                          )}

                          <p className="text-gray-600 text-sm mb-4">
                            {scheme.description?.length > 150
                              ? `${scheme.description.substring(0, 150)}...`
                              : scheme.description}
                          </p>

                          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                            <div className="flex items-center">
                              <FiClock className="mr-1.5" />
                              <span>Apply by {scheme.deadline || 'No deadline'}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-green-600">
                                {scheme.benefit}
                              </span>
                            </div>
                            <button
                              onClick={() => handleApply(scheme.id)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                              Apply Now
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex">
                          <div className="w-1/3 bg-gray-100 flex items-center justify-center p-6">
                            {scheme.category === 'Education' ? (
                              <FiBookOpen className="w-10 h-10 text-blue-600" />
                            ) : scheme.category === 'Housing' ? (
                              <FiHome className="w-10 h-10 text-blue-600" />
                            ) : scheme.category === 'Employment' ? (
                              <FiBriefcase className="w-10 h-10 text-blue-600" />
                            ) : (
                              <FiAward className="w-10 h-10 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 p-5">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{scheme.name}</h3>
                                <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 mt-1">
                                  {scheme.category}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleFavorite(scheme.id)}
                                className="text-gray-400 hover:text-red-500 focus:outline-none"
                              >
                                <FiHeart
                                  className={`w - 5 h - 5 ${favorites.has(scheme.id) ? 'fill-red-500 text-red-500' : ''} `}
                                />
                              </button>
                            </div>

                            <p className="text-gray-600 text-sm mb-4">{scheme.description}</p>

                            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                              <div className="flex items-center">
                                <FiClock className="mr-1.5" />
                                <span>Apply by {scheme.deadline || 'No deadline'}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-sm font-medium text-green-600">
                                  {scheme.benefit}
                                </span>
                              </div>
                              <button
                                onClick={() => handleApply(scheme.id)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                              >
                                Apply Now
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Add PropTypes validation
const propTypes = {
  initialProfile: PropTypes.shape({
    age: PropTypes.string,
    income: PropTypes.string,
    caste: PropTypes.string,
    gender: PropTypes.string,
    state: PropTypes.string,
    education: PropTypes.string,
    employment: PropTypes.string
  }),
  onSchemeSelect: PropTypes.func,
  showFilters: PropTypes.bool,
  defaultViewMode: PropTypes.string,
  onFiltersChange: PropTypes.func,
  onApply: PropTypes.func
};

// Set default props
const defaultProps = {
  initialProfile: {
    age: '',
    income: '',
    caste: 'General',
    gender: 'Male',
    state: '',
    education: 'Graduate',
    employment: 'Employed'
  },
  onSchemeSelect: () => { },
  showFilters: true,
  defaultViewMode: 'grid',
  onFiltersChange: () => { },
  onApply: async () => { }
};

RecommendationsPage.propTypes = propTypes;
RecommendationsPage.defaultProps = defaultProps;

export default RecommendationsPage;
