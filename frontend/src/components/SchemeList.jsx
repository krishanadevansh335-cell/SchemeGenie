import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { TailSpin } from 'react-loader-spinner';

const SchemeList = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const response = await axios.get('http://localhost:5002/api/schemes');
        setSchemes(response.data);
      } catch (err) {
        console.error('Error fetching schemes:', err);
        setError('Failed to load schemes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchemes();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <TailSpin color="#3B82F6" height={50} width={50} />
        <span className="ml-2 text-gray-600">Loading schemes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (schemes.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600">No schemes found in the database.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Available Schemes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schemes.map((scheme) => (
          <div
            key={scheme._id}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{scheme.name}</h2>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{scheme.description}</p>
              
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-700">Category:</span>{' '}
                  <span className="text-gray-600">{scheme.category}</span>
                </div>

                {scheme.benefits && (
                  <div>
                    <span className="font-medium text-gray-700">Benefits:</span>
                    <ul className="list-disc list-inside text-gray-600">
                      {scheme.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {scheme.deadline && (
                  <div>
                    <span className="font-medium text-gray-700">Deadline:</span>{' '}
                    <span className="text-gray-600">
                      {new Date(scheme.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {scheme.eligibility && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <h4 className="font-medium text-gray-700 mb-1">Eligibility:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {Object.entries(scheme.eligibility).map(([key, value]) => (
                        <li key={key}>
                          <span className="font-medium capitalize">{key}:</span>{' '}
                          {Array.isArray(value) ? value.join(', ') : value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-gray-100">
                  <span className="font-medium text-gray-700">Status: </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      scheme.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {scheme.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchemeList;
