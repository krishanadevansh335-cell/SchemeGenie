import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AllSchemesPage = () => {
  const [schemes, setSchemes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const response = await axios.get('http://localhost:5002/api/schemes');
        setSchemes(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching schemes:', err);
        setError('Failed to load schemes. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchSchemes();
  }, []);

  const filteredSchemes = schemes.filter(scheme => 
    scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scheme.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scheme.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">All Government Schemes</h1>
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search schemes by name, description, or category..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Showing {filteredSchemes.length} of {schemes.length} schemes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchemes.map((scheme) => (
          <div key={scheme._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{scheme.name}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {scheme.category}
                </span>
              </div>
              <p className="text-gray-600 mb-4 line-clamp-3">{scheme.description}</p>
              
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Eligibility:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {scheme.eligibility.income && <li>• Income: {scheme.eligibility.income}</li>}
                  {scheme.eligibility.caste && scheme.eligibility.caste.length > 0 && (
                    <li>• Caste: {scheme.eligibility.caste.join(', ')}</li>
                  )}
                  {scheme.eligibility.state && scheme.eligibility.state[0] !== 'All' && (
                    <li>• State: {scheme.eligibility.state.join(', ')}</li>
                  )}
                </ul>
              </div>

              <div className="flex justify-between items-center mt-4">
                <a
                  href={scheme.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  Official Website
                </a>
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllSchemesPage;
